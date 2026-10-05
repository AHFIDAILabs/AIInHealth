import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { issueFormToken } from '../services/formToken.service.js';

// GET /forms/token — public, no auth. See formToken.service.ts's header
// comment for the full time-trap rationale.
export const getToken = catchAsync(async (_req: Request, res: Response) => {
  res.json(new ApiResponse(issueFormToken()));
});
