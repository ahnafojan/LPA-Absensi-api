-- CreateEnum
CREATE TYPE "IzinTipe" AS ENUM ('SAKIT', 'CUTI', 'KEPERLUAN_PRIBADI', 'DUKA', 'LAINNYA');

-- CreateEnum
CREATE TYPE "IzinStatus" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK');

-- CreateTable
CREATE TABLE "Izin" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "tipe" "IzinTipe" NOT NULL,
    "label" TEXT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3),
    "status" "IzinStatus" NOT NULL DEFAULT 'MENUNGGU',
    "alasanPenolakan" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Izin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Izin_employeeId_idx" ON "Izin"("employeeId");

-- CreateIndex
CREATE INDEX "Izin_status_idx" ON "Izin"("status");

-- CreateIndex
CREATE INDEX "Izin_tipe_idx" ON "Izin"("tipe");

-- CreateIndex
CREATE INDEX "Izin_tanggalMulai_tanggalSelesai_idx" ON "Izin"("tanggalMulai", "tanggalSelesai");

-- AddForeignKey
ALTER TABLE "Izin" ADD CONSTRAINT "Izin_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Izin" ADD CONSTRAINT "Izin_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
