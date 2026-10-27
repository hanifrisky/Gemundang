import { SpriteAsset } from '@/types/platformer';

// Helper to convert SVG string to clean Data URI
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 1. Player: Groom (Idle & Run sequence)
const groomIdleFrame1 = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
    <!-- Groom Head -->
    <rect x="16" y="8" width="16" height="14" rx="4" fill="#ffdbac"/>
    <!-- Hair -->
    <path d="M14 8 Q24 2 34 8 L34 12 Q24 9 14 12 Z" fill="#2c1d11"/>
    <!-- Eyes -->
    <circle cx="21" cy="14" r="1.5" fill="#111"/>
    <circle cx="27" cy="14" r="1.5" fill="#111"/>
    <!-- Smile -->
    <path d="M22 18 Q24 20 26 18" stroke="#111" stroke-width="1" fill="none"/>
    <!-- Suit Body -->
    <rect x="14" y="22" width="20" height="24" rx="2" fill="#1e293b"/>
    <!-- White Shirt & Tie -->
    <polygon points="21,22 27,22 24,30" fill="#ffffff"/>
    <polygon points="23,24 25,24 24,34" fill="#dc2626"/>
    <!-- Rose boutonniere -->
    <circle cx="17" cy="26" r="2" fill="#e11d48"/>
    <!-- Hands -->
    <circle cx="12" cy="34" r="3" fill="#ffdbac"/>
    <circle cx="36" cy="34" r="3" fill="#ffdbac"/>
    <!-- Legs -->
    <rect x="16" y="46" width="6" height="14" fill="#0f172a"/>
    <rect x="26" y="46" width="6" height="14" fill="#0f172a"/>
    <!-- Shoes -->
    <rect x="14" y="58" width="8" height="4" rx="2" fill="#020617"/>
    <rect x="26" y="58" width="8" height="4" rx="2" fill="#020617"/>
  </svg>
`);

const groomIdleFrame2 = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
    <rect x="16" y="9" width="16" height="14" rx="4" fill="#ffdbac"/>
    <path d="M14 9 Q24 3 34 9 L34 13 Q24 10 14 13 Z" fill="#2c1d11"/>
    <circle cx="21" cy="15" r="1.5" fill="#111"/>
    <circle cx="27" cy="15" r="1.5" fill="#111"/>
    <path d="M22 19 Q24 21 26 19" stroke="#111" stroke-width="1" fill="none"/>
    <rect x="14" y="23" width="20" height="23" rx="2" fill="#1e293b"/>
    <polygon points="21,23 27,23 24,31" fill="#ffffff"/>
    <polygon points="23,25 25,25 24,35" fill="#dc2626"/>
    <circle cx="17" cy="27" r="2" fill="#e11d48"/>
    <circle cx="12" cy="35" r="3" fill="#ffdbac"/>
    <circle cx="36" cy="35" r="3" fill="#ffdbac"/>
    <rect x="16" y="46" width="6" height="14" fill="#0f172a"/>
    <rect x="26" y="46" width="6" height="14" fill="#0f172a"/>
    <rect x="14" y="58" width="8" height="4" rx="2" fill="#020617"/>
    <rect x="26" y="58" width="8" height="4" rx="2" fill="#020617"/>
  </svg>
`);

const groomRunFrame1 = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
    <rect x="16" y="7" width="16" height="14" rx="4" fill="#ffdbac"/>
    <path d="M14 7 Q24 1 34 7 L34 11 Q24 8 14 11 Z" fill="#2c1d11"/>
    <circle cx="23" cy="13" r="1.5" fill="#111"/>
    <circle cx="29" cy="13" r="1.5" fill="#111"/>
    <rect x="14" y="21" width="20" height="24" rx="2" fill="#1e293b"/>
    <polygon points="21,21 27,21 24,29" fill="#ffffff"/>
    <polygon points="23,23 25,23 24,33" fill="#dc2626"/>
    <!-- Running Arms -->
    <circle cx="10" cy="28" r="3" fill="#ffdbac"/>
    <circle cx="38" cy="38" r="3" fill="#ffdbac"/>
    <!-- Running Legs -->
    <path d="M18 45 L10 58 L6 58" stroke="#0f172a" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M28 45 L36 54 L42 54" stroke="#0f172a" stroke-width="6" stroke-linecap="round" fill="none"/>
  </svg>
