import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Session } from '../models/Session.model.js';
import { Speaker } from '../models/Speaker.model.js';

// GET /admin/translations/pending — a single cross-model queue of every
// Session/Speaker translation currently sitting in 'draft', so reviewing
// them doesn't mean opening each session/speaker's own edit form one at a
// time to find the translation panel buried inside it. Approve/reject still
// goes through the existing per-model endpoints
// (PATCH /admin/sessions/:id/translations/:lang,
// PATCH /admin/speakers/:id/translations/:lang) — this is read-only, just
// the "what needs a look" view.
export const adminListPending = catchAsync(async (_req: Request, res: Response) => {
  const draftFilter = { $or: [{ 'translations.fr.status': 'draft' }, { 'translations.pt.status': 'draft' }] };

  const [sessions, speakers] = await Promise.all([
    Session.find(draftFilter).select('title description translations').sort({ updatedAt: -1 }),
    Speaker.find(draftFilter).select('fullName bio translations').sort({ updatedAt: -1 }),
  ]);

  const items = [
    ...sessions.flatMap((s) =>
      (['fr', 'pt'] as const)
        .filter((lang) => s.translations?.[lang]?.status === 'draft')
        .map((lang) => ({
          contentType: 'session' as const,
          id: s.id,
          label: s.title,
          lang,
          draft: { title: s.translations![lang]!.title, description: s.translations![lang]!.description },
          original: { title: s.title, description: s.description },
        }))
    ),
    ...speakers.flatMap((sp) =>
      (['fr', 'pt'] as const)
        .filter((lang) => sp.translations?.[lang]?.status === 'draft')
        .map((lang) => ({
          contentType: 'speaker' as const,
          id: sp.id,
          label: sp.fullName,
          lang,
          draft: { bio: sp.translations![lang]!.bio },
          original: { bio: sp.bio },
        }))
    ),
  ];

  res.json(new ApiResponse({ items, total: items.length }));
});
