import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';

// GET /volunteers — public volunteer recognition directory. Only confirmed
// volunteers who've completed their portal profile with a photo show up here
// — this is a recognition showcase, not a full roster, so someone who
// applied but hasn't uploaded a photo yet simply isn't shown until they do.
// No email/phone ever leaves this endpoint — see Registration.model.ts for
// why those live on the same collection as everything else.
export const publicList = catchAsync(async (_req: Request, res: Response) => {
  const volunteers = await Registration.find({
    type: 'volunteer',
    status: 'confirmed',
    isActive: true,
    avatarUrl: { $exists: true, $nin: [null, ''] },
  })
    .select('fullName avatarUrl trackAssigned trackSelected')
    .sort({ fullName: 1 });

  res.json(
    new ApiResponse(
      volunteers.map((v) => ({
        id: v.id,
        fullName: v.fullName,
        avatarUrl: v.avatarUrl,
        // Staff's final track assignment wins over the volunteer's own
        // preference once one's been made.
        track: v.trackAssigned || v.trackSelected || undefined,
      }))
    )
  );
});
