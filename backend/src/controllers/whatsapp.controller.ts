import type { Request, Response } from 'express';
import { isValidObjectId, type FilterQuery, type HydratedDocument } from 'mongoose';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { WhatsAppConversation, type WhatsAppConversationDoc } from '../models/WhatsAppConversation.model.js';
import { Registration } from '../models/Registration.model.js';
import { isValidTwilioWebhookSignature, sendWhatsAppMessage } from '../services/twilio.service.js';
import { askConceptNote } from '../services/ai/rag.service.js';
import { checkDailyBudget } from '../services/ai/aiBudget.service.js';
import { emitAdminNotification } from '../services/notification.service.js';

const WEBHOOK_PATH = '/api/v1/whatsapp/webhook';
// Keyed separately from every chat-completion model's own daily counter in
// aiBudget.service.ts — see env.ts's GROQ_MODEL_WHATSAPP comment for why this
// alone doesn't give full Groq-side quota isolation, only app-level control.
const BUDGET_KEY = 'whatsapp-bot';
// A chatty visitor already in the 'handed_off' state shouldn't re-notify
// staff on every single message while they wait.
const HANDOFF_RENOTIFY_MS = 10 * 60 * 1000;

const MENU_TEXT = [
  "Hi! I'm the AI in Health Summit 2026 assistant.",
  'Reply with a number, or just ask me anything:',
  '1. Agenda',
  '2. Photos & media',
  '3. Check my registration',
  '4. Give feedback',
  '5. Talk to a person',
].join('\n');

const reply = async (convo: HydratedDocument<WhatsAppConversationDoc>, body: string): Promise<void> => {
  convo.messages.push({ direction: 'out', body, at: new Date() });
  await sendWhatsAppMessage(convo.phone, body);
};

const handleRegistrationEmailReply = async (convo: HydratedDocument<WhatsAppConversationDoc>, emailRaw: string): Promise<void> => {
  const email = emailRaw.trim().toLowerCase();
  // Same lookup shape as delegate.controller.ts's requestAccessCode — the one
  // proven "find this person's own registration" query in this codebase.
  const registration = await Registration.findOne({
    status: 'confirmed',
    isActive: true,
    $or: [{ email }, { contactEmail: email }],
  }).sort({ createdAt: -1 });

  if (registration) {
    convo.registration = registration._id;
    const label = (registration.ticketCategory ?? registration.type).replace(/_/g, ' ');
    await reply(convo, `Found it! Your registration (${label}) is confirmed — see you at the Summit!\n\n${MENU_TEXT}`);
  } else {
    // Deliberately NOT enumeration-safe the way the web portal's identical
    // lookup is — a WhatsApp conversation is already a much higher-friction,
    // lower-volume channel than a public web form, and telling the person
    // outright that nothing matched is more useful here than it would be
    // risking there.
    await reply(convo, `I couldn't find a confirmed registration for that email. Double-check it, or reply 5 to talk to a person.\n\n${MENU_TEXT}`);
  }
  convo.state = 'menu';
};

const handleMenuMessage = async (convo: HydratedDocument<WhatsAppConversationDoc>, text: string): Promise<void> => {
  const choice = text.trim();

  if (choice === '1') {
    await reply(convo, `Here's the agenda: ${env.FRONTEND_ORIGIN}/agenda`);
  } else if (choice === '2') {
    await reply(convo, `Photos & media: ${env.FRONTEND_ORIGIN}/gallery`);
  } else if (choice === '3') {
    convo.state = 'awaiting_registration_email';
    await reply(convo, 'Sure — what email did you register with?');
  } else if (choice === '4') {
    convo.state = 'awaiting_feedback';
    await reply(convo, "We'd love your feedback — go ahead and type it, and we'll pass it straight to the team.");
  } else if (choice === '5') {
    convo.handoffRequested = true;
    convo.handoffAt = new Date();
    convo.lastHandoffNotifiedAt = new Date();
    convo.state = 'handed_off';
    await reply(convo, "Connecting you with the team now — someone will reply here as soon as possible.");
    await emitAdminNotification({
      type: 'whatsapp.handoff_requested',
      title: 'WhatsApp: human requested',
      body: `${convo.phone} wants to talk to a person.`,
      resourceType: 'WhatsAppConversation',
      resourceId: convo.id,
    });
  } else if (choice === '' || /^(hi|hello|hey|start|menu)$/i.test(choice)) {
    await reply(convo, MENU_TEXT);
  } else if (checkDailyBudget(BUDGET_KEY, env.AI_DAILY_BUDGET_WHATSAPP)) {
    const { answer } = await askConceptNote(text, 'en', { feature: BUDGET_KEY, model: env.GROQ_MODEL_WHATSAPP });
    await reply(convo, `${answer}\n\n${MENU_TEXT}`);
  } else {
    await reply(convo, "I'm getting a lot of questions right now — try again shortly, or reply 5 to talk to a person.");
  }
};

