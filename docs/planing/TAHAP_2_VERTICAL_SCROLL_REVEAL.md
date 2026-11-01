# Perencanaan Teknis: Tahap 2 — Implementasi Tema Vertical Scroll Reveal
**Platform:** GemUndang  
**Fokus:** Engine Scrollytelling, Page Section Manager, Layer Z-Index, 3-State Animation, dan Dedicated Editor

---

## 1. Tujuan & Sasaran Tahap 2
Menghadirkan tema undangan baru berupa **Vertical Scroll Reveal (Website Biasa Beranimasi)** untuk pengguna yang menginginkan format website undangan modern yang di-scroll ke bawah layaknya website undangan elegan, namun dilengkapi sistem animasi visual berlapis (multi-layering) dan micro-interactions yang sangat dinamis.

### Fitur Kunci:
1. **Halaman Bertingkat ke Bawah (Page Sections)**:
   - Pengguna dapat menambahkan halaman/seksi baru ke bawah (`+ Tambah Halaman`).
   - Mengubah urutan halaman (Drag to reorder / Move Up & Down).
   - Mengatur background per seksi: Warna solid, gradient, gambar background, atau background dengan efek parallax scroll.
2. **Layer Order & Visual Positioning (Z-Index Manager)**:
   - Menempatkan elemen gambar, sprite dari Asset Library, teks judul/isi, tombol, ornamen bunga, dan widget interaktif.
   - Mengatur tumpukan layer visual (*Bring to Front*, *Send to Back*, drag reorder tumpukan layer).
3. **3-State Animation System**:
   - **Animasi Masuk (Entry)**: Efek kemunculan elemen saat halaman di-scroll atau dibuka.
   - **Animasi Diam (Idle)**: Efek gerakan lembut terus menerus saat elemen berada di layar (mengambang, berdenyut, berkilau, bergoyang angin).
   - **Animasi Keluar (Exit)**: Efek transisi keluar saat halaman di-scroll melewatinya.
4. **Timing & Trigger Control**:
   - Pilihan pemicu animasi: `scroll_reveal` (saat masuk viewport), `timer` (jeda otomatis), atau `click_tap` (saat disentuh tamu).
   - Kontrol durasi, delay, easing kurva animasi, dan pengulangan (loop).
5. **Dedicated Editor, Template Customizer, & Guest Runtime**:
   - Editor visual khusus web bertingkat dengan Instant Test Play (coba scroll langsung).
   - Form kustomisasi template dinamis berbasis flag `editable_appearance` dan `editable_content` + live side-by-side preview.
   - Runtime ringan, responsif mobile dan desktop, terintegrasi dengan universal modals (video, foto, maps, RSVP + konfeti).

---

## 2. Desain Struktur Data (`src/types/verticalScroll.ts`)

```typescript
import { BaseProject, SpriteAsset } from './base';

export type TriggerType = 'scroll_reveal' | 'timer' | 'click_tap';

export type EntryAnimationType = 
  | 'none'
  | 'fade-in'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom-in'
  | 'bounce-in'
  | 'flip-in';

export type IdleAnimationType = 
  | 'none'
  | 'float'        // Mengambang naik-turun halus (sinusoidal Y)
  | 'pulse'        // Denyut skala nafas (1.0 -> 1.05 -> 1.0)
  | 'shimmer'      // Efek kilau cahaya melintang
  | 'breathing'    // Opasitas lembut naik-turun
  | 'sway';        // Goyangan rotasi tertiup angin (-3deg hingga +3deg)

export type ExitAnimationType = 
  | 'none'
  | 'fade-out'
  | 'slide-down'
  | 'slide-up'
  | 'zoom-out'
  | 'blur-out';

export interface LayerAnimationConfig {
  entry: {
    type: EntryAnimationType;
    duration: number; // detik (default: 0.8)
    delay: number;    // detik jeda (default: 0.2)
    easing: 'linear' | 'ease-out' | 'ease-in-out' | 'spring' | 'bounce';
    trigger: TriggerType; // 'scroll_reveal' | 'timer' | 'click_tap'
  };
  idle: {
    type: IdleAnimationType;
    duration: number; // kecepatan loop per siklus dalam detik (default: 3)
  };
  exit?: {
    type: ExitAnimationType;
    duration: number;
    delay: number;
    trigger: TriggerType;
  };
}

export interface PageLayerElement {
  id: string;
  name: string;
  type: 'image' | 'text' | 'button' | 'interactive_widget';
  x: number;          // Posisi persentase (0-100%) atau pixel
  y: number;          // Posisi persentase atau pixel
  width: number;
  height: number;
  zIndex: number;     // Urutan tumpukan layer visual
  content?: string;   // Teks jika type === 'text'
  mediaUrl?: string;  // URL gambar jika type === 'image'
  spriteAsset?: SpriteAsset; // Dari Asset Library (single image atau sequence)
  styleOptions?: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    textAlign?: 'left' | 'center' | 'right';
    borderRadius?: number;
    shadow?: string;
    opacity?: number;
  };
  animation: LayerAnimationConfig;

  // Interaksi universal saat diklik / disentuh
  hasInteraction: boolean;
  interaction?: {
    type: 'info' | 'image' | 'video' | 'rsvp' | 'scroll_to_page';
    targetPageId?: string;
    title?: string;
    content?: string;
    mediaUrl?: string;
    actionButtonText?: string;
    actionUrl?: string;
  };

  // Granular Editable Flags untuk Mode Template
  editable_appearance: boolean; // Boleh ganti foto/gambar di form template
  appearanceLabel?: string;     // Contoh: "Foto Mempelai di Cover"
  editable_content: boolean;    // Boleh ganti teks judul/isi di form template
  contentLabel?: string;        // Contoh: "Tanggal & Lokasi Acara"
}

export interface PageSection {
  id: string;
  title: string;
  order: number;
  minHeight: string; // '100vh', '800px', 'auto'
  background: {
    type: 'color' | 'gradient' | 'image';
    value: string; // Hex color, CSS gradient, atau Image URL
    parallaxSpeed?: number; // 0 = statis, 0.4 = parallax scroll
    overlayOpacity?: number;
  };
  elements: PageLayerElement[];
}

export interface VerticalScrollProject extends BaseProject {
  theme_type: 'vertical_scroll';
  pages: PageSection[];
  globalTheme: {
    fontFamily: string;
    primaryColor: string;
    accentColor: string;
    showScrollIndicator: boolean;
    smoothScroll: boolean;
  };
}
```

