import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createIzinService } from "../src/services/izin.service.js";

type IzinRow = {
  id: string;
  employeeId: string;
  tipe: "SAKIT" | "CUTI" | "KEPERLUAN_PRIBADI" | "DUKA" | "LAINNYA";
  label: string;
  keterangan: string;
  tanggalMulai: Date;
  tanggalSelesai: Date | null;
  status: "MENUNGGU" | "DISETUJUI" | "DITOLAK";
  alasanPenolakan: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const fixedNow = new Date("2026-06-16T00:00:00.000Z");

const createRow = (overrides: Partial<IzinRow> = {}): IzinRow => {
  return {
    id: "izin-1",
    employeeId: "employee-1",
    tipe: "SAKIT",
    label: "Izin Sakit",
    keterangan: "Perlu istirahat",
    tanggalMulai: new Date("2026-06-17T00:00:00.000Z"),
    tanggalSelesai: new Date("2026-06-17T00:00:00.000Z"),
    status: "MENUNGGU",
    alasanPenolakan: null,
    approvedBy: null,
    approvedAt: null,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    ...overrides,
  };
};

const createFakeDb = (initialRows: IzinRow[] = []) => {
  const rows = [...initialRows];
  const employee = {
    id: "employee-1",
    nik: "202301087",
    namaLengkap: "Andi Saputra",
    divisi: {
      id: "division-1",
      name: "Produksi - Line 4",
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  };

  const matchesFieldCondition = (fieldValue: unknown, condition: unknown) => {
    if (condition === undefined) {
      return true;
    }

    if (condition && typeof condition === "object" && !Array.isArray(condition)) {
      const operators = condition as Record<string, unknown>;

      if (Array.isArray(operators.in) && !operators.in.includes(fieldValue)) {
        return false;
      }

      if (operators.lt instanceof Date && fieldValue instanceof Date && !(fieldValue < operators.lt)) {
        return false;
      }

      if (operators.gte instanceof Date && fieldValue instanceof Date && !(fieldValue >= operators.gte)) {
        return false;
      }

      return true;
    }

    return fieldValue === condition;
  };

  const matchesWhere = (row: IzinRow, where: Record<string, unknown>) => {
    return Object.entries(where).every(([key, value]) => {
      if (key === "OR" && Array.isArray(value)) {
        return value.some((item) => matchesWhere(row, item as Record<string, unknown>));
      }

      return matchesFieldCondition(row[key as keyof IzinRow], value);
    });
  };

  const db = {
    user: {
      findUnique: async (args: { where: { id: string } }) => {
        if (args.where.id !== "user-karyawan" && args.where.id !== "user-hrd") {
          return null;
        }

        return { employeeId: args.where.id === "user-karyawan" ? "employee-1" : "employee-hrd" };
      },
    },
    izin: {
      create: async (args: { data: Omit<IzinRow, "id" | "createdAt" | "updatedAt"> }) => {
        const row = createRow({
          ...args.data,
          id: `izin-${rows.length + 1}`,
          createdAt: fixedNow,
          updatedAt: fixedNow,
        });

        rows.push(row);

        return row;
      },
      updateMany: async (args: { where: Record<string, unknown>; data: Partial<IzinRow> }) => {
        const matchedRows = rows.filter((row) => matchesWhere(row, args.where));

        for (const row of matchedRows) {
          Object.assign(row, args.data, { updatedAt: fixedNow });
        }

        return { count: matchedRows.length };
      },
      findUnique: async (args: {
        where: { id: string };
        include?: unknown;
        select?: Record<string, boolean>;
      }) => {
        const row = rows.find((item) => item.id === args.where.id);

        if (!row) {
          return null;
        }

        if (args.select) {
          return Object.fromEntries(
            Object.entries(args.select)
              .filter(([, selected]) => selected)
              .map(([key]) => [key, row[key as keyof IzinRow]]),
          );
        }

        if (args.include) {
          return { ...row, employee };
        }

        return row;
      },
      findMany: async (args?: { where?: Record<string, unknown> }) => {
        return args?.where ? rows.filter((row) => matchesWhere(row, args.where!)) : rows;
      },
      count: async (args?: { where?: Record<string, unknown> }) => {
        return args?.where ? rows.filter((row) => matchesWhere(row, args.where!)).length : rows.length;
      },
    },
    $transaction: async (promises: Promise<unknown>[]) => Promise.all(promises),
  };

  return {
    rows,
    service: createIzinService(db as Parameters<typeof createIzinService>[0]),
  };
};

describe("izinService", () => {
  it("submitIzin membuat pengajuan izin dengan status menunggu dan label otomatis", async () => {
    const { rows, service } = createFakeDb();

    const result = await service.submitIzin("user-karyawan", {
      tipe: "sakit",
      tanggalMulai: "2026-06-17",
      tanggalSelesai: "2026-06-18",
      keterangan: "Demam dan perlu istirahat",
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, "MENUNGGU");
    assert.equal(rows[0]?.label, "Izin Sakit");
    assert.equal(result.status, "menunggu");
    assert.equal(result.tipe, "sakit");
    assert.equal(result.tanggalMulai, "2026-06-17");
    assert.equal(result.tanggalSelesai, "2026-06-18");
  });

  it("submitIzin menerima tanggal selesai kosong untuk izin satu hari", async () => {
    const { rows, service } = createFakeDb();

    const result = await service.submitIzin("user-karyawan", {
      tipe: "sakit",
      tanggalMulai: "2026-06-17",
      keterangan: "Kontrol kesehatan",
    });

    assert.equal(rows[0]?.tanggalSelesai, null);
    assert.equal(result.tanggalSelesai, null);
  });

  it("getMyStat hanya menghitung izin dan cuti yang sudah disetujui", async () => {
    const { service } = createFakeDb([
      createRow({
        id: "cuti-menunggu",
        tipe: "CUTI",
        status: "MENUNGGU",
        tanggalMulai: new Date("2026-06-17T00:00:00.000Z"),
        tanggalSelesai: new Date("2026-06-18T00:00:00.000Z"),
      }),
      createRow({
        id: "cuti-disetujui",
        tipe: "CUTI",
        status: "DISETUJUI",
        tanggalMulai: new Date("2026-06-20T00:00:00.000Z"),
        tanggalSelesai: null,
      }),
      createRow({
        id: "cuti-ditolak",
        tipe: "CUTI",
        status: "DITOLAK",
        tanggalMulai: new Date("2026-06-22T00:00:00.000Z"),
        tanggalSelesai: new Date("2026-06-23T00:00:00.000Z"),
      }),
      createRow({
        id: "izin-sakit",
        tipe: "SAKIT",
        status: "DISETUJUI",
        tanggalMulai: new Date("2026-06-24T00:00:00.000Z"),
        tanggalSelesai: new Date("2026-06-24T00:00:00.000Z"),
      }),
    ]);

    const result = await service.getMyStat("user-karyawan");

    assert.equal(result.totalIzin, 2);
    assert.equal(result.sisaCuti, 11);
  });

  it("approveIzin hanya menyetujui izin yang masih menunggu", async () => {
    const { rows, service } = createFakeDb([createRow({ id: "izin-approve" })]);

    const result = await service.approveIzin("izin-approve", "user-hrd");

    assert.equal(rows[0]?.status, "DISETUJUI");
    assert.equal(rows[0]?.approvedBy, "user-hrd");
    assert.ok(rows[0]?.approvedAt);
    assert.equal(result.status, "disetujui");
    assert.equal(result.employee.namaLengkap, "Andi Saputra");

    await assert.rejects(
      () =>
        service.rejectIzin("izin-approve", "user-hrd", {
          alasanPenolakan: "Sudah diproses sebelumnya",
        }),
      (error: unknown) => {
        return typeof error === "object" && error !== null && "statusCode" in error
          ? error.statusCode === 400
          : false;
      },
    );
  });

  it("rejectIzin menolak izin pending dan menyimpan alasan penolakan", async () => {
    const { rows, service } = createFakeDb([createRow({ id: "izin-reject" })]);

    const result = await service.rejectIzin("izin-reject", "user-hrd", {
      alasanPenolakan: "Dokumen pendukung belum lengkap",
    });

    assert.equal(rows[0]?.status, "DITOLAK");
    assert.equal(rows[0]?.approvedBy, "user-hrd");
    assert.equal(rows[0]?.alasanPenolakan, "Dokumen pendukung belum lengkap");
    assert.equal(result.status, "ditolak");
    assert.equal(result.alasanPenolakan, "Dokumen pendukung belum lengkap");
  });
});
