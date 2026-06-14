export const successResponse = (c, data, message = "OK", statusCode = 200) => {
    return c.json({
        success: true,
        message,
        data,
    }, statusCode);
};
export const errorResponse = (c, message, statusCode = 500, errors) => {
    const body = errors === undefined
        ? { success: false, message }
        : { success: false, message, errors };
    return c.json(body, statusCode);
};
//# sourceMappingURL=response.js.map