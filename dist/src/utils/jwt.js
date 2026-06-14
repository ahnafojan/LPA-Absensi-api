import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "./app-error.js";
import { parseDurationToMs, parseDurationToSeconds } from "./duration.js";
const accessTokenSchema = z.object({
    sub: z.string(),
    username: z.string(),
    role: z.enum(["KARYAWAN", "HRD"]),
    employeeId: z.string().nullable().optional(),
    type: z.literal("access"),
});
export const signAccessToken = (user) => {
    const payload = {
        sub: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId,
        type: "access",
    };
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: parseDurationToSeconds(env.JWT_EXPIRES_IN),
    });
};
export const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const parsed = accessTokenSchema.safeParse(decoded);
        if (!parsed.success) {
            throw new AppError(401, "Token tidak valid");
        }
        return {
            ...parsed.data,
            employeeId: parsed.data.employeeId ?? null,
        };
    }
    catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(401, "Token tidak valid atau kedaluwarsa");
    }
};
export const generateRefreshToken = () => {
    return randomBytes(48).toString("hex");
};
export const hashToken = (token) => {
    return createHash("sha256").update(token).digest("hex");
};
export const getRefreshTokenExpiresAt = () => {
    return new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN));
};
//# sourceMappingURL=jwt.js.map