`);

const groomRunFrame2 = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
    <rect x="16" y="8" width="16" height="14" rx="4" fill="#ffdbac"/>
    <path d="M14 8 Q24 2 34 8 L34 12 Q24 9 14 12 Z" fill="#2c1d11"/>
    <circle cx="23" cy="14" r="1.5" fill="#111"/>
    <circle cx="29" cy="14" r="1.5" fill="#111"/>
    <rect x="14" y="22" width="20" height="24" rx="2" fill="#1e293b"/>
    <polygon points="21,22 27,22 24,30" fill="#ffffff"/>
    <polygon points="23,24 25,24 24,34" fill="#dc2626"/>
    <!-- Running Arms Switched -->
    <circle cx="12" cy="38" r="3" fill="#ffdbac"/>
    <circle cx="36" cy="28" r="3" fill="#ffdbac"/>
    <!-- Running Legs Switched -->
    <path d="M18 45 L26 56 L32 56" stroke="#0f172a" stroke-width="6" stroke-linecap="round" fill="none"/>
    <path d="M28 45 L20 56 L14 56" stroke="#0f172a" stroke-width="6" stroke-linecap="round" fill="none"/>
  </svg>
`);

// 2. Player: Bride (Idle & Run sequence)
const brideIdleFrame1 = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
    <!-- Veil -->
    <path d="M12 12 Q24 4 36 12 Q42 32 38 52 Q24 56 10 52 Q6 32 12 12 Z" fill="#ffffff" opacity="0.4"/>
    <!-- Tiara -->
    <path d="M19 8 L24 4 L29 8 Z" fill="#fbbf24"/>
    <!-- Head -->
    <rect x="16" y="8" width="16" height="14" rx="4" fill="#fed7aa"/>
    <path d="M14 8 Q24 3 34 8 L35 14 Q24 10 13 14 Z" fill="#78350f"/>
    <circle cx="21" cy="14" r="1.5" fill="#111"/>
    <circle cx="27" cy="14" r="1.5" fill="#111"/>
    <!-- Wedding Dress -->
    <path d="M18 22 L30 22 L38 58 L10 58 Z" fill="#ffffff"/>
    <path d="M20 22 Q24 26 28 22" stroke="#f43f5e" stroke-width="2" fill="none"/>
    <!-- Bouquet -->
    <circle cx="24" cy="34" r="5" fill="#ec4899"/>
    <circle cx="22" cy="32" r="2.5" fill="#fb7185"/>
    <circle cx="26" cy="32" r="2.5" fill="#f43f5e"/>
  </svg>
`);

const brideIdleFrame2 = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
    <path d="M12 13 Q24 5 36 13 Q42 33 38 53 Q24 57 10 53 Q6 33 12 13 Z" fill="#ffffff" opacity="0.4"/>
    <path d="M19 9 L24 5 L29 9 Z" fill="#fbbf24"/>
    <rect x="16" y="9" width="16" height="14" rx="4" fill="#fed7aa"/>
    <path d="M14 9 Q24 4 34 9 L35 15 Q24 11 13 15 Z" fill="#78350f"/>
    <circle cx="21" cy="15" r="1.5" fill="#111"/>
    <circle cx="27" cy="15" r="1.5" fill="#111"/>
    <path d="M18 23 L30 23 L38 58 L10 58 Z" fill="#ffffff"/>
    <circle cx="24" cy="35" r="5" fill="#ec4899"/>
  </svg>
`);

