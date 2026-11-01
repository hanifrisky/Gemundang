export type GameThemeType = 'platformer' | 'vertical_scroll';

export type SpriteType = 'static' | 'sequence';

export type SoundEventType = 'bgm' | 'jump' | 'footstep' | 'idle' | 'proximity' | 'interact';

export interface SoundAsset {
  id: string;
  name: string;
  category: SoundEventType;
  url?: string;       // base64 data URI or remote audio URL
  presetId?: string;  // ID for procedural synth / built-in audio
  volume?: number;    // 0.0 - 1.0 (default 1.0)
  loop?: boolean;     // default true for bgm, false for sfx
}

export interface SpriteAsset {
  id: string;
  name: string;
  type: SpriteType;
  frames: string[]; // 1 URL for static, array of URLs for sequence
  frameRate?: number; // frames per second (default: 8)
  loop?: boolean; // default: true
  category?: 'character' | 'player' | 'npc' | 'obstacle' | 'decoration' | 'background' | 'platform';
}

export type InteractionType = 'info' | 'image' | 'video' | 'rsvp' | 'scroll_to_page';

export interface EntityInteraction {
  type: InteractionType;
  title?: string;
  content?: string;
  mediaUrl?: string; // Image URL or Video URL (YouTube embed or MP4)
  actionButtonText?: string;
  actionUrl?: string;
  targetPageId?: string; // For vertical scroll navigation
}

export interface RSVPRecord {
  id: string;
  guestName: string;
  attendance: 'hadir' | 'tidak_hadir' | 'ragu';
  pax: number;
  message: string;
  createdAt: string;
}

export interface BaseProject {
  slug: string;
  title: string;
  subtitle?: string;
  theme_type: GameThemeType;
  is_template_enabled: boolean;
  musicUrl?: string;
  rsvps?: RSVPRecord[];
}
