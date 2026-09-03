import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  // Several controllers call schema.parse(...) directly instead of going through
  // the validate() middleware (which already catches this the same way) — without
  // this, an uncaught ZodError falls through to the generic 500 branch below and
  // leaks its raw, un-flattened issues array as the error message.
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.flatten().fieldErrors },
    });
    return;
  }

  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 5MB).' : err.message;
    res.status(422).json({ success: false, error: { code: 'UPLOAD_ERROR', message } });
    return;
  }

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error({ err, requestId: req.id }, err.message);
    }
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  logger.error({ err, requestId: req.id }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      // Never leak internals externally — full detail is in the log, keyed by requestId.
      message: isProd ? 'Something went wrong. Please try again.' : String((err as Error)?.message ?? err),
    },
  });
};
