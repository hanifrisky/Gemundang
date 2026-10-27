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

export interface ProjectAudioConfig {
  bgm?: SoundAsset;
  jump?: SoundAsset;
  footstep?: SoundAsset;
  idle?: SoundAsset;
  proximity?: SoundAsset;
  interact?: SoundAsset;
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

export interface PlayerColliderConfig {
  // Offset relatif terhadap batas tepi gambar visual (seperti margin/padding)
  // Nilai positif (+) memperlebar hitbox melebihi batas gambar
  // Nilai negatif (-) memperkecil hitbox ke dalam gambar
  // Nilai 0 tepat sejajar dengan tepi gambar
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;

  // Legacy fields untuk kompatibilitas
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
}

export function getPlayerHitboxBounds(player: PlayerConfig) {
  const spriteW = player.width ?? 44;
  const spriteH = player.height ?? 60;
  const col = player.collider;

  let offLeft = 0;
  let offRight = 0;
  let offTop = 0;
  let offBottom = 0;

  if (
    col &&
    (col.left !== undefined || col.right !== undefined || col.top !== undefined || col.bottom !== undefined)
  ) {
    offLeft = col.left ?? 0;
    offRight = col.right ?? 0;
    offTop = col.top ?? 0;
    offBottom = col.bottom ?? 0;
  } else if (
    col &&
    (col.width !== undefined || col.height !== undefined || col.offsetX !== undefined || col.offsetY !== undefined)
  ) {
    const legacyW = col.width ?? spriteW;
    const legacyH = col.height ?? spriteH;
    const legacyOffX = col.offsetX ?? 0;
    const legacyOffY = col.offsetY ?? 0;

    offLeft = -legacyOffX;
    offRight = (legacyOffX + legacyW) - spriteW;
    offTop = -legacyOffY;
    offBottom = (legacyOffY + legacyH) - spriteH;
  }

  const hitboxWidth = Math.max(6, spriteW + offLeft + offRight);
  const hitboxHeight = Math.max(6, spriteH + offTop + offBottom);
  const offsetX = -offLeft;
  const offsetY = -offTop;

  return {
    spriteW,
    spriteH,
    offLeft,
    offRight,
    offTop,
    offBottom,
    hitboxWidth,
    hitboxHeight,
    offsetX,
    offsetY
  };
}

export interface PlayerConfig {
  canJump: boolean;
  jumpForce: number;
  speed: number;
  idleSprite: SpriteAsset;
  runSprite: SpriteAsset;
  editable_appearance: boolean;
  editableLabel?: string;
  startX?: number;
  startY?: number;
  width?: number; // Lebar visual gambar sprite (default: 44)
  height?: number; // Tinggi visual gambar sprite (default: 60)
  collider?: PlayerColliderConfig;
}

export interface ParallaxLayer {
  id: string;
  name: string;
  imageUrl: string;
  speedRatio: number; // 0 = static sky, 1 = same speed as ground
  yOffset: number;
  editable_appearance: boolean;
  editableLabel?: string;
}

export type InteractionType = 'info' | 'image' | 'video' | 'rsvp';

export interface EntityInteraction {
  type: InteractionType;
  title?: string;
  content?: string;
  mediaUrl?: string; // Image URL or Video URL (YouTube embed or MP4)
  actionButtonText?: string;
  actionUrl?: string;
}

export interface InteractiveEntity {
  id: string;
  name: string;
  type: 'npc' | 'obstacle' | 'decoration';
  x: number;
  y: number;
  width: number;
  height: number;
  sprite: SpriteAsset;
  
  // Proximity & Interaksi
  hasInteraction: boolean;
  interaction?: EntityInteraction;

  // Granular Editable Flags untuk Mode Template
  editable_appearance: boolean; // Dapat diganti sprite / tampilan di template form
  appearanceLabel?: string;     // Contoh: "Kostum NPC Ayah"
  
  editable_content: boolean;    // Dapat diganti isi teks/foto/video di template form
  contentLabel?: string;        // Contoh: "Rundown Acara & Tanggal"
}

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tileColor?: string;
  tileTextureUrl?: string;
}

export interface RSVPRecord {
  id: string;
  guestName: string;
  attendance: 'hadir' | 'tidak_hadir' | 'ragu';
  pax: number;
  message: string;
  createdAt: string;
}

export interface PlatformerProject {
  slug: string;
  title: string;
  subtitle?: string;
  is_template_enabled: boolean;
  musicUrl?: string;
  player: PlayerConfig;
  world: {
    groundMode: 'platform' | 'endless';
    worldWidth: number; // Level length (e.g. 4000px)
    groundY: number;    // Ground level height for endless mode (e.g. 460px)
    platforms: Platform[];
    parallaxLayers: ParallaxLayer[];
  };
  entities: InteractiveEntity[];
  audio?: ProjectAudioConfig;
  rsvps?: RSVPRecord[];
}
