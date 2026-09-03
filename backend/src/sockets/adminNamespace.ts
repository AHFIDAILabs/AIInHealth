import type { Server as HttpServer } from 'node:http';
import { Server, type Namespace } from 'socket.io';
import { parse } from 'cookie';
import { verifyAccessToken } from '../services/token.service.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let adminNamespace: Namespace | null = null;

// Authenticated at handshake using the same httpOnly access_token cookie the REST
// API trusts — never a token passed in the connection query string, which would
// leak into server logs and browser history.
export const initAdminSocket = (httpServer: HttpServer): void => {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_ORIGIN, credentials: true },
  });

  const admin = io.of('/admin');

  admin.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) throw new Error('No cookies on handshake');
      const token = parse(cookieHeader).access_token;
      if (!token) throw new Error('No access_token cookie');
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  admin.on('connection', (socket) => {
    const { userId, role } = socket.data as { userId: string; role: string };
    socket.join(`user:${userId}`);
    logger.info({ userId, role, socketId: socket.id }, 'Admin socket connected');

    socket.on('disconnect', () => {
      logger.info({ userId, socketId: socket.id }, 'Admin socket disconnected');
    });
  });

  adminNamespace = admin;
  logger.info('Socket.IO /admin namespace ready');
};

// Broadcasting to the whole namespace (every connected staff member) rather than
// filtering server-side by role/notificationPrefs — this is a small internal team,
// and the client already has the current user's prefs to decide what to surface.
// Tighten to per-user rooms here if the staff roster grows enough for that to matter.
export const broadcastAdminEvent = (event: string, payload: unknown): void => {
  adminNamespace?.emit(event, payload);
};
