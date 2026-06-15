import { Hono } from "hono";
import { authRoutes } from "./auth.route.js";
import { employeeRoutes } from "./employee.route.js";
export const routes = new Hono();
routes.route("/auth", authRoutes);
routes.route("/employees", employeeRoutes);
//# sourceMappingURL=index.js.map