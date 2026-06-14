export class AppError extends Error {
    statusCode;
    errors;
    constructor(statusCode, message, errors) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.errors = errors;
    }
}
export const isAppError = (error) => {
    return error instanceof AppError;
};
//# sourceMappingURL=app-error.js.map