import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestId } from './middlewares/requestId.middleware.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';
import { blockedIpGuard } from './middlewares/blockedIp.middleware.js';
import { lockdownGuard } from './middlewares/lockdown.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.middleware.js';
import { recordSecurityEvent } from './services/securityEvent.service.js';
import { getRawForwardedFor } from './utils/clientIp.js';
import healthRoutes from './routes/health.routes.js';
import apiV1Router from './routes/v1/index.js';

export const app = express();

// See config/env.ts's TRUST_PROXY_HOPS comment before ever changing this —
// wrong in either direction is a real problem (unhelpful IP logging if too
// low, spoofable rate-limiting/IP-blocking if too high).
app.set('trust proxy', env.TRUST_PROXY_HOPS);

app.use(
  helmet({
    // Defaults block cross-origin fonts/images unless explicitly allowed — Google Fonts
    // (Outfit/Plus Jakarta Sans) and Cloudinary images both need to be named here, not
    // discovered as a "why is prod unstyled" bug later.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'", env.FRONTEND_ORIGIN],
      },
    },
  })
);
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
// Gzips every JSON response — admin list/analytics payloads especially — before
// it goes out. Cheap win on a budget Render tier and matters more, not less,
// once traffic is 100 concurrent users instead of a handful of admins.
app.use(compression());
app.use(requestId);
app.use(pinoHttp({ logger, customLogLevel: (_req, res) => (res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info') }));
// Both checked before any body parsing, so a blocked/locked-down request is
// rejected as cheaply as possible — no point parsing a JSON body we're about
// to 403/503 anyway.
app.use(blockedIpGuard);
app.use(lockdownGuard);
// The verify callback stashes the untouched raw bytes on req.rawBody before
// express.json parses them — the Paystack webhook needs those exact bytes to
// recompute the HMAC signature; the parsed body isn't byte-identical to the wire.
app.use(
  express.json({
    limit: '1mb',
    verify: (req: express.Request, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(cookieParser());
app.use(hpp());
// Every route already validates req.body/req.query through a zod schema before
// a controller touches it, which is what actually prevents NoSQL operator
// injection today — this strips any stray `$`/`.`-prefixed keys as a second,
// independent layer so a future route that skips validation doesn't reopen it.
// onSanitize firing at all means something sent a `$`/`.`-prefixed key, which
// a legitimate client never does — worth a security event even though zod
// already caught/would catch the actual attempt.
app.use(
  mongoSanitize({
    onSanitize: ({ req, key }) => {
      void recordSecurityEvent({
        type: 'injection.mongo_operator_stripped',
        severity: 'medium',
        ip: req.ip,
        rawForwardedFor: getRawForwardedFor(req),
        userAgent: req.headers['user-agent'],
        path: req.originalUrl,
        detail: { key },
      });
    },
  })
);
app.use(apiLimiter);

app.use('/healthz', healthRoutes);
app.use('/api/v1', apiV1Router);

app.use(notFoundHandler);
app.use(errorHandler);
