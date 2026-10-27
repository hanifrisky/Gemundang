import { SoundAsset, SoundEventType, ProjectAudioConfig } from '@/types/platformer';

export const BUILT_IN_SOUNDS: SoundAsset[] = [
  // ===================== BGM =====================
  {
    id: 'preset-bgm-wedding',
    presetId: 'preset-bgm-wedding',
    name: 'Romantic Wedding Loop (Default)',
    category: 'bgm',
    volume: 0.8,
    loop: true
  },
  {
    id: 'preset-bgm-celebration',
    presetId: 'preset-bgm-celebration',
    name: 'Joyful Celebration (Upbeat)',
    category: 'bgm',
    volume: 0.8,
    loop: true
  },
  {
    id: 'preset-bgm-peaceful',
    presetId: 'preset-bgm-peaceful',
    name: 'Peaceful Serenade (Harp Lullaby)',
    category: 'bgm',
    volume: 0.75,
    loop: true
  },
  {
    id: 'preset-bgm-retro8bit',
    presetId: 'preset-bgm-retro8bit',
    name: 'Retro 8-Bit Adventure',
    category: 'bgm',
    volume: 0.7,
    loop: true
  },

  // ===================== JUMP =====================
  {
    id: 'preset-jump-classic',
    presetId: 'preset-jump-classic',
    name: 'Classic Jump (Default)',
    category: 'jump',
    volume: 0.85
  },
  {
    id: 'preset-jump-boing',
    presetId: 'preset-jump-boing',
    name: 'Spring Boing',
    category: 'jump',
    volume: 0.9
  },
  {
    id: 'preset-jump-soft',
    presetId: 'preset-jump-soft',
    name: 'Soft Hop',
    category: 'jump',
    volume: 0.8
  },

  // ===================== FOOTSTEP =====================
  {
    id: 'preset-footstep-soft',
    presetId: 'preset-footstep-soft',
    name: 'Soft Step (Default)',
    category: 'footstep',
    volume: 0.7
  },
  {
    id: 'preset-footstep-click',
    presetId: 'preset-footstep-click',
    name: 'Crisp Tap',
    category: 'footstep',
    volume: 0.6
  },
  {
    id: 'preset-footstep-grass',
    presetId: 'preset-footstep-grass',
    name: 'Grass Rustle',
    category: 'footstep',
    volume: 0.65
  },

  // ===================== IDLE =====================
  {
    id: 'preset-idle-chime',
    presetId: 'preset-idle-chime',
    name: 'Wind Chime (Default)',
    category: 'idle',
    volume: 0.75
  },
  {
    id: 'preset-idle-magic',
    presetId: 'preset-idle-magic',
    name: 'Magic Sparkle',
    category: 'idle',
    volume: 0.8
  },
  {
    id: 'preset-idle-birds',
    presetId: 'preset-idle-birds',
    name: 'Gentle Flutter',
    category: 'idle',
    volume: 0.7
  },

  // ===================== PROXIMITY =====================
  {
    id: 'preset-prox-bell',
    presetId: 'preset-prox-bell',
    name: 'Pleasant Bell (Default)',
    category: 'proximity',
    volume: 0.85
  },
  {
    id: 'preset-prox-ping',
    presetId: 'preset-prox-ping',
    name: 'Crystal Ping',
    category: 'proximity',
    volume: 0.8
  },
  {
    id: 'preset-prox-heart',
    presetId: 'preset-prox-heart',
    name: 'Heartbeat Pulse',
    category: 'proximity',
    volume: 0.9
  },

  // ===================== INTERACT =====================
  {
    id: 'preset-interact-fanfare',
    presetId: 'preset-interact-fanfare',
    name: 'Joyful Fanfare (Default)',
    category: 'interact',
    volume: 0.9
  },
  {
    id: 'preset-interact-magic',
    presetId: 'preset-interact-magic',
    name: 'Magical Chimes',
    category: 'interact',
    volume: 0.85
  },
  {
    id: 'preset-interact-blip',
    presetId: 'preset-interact-blip',
    name: 'Dialogue Blip',
    category: 'interact',
    volume: 0.8
  }
];

export const DEFAULT_PROJECT_AUDIO: ProjectAudioConfig = {
  bgm: BUILT_IN_SOUNDS.find(s => s.id === 'preset-bgm-wedding'),
  jump: BUILT_IN_SOUNDS.find(s => s.id === 'preset-jump-classic'),
  footstep: BUILT_IN_SOUNDS.find(s => s.id === 'preset-footstep-soft'),
  idle: BUILT_IN_SOUNDS.find(s => s.id === 'preset-idle-chime'),
  proximity: BUILT_IN_SOUNDS.find(s => s.id === 'preset-prox-bell'),
  interact: BUILT_IN_SOUNDS.find(s => s.id === 'preset-interact-fanfare')
};

export function getSoundEventInfo(category: SoundEventType): { title: string; subtitle: string; icon: string } {
  switch (category) {
    case 'bgm':
      return {
        title: 'Musik Latar (BGM)',
        subtitle: 'Diputar secara berulang (loop) saat pemain berada di dalam game',
        icon: 'Music'
      };
    case 'jump':
      return {
        title: 'Suara Karakter Melompat',
        subtitle: 'Diputar sesaat ketika pemain menekan tombol lompat (Spasi / W / Atas)',
        icon: 'ArrowUp'
      };
    case 'footstep':
      return {
        title: 'Suara Langkah Kaki',
        subtitle: 'Diputar saat karakter bergerak / berlari di atas platform atau tanah',
        icon: 'Footprints'
      };
    case 'idle':
      return {
        title: 'Suara Diam / Bersantai',
        subtitle: 'Diputar secara lembut berkala ketika karakter sedang diam tidak bergerak',
        icon: 'Coffee'
      };
    case 'proximity':
      return {
        title: 'Suara Mendekati Objek / NPC',
        subtitle: 'Diputar ketika karakter masuk ke dalam jarak interaksi objek',
        icon: 'Bell'
      };
    case 'interact':
      return {
        title: 'Suara Berinteraksi / Dialog',
        subtitle: 'Diputar ketika tombol interaksi ditekan (E / Enter / tombol aksi)',
        icon: 'Sparkles'
      };
  }
}
