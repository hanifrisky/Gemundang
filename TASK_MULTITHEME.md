# Task Breakdown: GemUndang Multi-Theme Architecture & Vertical Scroll Engine

Dokumen ini berisi daftar tugas teknis terperinci, terstruktur, dan actionable untuk pengerjaan arsitektur multi-theme dengan prioritas utama penambahan tema **Vertical Scroll Reveal (Website Biasa Beranimasi)** sebelum tema Top-Down RPG.

---

## 📋 Status Ringkasan Sprint

| Kode Task | Nama Task / Modul | Estimasi / Status | Prioritas |
| :--- | :--- | :--- | :--- |
| **TASK-01** | Refactoring Fondasi & Setup Theme Registry | `READY` | P0 (Kritis) |
| **TASK-02** | Core Engine: Vertical Scroll Reveal Runtime | `READY` | P0 (Kritis) |
| **TASK-03** | Visual Editor: Vertical Scroll & Page Manager | `READY` | P0 (Kritis) |
| **TASK-04** | Form Template & Live Preview: Vertical Scroll | `READY` | P0 (Kritis) |
| **TASK-05** | Top-Down RPG Quest: Engine & Tilemap Editor | `BACKLOG` | P1 (Tinggi) |
| **TASK-06** | Visual Novel / Storybook: Flowchart Dialog | `BACKLOG` | P2 (Menengah) |
| **TASK-07** | Point & Click Room Diorama & Endless Runner | `BACKLOG` | P2 (Menengah) |

---

## 🚀 Rincian Tugas (Actionable Tasks)

### TASK-01: Refactoring Fondasi & Setup Theme Registry
**Tujuan**: Mengubah skema project tunggal (platformer) menjadi polymorphic registry sehingga sistem dapat mendukung berbagai tema game/web secara dinamis.

- [ ] **1.1. Pemisahan TypeScript Schema (`src/types/`)**:
  - Buat `src/types/base.ts`: `BaseProject`, `RSVPRecord`, `GameThemeType`.
  - Pertahankan `src/types/platformer.ts` dengan mewarisi `BaseProject`.
  - Buat `src/types/verticalScroll.ts`: `VerticalScrollProject`, `PageSection`, `PageLayerElement`, `LayerAnimationConfig`.
  - Buat `src/types/index.ts` untuk mengekspor union `AnyGemUndangProject`.
- [ ] **1.2. Pembuatan Theme Registry Hub (`src/themes/`)**:
  - Buat `src/themes/types.ts`: Interface `ThemeDefinition` yang mendefinisikan:
    - `id`: identifier tema
    - `name`: nama tampilan
    - `description`: deskripsi tema
    - `icon`: ikon Lucide
    - `badge`: label badge (misal: "Web Modern", "Game 2D")
    - `defaultProject`: generator data default
    - `EditorComponent`: komponen editor khusus
    - `TemplateComponent`: komponen form khusus
    - `RuntimeComponent`: komponen player/viewer khusus
  - Buat `src/themes/registry.ts`: Dictionary pemetaan `THEME_REGISTRY: Record<GameThemeType, ThemeDefinition>`.
- [ ] **1.3. Pendaftaran Tema Platformer ke Registry**:
  - Buat folder `src/themes/platformer/` dan daftarkan Editor, Template, dan Engine yang telah dibuat sebelumnya ke dalam registry.
- [ ] **1.4. Pembaruan Halaman Dashboard (`src/app/page.tsx`)**:
  - Tambahkan kartu pemilih tema game saat membuat projek baru (Pilihan: *2D Platformer* atau *Vertical Scroll Reveal*).
  - Tampilkan badge jenis tema pada daftar projek yang sudah dibuat.

---

### TASK-02: Core Engine: Vertical Scroll Reveal Runtime
**Tujuan**: Membangun engine scrollytelling yang merender halaman bertingkat ke bawah dengan sistem layer gambar dan animasi 3-tahap (Entry, Idle, Exit).