const brideRunFrame1 = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
    <path d="M8 12 Q24 4 36 12 Q42 32 32 50 Q20 54 8 50 Z" fill="#ffffff" opacity="0.4"/>
    <path d="M19 7 L24 3 L29 7 Z" fill="#fbbf24"/>
    <rect x="16" y="7" width="16" height="14" rx="4" fill="#fed7aa"/>
    <path d="M14 7 Q24 2 34 7 L35 13 Q24 9 13 13 Z" fill="#78350f"/>
    <circle cx="23" cy="13" r="1.5" fill="#111"/>
    <circle cx="29" cy="13" r="1.5" fill="#111"/>
    <!-- Dress Flutter -->
    <path d="M18 21 L30 21 L42 56 L12 56 Z" fill="#ffffff"/>
    <circle cx="26" cy="32" r="5" fill="#ec4899"/>
    <!-- Feet -->
    <circle cx="16" cy="59" r="3" fill="#fed7aa"/>
    <circle cx="36" cy="55" r="3" fill="#fed7aa"/>
  </svg>
`);

const brideRunFrame2 = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
    <path d="M10 8 Q24 4 36 12 Q42 32 30 52 Q18 56 6 52 Z" fill="#ffffff" opacity="0.4"/>
    <path d="M19 8 L24 4 L29 8 Z" fill="#fbbf24"/>
    <rect x="16" y="8" width="16" height="14" rx="4" fill="#fed7aa"/>
    <path d="M14 8 Q24 3 34 8 L35 14 Q24 10 13 14 Z" fill="#78350f"/>
    <circle cx="23" cy="14" r="1.5" fill="#111"/>
    <circle cx="29" cy="14" r="1.5" fill="#111"/>
    <path d="M18 22 L30 22 L36 57 L8 57 Z" fill="#ffffff"/>
    <circle cx="28" cy="33" r="5" fill="#ec4899"/>
    <circle cx="22" cy="58" r="3" fill="#fed7aa"/>
    <circle cx="32" cy="58" r="3" fill="#fed7aa"/>
  </svg>
`);

// 3. NPC 1: Penghulu / Priest
export const priestSprite: SpriteAsset = {
  id: 'npc-priest',
  name: 'Penghulu / Officiant',
  type: 'sequence',
  frames: [
    svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
        <!-- Peci / Hat -->
        <rect x="16" y="5" width="16" height="7" rx="2" fill="#0f172a"/>
        <rect x="16" y="12" width="16" height="14" rx="4" fill="#ffdbac"/>
        <circle cx="21" cy="18" r="1.5" fill="#111"/>
        <circle cx="27" cy="18" r="1.5" fill="#111"/>
        <!-- Robe / Jas Batik -->
        <rect x="14" y="26" width="20" height="32" rx="3" fill="#854d0e"/>
        <!-- Golden Sash -->
        <line x1="16" y1="26" x2="32" y2="58" stroke="#facc15" stroke-width="4"/>
        <!-- Scroll / Buku Nikah -->
        <rect x="20" y="34" width="12" height="10" rx="1" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>
      </svg>
    `),
    svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
        <rect x="16" y="6" width="16" height="7" rx="2" fill="#0f172a"/>
        <rect x="16" y="13" width="16" height="14" rx="4" fill="#ffdbac"/>
        <circle cx="21" cy="19" r="1.5" fill="#111"/>
        <circle cx="27" cy="19" r="1.5" fill="#111"/>
        <rect x="14" y="27" width="20" height="31" rx="3" fill="#854d0e"/>
        <line x1="16" y1="27" x2="32" y2="58" stroke="#facc15" stroke-width="4"/>
        <rect x="20" y="35" width="12" height="10" rx="1" fill="#fef08a" stroke="#ca8a04" stroke-width="1.5"/>
      </svg>
    `)
  ],
  frameRate: 3,
  loop: true,
  category: 'npc'
};

