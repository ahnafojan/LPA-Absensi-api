import { Hono } from "hono";
import { authRoutes } from "./auth.route.js";
export const routes = new Hono();
routes.route("/auth", authRoutes);
//# sourceMappingURL=index.js.map