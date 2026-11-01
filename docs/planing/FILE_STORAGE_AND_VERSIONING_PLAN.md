# Arsitektur & Perencanaan: File-Based Storage & Versioning System
**Status:** DRAFT / APPROVED FOR IMPLEMENTATION  
**Tujuan:** Memindahkan penyimpanan data payload desain projek dari kolom JSON database ke file fisik `.json` terstruktur dengan referensi metadata di database MySQL, dilengkapi fitur **penamaan versi**, **pembatasan maksimal 10 versi tidak terkunci (auto-pruning)**, **fitur penguncian (lock/pin) versi penting**, dan **pemulihan versi (restore)**.

---

## 1. Latar Belakang & Motivasi

Sebelumnya, seluruh struktur data desain undangan (posisi layer, sprite, teks sambutan, audio, dialog, keyframe animasi) disimpan di kolom `data` (`Json`) tabel `Project` MySQL.
Meskipun praktis di awal, pendekatan ini memiliki keterbatasan:
1. **Beban I/O Database:** Setiap query daftar projek menarik blob JSON berukuran ratusan KB hingga MB.
2. **Ketiadaan Riwayat Edit:** Pengguna tidak bisa membatalkan kesalahan edit fatal atau melihat desain versi kemarin.
3. **Penyimpanan Kurang Fleksibel:** Tidak memungkinkan caching statis berbasis file (misal di-cache oleh Nginx / CDN) untuk tamu undangan.

Dengan beralih ke **File-Based Storage + Database Pointer**:
- Database hanya menyimpan metadata relasional, autentikasi, indexing slug, dan pointer path file.
- Payload desain disimpan sebagai file `.json` bersih di disk server.
- Tersedia riwayat versi dengan label nama kustom, penguncian versi, dan rollback instan.

---

## 2. Struktur Direktori File System

Penyimpanan file ditempatkan di root direktori projek: `storage/projects/{uuid}/`.  
Menggunakan format UUID (bukan slug) agar jika pengguna mengganti slug URL undangan, nama folder dan referensi file fisik tidak perlu di-rename dan tidak berisiko broken links.

```text
storage/
└── projects/
    └── {project-uuid}/
        ├── current.json           # File aktif saat ini (dibaca oleh /editor, /template, dan /view)
        ├── tmp/                   # Folder temporary untuk penulisan atomik
        │   └── temp_{timestamp}.json
        └── versions/              # Arsip snapshot versi
            ├── v1_1730432000000.json
            ├── v2_1730435600000.json
            └── v3_1730439200000.json
```

---

## 3. Skema Data Relasional (Prisma MySQL)

### Model `Project` (Pembaruan)
- Ditambahkan kolom `uuid` (UUID v4 unik).
- Ditambahkan kolom `themeType` (String: `'platformer'` | `'vertical_scroll'`).
- Kolom `data` dihapus atau diganti dengan pointer referensi:
  - `currentFilePath`: String path relatif file aktif (misal: `storage/projects/{uuid}/current.json`).
  - `currentVersion`: Integer (nomor versi aktif, default 1).
- Relasi `versions`: `ProjectVersion[]`.

### Model `ProjectVersion` (Model Baru)
Menyimpan riwayat snapshot versi untuk tiap projek:
- `id`: Int (Primary Key auto-increment).
- `projectId`: Int (Foreign Key ke `Project.id`).
- `versionNumber`: Int (1, 2, 3, dst).
- `name`: String (Nama/label versi yang bisa diisi pengguna, misal: "Sebelum ganti foto cover", "Revisi Akad Dimas").
- `filePath`: String (Path relatif file snapshot versi).
- `fileSize`: Int (Ukuran file dalam bytes, untuk transparansi penggunaan ruang).
- `isLocked`: Boolean (Default: `false`. Jika `true`, kebal dari pembersihan rotasi 10 versi).
- `createdAt`: DateTime (Timestamp pembuatan versi).

---

## 4. Mekanisme & Logika Operasi

### 4.1. Penulisan File Atomik (Atomic Write)
Untuk mencegah file korup jika proses server crash atau koneksi I/O terputus saat simpan:
1. Data JSON ditulis ke file sementara di dalam folder `tmp/temp_{timestamp}.json`.
2. Setelah penulisan tuntas dan valid, file di-rename / di-replace secara atomik ke `current.json`.
3. File lama digantikan tanpa ada jeda file kosong (*zero-byte window*).

### 4.2. Siklus Pembuatan Versi & Penamaan (Save as Version)
Pengguna memiliki 2 opsi di Editor:
1. **Simpan Cepat (Quick Save / Auto Save):** Memperbarui `current.json` langsung untuk sesi edit berjalan.
2. **Simpan sebagai Versi Baru (Create Version Snapshot):**
   - Pengguna menekan tombol "Simpan Versi".
   - Muncul dialog modal untuk memberi nama/keterangan versi (misal: "Final Revisi Ortu").
   - Server membuat salinan `current.json` ke folder `versions/v{n}_{timestamp}.json`.
   - Server mencatat record baru ke tabel `ProjectVersion`.
   - Server menjalankan fungsi rotasi auto-prune.

### 4.3. Algoritma Rotasi Maksimal 10 Versi (Auto-Pruning dengan Lock Protection)
- Server melakukan query terhadap seluruh versi projek yang **TIDAK TERKUNCI** (`isLocked === false`), diurutkan dari nomor versi terbaru ke terlama (`DESC`).
- Jika jumlah versi tidak terkunci melebihi **10**:
  - Ambil kelebihan versi tertua: `unlockedVersions.slice(10)`.
  - Hapus file fisik `.json` dari folder `versions/`.
  - Hapus data record-nya dari tabel `ProjectVersion`.
- **Proteksi Penguncian:** Versi yang berstatus `isLocked === true` tidak akan pernah masuk ke dalam daftar yang dihapus, sehingga pengguna bisa mengamankan checkpoint-checkpoint penting selamanya.

### 4.4. Pemulihan Versi (Restore Version)
- Pengguna membuka panel **"Riwayat Versi"** di editor.
- Pengguna memilih salah satu versi lalu menekan tombol **"Pulihkan / Restore"**.
- Server membaca file snapshot versi tersebut, lalu menuliskannya kembali sebagai `current.json` melalui penulisan atomik.
- Editor langsung me-reload state dengan payload yang baru dipulihkan.

### 4.5. Penguncian / Membuka Kunci Versi (Toggle Lock/Pin)
- Pengguna dapat mengklik ikon gembok pada salah satu versi di panel riwayat.
- Server meng-update `isLocked: !currentValue` di tabel `ProjectVersion`.
- UI langsung menampilkan status badge gembok terkunci/terbuka.

---

## 5. Komponen UI Pendukung di Editor

Di pojok atas toolbar Editor (baik Platformer maupun Vertical Scroll):
1. **Dropdown / Tombol "Riwayat Versi":**
   - Menampilkan modal daftar versi lengkap dengan nomor versi, nama/label custom, tanggal dibuat, ukuran file, dan badge gembok.
   - Tombol **Gembok**: Klik untuk mengunci/membuka kunci versi.
   - Tombol **Ubah Nama**: Klik untuk mengganti nama versi kapan saja.
   - Tombol **Restore**: Mengembalikan versi ini menjadi draft aktif.
2. **Dialog "Simpan Versi":**
   - Input nama/label versi (dengan saran placeholder: *"Versi 2 - [Waktu]"*).
   - Checkbox pilihan: *"Kunci versi ini agar tidak terhapus otomatis"*.
