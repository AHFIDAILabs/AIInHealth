import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { ApiError } from '../../utils/ApiError.js';
import { complete } from './groqClient.js';
import { SessionReport } from '../../models/SessionReport.model.js';
import { PolicyTrackerEntry } from '../../models/PolicyTrackerEntry.model.js';
import { Abstract } from '../../models/Abstract.model.js';
import type { KnowledgeProductType } from '../../types/enums.js';

export interface KnowledgeProductSection {
  heading: string;
  content: string;
}

export interface DraftKnowledgeProductResult {
  sections: KnowledgeProductSection[];
  inputSummary: Record<string, number>;
}

const NO_MATERIAL_MESSAGE = 'No approved input material exists yet for this product.';

// Reconciles whatever the model returned onto the REQUIRED heading list, in
// order — a minor heading mismatch (wrong case, trailing punctuation) still
// produces a usable draft with that one section left for the admin to fill in,
// rather than failing the whole generation over a formatting slip.
const reconcileSections = (requiredHeadings: string[], raw: unknown): KnowledgeProductSection[] => {
  const parsed = raw as { sections?: { heading?: string; content?: string }[] } | null;
  const byHeading = new Map((parsed?.sections ?? []).map((s) => [String(s.heading ?? '').trim().toLowerCase(), String(s.content ?? '')]));
  return requiredHeadings.map((heading) => ({ heading, content: byHeading.get(heading.toLowerCase()) ?? '' }));
};

