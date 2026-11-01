import {
  BaseProject,
  SpriteAsset,
  SpriteType,
  SoundAsset,
  SoundEventType,
  RSVPRecord,
  EntityInteraction,
  InteractionType
} from './base';

export type {
  SpriteAsset,
  SpriteType,
  SoundAsset,
  SoundEventType,
  RSVPRecord,
  EntityInteraction,
  InteractionType
};

export interface ProjectAudioConfig {
  bgm?: SoundAsset;
  jump?: SoundAsset;
  footstep?: SoundAsset;
  idle?: SoundAsset;
  proximity?: SoundAsset;
  interact?: SoundAsset;
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

  if (col) {
    if (col.left !== undefined || col.right !== undefined || col.top !== undefined || col.bottom !== undefined) {
      offLeft = col.left ?? 0;
      offRight = col.right ?? 0;
      offTop = col.top ?? 0;
      offBottom = col.bottom ?? 0;
    } else if (col.width !== undefined || col.height !== undefined) {
      const w = col.width ?? spriteW;
      const h = col.height ?? spriteH;
      const ox = col.offsetX ?? 0;
      const oy = col.offsetY ?? 0;
      offLeft = ox;
      offRight = -(spriteW - (ox + w));
      offTop = oy;
      offBottom = -(spriteH - (oy + h));
    }
  }

  const effectiveX = offLeft;
  const effectiveY = offTop;
  const effectiveWidth = Math.max(8, spriteW + offRight - offLeft);
  const effectiveHeight = Math.max(8, spriteH + offBottom - offTop);

  return {
    effectiveX,
    effectiveY,
    effectiveWidth,
    effectiveHeight,
    offLeft,
    offRight,
    offTop,
    offBottom,
    // Alias untuk kompatibilitas kode lama
    spriteW,
    spriteH,
    hitboxWidth: effectiveWidth,
    hitboxHeight: effectiveHeight,
    offsetX: effectiveX,
    offsetY: effectiveY
  };
}

export interface PlayerConfig {
  canJump: boolean;
  jumpForce: number;
  speed: number;
  width?: number;  // Visual rendering width (default: 44)
  height?: number; // Visual rendering height (default: 60)
  startX?: number; // Initial X position in the world
  startY?: number; // Initial Y position in the world
  collider?: PlayerColliderConfig;
  idleSprite: SpriteAsset;
  runSprite: SpriteAsset;
  editable_appearance: boolean;
  editableLabel?: string;
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

export interface PlatformerProject extends BaseProject {
  theme_type: 'platformer';
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
}
