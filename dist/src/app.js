import { Hono } from "hono";
import { cors } from "hono/cors";
import { routes } from "./routes/index.js";
import { isAppError } from "./utils/app-error.js";
import { errorResponse, successResponse } from "./utils/response.js";
export const app = new Hono();
app.use("*", cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
}));
app.get("/", (c) => {
    return successResponse(c, {
        service: "Lucky Print Absensi API",
        status: "ok",
    });
});
app.route("/", routes);
app.notFound((c) => {
    return errorResponse(c, "Endpoint tidak ditemukan", 404);
});
app.onError((error, c) => {
    if (isAppError(error)) {
        return errorResponse(c, error.message, error.statusCode, error.errors);
    }
    console.error(error);
    return errorResponse(c, "Terjadi kesalahan pada server", 500);
});
//# sourceMappingURL=app.js.map