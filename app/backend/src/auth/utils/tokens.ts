import { createHash, randomUUID } from 'crypto';

import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN ||
  '30d') as jwt.SignOptions['expiresIn'];

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

const JWT_SECRET: string = process.env.JWT_SECRET;

export type TokenPayload = {
  sub: string;
  sid: string;
  email: string;
  type: 'access' | 'refresh';
  jti?: string;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createAccessToken(userId: string, sessionId: string, email: string) {
  const jti = randomUUID();
  const payload = { sid: sessionId, email, type: 'access' as const };
  const options: jwt.SignOptions = {
    subject: userId,
    expiresIn: JWT_EXPIRES_IN,
    jwtid: jti,
  };
  const token = jwt.sign(payload, JWT_SECRET, options);

  return { token, jti };
}

export function createRefreshToken(userId: string, sessionId: string, email: string) {
  const payload = { sid: sessionId, email, type: 'refresh' as const };
  const options: jwt.SignOptions = {
    subject: userId,
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  };
  const token = jwt.sign(payload, JWT_SECRET, options);

  return token;
}

export function getRefreshExpiryDate() {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  return now;
}
