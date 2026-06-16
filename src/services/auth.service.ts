import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import type {
  ChangePasswordBody,
  LoginBody,
  UpdateProfileBody,
} from "../validators/auth.validator.js";
import type { UserRole } from "../types/auth.js";
import { AppError } from "../utils/app-error.js";
import {
  generateRefreshToken,
  getRefreshTokenExpiresAt,
  hashToken,
  signAccessToken,
} from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
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

export const PROFILE_PHOTO_MAX_SIZE = 3 * 1024 * 1024;

const profilePhotoPublicPath = "/uploads/profiles";
const profilePhotoStorageDir = path.join(process.cwd(), "uploads", "profiles");
const allowedProfilePhotoMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const restrictedProfileFields = ["nik", "divisi", "jabatan"] as const;

const toUserRole = (role: string): UserRole => {
  return role as UserRole;
};

const resolvePublicUri = (
  storedUri: string | null | undefined,
  publicBaseUrl?: string,
) => {
  if (!storedUri) {
    return null;
  }

  if (/^https?:\/\//i.test(storedUri)) {
    return storedUri;
  }

  if (!publicBaseUrl) {
    return storedUri;
  }

  return new URL(storedUri, publicBaseUrl).toString();
};

const formatUser = (user: AuthUserRecord, publicBaseUrl?: string) => {
  return {
    id: user.id,
    name: user.employee?.namaLengkap ?? user.username,
    username: user.username,
    nik: user.employee?.nik ?? null,
    divisi: user.employee?.divisi.name ?? null,
    jabatan: user.employee?.jabatan.name ?? null,
    photoUri: resolvePublicUri(user.employee?.photoUrl, publicBaseUrl),
  };
};

const formatAuthData = (user: AuthUserRecord, publicBaseUrl?: string) => {
  return {
    role: user.role,
    user: formatUser(user, publicBaseUrl),
  };
};

const fieldErrors = (errors: Record<string, string[]>) => {
  return new AppError(422, "Validasi gagal", errors);
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

const getProfilePhotoLocalPath = (photoUri: string | null | undefined) => {
  if (!photoUri) {
    return null;
  }

  let pathname = photoUri;

  try {
    pathname = new URL(photoUri).pathname;
  } catch {
    // Relative public paths are expected for local storage.
  }

  if (!pathname.startsWith(`${profilePhotoPublicPath}/`)) {
    return null;
  }

  const fileName = path.basename(pathname);
  if (!fileName) {
    return null;
  }

  const storageRoot = path.resolve(profilePhotoStorageDir);
  const localPath = path.resolve(profilePhotoStorageDir, fileName);

  if (!localPath.startsWith(`${storageRoot}${path.sep}`)) {
    return null;
  }

  return localPath;
};

const deleteLocalProfilePhoto = async (photoUri: string | null | undefined) => {
  const localPath = getProfilePhotoLocalPath(photoUri);

  if (!localPath) {
    return;
  }

  try {
    await rm(localPath, { force: true });
  } catch (error) {
    console.warn("Gagal menghapus foto profil lama", error);
  }
};

const validateProfilePhoto = (photo: File) => {
  const errors: string[] = [];
  const extension = allowedProfilePhotoMimeTypes.get(photo.type);

  if (photo.size <= 0) {
    errors.push("Foto wajib diisi");
  }

  if (photo.size > PROFILE_PHOTO_MAX_SIZE) {
    errors.push("Ukuran foto maksimal 3MB");
  }

  if (!extension) {
    errors.push("Format foto hanya boleh jpg, jpeg, png, atau webp");
  }

  if (errors.length > 0 || !extension) {
    throw fieldErrors({ photo: errors });
  }

  return extension;
};

const saveProfilePhoto = async (userId: string, photo: File) => {
  const extension = validateProfilePhoto(photo);
  const fileName = `user-${userId}-${Date.now()}-${randomUUID()}.${extension}`;
  const publicPath = `${profilePhotoPublicPath}/${fileName}`;
  const localPath = path.join(profilePhotoStorageDir, fileName);
  const buffer = Buffer.from(await photo.arrayBuffer());

  await mkdir(profilePhotoStorageDir, { recursive: true });
  await writeFile(localPath, buffer, { flag: "wx" });

  return {
    publicPath,
    mimeType: photo.type,
    size: photo.size,
  };
};

const resolveDivisionByName = async (
  tx: Prisma.TransactionClient,
  name: string,
) => {
  return tx.division.upsert({
    where: { name },
    update: {},
    create: { name },
  });
};

const resolvePositionByName = async (
  tx: Prisma.TransactionClient,
  name: string,
) => {
  const existingPosition = await tx.position.findFirst({
    where: { name },
  });

  if (existingPosition) {
    return existingPosition;
  }

  return tx.position.create({
    data: { name },
  });
};

const mapUniqueProfileError = (error: unknown): never => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target
      : [];

    if (target.includes("username")) {
      throw fieldErrors({ username: ["Username sudah digunakan"] });
    }

    if (target.includes("nik")) {
      throw fieldErrors({ nik: ["NIK sudah digunakan"] });
    }

    throw new AppError(422, "Validasi gagal");
  }

  throw error;
};

