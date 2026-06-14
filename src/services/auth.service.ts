import type { Prisma } from "@prisma/client";
import type { LoginBody } from "../validators/auth.validator.js";
import type { UserRole } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";
import {
  generateRefreshToken,
  getRefreshTokenExpiresAt,
  hashToken,
  signAccessToken,
} from "../utils/jwt.js";
import { verifyPassword } from "../utils/password.js";
import { prisma } from "../utils/prisma.js";

const authUserInclude = {
  employee: {
    include: {
      divisi: true,
      jabatan: true,
    },
  },
} as const;

type AuthUserRecord = Prisma.UserGetPayload<{
  include: typeof authUserInclude;
}>;

const toUserRole = (role: string): UserRole => {
  return role as UserRole;
};

const formatUser = (user: AuthUserRecord) => {
  return {
    id: user.id,
    name: user.employee?.namaLengkap ?? user.username,
    username: user.username,
    nik: user.employee?.nik ?? null,
    divisi: user.employee?.divisi.name ?? null,
    jabatan: user.employee?.jabatan.name ?? null,
    photoUri: user.employee?.photoUrl ?? null,
  };
};

const createTokenPair = async (user: AuthUserRecord) => {
  const refreshToken = generateRefreshToken();
  const token = signAccessToken({
    id: user.id,
    username: user.username,
    role: toUserRole(user.role),
    employeeId: user.employeeId,
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshTokenExpiresAt(),
    },
  });

  return {
    token,
    refreshToken,
  };
};

export const authService = {
  async login(payload: LoginBody) {
    const user = await prisma.user.findUnique({
      where: { username: payload.username },
      include: authUserInclude,
    });

    if (!user?.isActive) {
      throw new AppError(401, "Username atau password salah");
    }

    const isPasswordValid = await verifyPassword(
      payload.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new AppError(401, "Username atau password salah");
    }

    const refreshToken = generateRefreshToken();
    const accessToken = signAccessToken({
      id: user.id,
      username: user.username,
      role: toUserRole(user.role),
      employeeId: user.employeeId,
    });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          expiresAt: getRefreshTokenExpiresAt(),
        },
      }),
    ]);

    return {
      token: accessToken,
      refreshToken,
      role: user.role,
      user: formatUser(user),
    };
  },

  async refresh(refreshToken: string) {
    const now = new Date();
    const storedRefreshToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: {
          include: authUserInclude,
        },
      },
    });

    if (!storedRefreshToken?.user.isActive) {
      throw new AppError(401, "Refresh token tidak valid");
    }

    const nextTokens = await createTokenPair(storedRefreshToken.user);

    await prisma.refreshToken.update({
      where: { id: storedRefreshToken.id },
      data: { revokedAt: now },
    });

    return {
      ...nextTokens,
      role: storedRefreshToken.user.role,
      user: formatUser(storedRefreshToken.user),
    };
  },

  async logout(userId: string, refreshToken?: string) {
    const where = refreshToken
      ? {
          userId,
          tokenHash: hashToken(refreshToken),
          revokedAt: null,
        }
      : {
          userId,
          revokedAt: null,
        };

    const result = await prisma.refreshToken.updateMany({
      where,
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      revoked: result.count,
    };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: authUserInclude,
    });

    if (!user?.isActive) {
      throw new AppError(401, "Sesi tidak valid");
    }

    return {
      role: user.role,
      user: formatUser(user),
    };
  },
};
