import { Hono } from "hono";
import { authRoutes } from "./auth.route.js";
import { employeeRoutes } from "./employee.route.js";
import type { AppEnv } from "../types/auth.js";

export const routes = new Hono<AppEnv>();

routes.route("/auth", authRoutes);
routes.route("/employees", employeeRoutes);
