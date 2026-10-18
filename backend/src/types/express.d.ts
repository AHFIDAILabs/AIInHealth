import type { Role } from './enums.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: { sub: string; role: Role };
      delegate?: { registrationId: string };
      reviewer?: { reviewerId: string };
      rapporteur?: { tokenId: string; sessionId: string; reportId: string };
      sessionAttendance?: { tokenId: string; sessionId: string; volunteerName: string };
      rawBody?: Buffer;
    }
  }
}

export {};
