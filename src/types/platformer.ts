export type SpriteType = 'static' | 'sequence';

export interface SpriteAsset {
  id: string;
  name: string;
  type: SpriteType;
  frames: string[]; // 1 URL for static, array of URLs for sequence
  frameRate?: number; // frames per second (default: 8)
  loop?: boolean; // default: true
  category?: 'player' | 'npc' | 'obstacle' | 'decoration' | 'background';
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
  rsvps?: RSVPRecord[];
}