// 4. NPC 2: Sahabat / Best Friend / Host
export const friendSprite: SpriteAsset = {
  id: 'npc-friend',
  name: 'Sahabat / MC Acara',
  type: 'sequence',
  frames: [
    svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
        <!-- Casual Guy -->
        <rect x="16" y="8" width="16" height="14" rx="4" fill="#ffdbac"/>
        <path d="M14 8 Q24 2 34 8 L34 11 Q24 8 14 11 Z" fill="#b45309"/>
        <circle cx="21" cy="14" r="1.5" fill="#111"/>
        <circle cx="27" cy="14" r="1.5" fill="#111"/>
        <!-- Mic in Hand -->
        <rect x="14" y="22" width="20" height="24" rx="2" fill="#0284c7"/>
        <line x1="36" y1="26" x2="36" y2="38" stroke="#475569" stroke-width="3"/>
        <circle cx="36" cy="24" r="4" fill="#94a3b8"/>
        <!-- Pants -->
        <rect x="16" y="46" width="6" height="14" fill="#334155"/>
        <rect x="26" y="46" width="6" height="14" fill="#334155"/>
      </svg>
    `),
    svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" width="48" height="64">
        <rect x="16" y="9" width="16" height="14" rx="4" fill="#ffdbac"/>
        <path d="M14 9 Q24 3 34 9 L34 12 Q24 9 14 12 Z" fill="#b45309"/>
        <circle cx="21" cy="15" r="1.5" fill="#111"/>
        <circle cx="27" cy="15" r="1.5" fill="#111"/>
        <rect x="14" y="23" width="20" height="23" rx="2" fill="#0284c7"/>
        <line x1="36" y1="25" x2="36" y2="37" stroke="#475569" stroke-width="3"/>
        <circle cx="36" cy="23" r="4" fill="#94a3b8"/>
        <rect x="16" y="46" width="6" height="14" fill="#334155"/>
        <rect x="26" y="46" width="6" height="14" fill="#334155"/>
      </svg>
    `)
  ],
  frameRate: 3,
  loop: true,
  category: 'npc'
};

// 5. Interactive Object: Treasure Chest (Animasi Buka Peti)
export const chestSprite: SpriteAsset = {
  id: 'obj-chest',
  name: 'Peti Hadiah / Kenangan',
  type: 'sequence',
  frames: [
    svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
        <!-- Closed Chest -->
        <rect x="8" y="16" width="32" height="26" rx="4" fill="#854d0e" stroke="#3e2008" stroke-width="2"/>
        <rect x="8" y="14" width="32" height="12" rx="3" fill="#a16207" stroke="#3e2008" stroke-width="2"/>
        <rect x="21" y="20" width="6" height="8" rx="1" fill="#facc15" stroke="#713f12" stroke-width="1.5"/>
        <circle cx="24" cy="24" r="1.5" fill="#713f12"/>
      </svg>
    `),
    svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
        <!-- Sparkling Chest -->
        <rect x="8" y="16" width="32" height="26" rx="4" fill="#854d0e" stroke="#3e2008" stroke-width="2"/>
        <rect x="8" y="14" width="32" height="12" rx="3" fill="#a16207" stroke="#3e2008" stroke-width="2"/>
        <rect x="21" y="20" width="6" height="8" rx="1" fill="#fef08a" stroke="#713f12" stroke-width="1.5"/>
        <!-- Sparkle stars -->
        <polygon points="6,12 8,7 10,12 15,14 10,16 8,21 6,16 1,14" fill="#facc15"/>
        <polygon points="38,8 40,4 42,8 46,10 42,12 40,16 38,12 34,10" fill="#facc15"/>
      </svg>
    `)
  ],
  frameRate: 2,
  loop: true,
  category: 'obstacle'
};

