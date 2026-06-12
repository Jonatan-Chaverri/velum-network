import express from 'express';
import jwt from 'jsonwebtoken';

import { AuthRepository } from '../auth/repositories/authRepository';
import { TokenPayload } from '../auth/utils/tokens';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export async function getAuthenticatedUserId(
  req: express.Request,
  res: express.Response,
): Promise<string | null> {
  const authorizationHeader = req.get('authorization');

  if (!authorizationHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token is required' });
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload &
      TokenPayload;

    if (payload.type !== 'access' || !payload.sub || !payload.jti || !payload.sid) {
      res.status(401).json({ error: 'Invalid access token' });
      return null;
    }

    const session = await AuthRepository.findSessionByAccessTokenJti(payload.jti);

    if (!session || session.id !== payload.sid || session.userId !== payload.sub) {
      res.status(401).json({ error: 'Invalid session' });
      return null;
    }

    if (session.revokedAt || session.expiresAt < new Date()) {
      res.status(401).json({ error: 'Session expired or revoked' });
      return null;
    }

    await AuthRepository.touchSession(session.id);

    return payload.sub;
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
    return null;
  }
}