const callForSections = async (
  feature: string,
  systemPrompt: string,
  userContent: string,
  requiredHeadings: string[],
  maxTokens: number
): Promise<KnowledgeProductSection[]> => {
  const raw = await complete({
    feature,
    model: env.GROQ_MODEL_ADVANCED,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
    maxTokens,
    responseFormat: 'json_object',
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.error({ err, feature, raw }, 'knowledgeProduct.service: model returned invalid JSON');
    throw new Error('The AI response could not be parsed. Try regenerating.');
  }
  return reconcileSections(requiredHeadings, parsed);
};

// --- Communiqué ---

const COMMUNIQUE_HEADINGS = ['Preamble', 'Key Outcomes', 'Commitments & Next Steps'];

const draftCommunique = async (): Promise<DraftKnowledgeProductResult> => {
  const reports = await SessionReport.find({ aiPolishedStatus: 'approved' })
    .populate<{ session: { title: string } }>('session', 'title')
    .select('session keyPoints decisions actionItems');
  if (reports.length === 0) throw new ApiError(422, NO_MATERIAL_MESSAGE, 'NO_INPUT_MATERIAL');

  const material = reports
    .map((r) => {
      const lines = [`Session: ${r.session.title}`];
      if (r.keyPoints.length) lines.push(`Key points: ${r.keyPoints.join('; ')}`);
      if (r.decisions.length) lines.push(`Decisions: ${r.decisions.join('; ')}`);
      if (r.actionItems.length) lines.push(`Action items: ${r.actionItems.map((a) => a.text).join('; ')}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const sections = await callForSections(
    'knowledge-product-communique',
    `You draft a short, formal Summit Communiqué for the AI in Health Summit 2026, synthesizing input from multiple approved session reports. Write exactly these three sections as JSON: {"sections":[{"heading":"Preamble","content":"..."},{"heading":"Key Outcomes","content":"..."},{"heading":"Commitments & Next Steps","content":"..."}]}. Formal, declarative tone appropriate for a multi-stakeholder communiqué. Do not invent facts, figures, or commitments not present in the material given.`,
    material,
    COMMUNIQUE_HEADINGS,
    1800
  );
  return { sections, inputSummary: { sessionReportCount: reports.length } };
};

// --- Proceedings ---

const draftProceedings = async (): Promise<DraftKnowledgeProductResult> => {
  const reports = await SessionReport.find({ status: 'submitted' })
    .populate<{ session: { title: string; day: string; startTime: string } }>('session', 'title day startTime')
    .select('session aiPolishedSummary aiPolishedStatus');
  if (reports.length === 0) throw new ApiError(422, NO_MATERIAL_MESSAGE, 'NO_INPUT_MATERIAL');

  const byDay = new Map<string, typeof reports>();
  for (const r of reports) {
    const list = byDay.get(r.session.day) ?? [];
    list.push(r);
    byDay.set(r.session.day, list);
  }

  // Day sections are compiled DETERMINISTICALLY, not AI-synthesized — this is
  // meant to be a faithful official record, so it's built straight from each
  // session's own already-approved material rather than risking an AI
  // rewrite introducing an error. Only the Overview paragraph below is an
  // actual AI call.
  const daySections: KnowledgeProductSection[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayReports]) => {
      const content = dayReports
        .sort((a, b) => a.session.startTime.localeCompare(b.session.startTime))
        .map((r) => {
          const summary =
            r.aiPolishedStatus === 'approved' && r.aiPolishedSummary
              ? r.aiPolishedSummary
              : '(Session report submitted; AI-polished summary not yet approved.)';
          return `${r.session.startTime} — ${r.session.title}\n${summary}`;
        })
        .join('\n\n');
      return { heading: day, content };
    });

  const overviewMaterial = daySections.map((s) => `${s.heading}: ${s.content.slice(0, 500)}`).join('\n\n');
  const [overview] = await callForSections(
    'knowledge-product-proceedings-overview',
    `You write a short (one paragraph) Overview for the AI in Health Summit 2026 Proceedings document, introducing what follows. Respond as JSON: {"sections":[{"heading":"Overview","content":"..."}]}. Do not invent facts not present in the material given.`,
    overviewMaterial,
    ['Overview'],
    600
  );

  return { sections: [overview, ...daySections], inputSummary: { sessionReportCount: reports.length } };
};

// --- Policy Brief ---

const POLICY_BRIEF_HEADINGS = ['Context', 'Policy Landscape', 'Recommendations'];

const draftPolicyBrief = async (): Promise<DraftKnowledgeProductResult> => {
  const [reports, policyEntries] = await Promise.all([
    SessionReport.find({ aiPolishedStatus: 'approved' }).select('keyPoints decisions'),
    PolicyTrackerEntry.find({ status: 'approved' }).select('country frameworkStatus summary'),
  ]);
  if (reports.length === 0 && policyEntries.length === 0) throw new ApiError(422, NO_MATERIAL_MESSAGE, 'NO_INPUT_MATERIAL');

  const materialParts: string[] = [];
  if (reports.length) {
    materialParts.push(
      `Summit session material:\n${reports.map((r) => [...r.keyPoints, ...r.decisions].join('; ')).join('\n')}`
    );
  }
  if (policyEntries.length) {
    materialParts.push(
      `National policy landscape:\n${policyEntries.map((p) => `${p.country} (${p.frameworkStatus}): ${p.summary}`).join('\n')}`
    );
  }

  const sections = await callForSections(
    'knowledge-product-policy-brief',
    `You draft a National Policy Brief for the AI in Health Summit 2026, aimed at government policymakers. Write exactly these three sections as JSON: {"sections":[{"heading":"Context","content":"..."},{"heading":"Policy Landscape","content":"..."},{"heading":"Recommendations","content":"..."}]}. Plain language, policy-relevant framing. Do not invent facts, countries, or figures not present in the material given.`,
    materialParts.join('\n\n'),
    POLICY_BRIEF_HEADINGS,
    1800
  );
  return { sections, inputSummary: { sessionReportCount: reports.length, policyEntryCount: policyEntries.length } };
};

// --- Technical Report ---

const TECHNICAL_REPORT_HEADINGS = ['Research Landscape', 'Key Findings by Track', 'Methodological Notes'];

const draftTechnicalReport = async (): Promise<DraftKnowledgeProductResult> => {
  const abstracts = await Abstract.find({ plainSummaryStatus: 'approved' }).select('track plainSummary');
  if (abstracts.length === 0) throw new ApiError(422, NO_MATERIAL_MESSAGE, 'NO_INPUT_MATERIAL');

  const byTrack = new Map<string, string[]>();
  for (const a of abstracts) {
    const list = byTrack.get(a.track) ?? [];
    if (a.plainSummary) list.push(a.plainSummary);
    byTrack.set(a.track, list);
  }
  const material = [...byTrack.entries()]
    .map(([track, summaries]) => `Track: ${track} (${summaries.length} abstracts)\n${summaries.join('\n')}`)
    .join('\n\n');

  const sections = await callForSections(
    'knowledge-product-technical-report',
    `You draft a Technical Report for the AI in Health Summit 2026, synthesizing approved abstract summaries grouped by track. Write exactly these three sections as JSON: {"sections":[{"heading":"Research Landscape","content":"..."},{"heading":"Key Findings by Track","content":"..."},{"heading":"Methodological Notes","content":"..."}]}. Technical but accessible tone. Do not invent findings, tracks, or figures not present in the material given.`,
    material,
    TECHNICAL_REPORT_HEADINGS,
    1800
  );
  return { sections, inputSummary: { abstractCount: abstracts.length, trackCount: byTrack.size } };
};

// --- Action Plan ---

const ACTION_PLAN_HEADINGS = ['Priority Actions', 'Owners & Timelines'];

const draftActionPlan = async (): Promise<DraftKnowledgeProductResult> => {
  const reports = await SessionReport.find({ status: 'submitted' }).select('actionItems');
  const actionItems = reports.flatMap((r) => r.actionItems);
  if (actionItems.length === 0) throw new ApiError(422, NO_MATERIAL_MESSAGE, 'NO_INPUT_MATERIAL');

  const material = actionItems
    .map((a) => `- ${a.text}${a.owner ? ` (owner: ${a.owner})` : ''}${a.dueDate ? ` (due: ${a.dueDate})` : ''}`)
    .join('\n');

  const sections = await callForSections(
    'knowledge-product-action-plan',
    `You draft an Action Plan for AI in Health Implementation from a flat, pooled list of action items raised across many Summit sessions — some will overlap or duplicate. Group and de-duplicate them into coherent priorities. Write exactly these two sections as JSON: {"sections":[{"heading":"Priority Actions","content":"..."},{"heading":"Owners & Timelines","content":"..."}]}. Do not invent owners, dates, or actions not present in the material given.`,
    material,
    ACTION_PLAN_HEADINGS,
    1800
  );
  return { sections, inputSummary: { actionItemCount: actionItems.length } };
};

export const draftKnowledgeProduct = async (type: KnowledgeProductType): Promise<DraftKnowledgeProductResult> => {
  switch (type) {
    case 'communique':
      return draftCommunique();
    case 'proceedings':
      return draftProceedings();
    case 'policyBrief':
      return draftPolicyBrief();
    case 'technicalReport':
      return draftTechnicalReport();
    case 'actionPlan':
      return draftActionPlan();
  }
};