// 6. Interactive Object: Signpost / Papan Petunjuk
export const signpostSprite: SpriteAsset = {
  id: 'obj-signpost',
  name: 'Papan Arah / Lokasi Acara',
  type: 'static',
  frames: [
    svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
        <rect x="22" y="12" width="4" height="34" fill="#78350f"/>
        <!-- Sign 1 Right -->
        <path d="M12 10 L34 10 L40 16 L34 22 L12 22 Z" fill="#b45309" stroke="#451a03" stroke-width="1.5"/>
        <text x="16" y="18" font-size="6" font-weight="bold" fill="#fef3c7" font-family="sans-serif">VENUE ➔</text>
        <!-- Sign 2 Left -->
        <path d="M34 26 L12 26 L6 32 L12 38 L34 38 Z" fill="#b45309" stroke="#451a03" stroke-width="1.5"/>
        <text x="13" y="34" font-size="6" font-weight="bold" fill="#fef3c7" font-family="sans-serif">◀ RSVP</text>
      </svg>
    `)
  ],
  category: 'decoration'
};

// 7. Interactive Object: Wedding Arch / Gapura Bunga
export const weddingArchSprite: SpriteAsset = {
  id: 'obj-arch',
  name: 'Gapura Bunga / Pelaminan',
  type: 'static',
  frames: [
    svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 96" width="80" height="96">
        <!-- Arch Pillars -->
        <rect x="8" y="24" width="8" height="70" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
        <rect x="64" y="24" width="8" height="70" rx="2" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
        <!-- Top Arch Curve -->
        <path d="M8 26 Q40 -6 72 26" stroke="#f8fafc" stroke-width="10" fill="none"/>
        <!-- Floral Garland -->
        <path d="M8 26 Q40 -4 72 26" stroke="#15803d" stroke-width="6" fill="none"/>
        <!-- Flowers -->
        <circle cx="20" cy="18" r="5" fill="#f43f5e"/>
        <circle cx="30" cy="10" r="5.5" fill="#ec4899"/>
        <circle cx="40" cy="8" r="6" fill="#fb7185"/>
        <circle cx="50" cy="10" r="5.5" fill="#ec4899"/>
        <circle cx="60" cy="18" r="5" fill="#f43f5e"/>
        <!-- Dangling Bells -->
        <circle cx="40" cy="22" r="3" fill="#fbbf24"/>
      </svg>
    `)
  ],
  category: 'decoration'
};

// 8. Interactive Object: Cinema / TV Billboard (Video Teaser)
export const billboardSprite: SpriteAsset = {
  id: 'obj-billboard',
  name: 'Layar Bioskop / Video Player',
  type: 'static',
  frames: [
    svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
        <!-- Legs -->
        <rect x="16" y="44" width="4" height="18" fill="#334155"/>
        <rect x="44" y="44" width="4" height="18" fill="#334155"/>
        <!-- Screen Border -->
        <rect x="6" y="8" width="52" height="38" rx="4" fill="#0f172a" stroke="#475569" stroke-width="2"/>
        <!-- Screen Glass -->
        <rect x="10" y="12" width="44" height="30" rx="2" fill="#1e293b"/>
        <!-- Play Icon -->
        <polygon points="28,20 40,27 28,34" fill="#f43f5e"/>
        <circle cx="32" cy="27" r="12" stroke="#f43f5e" stroke-width="1.5" fill="none"/>
      </svg>
    `)
  ],
  category: 'obstacle'
};

// Parallax Layers Default SVGs
export const defaultSkyLayer = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400" width="1000" height="400">
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fdba74"/>
        <stop offset="40%" stop-color="#f472b6"/>
        <stop offset="80%" stop-color="#c084fc"/>
        <stop offset="100%" stop-color="#818cf8"/>
      </linearGradient>
    </defs>
    <rect width="1000" height="400" fill="url(#skyGrad)"/>
    <!-- Distant Sun / Moon -->
    <circle cx="500" cy="180" r="60" fill="#fef08a" opacity="0.6"/>
  </svg>
`);

export const defaultMountainLayer = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400" width="1000" height="400">
    <!-- Distant Mountains -->
    <polygon points="0,400 150,220 320,380 480,180 650,390 850,210 1000,400" fill="#4c1d95" opacity="0.45"/>
    <polygon points="0,400 80,280 240,400 400,250 560,400 750,270 920,400 1000,400" fill="#3b0764" opacity="0.6"/>
  </svg>
`);

export const defaultCloudLayer = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400" width="1000" height="400">
    <!-- Fluffy Clouds -->
    <path d="M50 120 Q70 90 100 100 Q130 80 160 110 Q190 100 200 130 Q210 160 180 160 L60 160 Q40 150 50 120 Z" fill="#ffffff" opacity="0.5"/>
    <path d="M450 90 Q470 60 500 70 Q530 50 560 80 Q590 70 600 100 Q610 130 580 130 L460 130 Q440 120 450 90 Z" fill="#ffffff" opacity="0.6"/>
    <path d="M780 140 Q800 110 830 120 Q860 100 890 130 Q920 120 930 150 Q940 180 910 180 L790 180 Q770 170 780 140 Z" fill="#ffffff" opacity="0.4"/>
  </svg>
`);

