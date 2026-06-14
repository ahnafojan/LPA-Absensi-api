import { createMiddleware } from "hono/factory";
import { AppError } from "../utils/app-error.js";

type Bucket = {
  count: number;
  resetAt: number;
};

const loginAttempts = new Map<string, Bucket>();
const windowMs = 60 * 1000;
const maxAttempts = 10;

export const loginRateLimit = createMiddleware(async (c, next) => {
  const forwardedFor = c.req.header("x-forwarded-for");
  const key =
    forwardedFor?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown";
  const now = Date.now();
  const existing = loginAttempts.get(key);

  if (!existing || existing.resetAt <= now) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    await next();
    return;
  }

  if (existing.count >= maxAttempts) {
    throw new AppError(429, "Terlalu banyak percobaan login");
  }

  existing.count += 1;
  await next();
});
