import express from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

import { AuthRepository } from '../auth/repositories/authRepository';
import { hashPassword, verifyPassword } from '../auth/utils/password';
import {
  createAccessToken,
  createRefreshToken,
  getRefreshExpiryDate,
  hashToken,
  TokenPayload,
} from '../auth/utils/tokens';

const router = express.Router();

type RegisterBody = {
  name?: string;
  lastName?: string;
  organization?: string;
  email?: string;
  password?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type RefreshBody = {
  refreshToken?: string;
};

function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

async function createAuthSession(params: {
  userId: string;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const sessionId = randomUUID();
  const accessTokenData = createAccessToken(params.userId, sessionId, params.email);
  const refreshToken = createRefreshToken(params.userId, sessionId, params.email);

  const session = await AuthRepository.createSession({
    id: sessionId,
    userId: params.userId,
    refreshTokenHash: hashToken(refreshToken),
    accessTokenJti: accessTokenData.jti,
    expiresAt: getRefreshExpiryDate(),
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  });

  return {
    session,
    tokens: {
      accessToken: accessTokenData.token,
      refreshToken,
    },
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, lastName, organization, email, password }: RegisterBody = req.body;

    if (!name || !lastName || !email || !password) {
      return res.status(400).json({
        error: 'name, lastName, email, and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters long and include one uppercase letter, one lowercase letter, and one number',
      });
    }

    const existingUser = await AuthRepository.findUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await hashPassword(password);

    const user = await AuthRepository.createUser({
      name: name.trim(),
      lastName: lastName.trim(),
      organization: organization?.trim() || null,
      email: normalizedEmail,
      password: passwordHash,
    });

    const { session, tokens } = await createAuthSession({
      userId: user.id,
      email: user.email,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        organization: user.organization,
        email: user.email,
        createdAt: user.createdAt,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
      tokens,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password }: LoginBody = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const user = await AuthRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatches = await verifyPassword(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { session, tokens } = await createAuthSession({
      userId: user.id,
      email: user.email,
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        organization: user.organization,
        email: user.email,
        createdAt: user.createdAt,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
      tokens,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken }: RefreshBody = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'refreshToken is required',
      });
    }

    let payload: jwt.JwtPayload & TokenPayload;

    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as jwt.JwtPayload &
        TokenPayload;
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    if (payload.type !== 'refresh' || !payload.sub || !payload.sid || !payload.email) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const session = await AuthRepository.findSessionById(payload.sid);

    if (!session || session.userId !== payload.sub) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (session.revokedAt || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired or revoked' });
    }

    if (session.refreshTokenHash !== hashToken(refreshToken)) {
      return res.status(401).json({ error: 'Refresh token does not match current session' });
    }

    const accessTokenData = createAccessToken(session.userId, session.id, session.user.email);
    const nextRefreshToken = createRefreshToken(session.userId, session.id, session.user.email);
    const expiresAt = getRefreshExpiryDate();

    await AuthRepository.rotateSession(session.id, {
      refreshTokenHash: hashToken(nextRefreshToken),
      accessTokenJti: accessTokenData.jti,
      expiresAt,
    });

    return res.status(200).json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        lastName: session.user.lastName,
        organization: session.user.organization,
        email: session.user.email,
        createdAt: session.user.createdAt,
      },
      session: {
        id: session.id,
        expiresAt,
      },
      tokens: {
        accessToken: accessTokenData.token,
        refreshToken: nextRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