export const defaultTreeLayer = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 400" width="1000" height="400">
    <!-- Hill with Trees Silhouette -->
    <path d="M0 360 Q250 310 500 350 Q750 320 1000 360 L1000 400 L0 400 Z" fill="#064e3b" opacity="0.7"/>
    <!-- Pine Trees -->
    <polygon points="120,340 100,370 140,370" fill="#022c22"/>
    <polygon points="120,320 105,350 135,350" fill="#022c22"/>
    <polygon points="380,350 360,380 400,380" fill="#022c22"/>
    <polygon points="620,330 600,365 640,365" fill="#022c22"/>
    <polygon points="850,345 830,375 870,375" fill="#022c22"/>
  </svg>
`);

// Preset Groom Player
export const presetGroom: { idle: SpriteAsset; run: SpriteAsset } = {
  idle: {
    id: 'player-groom-idle',
    name: 'Groom (Idle)',
    type: 'sequence',
    frames: [groomIdleFrame1, groomIdleFrame2],
    frameRate: 2,
    loop: true,
    category: 'player'
  },
  run: {
    id: 'player-groom-run',
    name: 'Groom (Run)',
    type: 'sequence',
    frames: [groomRunFrame1, groomRunFrame2],
    frameRate: 6,
    loop: true,
    category: 'player'
  }
};

// Preset Bride Player
export const presetBride: { idle: SpriteAsset; run: SpriteAsset } = {
  idle: {
    id: 'player-bride-idle',
    name: 'Bride (Idle)',
    type: 'sequence',
    frames: [brideIdleFrame1, brideIdleFrame2],
    frameRate: 2,
    loop: true,
    category: 'player'
  },
  run: {
    id: 'player-bride-run',
    name: 'Bride (Run)',
    type: 'sequence',
    frames: [brideRunFrame1, brideRunFrame2],
    frameRate: 6,
    loop: true,
    category: 'player'
  }
};

// Built-in library catalog
export const BUILT_IN_SPRITES: SpriteAsset[] = [
  presetGroom.idle,
  presetGroom.run,
  presetBride.idle,
  presetBride.run,
  priestSprite,
  friendSprite,
  chestSprite,
  signpostSprite,
  weddingArchSprite,
  billboardSprite
];

// Preset Platform Textures
export const presetGrassPlatformTexture = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" width="48" height="24">
    <rect x="0" y="0" width="48" height="24" fill="#78350f"/>
    <!-- Grass top -->
    <rect x="0" y="0" width="48" height="6" fill="#22c55e"/>
    <path d="M0 6 L4 8 L8 6 L12 9 L16 6 L20 8 L24 6 L28 9 L32 6 L36 8 L40 6 L44 8 L48 6 L48 0 L0 0 Z" fill="#16a34a"/>
    <rect x="0" y="0" width="48" height="2" fill="#86efac"/>
    <!-- Earth pebbles -->
    <circle cx="8" cy="14" r="2" fill="#92400e"/>
    <circle cx="22" cy="18" r="1.5" fill="#451a03"/>
    <circle cx="36" cy="13" r="2.5" fill="#92400e"/>
    <circle cx="42" cy="19" r="1" fill="#451a03"/>
  </svg>
`);

export const presetWoodPlatformTexture = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" width="48" height="24">
    <rect x="0" y="0" width="48" height="24" fill="#b45309"/>
    <!-- Wood grain lines -->
    <line x1="0" y1="1" x2="48" y2="1" stroke="#fde047" stroke-width="1" opacity="0.6"/>
    <line x1="0" y1="12" x2="48" y2="12" stroke="#78350f" stroke-width="1.5"/>
    <line x1="0" y1="23" x2="48" y2="23" stroke="#451a03" stroke-width="1"/>
    <line x1="24" y1="0" x2="24" y2="12" stroke="#451a03" stroke-width="1"/>
    <line x1="12" y1="12" x2="12" y2="24" stroke="#451a03" stroke-width="1"/>
    <line x1="36" y1="12" x2="36" y2="24" stroke="#451a03" stroke-width="1"/>
    <!-- Nails / Rivets -->
    <circle cx="3" cy="6" r="1.2" fill="#1e293b"/>
    <circle cx="21" cy="6" r="1.2" fill="#1e293b"/>
    <circle cx="27" cy="6" r="1.2" fill="#1e293b"/>
    <circle cx="45" cy="6" r="1.2" fill="#1e293b"/>
    <circle cx="15" cy="18" r="1.2" fill="#1e293b"/>
    <circle cx="33" cy="18" r="1.2" fill="#1e293b"/>
  </svg>
