Saya ingin membuat backend untuk aplikasi absensi mobile menggunakan Hono, Prisma, dan PostgreSQL.

Frontend sudah tersedia dengan role KARYAWAN dan HRD. Untuk fase awal ini, backend belum perlu integrasi fingerprint. Semua data absensi, jadwal, izin, laporan, dan karyawan untuk testing berasal dari seed dummy database.

Konteks penting:

- Untuk saat ini tidak perlu integrasi mesin fingerprint.
- Data hadir, terlambat, izin, alfa, dan belum absen dibuat dari seed dummy.
- Saat HRD menambahkan karyawan baru, backend hanya membuat akun user dan data master karyawan.
- Karyawan baru tidak perlu otomatis punya data absensi dummy.
- Jika karyawan baru belum punya jadwal atau absensi, frontend boleh menampilkan data kosong atau status BELUM_ABSEN.
- Data dummy hanya dibuat melalui seed development, bukan otomatis dari logic production.
- Backend harus tetap dibuat rapi agar nanti bisa dikembangkan untuk integrasi fingerprint di masa depan.

Tech stack:

- Hono sebagai HTTP framework.
- Prisma ORM.
- PostgreSQL database.
- JWT authentication.
- Role-based access control untuk KARYAWAN dan HRD.
- Validasi request menggunakan Zod.
- Password di-hash menggunakan bcrypt atau argon2.
- Jangan pernah mengirim password asli atau passwordHash ke frontend.
- Gunakan pagination server-side.
- Gunakan struktur response yang konsisten.

Role aplikasi:

1. KARYAWAN

- Login.
- Melihat profile sendiri.
- Melihat status absensi hari ini.
- Melihat jadwal kerja sendiri.
- Melihat rekap absensi bulanan.
- Melihat riwayat absensi dengan filter dan pagination.
- Mengajukan izin.
- Melihat riwayat izin sendiri.
- Melihat notifikasi sendiri.
- Melihat pengumuman dan lokasi kantor.

2. HRD

- Login.
- Melihat dashboard HRD.
- Melihat total karyawan.
- Melihat jumlah hadir hari ini.
- Melihat jumlah terlambat hari ini.
- Melihat jumlah izin pending.
- Melihat kehadiran real-time.
- Search/filter data kehadiran.
- Melihat daftar karyawan.
- Menambahkan karyawan baru.
- Mengubah data karyawan.
- Approve/reject pengajuan izin.
- Melihat laporan absensi.
- Melihat notifikasi HRD.

Buat schema Prisma dengan tabel berikut:

users:

- id
- username unique
- passwordHash
- role enum: KARYAWAN, HRD
- employeeId nullable unique
- isActive boolean default true
- lastLoginAt nullable
- createdAt
- updatedAt

employees:

- id
- userId nullable unique
- nik unique
- namaLengkap
- divisiId
- jabatanId
- status enum: AKTIF, CUTI, NONAKTIF, PERLU_REVIEW
- photoUrl nullable
- createdAt
- updatedAt

divisions:

- id
- name unique
- createdAt
- updatedAt

positions:

- id
- name
- createdAt
- updatedAt

shifts:

- id
- name, contoh: Shift Pagi, Shift Siang, Shift Malam, Libur
- startTime
- endTime
- isWorkingDay boolean
- createdAt
- updatedAt

schedules:

- id
- employeeId
- shiftId
- date
- weekNumber nullable
- note nullable
- createdAt
- updatedAt

attendances:

- id
- employeeId
- date
- checkInAt nullable
- checkOutAt nullable
- status enum: HADIR, TERLAMBAT, IZIN, ALFA, BELUM_ABSEN
- lateMinutes default 0
- source enum: DUMMY, MANUAL, SYSTEM
- note nullable
- createdAt
- updatedAt

leave_requests:

- id
- employeeId
- type enum: SAKIT, CUTI, KEPERLUAN_PRIBADI, DUKA, LAINNYA
- startDate
- endDate
- reason
- status enum: MENUNGGU, DISETUJUI, DITOLAK
- reviewedById nullable
- reviewedAt nullable
- rejectionReason nullable
- createdAt
- updatedAt

