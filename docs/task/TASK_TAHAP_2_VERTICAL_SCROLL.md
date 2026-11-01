# Task Breakdown: Tahap 2 — Implementasi Tema Vertical Scroll Reveal
**Status:** READY TO EXECUTE (Setelah Tahap 1)  
**Prioritas:** P0 (Kritis)

---

## 📋 Checklist Eksekusi Tahap 2

### 1. Skema Data & Seed Demo
- [ ] **Task 1.1: Pembuatan `src/types/verticalScroll.ts`**
  - Implementasikan interface:
    - `VerticalScrollProject extends BaseProject` (`theme_type: 'vertical_scroll'`).
    - `PageSection`: `id`, `title`, `order`, `minHeight`, `background`, `elements`.
    - `PageLayerElement`: `id`, `name`, `type`, `x`, `y`, `width`, `height`, `zIndex`, `content`, `mediaUrl`, `spriteAsset`, `styleOptions`, `animation`, `hasInteraction`, `interaction`, `editable_appearance`, `editable_content`.
    - `LayerAnimationConfig`: `entry`, `idle`, `exit` (dengan `type`, `duration`, `delay`, `easing`, `trigger`).
- [ ] **Task 1.2: Pembuatan Demo Project Seed (`src/themes/vertical-scroll/defaultProject.ts`)**
  - Buat data demo lengkap dengan 5 halaman:
    - Page 1: Hero / Cover (Judul undangan, foto mengambang, animasi slide-down).
    - Page 2: Profil Mempelai (Foto pasangan, bio, teks sambutan).
    - Page 3: Waktu & Lokasi Acara (Jadwal akad & resepsi, link Google Maps).
    - Page 4: Galeri Kenangan (Galeri foto beranimasi).
    - Page 5: Ucapan & RSVP (Form konfirmasi kehadiran).

---

### 2. Runtime Engine Vertical Scroll (`src/themes/vertical-scroll/runtime/`)
- [ ] **Task 2.1: Generator Dynamic Keyframe & Animasi CSS (`animations.ts`)**
  - Buat helper generator CSS style / keyframes:
    - **Entry**: `fade-in`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `zoom-in`, `bounce-in`.
    - **Idle**: `float` (translasi sinus Y mengambang lembut), `pulse` (skala denyut nafas), `shimmer` (pantulan cahaya melintang), `breathing`, `sway` (rotasi angin).
    - **Exit**: `fade-out`, `slide-down`, `zoom-out`, `blur-out`.
- [ ] **Task 2.2: Scroll Reveal Hook (`useScrollReveal.ts`)**
  - Gunakan `IntersectionObserver` untuk mendeteksi kapan seksi halaman/elemen masuk dan keluar viewport layar.
  - Atur pergantian state elemen: `hidden` ➔ `entry` ➔ `idle_loop` ➔ `exit`.
- [ ] **Task 2.3: Timer & Click Trigger Handler**
  - Jika trigger diset ke `timer`: hitung jeda delay sebelum transisi dimulai secara otomatis.
  - Jika trigger diset ke `click_tap`: picu animasi saat disentuh / diklik tamu.
- [ ] **Task 2.4: Layer Element Renderer**
  - Render elemen teks, gambar, dan tombol sesuai koordinat posisi X/Y dan urutan `zIndex`.
  - Dukungan rendering gambar statis maupun multi-frame sequence dari Asset Library.
- [ ] **Task 2.5: Integrasi Universal Interaction Modals**
  - Hubungkan elemen dengan dialog universal:
    - Lightbox Foto Fullscreen.
    - Pemutar Video (YouTube Embed / MP4).
    - Link Lokasi Google Maps.
    - Form Konfirmasi Kehadiran (RSVP) terintegrasi database dengan selebrasi konfeti.

---

### 3. Visual Level Editor Vertical Scroll (`src/themes/vertical-scroll/editor/`)
- [ ] **Task 3.1: Page Section Manager**
  - Tombol `+ Tambah Halaman Baru` di bagian bawah canvas.
  - Panel daftar halaman:
    - Ubah urutan halaman (Move Up / Down).
    - Duplikat Halaman, Ganti Nama Halaman, Hapus Halaman.
    - Pengaturan latar belakang per halaman: Warna solid, CSS gradient, URL gambar latar, dan rasio parallax scroll.