const handleInboundMessage = async (from: string, text: string): Promise<void> => {
  let convo = await WhatsAppConversation.findOne({ phone: from });
  if (!convo) convo = await WhatsAppConversation.create({ phone: from });

  convo.messages.push({ direction: 'in', body: text, at: new Date() });
  convo.lastMessageAt = new Date();

  if (convo.state === 'handed_off') {
    const shouldRenotify = !convo.lastHandoffNotifiedAt || Date.now() - convo.lastHandoffNotifiedAt.getTime() > HANDOFF_RENOTIFY_MS;
    if (shouldRenotify) {
      convo.lastHandoffNotifiedAt = new Date();
      await emitAdminNotification({
        type: 'whatsapp.handoff_requested',
        title: 'WhatsApp: follow-up from a waiting visitor',
        body: `${convo.phone} sent another message while waiting for a reply.`,
        resourceType: 'WhatsAppConversation',
        resourceId: convo.id,
      });
    }
    await convo.save();
    return;
  }

  if (convo.state === 'awaiting_registration_email') {
    await handleRegistrationEmailReply(convo, text);
  } else if (convo.state === 'awaiting_feedback') {
    await reply(convo, "Thanks for the feedback — we've passed it straight to the team!");
    convo.state = 'menu';
  } else {
    await handleMenuMessage(convo, text);
  }

  await convo.save();
};

// POST /whatsapp/webhook — public, no requireAuth, no rate limiter (Twilio
// retries undelivered webhooks, same reasoning as the Paystack webhook never
// having one — signature verification is the real gate here, not volume).
export const webhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers['x-twilio-signature'] as string | undefined;
  if (!isValidTwilioWebhookSignature(WEBHOOK_PATH, req.body, signature)) {
    throw new ApiError(401, 'Invalid webhook signature', 'INVALID_SIGNATURE');
  }

  // Ack immediately with empty TwiML — replies go out separately via the REST
  // API (sendWhatsAppMessage), not an inline TwiML <Message>, so processing a
  // little late (or Twilio retrying) is harmless, same as Paystack's webhook.
  res.status(200).set('Content-Type', 'text/xml').send('<Response></Response>');

  const from = typeof req.body?.From === 'string' ? req.body.From : '';
  const text = typeof req.body?.Body === 'string' ? req.body.Body.trim() : '';
  if (!from) return;

  handleInboundMessage(from, text).catch((err) => logger.error({ err }, 'whatsapp.controller: handleInboundMessage failed'));
});

const buildFilter = (q?: string): FilterQuery<WhatsAppConversationDoc> => {
  if (!q) return {};
  return { phone: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') };
};

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter = buildFilter(typeof req.query.q === 'string' ? req.query.q : undefined);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    WhatsAppConversation.find(filter)
      .sort({ handoffRequested: -1, lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('phone state handoffRequested handoffAt lastMessageAt registration')
      .populate('registration', 'fullName contactName email contactEmail'),
    WhatsAppConversation.countDocuments(filter),
  ]);

  res.json(new ApiResponse(items, { page, limit, total, pages: Math.ceil(total / limit) || 1 }));
});

export const adminGet = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
  const convo = await WhatsAppConversation.findById(req.params.id).populate('registration', 'fullName contactName email contactEmail');
  if (!convo) throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
  res.json(new ApiResponse(convo));
});

export const adminReply = catchAsync(async (req: Request, res: Response) => {
  if (!isValidObjectId(req.params.id)) throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!body) throw new ApiError(422, 'Reply text is required', 'VALIDATION_ERROR');

  const convo = await WhatsAppConversation.findById(req.params.id);
  if (!convo) throw new ApiError(404, 'Conversation not found', 'NOT_FOUND');

  await sendWhatsAppMessage(convo.phone, body);
  convo.messages.push({ direction: 'out', body, at: new Date() });
  // A staff reply resolves the handoff — the visitor's next message falls
  // back to the normal menu/RAG flow rather than staying stuck waiting.
  convo.handoffRequested = false;
  convo.state = 'menu';
  await convo.save();

  res.json(new ApiResponse(convo));
});
