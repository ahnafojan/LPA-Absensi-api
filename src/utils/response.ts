import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const successResponse = <T>(
  c: Context,
  data: T,
  message = "OK",
  statusCode = 200,
) => {
  return c.json(
    {
      success: true,
      message,
      data,
    },
    statusCode as ContentfulStatusCode,
  );
};

export const errorResponse = (
  c: Context,
  message: string,
  statusCode = 500,
  errors?: unknown,
) => {
  const body =
    errors === undefined
      ? { success: false, message }
      : { success: false, message, errors };

  return c.json(body as Record<string, unknown>, statusCode as ContentfulStatusCode);
};
