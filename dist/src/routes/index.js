import { Hono } from "hono";
import { authRoutes } from "./auth.route.js";
import { employeeRoutes } from "./employee.route.js";
import { attendanceRoutes } from "./attendance.route.js";
import { izinRoutes } from "./izin.route.js";
export const routes = new Hono();
routes.route("/auth", authRoutes);
routes.route("/employees", employeeRoutes);
routes.route("/attendance", attendanceRoutes);
routes.route("/izin", izinRoutes);
//# sourceMappingURL=index.js.map