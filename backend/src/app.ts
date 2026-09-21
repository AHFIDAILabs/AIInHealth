import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestId } from './middlewares/requestId.middleware.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.middleware.js';
import healthRoutes from './routes/health.routes.js';
import apiV1Router from './routes/v1/index.js';

export const app = express();

app.set('trust proxy', 1);

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
app.use(apiLimiter);

app.use('/healthz', healthRoutes);
app.use('/api/v1', apiV1Router);

app.use(notFoundHandler);
app.use(errorHandler);
