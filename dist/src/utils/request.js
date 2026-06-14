import { AppError } from "./app-error.js";
const validate = (schema, body) => {
    const result = schema.safeParse(body);
    if (!result.success) {
        throw new AppError(422, "Validasi request gagal", result.error.flatten());
    }
    return result.data;
};
export const parseJsonBody = async (c, schema) => {
    try {
        const body = await c.req.json();
        return validate(schema, body);
    }
    catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(400, "Body JSON tidak valid");
    }
};
export const parseOptionalJsonBody = async (c, schema) => {
    const contentType = c.req.header("content-type") ?? "";
    const contentLength = c.req.header("content-length");
    const hasJsonBody = contentType.includes("application/json") ||
        (contentLength !== undefined && contentLength !== "0");
    if (!hasJsonBody) {
        return validate(schema, {});
    }
    return parseJsonBody(c, schema);
};
//# sourceMappingURL=request.js.map