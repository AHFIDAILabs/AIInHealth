import type { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const validate =
  (schema: AnyZodObject) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
      // Write every parsed section back, not just body — a schema that uses
      // `.coerce`/`.transform()`/`.default()` on query/params previously
      // validated correctly but the controller still saw the raw,
      // untransformed req.query/req.params, since only req.body was ever
      // reassigned here. No current route schema relies on a query/params
      // transform, so this was latent rather than an active bug, but it's a
      // silent-validation-bypass shape worth closing before any route does.
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query;
      if (parsed.params) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ApiError(422, 'Validation failed', 'VALIDATION_ERROR', err.flatten().fieldErrors));
        return;
      }
      next(err);
    }
  };