- [ ] **Task 3.2: Visual Canvas & Transform Handles**
  - Canvas vertikal yang dapat di-scroll saat proses desain.
  - Drag transform handles untuk mengatur posisi X, Y, Width, dan Height elemen terpilih.
  - Tombol tambah elemen baru ke halaman aktif: `+ Gambar/Sprite`, `+ Teks`, `+ Tombol/Widget`.
- [ ] **Task 3.3: Layer Ordering Panel (Z-Index Manager)**
  - Daftar tumpukan layer elemen pada halaman aktif:
    - Drag-and-drop urutan layer untuk mengubah nilai `zIndex`.
    - Tombol cepat: *Bring to Front* (Paling Depan) & *Send to Back* (Paling Belakang).
    - Toggle sembunyikan/tampilkan (Hide/Show) dan kunci posisi (Lock).
- [ ] **Task 3.4: 3-State Animation & Timing Inspector Panel**
  - **Tab Animasi Masuk (Entry)**:
    - Dropdown tipe animasi masuk.
    - Slider durasi (0.1s - 5s).
    - Slider delay (0s - 3s).
    - Pilihan easing kurva (`linear`, `ease-out`, `spring`, `bounce`).
    - Pilihan pemicu: `scroll_reveal` / `timer` / `click_tap`.
  - **Tab Animasi Diam (Idle)**:
    - Dropdown tipe animasi diam (`none`, `float`, `pulse`, `shimmer`, `breathing`, `sway`).
    - Slider durasi kecepatan loop per siklus (detik).
  - **Tab Animasi Keluar (Exit)**:
    - Dropdown tipe animasi transisi keluar saat halaman di-scroll melewatinya.
- [ ] **Task 3.5: Granular Editable Flags Inspector**
  - Checkbox `editable_appearance`: mengizinkan pemakai template mengganti foto/gambar di form template + input label form.
  - Checkbox `editable_content`: mengizinkan pemakai template mengganti teks judul/isi di form template + input label form.
- [ ] **Task 3.6: Instant Test Play Mode (Test Scroll)**
  - Tombol toggle `Play / Test Mode` di toolbar atas editor.
  - Mengubah canvas editor seketika menjadi preview tamu interaktif untuk menguji kelancaran scroll dan animasi secara langsung.

---

### 4. Form Template Dinamis (`src/themes/vertical-scroll/template/`)
- [ ] **Task 4.1: Pemindai Elemen Editable Otomatis**
  - Sistem memindai seluruh `pages` dan hanya merender input field untuk elemen yang `editable_appearance === true` atau `editable_content === true`.
  - Dikelompokkan rapi per Seksi Halaman.
- [ ] **Task 4.2: Formulir Kustomisasi Mudah**
  - Input teks judul dan keterangan rundown/lokasi.
  - Pemilih foto dari Asset Library / upload gambar baru.
- [ ] **Task 4.3: Live Reactive Side-by-Side Preview**
  - Form kustomisasi di sisi kiri, live preview scroll vertikal di sisi kanan yang langsung ter-update seketika (hot-reload) saat pengguna mengetik atau mengganti foto.

---

### 5. Pendaftaran ke Theme Registry Hub
- [ ] **Task 5.1: Daftarkan ke `src/themes/registry.ts`**
  - Buat `VerticalScrollThemeDefinition` di `src/themes/vertical-scroll/index.ts`.
  - Daftarkan ke `THEME_REGISTRY.vertical_scroll`.
  - Verifikasi tema muncul di selector dashboard dan dapat dibuat project barunya.

---

## 🧪 Kriteria Keberhasilan (Acceptance Criteria)
1. Pengguna dapat membuat project baru bertema **Vertical Scroll Reveal** melalui dashboard.
2. Desainer dapat menambah beberapa halaman ke bawah, mengatur latar belakang, dan mengubah urutan halaman.
3. Desainer dapat mengatur tumpukan Z-index layer gambar/teks (*Bring to Front*, *Send to Back*).
4. Animasi 3-state (Entry, Idle, Exit) berjalan mulus di browser dengan timing dan trigger yang disesuaikan.
5. Form template di `/template/[slug]` hanya memunculkan elemen yang berstatus editable dan live preview di sampingnya ter-update secara real-time.
6. Halaman tamu di `/view/[slug]` responsif di layar smartphone maupun desktop.
7. `npm run build` lulus tanpa error.
