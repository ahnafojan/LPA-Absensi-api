import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { attendanceService } from "../services/attendance.service.js";
import { parseQuery } from "../utils/request.js";
import { successResponse } from "../utils/response.js";
import { monthlyRecapQuerySchema, myAttendanceHistoryQuerySchema, realtimeAttendanceQuerySchema, } from "../validators/attendance.validator.js";
export const attendanceRoutes = new Hono();
attendanceRoutes.get("/today/summary", authMiddleware, requireRole("HRD"), async (c) => {
    const data = await attendanceService.getTodaySummary();
    return successResponse(c, data, "Ringkasan kehadiran berhasil diambil");
});
attendanceRoutes.get("/realtime", authMiddleware, requireRole("HRD"), async (c) => {
    const query = parseQuery(c, realtimeAttendanceQuerySchema);
    const data = await attendanceService.getRealtimeAttendance(query);
    return successResponse(c, data, "Data kehadiran berhasil diambil");
});
attendanceRoutes.get("/me/today", authMiddleware, requireRole("KARYAWAN"), async (c) => {
    const authUser = c.get("authUser");
    const data = await attendanceService.getMyTodayAttendance(authUser.id);
    return successResponse(c, data, "Status absensi hari ini berhasil diambil");
});
attendanceRoutes.get("/me/history", authMiddleware, requireRole("KARYAWAN"), async (c) => {
    const authUser = c.get("authUser");
    const query = parseQuery(c, myAttendanceHistoryQuerySchema);
    const data = await attendanceService.getMyAttendanceHistory(authUser.id, query);
    return successResponse(c, data, "Riwayat absensi berhasil diambil");
});
attendanceRoutes.get("/me/recap", authMiddleware, requireRole("KARYAWAN"), async (c) => {
    const authUser = c.get("authUser");
    const query = parseQuery(c, monthlyRecapQuerySchema);
    const data = await attendanceService.getMyMonthlyRecap(authUser.id, query);
    return successResponse(c, data, "Rekap absensi berhasil diambil");
});
//# sourceMappingURL=attendance.route.js.map