notifications:

- id
- userId
- title
- description
- type nullable
- readAt nullable
- payload json nullable
- createdAt

announcements:

- id
- title
- message
- audienceRole nullable, bisa KARYAWAN, HRD, atau null untuk semua
- createdById nullable
- publishedAt
- createdAt
- updatedAt

uploaded_files:

- id
- ownerId nullable
- url
- mimeType
- size
- type enum: PROFILE_PHOTO, REPORT, OTHER
- createdAt

refresh_tokens atau sessions:

- id
- userId
- tokenHash
- expiresAt
- revokedAt nullable
- createdAt

Endpoint yang dibutuhkan:

Auth:
POST /auth/login
POST /auth/logout
POST /auth/refresh
GET /auth/me

Profile:
GET /users/me
PATCH /users/me/profile
PATCH /users/me/photo

Karyawan:
GET /employees/me
GET /attendance/me/today
GET /attendance/me/recap?month=2026-06
GET /attendance/me/history?page=1&limit=10&status=HADIR
GET /schedules/me?month=2026-06
GET /leaves/me/stats
GET /leaves/me?page=1&limit=10&status=MENUNGGU&type=SAKIT
POST /leaves
GET /announcements/me
GET /office-location
GET /notifications?filter=unread&page=1&limit=10
PATCH /notifications/:id/read
PATCH /notifications/read-all

HRD:
GET /hrd/dashboard
GET /employees?search=&status=&divisionId=&page=1&limit=10
POST /employees
GET /employees/:id
PATCH /employees/:id
GET /attendance/today/summary
GET /attendance/realtime?search=&status=&divisionId=&shiftId=&page=1&limit=10
GET /leaves?page=1&limit=10&status=MENUNGGU&type=
PATCH /leaves/:id/approve
PATCH /leaves/:id/reject
GET /hrd/reports/summary?month=2026-06
GET /hrd/reports/unit-attendance?month=2026-06
GET /hrd/reports/download?month=2026-06

Saat HRD tambah karyawan:
Input:

- namaLengkap
- username
- password
- divisiId atau nama divisi
- jabatanId atau nama jabatan
- NIK
- status default AKTIF

Backend harus:

- Validasi username unique.
- Validasi NIK unique.
- Hash password.
- Buat user role KARYAWAN.
- Buat employee.
- Relasikan user dengan employee.
- Tidak membuat attendance otomatis.
- Tidak membuat leave request otomatis.
- Tidak membuat data rekap otomatis.
- Gunakan Prisma transaction saat membuat user dan employee.

Buat seed development berisi data dummy:

User HRD:

- username: hrd
- password: 123
- role: HRD
- nama: Budi Santoso
- nik: 202301088
- divisi: HR & Admin
- jabatan: HRD Staff

User karyawan utama:

- username: karyawan
- password: 123
- role: KARYAWAN
- nama: Andi Saputra
- nik: 202301087
- divisi: Produksi - Line 4
- jabatan: Operator

Tambahkan beberapa karyawan dummy:

1. Andi Saputra
   - NIK 202301081
   - Divisi Produksi - Line 4
   - Jabatan Operator
   - Status absensi hari ini: HADIR
   - Check-in: 06:54

2. Budi Kusuma
   - NIK 202301082
   - Divisi Logistik
   - Jabatan Staff Gudang
   - Status absensi hari ini: TERLAMBAT
   - Check-in: 07:28
   - lateMinutes: 28

3. Citra Triana
   - NIK 202301083
   - Divisi HR & Admin
   - Jabatan Admin
   - Status absensi hari ini: IZIN

4. Dedi Riswan
   - NIK 202301084
   - Divisi Quality Control
   - Jabatan QC Staff
   - Status absensi hari ini: BELUM_ABSEN

5. Eka Mahendra
   - NIK 202301085
   - Divisi Produksi - Line 2
   - Jabatan Operator
   - Status absensi hari ini: HADIR
   - Check-in: 06:58