- [ ] **2.1. Dynamic CSS / Animation Keyframe Generator**:
  - Implementasikan utility generator animasi di `src/themes/vertical-scroll/animations.ts`:
    - **Entry**: `fade-in`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `zoom-in`, `bounce-in`.
    - **Idle**: `float` (mengambang lembut sinusoideal), `pulse` (skala denyut bernafas), `shimmer` (efek kilau emas), `breathing`, `sway` (bergoyang tertiup angin).
    - **Exit**: `fade-out`, `slide-down`, `zoom-out`, `blur-out`.
- [ ] **2.2. Scroll Trigger & Intersection Observer Hook**:
  - Buat custom hook `useScrollRevealTrigger.ts`:
    - Mendeteksi kapan sebuah page atau elemen masuk ke dalam viewport layar (dengan configurable threshold 0.1 - 0.9).
    - Mengatur pergantian state animasi dari `idle_before_entry` ➔ `entry` ➔ `idle_loop` ➔ `exit`.
- [ ] **2.3. Timer & Click Trigger Handler**:
  - Jika elemen diset dengan `trigger: 'timer'`, jalankan animasi setelah jeda `delay` detik selesai dihitung.
  - Jika elemen diset dengan `trigger: 'click_tap'`, jalankan animasi atau buka aksi saat tamu menyentuh/mengklik elemen.
- [ ] **2.4. Layer Z-Index & Position Renderer**:
  - Render elemen-elemen di dalam section page dengan koordinat X/Y (persentase responsif atau pixel) dan `zIndex` yang presisi.
  - Dukungan gambar tunggal maupun Sprite Sequence (animasi frame bergulir dari Asset Library).
- [ ] **2.5. Universal Interaction Trigger Integration**:
  - Hubungkan elemen dengan dialog universal:
    - Buka Video YouTube / MP4 Lightbox.
    - Buka Foto Galeri Fullscreen.
    - Buka Detail Lokasi Google Maps.
    - Buka Formulir RSVP dengan efek konfeti selebrasi.

---

### TASK-03: Visual Editor Khusus Vertical Scroll Reveal
**Tujuan**: Membangun antarmuka level editor di `/editor/[slug]` khusus untuk tema website scroll vertikal.

- [ ] **3.1. Page Section Manager (Halaman Bertingkat ke Bawah)**:
  - Tombol `+ Tambah Halaman Baru` di bagian bawah canvas.
  - Daftar daftar halaman (Page 1: Cover, Page 2: Mempelai, Page 3: Acara, Page 4: Galeri, Page 5: RSVP).
  - Aksi per halaman: Ubah urutan (Move Up / Down), Duplikat Halaman, Ganti Nama, Hapus Halaman.
  - Pengaturan background per halaman: Warna solid, gradient latar, gambar background dengan opsi parallax scroll ratio.
- [ ] **3.2. Visual Page Canvas & Object Placement**:
  - Tampilan canvas vertikal yang dapat di-scroll saat mendesain.
  - Tombol tambah elemen baru ke dalam halaman yang aktif: `+ Gambar/Sprite`, `+ Teks`, `+ Tombol/Widget`.
  - Klik elemen untuk memunculkan bounding box transform (geser posisi X/Y, atur lebar/tinggi).
- [ ] **3.3. Layer Ordering Panel (Z-Index Manager)**:
  - Daftar tumpukan layer di halaman aktif:
    - Drag-and-drop urutan layer untuk menaikkan/menurunkan tumpukan.
    - Tombol cepat: *Bring to Front* (Paling Depan), *Send to Back* (Paling Belakang).
    - Opsi sembunyikan (Hide/Show) dan kunci posisi (Lock).
- [ ] **3.4. 3-State Animation Inspector Panel**:
  - **Seksi Animasi Masuk (Entry)**:
    - Dropdown tipe animasi masuk.
    - Slider durasi (0.1s - 5s).
    - Slider delay (0s - 3s).
    - Pilihan easing (`linear`, `ease-out`, `bounce`, `spring`).
    - Pilihan pemicu: `scroll_reveal` (saat di-scroll), `timer` (jeda waktu otomatis), atau `click_tap`.
  - **Seksi Animasi Diam (Idle)**:
    - Dropdown tipe animasi idle (`none`, `float`, `pulse`, `shimmer`, `breathing`, `sway`).
    - Slider kecepatan loop per putaran (detik).
  - **Seksi Animasi Keluar (Exit)**:
    - Dropdown tipe animasi keluar saat halaman di-scroll melewatinya.
