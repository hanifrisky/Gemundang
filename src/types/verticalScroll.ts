import { BaseProject, SpriteAsset, EntityInteraction } from './base';

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
  | 'sway';        // Goyangan rotasi tertiup angin (-3deg s/d +3deg)

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
    duration: number; // detik (e.g. 0.8)
    delay: number;    // detik jeda (e.g. 0.2)
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

export type LayerElementType = 'image' | 'text' | 'button' | 'interactive_widget';

export interface PageLayerElement {
  id: string;
  name: string;
  type: LayerElementType;
  x: number;          // Posisi X persentase terhadap lebar kanvas (0-100%, boleh <0 atau >100 untuk bleed tepi)
  y: number;          // Posisi Y persentase terhadap tinggi kanvas (0-100%, boleh <0 atau >100)
  width: number;      // Lebar dasar dalam pixel kanvas
  height: number;     // Tinggi dasar dalam pixel kanvas
  rotation?: number;  // Rotasi dalam derajat (-180 s/d 180, default: 0)
  scale?: number;     // Skala proporsional elemen (mis. 0.1 s/d 5.0, default: 1)
  flipX?: boolean;    // Cermin horizontal (default: false)
  flipY?: boolean;    // Cermin vertikal (default: false)
  locked?: boolean;   // Kunci elemen di editor agar tidak tergeser tidak sengaja
  hidden?: boolean;   // Sembunyikan elemen sementara
  zIndex: number;     // Urutan tumpukan layer visual (1, 2, 3...)
  content?: string;   // Teks jika type === 'text' atau button label
  mediaUrl?: string;  // URL gambar jika type === 'image'
  spriteAsset?: SpriteAsset; // Dari Asset Library (single image atau sequence)
  styleOptions?: {
    fontSize?: number;
    fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
    color?: string;
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    borderRadius?: number;
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    opacity?: number;
    fontFamily?: 'sans' | 'serif' | 'mono';
    objectFit?: 'cover' | 'contain' | 'fill';
  };
  animation: LayerAnimationConfig;

  // Interaksi universal saat diklik / disentuh
  hasInteraction: boolean;
  interaction?: EntityInteraction;

  // Granular Editable Flags untuk Mode Template
  editable_appearance: boolean; // Boleh ganti foto/gambar di form template
  appearanceLabel?: string;     // Contoh: "Foto Utama Mempelai"
  editable_content: boolean;    // Boleh ganti teks judul/isi di form template
  contentLabel?: string;        // Contoh: "Nama Acara & Tanggal"
}

export interface PageSectionBackground {
  type: 'color' | 'gradient' | 'image';
  value: string; // Hex color, CSS gradient string, atau Image URL
  parallaxSpeed?: number; // 0 = statis, 0.4 = parallax scroll
  overlayOpacity?: number; // 0.0 - 1.0
}

export interface PageSection {
  id: string;
  title: string;
  order: number;
  minHeight: string; // '100vh', '800px', 'auto'
  stageHeight?: number; // Tinggi kanvas referensi dalam pixel (default: 600 atau mengikuti minHeight px)
  background: PageSectionBackground;
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
    stageWidth?: number; // Lebar kanvas referensi dalam pixel (default: 800, atau 480 untuk mode potret mobile)
  };
}