6. Fajar Nugroho
   - NIK 202301086
   - Divisi Produksi - Line 1
   - Jabatan Operator
   - Status absensi hari ini: ALFA

Seed juga harus membuat:

- Divisi: HR & Admin, Produksi - Line 1, Produksi - Line 2, Produksi - Line 4, Logistik, Quality Control
- Jabatan: HRD Staff, Admin, Operator, Staff Gudang, QC Staff
- Shift:
  - Shift Pagi: 07:00 - 15:00
  - Shift Siang: 15:00 - 23:00
  - Shift Malam: 23:00 - 07:00
  - Libur
- Jadwal dummy bulan berjalan untuk beberapa karyawan.
- Attendance dummy minimal 14 data untuk riwayat rekap karyawan.
- Leave request dummy minimal 14 data dengan status MENUNGGU, DISETUJUI, dan DITOLAK.
- Notifikasi dummy untuk HRD dan Karyawan.
- Pengumuman dummy.
- Lokasi kantor dummy.

Logic dashboard HRD:

- totalKaryawan = count employees dengan status AKTIF.
- hadirHariIni = count attendances hari ini status HADIR.
- terlambatHariIni = count attendances hari ini status TERLAMBAT.
- izinPending = count leave_requests status MENUNGGU.
- kehadiranRealTime = list attendance hari ini join employee, divisi, shift.

Logic status karyawan hari ini:

- Jika ada attendance hari ini, tampilkan attendance tersebut.
- Jika tidak ada attendance tetapi ada leave_request DISETUJUI pada tanggal hari ini, tampilkan IZIN.
- Jika tidak ada attendance dan ada schedule kerja hari ini, tampilkan BELUM_ABSEN.
- Jika tidak ada schedule, tampilkan null atau LIBUR.

Logic pengajuan izin:

- Karyawan wajib mengisi type, startDate, endDate, dan reason.
- Status awal selalu MENUNGGU.
- HRD bisa approve atau reject.
- Jika approve, status menjadi DISETUJUI dan reviewedById terisi.
- Jika reject, status menjadi DITOLAK dan rejectionReason wajib jika tersedia.

Response login:
{
"token": "...",
"refreshToken": "...",
"role": "KARYAWAN",
"user": {
"id": "...",
"name": "Andi Saputra",
"username": "karyawan",
"nik": "202301087",
"divisi": "Produksi - Line 4",
"jabatan": "Operator",
"photoUri": null
}
}

Response pagination:
{
"data": [],
"meta": {
"page": 1,
"limit": 10,
"total": 100,
"totalPages": 10
}
}

Best practice:

- Gunakan index untuk users.username.
- Gunakan index untuk employees.nik.
- Gunakan index untuk attendances.employeeId, attendances.date, attendances.status.
- Gunakan unique constraint attendance employeeId + date.
- Gunakan index untuk leave_requests.employeeId, leave_requests.status, startDate, endDate.
- Gunakan select Prisma agar response tidak mengambil field sensitif.
- Jangan return passwordHash.
- Batasi pagination maksimal 50 atau 100.
- Gunakan transaction untuk proses penting.
- Gunakan Zod untuk semua body dan query params.
- Gunakan middleware auth JWT.
- Gunakan middleware role HRD untuk endpoint HRD.
- Gunakan rate limit untuk login.
- Gunakan refresh token yang disimpan hashed.
- Simpan foto profil di storage/file server, database hanya menyimpan URL.
- Validasi upload foto maksimal 1 MB di backend dan frontend.
- Gunakan enum Prisma agar status konsisten.
- Pisahkan seed dummy dari logic aplikasi.
- Buat struktur folder yang rapi: routes, services, repositories, middleware, validators, utils.
- Buat error response konsisten.

Tolong buatkan backend Hono + Prisma + PostgreSQL berdasarkan kebutuhan di atas, termasuk:

- schema Prisma
- migration
- seed development
- route Hono
- middleware auth
- middleware role
- validasi Zod
- service layer
- contoh response
- contoh request body
- setup env
- script npm untuk dev, migrate, seed
