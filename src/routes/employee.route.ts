import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { employeeService } from "../services/employee.service.js";
import type { AppEnv } from "../types/auth.js";
import { parseJsonBody, parseQuery } from "../utils/request.js";
import { successResponse } from "../utils/response.js";
import { createEmployeeBodySchema, listEmployeesQuerySchema } from "../validators/employee.validator.js";

export const employeeRoutes = new Hono<AppEnv>();

employeeRoutes.get("/", authMiddleware, requireRole("HRD"), async (c) => {
  const query = parseQuery(c, listEmployeesQuerySchema);
  const data = await employeeService.listEmployees(query);

  return successResponse(c, data, "Data karyawan berhasil diambil");
});

employeeRoutes.post("/", authMiddleware, requireRole("HRD"), async (c) => {
  const body = await parseJsonBody(c, createEmployeeBodySchema);
  const data = await employeeService.createEmployee(body);

  return successResponse(c, data, "Karyawan berhasil ditambahkan", 201);
});