- [ ] **3.5. Granular Editable Flags Configurator**:
  - Checkbox `editable_appearance`: Mengizinkan pemakai template mengganti gambar/foto elemen.
  - Checkbox `editable_content`: Mengizinkan pemakai template mengganti teks isi/judul elemen.
  - Input label kustom untuk form template.
- [ ] **3.6. Instant Test Mode (Play / Scroll Test)**:
  - Tombol Play/Test di header editor: Canvas langsung berubah menjadi tampilan interaktif tamu dengan scroll halus untuk menguji animasi masuk, idle, dan keluarnya secara instan!

---

### TASK-04: Form Template & Live Preview: Vertical Scroll
**Tujuan**: Membangun antarmuka kustomisasi mudah di `/template/[slug]` untuk pengguna template website biasa.

- [ ] **4.1. Pemindai Elemen Editable Otomatis**:
  - Sistem memindai seluruh page section dan menyaring elemen yang memiliki `editable_appearance: true` atau `editable_content: true`.
  - Mengelompokkan formulir berdasarkan nama Halaman / Section (misal: Section Cover, Section Profil, Section Acara).
- [ ] **4.2. Formulir Dinamis**:
  - Ganti teks judul & keterangan.
  - Ganti foto atau pilih dari Asset Library.
  - Ganti tautan video YouTube atau lokasi acara.
- [ ] **4.3. Live Reactive Side-by-Side Preview**:
  - Di sisi kanan form, tampilkan live viewport scrollytelling yang langsung bereaksi terhadap setiap ketikan teks atau penggantian foto tanpa refresh halaman.

---

### TASK-05: Top-Down RPG Quest (Tahap Selanjutnya)
- [ ] **5.1. Engine Tilemap 2D**: Canvas grid 32x32 pixel untuk lantai dan collision solid.
- [ ] **5.2. Editor Tilemap**: Kuas cat (brush), penghapus (eraser), seleksi tile palet.
- [ ] **5.3. Karakter 4 Arah**: Gerak atas/bawah/kiri/kanan dengan tombol keyboard dan virtual joystick.
- [ ] **5.4. NPC Interaktif**: NPC dengan balon bicara saat karakter mendekat.

---

### TASK-06: Visual Novel / Storybook
- [ ] **6.1. Node Flowchart Editor**: Pembuat alur percakapan bab cerita.
- [ ] **6.2. Dialogue Staging**: Penata ekspresi karakter kiri/kanan dan teks mesin tik (*typewriter*).

---

### TASK-07: Point & Click Room Diorama & Endless Runner
- [ ] **7.1. Hotspot Editor**: Penanda area klik pada ilustrasi denah/ruangan resepsi.
- [ ] **7.2. Endless Runner**: Mini arcade lari mengumpulkan bunga/cincin.

---

## 🧪 Kriteria Pengujian & Verifikasi (Verification Checklist)

1. **Pengujian Layering & Z-Index**:
   - Menempatkan 3 gambar bertumpuk di Page 1 (misal: background ornamen di belakang, foto pasangan di tengah, teks di depan).
   - Verifikasi urutan z-index tampil tepat sesuai daftar layer.
2. **Pengujian Animasi 3-Tahap**:
   - Set elemen dengan `entry: slide-up` (delay 0.3s), `idle: float` (loop 3s), dan `exit: fade-out`.
   - Scroll halaman masuk ke layar: Elemen harus slide-up, lalu otomatis mengambang halus, dan fade-out saat di-scroll menjauh.
3. **Pengujian Trigger**:
   - Uji trigger `scroll_reveal` (aktif saat masuk layar).
   - Uji trigger `timer` (aktif otomatis setelah delay).
   - Uji trigger `click_tap` (aktif saat disentuh).
4. **Pengujian Multi-Page**:
   - Tambah 4 halaman ke bawah.
   - Uji kelancaran scroll di layar HP dan desktop.
5. **Pengujian Build & Type-Check**:
   - Jalankan `npm run build` dan pastikan bebas dari error TypeScript maupun prerender issue.
