// Central place that reads, validates and exposes environment variables.
// Every other file imports from here instead of touching process.env directly,
// so a missing variable fails fast at startup, not in the middle of a request.
require('dotenv').config({ quiet: true });

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill it in.`);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

if (isProduction && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
if (!['lax', 'strict', 'none'].includes(sameSite)) {
  throw new Error('COOKIE_SAMESITE must be one of: lax, strict, none');
}
if (sameSite === 'none' && !isProduction) {
  console.warn('[config] COOKIE_SAMESITE=none requires Secure cookies (HTTPS); it only works with NODE_ENV=production.');
}

module.exports = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  cookie: {
    name: 'token',
    httpOnly: true,            // JavaScript in the browser cannot read it (protects against XSS token theft)
    secure: isProduction,      // only sent over HTTPS in production
    sameSite,                  // CSRF protection level
  },
  clientOrigins: (process.env.CLIENT_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};
