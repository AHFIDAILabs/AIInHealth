import { env } from '../config/env.js';
import { AbstractCommunication } from '../models/AbstractCommunication.model.js';
import type { AbstractDoc } from '../models/Abstract.model.js';
import type { AbstractDecision } from '../types/enums.js';

interface TemplateInput {
  authorName: string;
  title: string;
  track: string;
}

const TEMPLATES: Record<AbstractDecision, (input: TemplateInput) => { subject: string; body: string }> = {
  accepted_oral: ({ authorName, title, track }) => ({
    subject: 'Your abstract has been accepted for an Oral Presentation — AI in Health Summit 2026',
    body: `
      <p>Dear ${authorName},</p>
      <p>Congratulations — your abstract, <strong>${title}</strong> (${track}), has been accepted for an <strong>oral presentation</strong> at the AI in Health Summit 2026.</p>
      <p>Our programme committee will follow up shortly with your presentation slot and further details on preparing your talk.</p>
      <p>We look forward to having you present in Abuja, 19&ndash;20 October 2026.</p>
      <p>Questions? Contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  }),
  accepted_poster: ({ authorName, title, track }) => ({
    subject: 'Your abstract has been accepted for a Poster Presentation — AI in Health Summit 2026',
    body: `
      <p>Dear ${authorName},</p>
      <p>Congratulations — your abstract, <strong>${title}</strong> (${track}), has been accepted for a <strong>poster presentation</strong> at the AI in Health Summit 2026.</p>
      <p>Our programme committee will follow up shortly with poster specifications and your assigned session.</p>
      <p>We look forward to having you present in Abuja, 19&ndash;20 October 2026.</p>
      <p>Questions? Contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  }),
  rejected: ({ authorName, title, track }) => ({
    subject: 'Update on your abstract submission — AI in Health Summit 2026',
    body: `
      <p>Dear ${authorName},</p>
      <p>Thank you for submitting your abstract, <strong>${title}</strong> (${track}), to the AI in Health Summit 2026. After careful review by our programme committee, we regret to inform you that it has not been selected for presentation at this time.</p>
      <p>We received a large number of strong submissions this year, and this decision does not reflect the merit of your work. We encourage you to continue engaging with the Summit and to submit again in future editions.</p>
      <p>Questions? Contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  }),
  waitlisted: ({ authorName, title, track }) => ({
    subject: 'Update on your abstract submission — AI in Health Summit 2026',
    body: `
      <p>Dear ${authorName},</p>
      <p>Thank you for submitting your abstract, <strong>${title}</strong> (${track}), to the AI in Health Summit 2026. Your submission has been placed on our <strong>waitlist</strong> — it was well received, and we may be in touch with a presentation opportunity should space become available.</p>
      <p>No action is needed from you at this time. We'll follow up directly if your status changes.</p>
      <p>Questions? Contact ${env.SUPPORT_EMAIL || 'the AHFID team'}.</p>
    `,
  }),
};

// Called right after a decision is recorded (abstractController.adminUpdate).
// Cancels any still-draft communication for this abstract (superseded by the
// new decision) before drafting a fresh one, so only one draft is ever live
// per abstract while past drafts/sends stay in the history.
export const draftDecisionCommunication = async (abstract: AbstractDoc & { _id: unknown }, decision: AbstractDecision): Promise<void> => {
  await AbstractCommunication.updateMany(
    { abstract: abstract._id, status: 'draft' },
    { $set: { status: 'cancelled' } }
  );

  const { subject, body } = TEMPLATES[decision]({
    authorName: abstract.authorName,
    title: abstract.title,
    track: abstract.track,
  });

  await AbstractCommunication.create({ abstract: abstract._id, decision, subject, body });
};
