export class AppError extends Error {
  readonly statusCode: number;
  readonly errors: unknown | undefined;

  constructor(statusCode: number, message: string, errors?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};
