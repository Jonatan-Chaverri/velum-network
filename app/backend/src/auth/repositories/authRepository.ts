import { prisma } from '../../lib/prisma';

export type CreateUserInput = {
  name: string;
  lastName: string;
  organization: string | null;
  email: string;
  password: string;
};

export type CreateSessionInput = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  accessTokenJti: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export const AuthRepository = {
  createUser(input: CreateUserInput) {
    return prisma.user.create({ data: input });
  },

  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { sessions: true },
    });
  },

  createSession(input: CreateSessionInput) {
    return prisma.session.create({ data: input });
  },

  findSessionByAccessTokenJti(accessTokenJti: string) {
    return prisma.session.findUnique({
      where: { accessTokenJti },
      include: { user: true },
    });
  },

  findSessionById(sessionId: string) {
    return prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
  },

  rotateSession(sessionId: string, input: {
    refreshTokenHash: string;
    accessTokenJti: string;
    expiresAt: Date;
  }) {
    return prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: input.refreshTokenHash,
        accessTokenJti: input.accessTokenJti,
        expiresAt: input.expiresAt,
        lastUsedAt: new Date(),
      },
      include: { user: true },
    });
  },

  revokeSession(sessionId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  },

  touchSession(sessionId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date() },
    });
  },
};