---

## 3. Komponen Utama Tema Vertical Scroll

### 3.1 Runtime Engine (`src/themes/vertical-scroll/runtime/`)
1. **`animations.ts`**:
   - Menghasilkan inline styles dan dynamic CSS keyframes untuk:
     - Entry: transform translate/scale/opacity dengan durasi & delay.
     - Idle: keyframe animation loop (`@keyframes floatKeyframe`, `pulseKeyframe`, dll).
     - Exit: transisi keluar saat out of viewport.
2. **`VerticalScrollEngine.tsx`**:
   - Memanfaatkan `IntersectionObserver` untuk mendeteksi saat page masuk viewport.
   - Mendukung continuous smooth scroll dan indikator scroll progress.
   - Merender setiap elemen layer dengan koordinat presisi dan `zIndex`.
   - Mengintegrasikan modal interaksi universal (Lightbox Foto, Pemutar Video YouTube/MP4, Link Maps, Form RSVP dengan konfeti selebrasi).

### 3.2 Visual Level Editor (`src/themes/vertical-scroll/editor/`)
1. **Page Section Manager**:
   - Panel di sisi kiri / floating toolbar:
     - Daftar halaman (Cover, Profil Pasangan, Rundown Acara, Galeri Kenangan, Ucapan & RSVP).
     - Tombol `+ Tambah Halaman Baru`.
     - Tombol Reorder (Naik / Turun urutan halaman).
     - Pengaturan latar belakang per halaman (Warna, Gradien, Foto Background, Efek Parallax).
2. **Canvas Transform & Drag Manager**:
   - Canvas vertikal yang dapat di-scroll saat mendesain.
   - Bounding box transform handle untuk mengatur posisi X, Y, Width, dan Height elemen terpilih.
3. **Layer Ordering (Z-Index Manager)**:
   - Panel daftar tumpukan layer pada halaman aktif.
   - Drag reorder urutan layer.
   - Tombol cepat: *Bring to Front* (Paling Depan) & *Send to Back* (Paling Belakang).
   - Toggle Hide/Show dan Lock elemen.
4. **3-State Animation & Timing Inspector**:
   - Tab Entry Animation: dropdown tipe, slider durasi (0.1s - 5s), slider delay (0s - 3s), pilihan easing kurva, radio pilihan pemicu (`scroll_reveal` / `timer` / `click_tap`).
   - Tab Idle Animation: dropdown tipe (`none`, `float`, `pulse`, `shimmer`, `breathing`, `sway`), slider kecepatan per putaran loop.
   - Tab Exit Animation: dropdown tipe transisi keluar saat melewati layar.
5. **Granular Editable Flags Inspector**:
   - Checkbox `editable_appearance` + input label form.
   - Checkbox `editable_content` + input label form.
6. **Instant Test Play Mode**:
   - Tombol toggle di toolbar atas untuk mencoba men-scroll langsung hasil desain undangan di dalam editor.

### 3.3 Form Template Customizer (`src/themes/vertical-scroll/template/`)
1. **Accordion Form Dinamis**:
   - Memindai seluruh `pages` dan hanya merender field untuk elemen yang `editable_appearance === true` (ganti foto dari library) atau `editable_content === true` (ganti teks).
   - Dikelompokkan rapi per Halaman.
2. **Live Side-by-Side Reactive Preview**:
   - Form di sisi kiri, live preview scroll vertikal di sisi kanan yang langsung ter-update seketika saat teks diketik atau foto diubah.

### 3.4 Data Seed Demo (`src/themes/vertical-scroll/defaultProject.ts`)
- Menyediakan template bawaan lengkap dengan 5 seksi halaman:
  1. **Page 1: Cover / Hero** (Judul acara, foto utama mengambang, animasi masuk slide-down).
  2. **Page 2: Profil Mempelai / Tokoh Utama** (Foto pasangan, bio singkat, teks sambutan).
  3. **Page 3: Waktu & Lokasi Acara** (Jadwal akad/resepsi, tombol Google Maps).
  4. **Page 4: Galeri Kenangan** (Galeri foto beranimasi shimmer).
  5. **Page 5: Konfirmasi Kehadiran (RSVP) & Doa Ucapan**.
