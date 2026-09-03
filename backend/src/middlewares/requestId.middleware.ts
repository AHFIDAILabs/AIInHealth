import type { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  req.id = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
};
