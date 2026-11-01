# Task Breakdown: File-Based Storage & Versioning System
**Status:** COMPLETED ✅  
**Prioritas:** P0 (Kritis)

---

## 📋 Checklist Eksekusi

### 1. Pembaruan Skema Database (Prisma)
- [x] **Task 1.1: Modifikasi Model `Project` di `prisma/schema.prisma`**
  - Tambahkan kolom `uuid String @unique @default(uuid())`.
  - Tambahkan kolom `themeType String @default("platformer")`.
  - Tambahkan kolom `currentFilePath String @db.VarChar(500)`.
  - Tambahkan kolom `currentVersion Int @default(1)`.
  - Hapus kolom lama `data Json` (data tersimpan di file fisik).
  - Tambahkan relasi `versions ProjectVersion[]`.
- [x] **Task 1.2: Buat Model Baru `ProjectVersion`**
  - Definisikan kolom: `id`, `projectId`, `versionNumber`, `name`, `filePath`, `fileSize`, `isLocked`, `createdAt`.
  - Tambahkan `@@unique([projectId, versionNumber])` dan indeks pada `[projectId, createdAt]`.
- [x] **Task 1.3: Generate & Push Migrasi Database**
  - Jalankan `npx prisma db push --force-reset` berhasil sinkron.
  - Jalankan `npx prisma generate` berhasil generate client.

---

### 2. Service File Storage (`src/lib/fileStorage.ts`)
- [x] **Task 2.1: Fondasi Direktori & Path Resolver**
  - Basis direktori: `storage/projects/{uuid}/`.
  - Helper `ensureProjectDirectories(projectUuid)`.
- [x] **Task 2.2: Implementasi Penulisan Atomik (Atomic Write)**
  - Tulis payload ke file temporary: `storage/projects/{uuid}/tmp/{temp-id}.json`.
  - Rename/replace secara atomik ke path target (`current.json`).
- [x] **Task 2.3: Pembacaan & Penghapusan File**
  - Helper `readProjectJsonFile(filePath)`.
  - Helper `deleteProjectStorageFolder(projectUuid)` (saat projek dihapus).
- [x] **Task 2.4: Logika Rotasi & Auto-Pruning (Maksimal 10 Versi)**
  - Fungsi `pruneUnlockedVersions(projectId, projectUuid, 10)`.
  - Menghapus versi tidak terkunci (`isLocked === false`) tertua yang melebihi kuota 10.
  - Versi yang berstatus `isLocked === true` tidak pernah terhapus.

---

### 3. Server Actions & Integrasi Data Layer (`src/lib/projectStorage.ts`)
- [x] **Task 3.1: Pembuatan Projek (`createNewProject`)**
  - Buat folder `storage/projects/{uuid}/`.
  - Tulis initial seed ke `current.json`.
  - Otomatis buat snapshot `Versi Awal (Dibuat)` di `ProjectVersion`.
- [x] **Task 3.2: Penyimpanan Projek (`saveProject`)**
  - Tulis ke `current.json` secara atomik.
- [x] **Task 3.3: Pembacaan Projek (`getProjectBySlug`, `getProjectForEdit`)**
  - Ambil metadata projek dari DB, baca payload dari `currentFilePath`.
- [x] **Task 3.4: Server Actions untuk Fitur Versioning**
  - `createNamedVersion(slug, versionName, isLocked)`: membuat snapshot baru dengan nama kustom.
  - `getProjectVersions(slug)`: mengambil daftar riwayat versi.
  - `toggleVersionLock(versionId)`: mengunci / membuka kunci versi.
  - `renameVersion(versionId, newName)`: mengubah nama versi kapan saja.
  - `restoreVersion(slug, versionId)`: memulihkan payload snapshot ke draft aktif `current.json`.

---

### 4. UI Komponen Version History di Editor
- [x] **Task 4.1: Modal "Riwayat Versi" (`src/components/versioning/VersionHistoryModal.tsx`)**
  - Daftar versi dengan nomor versi, nama custom, timestamp lokal, ukuran file (KB).
  - Tombol gembok (*Lock/Unlock*) untuk mengamankan versi penting.
  - Tombol edit nama versi inline.
  - Tombol *"Pulihkan Versi Ini"* dengan dialog konfirmasi.
- [x] **Task 4.2: Dialog "Simpan Versi Baru" (`src/components/versioning/SaveVersionModal.tsx`)**
  - Form input nama versi custom.
  - Checkbox kunci versi (*Lock*).
- [x] **Task 4.3: Integrasi Toolbar Editor**
  - Terintegrasi di [`src/themes/platformer/PlatformerEditor.tsx`](file:///d:/Project/gemundang/src/themes/platformer/PlatformerEditor.tsx).
  - Terintegrasi di [`src/themes/vertical-scroll/editor/VerticalScrollEditor.tsx`](file:///d:/Project/gemundang/src/themes/vertical-scroll/editor/VerticalScrollEditor.tsx).

---

## 🧪 Kriteria Keberhasilan (Acceptance Criteria)
1. ✅ Seluruh payload desain disimpan sebagai file `.json` fisik di `storage/projects/{uuid}/current.json`.
2. ✅ Database MySQL hanya memuat metadata, pointer `currentFilePath`, serta tabel `ProjectVersion`.
3. ✅ Pengguna dapat memberi nama kustom pada versi baru (misal: "Revisi Foto Cover").
4. ✅ Versi yang tidak dikunci otomatis di-prune jika melebihi kuota 10 versi terbaru.
5. ✅ Versi yang dikunci (`isLocked === true`) tetap aman dan kebal dari rotasi otomatis.
6. ✅ Pengguna dapat me-restore versi lama dan state editor langsung ter-refresh.
7. ✅ `npm run build` lulus tanpa error (Exit code 0).