const getRestrictedProfileChanges = (
  user: AuthUserRecord,
  payload: UpdateProfileBody,
) => {
  const currentValues = {
    nik: user.employee?.nik ?? null,
    divisi: user.employee?.divisi.name ?? null,
    jabatan: user.employee?.jabatan.name ?? null,
  };

  return restrictedProfileFields.filter((field) => {
    const nextValue = payload[field];
    return nextValue !== undefined && nextValue !== currentValues[field];
  });
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
      ...formatAuthData(user),
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
      ...formatAuthData(storedRefreshToken.user),
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

  async me(userId: string, publicBaseUrl?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: authUserInclude,
    });

    if (!user) {
      throw new AppError(404, "User tidak ditemukan");
    }

    if (!user.isActive) {
      throw new AppError(401, "Sesi tidak valid");
    }

    return formatAuthData(user, publicBaseUrl);
  },

  async updateMe(
    userId: string,
    authRole: UserRole,
    payload: UpdateProfileBody,
    publicBaseUrl?: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: authUserInclude,
    });

    if (!user) {
      throw new AppError(404, "User tidak ditemukan");
    }

    if (!user.isActive) {
      throw new AppError(401, "Sesi tidak valid");
    }

    if (!user.employee) {
      throw new AppError(404, "Profil karyawan tidak ditemukan");
    }

    const employeeId = user.employee.id;
    const restrictedChanges = getRestrictedProfileChanges(user, payload);
    if (authRole !== "HRD" && restrictedChanges.length > 0) {
      throw new AppError(
        403,
        "Tidak punya akses untuk mengubah field profil tertentu",
        Object.fromEntries(
          restrictedChanges.map((field) => [
            field,
            ["Field ini hanya boleh diedit HRD"],
          ]),
        ),
      );
    }

    try {
      const updatedUser = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({
          where: { username: payload.username },
          select: { id: true },
        });

        if (existingUser && existingUser.id !== userId) {
          throw fieldErrors({ username: ["Username sudah digunakan"] });
        }

        const employeeData: Prisma.EmployeeUpdateInput = {
          namaLengkap: payload.name,
        };

        if (authRole === "HRD") {
          if (payload.nik !== undefined) {
            const existingEmployee = await tx.employee.findUnique({
              where: { nik: payload.nik },
              select: { id: true },
            });

            if (
              existingEmployee &&
              existingEmployee.id !== employeeId
            ) {
              throw fieldErrors({ nik: ["NIK sudah digunakan"] });
            }

            employeeData.nik = payload.nik;
          }

          if (payload.divisi !== undefined) {
            const division = await resolveDivisionByName(tx, payload.divisi);
            employeeData.divisi = {
              connect: { id: division.id },
            };
          }

          if (payload.jabatan !== undefined) {
            const position = await resolvePositionByName(tx, payload.jabatan);
            employeeData.jabatan = {
              connect: { id: position.id },
            };
          }
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            username: payload.username,
          },
        });

        await tx.employee.update({
          where: { id: employeeId },
          data: employeeData,
        });

        return tx.user.findUniqueOrThrow({
          where: { id: userId },
          include: authUserInclude,
        });
      });

      return formatAuthData(updatedUser, publicBaseUrl);
    } catch (error) {
      mapUniqueProfileError(error);
    }
  },

  async changePassword(userId: string, payload: ChangePasswordBody) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User tidak ditemukan");
    }

    if (!user.isActive) {
      throw new AppError(401, "Sesi tidak valid");
    }

    const isCurrentPasswordValid = await verifyPassword(
      payload.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new AppError(400, "Password saat ini salah", {
        currentPassword: ["Password saat ini salah"],
      });
    }

    const passwordHash = await hashPassword(payload.newPassword);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: now },
      }),
    ]);

    return {
      changed: true,
    };
  },

  async updateProfilePhoto(
    userId: string,
    photo: File,
    publicBaseUrl?: string,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: authUserInclude,
    });

    if (!user) {
      throw new AppError(404, "User tidak ditemukan");
    }

    if (!user.isActive) {
      throw new AppError(401, "Sesi tidak valid");
    }

    if (!user.employee) {
      throw new AppError(404, "Profil karyawan tidak ditemukan");
    }

    const employeeId = user.employee.id;
    const savedPhoto = await saveProfilePhoto(user.id, photo);

    try {
      const updatedUser = await prisma.$transaction(async (tx) => {
        await tx.employee.update({
          where: { id: employeeId },
          data: { photoUrl: savedPhoto.publicPath },
        });

        await tx.uploadedFile.create({
          data: {
            ownerId: user.id,
            url: savedPhoto.publicPath,
            mimeType: savedPhoto.mimeType,
            size: savedPhoto.size,
            type: "PROFILE_PHOTO",
          },
        });

        await tx.uploadedFile.deleteMany({
          where: {
            ownerId: user.id,
            type: "PROFILE_PHOTO",
            url: { not: savedPhoto.publicPath },
          },
        });

        return tx.user.findUniqueOrThrow({
          where: { id: user.id },
          include: authUserInclude,
        });
      });

      await deleteLocalProfilePhoto(user.employee.photoUrl);

      return formatAuthData(updatedUser, publicBaseUrl);
    } catch (error) {
      await deleteLocalProfilePhoto(savedPhoto.publicPath);
      throw error;
    }
  },

  async deleteProfilePhoto(userId: string, publicBaseUrl?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: authUserInclude,
    });

    if (!user) {
      throw new AppError(404, "User tidak ditemukan");
    }

    if (!user.isActive) {
      throw new AppError(401, "Sesi tidak valid");
    }

    if (!user.employee) {
      throw new AppError(404, "Profil karyawan tidak ditemukan");
    }

    const employeeId = user.employee.id;
    const oldPhotoUri = user.employee.photoUrl;
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: { photoUrl: null },
      });

      await tx.uploadedFile.deleteMany({
        where: {
          ownerId: user.id,
          type: "PROFILE_PHOTO",
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: authUserInclude,
      });
    });

    await deleteLocalProfilePhoto(oldPhotoUri);

    return formatAuthData(updatedUser, publicBaseUrl);
  },
};
