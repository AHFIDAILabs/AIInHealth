import type { Role } from './enums.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: { sub: string; role: Role };
      delegate?: { registrationId: string };
      reviewer?: { reviewerId: string };
      rapporteur?: { tokenId: string; sessionId: string; reportId: string };
      rawBody?: Buffer;
    }
  }
}

export {};