`);

export const presetStonePlatformTexture = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" width="48" height="24">
    <rect x="0" y="0" width="48" height="24" fill="#64748b"/>
    <!-- Mortar lines -->
    <line x1="0" y1="0" x2="48" y2="0" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="0" y1="12" x2="48" y2="12" stroke="#334155" stroke-width="1.5"/>
    <line x1="0" y1="23" x2="48" y2="23" stroke="#1e293b" stroke-width="1.5"/>
    <line x1="24" y1="0" x2="24" y2="12" stroke="#334155" stroke-width="1.5"/>
    <line x1="12" y1="12" x2="12" y2="24" stroke="#334155" stroke-width="1.5"/>
    <line x1="36" y1="12" x2="36" y2="24" stroke="#334155" stroke-width="1.5"/>
    <!-- Stone highlights & shadows -->
    <rect x="1" y="1" width="22" height="2" fill="#94a3b8"/>
    <rect x="25" y="1" width="22" height="2" fill="#94a3b8"/>
    <rect x="13" y="13" width="22" height="2" fill="#94a3b8"/>
  </svg>
`);

export const presetCloudPlatformTexture = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" width="48" height="24">
    <rect x="0" y="0" width="48" height="24" fill="#e0f2fe" opacity="0.4"/>
    <!-- Cloud puffs -->
    <circle cx="12" cy="14" r="10" fill="#ffffff"/>
    <circle cx="24" cy="10" r="11" fill="#ffffff"/>
    <circle cx="36" cy="14" r="10" fill="#ffffff"/>
    <circle cx="48" cy="16" r="8" fill="#f0f9ff"/>
    <circle cx="0" cy="16" r="8" fill="#f0f9ff"/>
    <!-- Soft shading -->
    <path d="M0 20 Q24 26 48 20 L48 24 L0 24 Z" fill="#bae6fd" opacity="0.8"/>
  </svg>
`);

export const presetMarblePlatformTexture = svgToDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 24" width="48" height="24">
    <rect x="0" y="0" width="48" height="24" fill="#f8fafc"/>
    <!-- Gold border trim -->
    <rect x="0" y="0" width="48" height="3" fill="#eab308"/>
    <rect x="0" y="21" width="48" height="3" fill="#ca8a04"/>
    <!-- Floral/marble vein -->
    <path d="M0 8 Q12 14 24 10 T48 14" stroke="#fef08a" stroke-width="1.5" fill="none"/>
    <path d="M6 18 Q18 12 30 16 T44 10" stroke="#facc15" stroke-width="1" fill="none" opacity="0.7"/>
    <circle cx="24" cy="1.5" r="1.5" fill="#ffffff"/>
  </svg>
`);

export interface PresetPlatformTexture {
  id: string;
  name: string;
  url: string;
  tileColor: string;
}

export const PRESET_PLATFORM_TEXTURES: PresetPlatformTexture[] = [
  { id: 'tex-grass', name: 'Rumput & Tanah', url: presetGrassPlatformTexture, tileColor: '#22c55e' },
  { id: 'tex-wood', name: 'Papan Kayu Rustik', url: presetWoodPlatformTexture, tileColor: '#b45309' },
  { id: 'tex-stone', name: 'Batu Kerajaan', url: presetStonePlatformTexture, tileColor: '#64748b' },
  { id: 'tex-cloud', name: 'Awan Putih Lembut', url: presetCloudPlatformTexture, tileColor: '#38bdf8' },
  { id: 'tex-marble', name: 'Marmer Emas Resepsi', url: presetMarblePlatformTexture, tileColor: '#eab308' },
];

