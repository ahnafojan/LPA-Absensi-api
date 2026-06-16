import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { izinService } from "../services/izin.service.js";
import { parseJsonBody, parseQuery } from "../utils/request.js";
import { successResponse } from "../utils/response.js";
import { createIzinBodySchema, hrdIzinQuerySchema, myIzinQuerySchema, rejectIzinBodySchema, } from "../validators/izin.validator.js";
export const izinRoutes = new Hono();
izinRoutes.get("/me/stat", authMiddleware, requireRole("KARYAWAN"), async (c) => {
    const authUser = c.get("authUser");
    const data = await izinService.getMyStat(authUser.id);
    return successResponse(c, data, "Statistik izin berhasil diambil");
});
izinRoutes.get("/me", authMiddleware, requireRole("KARYAWAN"), async (c) => {
    const authUser = c.get("authUser");
    const query = parseQuery(c, myIzinQuerySchema);
    const data = await izinService.getMyIzin(authUser.id, query);
    return successResponse(c, data, "Riwayat izin berhasil diambil");
});
izinRoutes.post("/", authMiddleware, requireRole("KARYAWAN"), async (c) => {
    const authUser = c.get("authUser");
    const body = await parseJsonBody(c, createIzinBodySchema);
    const data = await izinService.submitIzin(authUser.id, body);
    return successResponse(c, data, "Pengajuan izin berhasil dibuat", 201);
});
izinRoutes.get("/hrd/summary", authMiddleware, requireRole("HRD"), async (c) => {
    const data = await izinService.getHrdSummary();
    return successResponse(c, data, "Ringkasan approval izin berhasil diambil");
});
izinRoutes.get("/hrd", authMiddleware, requireRole("HRD"), async (c) => {
    const query = parseQuery(c, hrdIzinQuerySchema);
    const data = await izinService.getHrdIzin(query);
    return successResponse(c, data, "Daftar pengajuan izin berhasil diambil");
});
izinRoutes.patch("/:id/approve", authMiddleware, requireRole("HRD"), async (c) => {
    const authUser = c.get("authUser");
    const data = await izinService.approveIzin(c.req.param("id"), authUser.id);
    return successResponse(c, data, "Izin berhasil disetujui");
});
izinRoutes.patch("/:id/reject", authMiddleware, requireRole("HRD"), async (c) => {
    const authUser = c.get("authUser");
    const body = await parseJsonBody(c, rejectIzinBodySchema);
    const data = await izinService.rejectIzin(c.req.param("id"), authUser.id, body);
    return successResponse(c, data, "Izin berhasil ditolak");
});
//# sourceMappingURL=izin.route.js.map