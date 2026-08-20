import cors from 'cors';
import type { CorsOptions } from 'cors';
import express from 'express';
import type { RequestHandler } from 'express';
import * as helmetModule from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRoutes } from './routes/index.js';

type HelmetFactory = () => RequestHandler;

const helmet = ((helmetModule as unknown as { default?: HelmetFactory }).default ??
  (helmetModule as unknown as HelmetFactory));

const allowedClientOrigins = env.CLIENT_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function getVercelPreviewPrefix(origin: string) {
  try {
    const url = new URL(origin);

    if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app')) {
      return null;
    }

    const projectHost = url.hostname.replace(/\.vercel\.app$/, '');
    const previewSuffixIndex = projectHost.lastIndexOf('-');

    if (previewSuffixIndex <= 0) {
      return null;
    }

    return `${projectHost.slice(0, previewSuffixIndex)}-`;
  } catch {
    return null;
  }
}

function isAllowedClientOrigin(origin: string) {
  if (allowedClientOrigins.includes(origin)) {
    return true;
  }

  return allowedClientOrigins.some((allowedOrigin) => {
    const previewPrefix = getVercelPreviewPrefix(allowedOrigin);

    if (!previewPrefix) {
      return false;
    }

    try {
      const requestUrl = new URL(origin);
      return (
        requestUrl.protocol === 'https:' &&
        requestUrl.hostname.endsWith('.vercel.app') &&
        requestUrl.hostname.startsWith(previewPrefix)
      );
    } catch {
      return false;
    }
  });
}

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedClientOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true
};

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

export default app;
