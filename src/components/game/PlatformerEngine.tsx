'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlatformerProject, InteractiveEntity, SpriteAsset, getPlayerHitboxBounds } from '@/types/platformer';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  X,
  Send,
  ExternalLink,
  MessageCircle,
  Crosshair,
  ArrowUp,
  Gamepad2
} from 'lucide-react';
import { addRSVPToProject } from '@/lib/projectStorage';
import { audioEngine } from '@/lib/audioEngine';
import { getDeviceProfile } from '@/lib/deviceDetection';

interface PlatformerEngineProps {
  project: PlatformerProject;
  mode?: 'play' | 'test' | 'preview';
  guestName?: string;
  onExitTestMode?: () => void;
  className?: string;

  // Editor Interactivity Props
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string | null) => void;
  onUpdateEntityPosition?: (id: string, x: number, y: number) => void;

  selectedPlatformId?: string | null;
  onSelectPlatform?: (id: string | null) => void;
  onUpdatePlatformPosition?: (id: string, x: number, y: number) => void;

  isPlayerSelected?: boolean;
  onSelectPlayer?: (selected: boolean) => void;
  onUpdatePlayerPosition?: (x: number, y: number) => void;

  editorCameraX?: number;
  onCameraChange?: (camX: number) => void;

  // Viewport orientation: 'portrait' | 'landscape' | 'responsive'
  viewportOrientation?: 'portrait' | 'landscape' | 'responsive';

  // Virtual controls visibility: if provided, controlled by parent. If omitted, auto (true in portrait, false in landscape)
  showControls?: boolean;
  onToggleControls?: (show: boolean) => void;
}

export default function PlatformerEngine({
  project,
  mode = 'play',
  guestName,
  onExitTestMode,
  className = '',
  selectedEntityId = null,
  onSelectEntity,
  onUpdateEntityPosition,
  selectedPlatformId = null,
  onSelectPlatform,
  onUpdatePlatformPosition,
  isPlayerSelected = false,
  onSelectPlayer,
  onUpdatePlayerPosition,
  editorCameraX,
  onCameraChange,
  viewportOrientation = 'responsive',
  showControls,
  onToggleControls
}: PlatformerEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Orientation state: determine if current canvas should render in portrait
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    if (viewportOrientation === 'portrait') return true;
    if (viewportOrientation === 'landscape') return false;
    if (typeof window !== 'undefined') {
      const dev = getDeviceProfile();
      return dev.defaultOrientation === 'portrait';
    }
    return false;
  });

  useEffect(() => {
    if (viewportOrientation === 'portrait') {
      setIsPortrait(true);
    } else if (viewportOrientation === 'landscape') {
      setIsPortrait(false);
    } else {
      const handleResize = () => {
        const dev = getDeviceProfile();
        setIsPortrait(dev.defaultOrientation === 'portrait');
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }
  }, [viewportOrientation]);

  // Virtual controls visibility state:
  // In portrait: automatically open. In landscape/desktop: default hidden (can be toggled)
  const [internalShowControls, setInternalShowControls] = useState<boolean>(() => {
    if (showControls !== undefined) return showControls;
    return isPortrait;
  });

  useEffect(() => {
    if (showControls !== undefined) {
      setInternalShowControls(showControls);
    } else {
      setInternalShowControls(isPortrait);
    }
  }, [showControls, isPortrait]);

  const effectiveShowControls = showControls !== undefined ? showControls : internalShowControls;

  const toggleControls = () => {
    const next = !effectiveShowControls;
    setInternalShowControls(next);
    onToggleControls?.(next);
  };

  // Active interaction modal state
  const [activeEntity, setActiveEntity] = useState<InteractiveEntity | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [nearbyEntity, setNearbyEntity] = useState<InteractiveEntity | null>(null);

  // Active touch buttons feedback
  const [activeTouchKeys, setActiveTouchKeys] = useState<{ left: boolean; right: boolean; jump: boolean }>({
    left: false,
    right: false,
    jump: false
  });

  // RSVP Form internal state
  const [rsvpName, setRsvpName] = useState(guestName || '');
  const [rsvpStatus, setRsvpStatus] = useState<'hadir' | 'tidak_hadir' | 'ragu'>('hadir');
  const [rsvpPax, setRsvpPax] = useState(1);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  // Canvas cursor state in preview mode
  const [canvasCursor, setCanvasCursor] = useState<'default' | 'grab' | 'grabbing' | 'move' | 'pointer'>('default');
  const [showHitboxes, setShowHitboxes] = useState(false);
  const prevNearbyIdRef = useRef<string | null>(null);

  // Sync mute state and handle unmount cleanup
  useEffect(() => {
    audioEngine.setMuted(isAudioMuted);
  }, [isAudioMuted]);

  useEffect(() => {
    return () => {
      audioEngine.stopBGM();
    };
  }, []);

  // Image cache
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Input states (only active in play/test mode)
  const keysRef = useRef<{ left: boolean; right: boolean; jump: boolean; interact: boolean }>({
    left: false,
    right: false,
    jump: false,
    interact: false
  });

  // Camera X state for preview mode (synced with editorCameraX if provided)
  const previewCamXRef = useRef<number>(editorCameraX || 0);

  useEffect(() => {
    if (editorCameraX !== undefined) {
      previewCamXRef.current = editorCameraX;
    }
  }, [editorCameraX]);

  // Initial player coordinates & dimensions from config or sensible defaults
  const initialPlayerX = project.player.startX ?? 100;
  const initialPlayerY = project.player.startY ?? (project.world.groundY ? project.world.groundY - 64 : 396);
  const initialSpriteWidth = project.player.width ?? 44;
  const initialSpriteHeight = project.player.height ?? 60;

  // Game state references
  const gameStateRef = useRef({
    player: {
      x: initialPlayerX,
      y: initialPlayerY,
      vx: 0,
      vy: 0,
      width: initialSpriteWidth,
      height: initialSpriteHeight,
      isGrounded: false,
      facing: 'right' as 'left' | 'right',
      state: 'idle' as 'idle' | 'run',
      frameIndex: 0,
      frameTimeAccum: 0
    },
    cameraX: editorCameraX || 0,
    lastTime: 0
  });

  // When project start position or size changes in preview mode, update player state
  useEffect(() => {
    if (mode === 'preview') {
      gameStateRef.current.player.x = project.player.startX ?? 100;
      gameStateRef.current.player.y = project.player.startY ?? (project.world.groundY ? project.world.groundY - 64 : 396);
      gameStateRef.current.player.width = project.player.width ?? 44;
      gameStateRef.current.player.height = project.player.height ?? 60;
      gameStateRef.current.player.vx = 0;
      gameStateRef.current.player.vy = 0;
    }
  }, [project.player.startX, project.player.startY, project.player.width, project.player.height, project.world.groundY, mode]);

  // Dragging state for preview mode
  const dragRef = useRef<{
    active: boolean;
    type: 'entity' | 'platform' | 'player' | 'pan';
    id?: string;
    startObjX: number;
    startObjY: number;
    mouseStartWorldX: number;
    mouseStartWorldY: number;
    clientStartX: number;
    startCamX: number;
  } | null>(null);

  // Helper to load image with cache
  const getImage = useCallback((src: string): HTMLImageElement | null => {
    if (!src) return null;
    let img = imageCacheRef.current.get(src);
    if (!img) {
      img = new Image();
      img.src = src;
      imageCacheRef.current.set(src, img);
    }
    return img.complete ? img : null;
  }, []);

  // Helper to render static sprite or multi-frame sequence
  const renderSprite = useCallback((
    ctx: CanvasRenderingContext2D,
    sprite: SpriteAsset,
    x: number,
    y: number,
    w: number,
    h: number,
    dt: number,
    flipX: boolean
  ) => {
    if (!sprite || !sprite.frames || sprite.frames.length === 0) return;

    let frameSrc = sprite.frames[0];

    if (sprite.type === 'sequence' && sprite.frames.length > 1) {
      const fps = sprite.frameRate || 8;
      const interval = 1000 / fps;
      const totalFrames = sprite.frames.length;
      const frameIdx = Math.floor(performance.now() / interval) % totalFrames;
      frameSrc = sprite.frames[frameIdx];
    }

    const img = getImage(frameSrc);
    if (!img) return;

    ctx.save();
    if (flipX) {
      ctx.translate(x + w, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, w, h);
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
    ctx.restore();
  }, [getImage]);

  // Reset player position (for test mode)
  const resetPlayer = () => {
    gameStateRef.current.player.x = project.player.startX ?? 80;
    gameStateRef.current.player.y = project.player.startY ?? (project.world.groundY ? project.world.groundY - 64 : 300);
    gameStateRef.current.player.vx = 0;
    gameStateRef.current.player.vy = 0;
    gameStateRef.current.cameraX = 0;
    setActiveEntity(null);
  };

  // Keyboard Event Listeners (only enabled in 'play' or 'test' mode)
  useEffect(() => {
    if (mode === 'preview') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (!isAudioMuted) {
        audioEngine.startBGM(project.audio?.bgm);
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keysRef.current.jump = true;
      if (e.code === 'KeyE' || e.code === 'Enter') {
        keysRef.current.interact = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keysRef.current.jump = false;
      if (e.code === 'KeyE' || e.code === 'Enter') keysRef.current.interact = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, isAudioMuted, project.audio?.bgm]);

  // Main Game / Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    gameStateRef.current.lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - gameStateRef.current.lastTime) / 1000, 0.1);
      gameStateRef.current.lastTime = time;

      const { player } = gameStateRef.current;
      const { world, player: playerConf, entities } = project;
      const gravity = 28;
      const groundY = world.groundY || 460;

      // ==========================================
      // 1. PHYSICS & CONTROLS (ONLY IN PLAY/TEST)
      // ==========================================
      if (mode !== 'preview') {
        // Horizontal movement
        if (!activeEntity) {
          if (keysRef.current.left) {
            player.vx = -playerConf.speed * 60;
            player.facing = 'left';
            player.state = 'run';
          } else if (keysRef.current.right) {
            player.vx = playerConf.speed * 60;
            player.facing = 'right';
            player.state = 'run';
          } else {
            player.vx = 0;
            player.state = 'idle';
          }

          // Jumping
          if (playerConf.canJump && keysRef.current.jump && player.isGrounded) {
            player.vy = -playerConf.jumpForce * 38;
            player.isGrounded = false;
            audioEngine.playJump(playerConf ? project.audio?.jump : undefined);
          }
        } else {
          player.vx = 0;
          player.state = 'idle';
        }

        // Player collider parameters & visual size
        const {
          spriteW: spriteWidth,
          spriteH: spriteHeight,
          hitboxWidth: colWidth,
          hitboxHeight: colHeight,
          offsetX: colOffsetX,
          offsetY: colOffsetY
        } = getPlayerHitboxBounds(playerConf);

        player.width = spriteWidth;
        player.height = spriteHeight;

        // Gravity & Vertical movement
        player.vy += gravity * 40 * dt;
        player.x += player.vx * dt;
        player.y += player.vy * dt;

        // Bound player within world (using collider boundaries)
        if (player.x + colOffsetX < 10) {
          player.x = 10 - colOffsetX;
        }
        if (player.x + colOffsetX + colWidth > world.worldWidth - 20) {
          player.x = world.worldWidth - 20 - colWidth - colOffsetX;
        }

        // Collision detection
        player.isGrounded = false;

        // Ground Collision (snaps collider bottom to ground line)
        if (world.groundMode === 'endless') {
          const colBottom = player.y + colOffsetY + colHeight;
          if (colBottom >= groundY) {
            player.y = groundY - colHeight - colOffsetY;
            player.vy = 0;
            player.isGrounded = true;
          }
        }

        // Platforms Collision (using collider bounds & offset)
        if (world.platforms && world.platforms.length > 0) {
          const colLeft = player.x + colOffsetX;
          const colRight = colLeft + colWidth;
          const colBottom = player.y + colOffsetY + colHeight;
          const prevColBottom = (player.y - player.vy * dt) + colOffsetY + colHeight;

          for (const plat of world.platforms) {
            if (
              colRight > plat.x &&
              colLeft < plat.x + plat.width &&
              prevColBottom <= plat.y + 12 &&
              colBottom >= plat.y &&
              player.vy >= 0
            ) {
              player.y = plat.y - colHeight - colOffsetY;
              player.vy = 0;
              player.isGrounded = true;
            }
          }
        }

        // Player sounds during gameplay (walking footsteps & gentle idle ambient)
        if (player.isGrounded) {
          if (player.state === 'run' && Math.abs(player.vx) > 0.1) {
            audioEngine.playFootstep(project.audio?.footstep);
          } else if (player.state === 'idle') {
            audioEngine.playIdle(project.audio?.idle);
          }
        }

        // Camera following player
        const targetCamX = player.x - canvas.width * 0.4;
        gameStateRef.current.cameraX = Math.max(
          0,
          Math.min(targetCamX, world.worldWidth - canvas.width)
        );

        // Proximity detection (centered on player collider)
        let closest: InteractiveEntity | null = null;
        for (const ent of entities) {
          if (!ent.hasInteraction) continue;
          const pCenterX = player.x + colOffsetX + colWidth / 2;
          const pCenterY = player.y + colOffsetY + colHeight / 2;
          const dist = Math.hypot(
            pCenterX - (ent.x + ent.width / 2),
            pCenterY - (ent.y + ent.height / 2)
          );
          if (dist < 85) {
            closest = ent;
            break;
          }
        }

        // Proximity chime: bunyikan saat mendekati objek yang dapat diinteraksikan
        if (closest && closest.id !== prevNearbyIdRef.current) {
          audioEngine.playProximityChime(project.audio?.proximity);
        }
        prevNearbyIdRef.current = closest ? closest.id : null;
        setNearbyEntity(closest);

        // Interaction chime: bunyikan saat diinteraksikan
        if (keysRef.current.interact && closest && !activeEntity) {
          audioEngine.playInteraction(project.audio?.interact);
          setActiveEntity(closest);
          keysRef.current.interact = false;
        }
      } else {
        // ==========================================
        // PREVIEW / EDITOR MODE: NO GRAVITY, STATIC
        // ==========================================
        player.vx = 0;
        player.vy = 0;
        player.state = 'idle';
        player.isGrounded = true;
        // Keep camera aligned with previewCamXRef
        gameStateRef.current.cameraX = previewCamXRef.current;
      }

      const camX = gameStateRef.current.cameraX;

      // ==========================================
      // 2. RENDER CANVAS
      // ==========================================
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // A. PARALLAX BACKGROUNDS
      if (world.parallaxLayers && world.parallaxLayers.length > 0) {
        for (const layer of world.parallaxLayers) {
          const bgImg = getImage(layer.imageUrl);
          if (bgImg && bgImg.width > 0) {
            const layerSpeed = layer.speedRatio || 0.1;
            const scrollOffset = (camX * layerSpeed) % canvas.width;
            const yPos = layer.yOffset || 0;
            const drawH = canvas.height;
            const drawW = canvas.width;

            ctx.drawImage(bgImg, -scrollOffset, yPos, drawW, drawH);
            ctx.drawImage(bgImg, drawW - scrollOffset, yPos, drawW, drawH);
          }
        }
      } else {
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      // Apply Camera Translation
      ctx.translate(-camX, 0);

      // B. RENDER GROUND
      if (world.groundMode === 'endless') {
        // Grass top
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(0, groundY, world.worldWidth, 16);
        // Dirt under
        ctx.fillStyle = '#78350f';
        ctx.fillRect(0, groundY + 16, world.worldWidth, canvas.height - groundY - 16);

        // Ground stone accents
        ctx.fillStyle = '#92400e';
        for (let gx = 40; gx < world.worldWidth; gx += 120) {
          ctx.beginPath();
          ctx.arc(gx, groundY + 28, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // C. RENDER FLOATING PLATFORMS (SUPPORTING IMAGES & TEXTURES)
      if (world.platforms) {
        for (const plat of world.platforms) {
          if (plat.tileTextureUrl) {
            const texImg = getImage(plat.tileTextureUrl);
            if (texImg && texImg.complete && texImg.naturalWidth > 0) {
              ctx.save();
              // Repeat tile texture horizontally across platform width
              const tileW = Math.min(texImg.naturalWidth, 48);
              const tileH = plat.height;
              for (let px = plat.x; px < plat.x + plat.width; px += tileW) {
                const drawW = Math.min(tileW, plat.x + plat.width - px);
                ctx.drawImage(
                  texImg,
                  0,
                  0,
                  (drawW / tileW) * texImg.naturalWidth,
                  texImg.naturalHeight,
                  px,
                  plat.y,
                  drawW,
                  tileH
                );
              }
              // Subtle border
              ctx.strokeStyle = 'rgba(0,0,0,0.35)';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
              ctx.restore();
            } else {
              // Fallback solid color while loading texture
              ctx.fillStyle = plat.tileColor || '#4ade80';
              ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
            }
          } else {
            // Solid color with stylish border & highlight
            ctx.fillStyle = plat.tileColor || '#4ade80';
            ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 2;
            ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.fillRect(plat.x, plat.y, plat.width, 4);
          }

          // In preview mode: outline if selected
          if (mode === 'preview' && selectedPlatformId === plat.id) {
            ctx.save();
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2.5;
            ctx.strokeRect(plat.x - 3, plat.y - 3, plat.width + 6, plat.height + 6);

            // Corner anchor nodes
            ctx.fillStyle = '#38bdf8';
            const corners = [
              [plat.x - 5, plat.y - 5],
              [plat.x + plat.width - 1, plat.y - 5],
              [plat.x - 5, plat.y + plat.height - 1],
              [plat.x + plat.width - 1, plat.y + plat.height - 1]
            ];
            corners.forEach(([cx, cy]) => {
              ctx.fillRect(cx, cy, 6, 6);
            });

            // Dimension & position floating label
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(plat.x, plat.y - 22, 130, 18);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.strokeRect(plat.x, plat.y - 22, 130, 18);
            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`Pijakan: ${plat.width}x${plat.height}`, plat.x + 6, plat.y - 9);
            ctx.restore();
          }
        }
      }

      // D. RENDER ENTITIES (NPC, Obstacles, Decorations)
      for (const ent of entities) {
        renderSprite(ctx, ent.sprite, ent.x, ent.y, ent.width, ent.height, dt, false);

        // Proximity badge in play/test mode
        if (mode !== 'preview' && ent.hasInteraction && nearbyEntity?.id === ent.id) {
          ctx.save();
          const bounce = Math.sin(time / 150) * 4;
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(ent.x + ent.width / 2, ent.y - 18 + bounce, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', ent.x + ent.width / 2, ent.y - 18 + bounce);
          ctx.restore();
        }

        // Selection outline in preview mode
        if (mode === 'preview' && selectedEntityId === ent.id) {
          ctx.save();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(ent.x - 3, ent.y - 3, ent.width + 6, ent.height + 6);

          // Corner handles
          ctx.fillStyle = '#f59e0b';
          const corners = [
            [ent.x - 5, ent.y - 5],
            [ent.x + ent.width - 1, ent.y - 5],
            [ent.x - 5, ent.y + ent.height - 1],
            [ent.x + ent.width - 1, ent.y + ent.height - 1]
          ];
          corners.forEach(([cx, cy]) => {
            ctx.fillRect(cx, cy, 6, 6);
          });

          // Label
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(ent.x, ent.y - 22, 140, 18);
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          ctx.strokeRect(ent.x, ent.y - 22, 140, 18);
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`Objek: (${ent.x}, ${ent.y})`, ent.x + 6, ent.y - 9);
          ctx.restore();
        }
      }

      // E. RENDER PLAYER
      const currentSprite: SpriteAsset =
        player.state === 'run' ? playerConf.runSprite : playerConf.idleSprite;

      renderSprite(
        ctx,
        currentSprite,
        player.x,
        player.y,
        player.width,
        player.height,
        dt,
        player.facing === 'left'
      );

      // Render Collision Box (Hitbox) & Selection Outline in preview/editor mode or debug mode
      if (mode === 'preview' || showHitboxes) {
        const {
          offLeft,
          offRight,
          offTop,
          offBottom,
          hitboxWidth: colWidth,
          hitboxHeight: colHeight,
          offsetX: colOffsetX,
          offsetY: colOffsetY
        } = getPlayerHitboxBounds(playerConf);

        const cX = player.x + colOffsetX;
        const cY = player.y + colOffsetY;

        ctx.save();
        // Green semi-transparent collider box
        ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
        ctx.fillRect(cX, cY, colWidth, colHeight);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(cX, cY, colWidth, colHeight);
        ctx.setLineDash([]);

        // Small center mark of collider
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cX + colWidth / 2 - 4, cY + colHeight / 2);
        ctx.lineTo(cX + colWidth / 2 + 4, cY + colHeight / 2);
        ctx.moveTo(cX + colWidth / 2, cY + colHeight / 2 - 4);
        ctx.lineTo(cX + colWidth / 2, cY + colHeight / 2 + 4);
        ctx.stroke();

        // When selected in preview mode
        if (mode === 'preview' && isPlayerSelected) {
          // Sprite visual bounding outline (purple dashed)
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(player.x - 2, player.y - 2, player.width + 4, player.height + 4);

          // Corner handles
          ctx.fillStyle = '#c084fc';
          const corners = [
            [player.x - 4, player.y - 4],
            [player.x + player.width - 2, player.y - 4],
            [player.x - 4, player.y + player.height - 2],
            [player.x + player.width - 2, player.y + player.height - 2]
          ];
          corners.forEach(([cornerX, cornerY]) => {
            ctx.fillRect(cornerX, cornerY, 6, 6);
          });

          // Label floating above
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.fillRect(player.x - 10, player.y - 40, 240, 34);
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 1;
          ctx.strokeRect(player.x - 10, player.y - 40, 240, 34);

          ctx.fillStyle = '#f3e8ff';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(`Gambar: ${player.width}x${player.height} px`, player.x - 4, player.y - 26);

          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 9px monospace';
          ctx.fillText(`Hitbox: ${colWidth}x${colHeight} (L:${offLeft} R:${offRight} T:${offTop} B:${offBottom})`, player.x - 4, player.y - 12);
        }
        ctx.restore();
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    project,
    activeEntity,
    getImage,
    renderSprite,
    mode,
    selectedEntityId,
    selectedPlatformId,
    isPlayerSelected,
    nearbyEntity,
    showHitboxes
  ]);

  // ========================================================
  // PREVIEW / EDITOR MOUSE & TOUCH INTERACTIONS (DRAG & SELECT & PAN)
  // ========================================================
  const getCanvasWorldCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { worldX: 0, worldY: 0, canvasX: 0, canvasY: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    const worldX = Math.round(canvasX + previewCamXRef.current);
    const worldY = Math.round(canvasY);
    return { worldX, worldY, canvasX, canvasY };
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    if (mode !== 'preview') {
      if (!isAudioMuted) {
        audioEngine.startBGM(project.audio?.bgm);
      }
      return;
    }
    const { worldX, worldY } = getCanvasWorldCoords(clientX, clientY);
    const { entities, world, player } = project;
    const playerX = player.startX ?? 100;
    const playerY = player.startY ?? (world.groundY ? world.groundY - 64 : 396);

    // 1. Check Entities (in reverse order to select topmost)
    for (let i = entities.length - 1; i >= 0; i--) {
      const ent = entities[i];
      if (
        worldX >= ent.x &&
        worldX <= ent.x + ent.width &&
        worldY >= ent.y &&
        worldY <= ent.y + ent.height
      ) {
        onSelectEntity?.(ent.id);
        onSelectPlatform?.(null);
        onSelectPlayer?.(false);

        dragRef.current = {
          active: true,
          type: 'entity',
          id: ent.id,
          startObjX: ent.x,
          startObjY: ent.y,
          mouseStartWorldX: worldX,
          mouseStartWorldY: worldY,
          clientStartX: clientX,
          startCamX: previewCamXRef.current
        };
        setCanvasCursor('move');
        return;
      }
    }

    // 2. Check Player (hits visual sprite or collider box)
    const {
      spriteW,
      spriteH,
      hitboxWidth: colW,
      hitboxHeight: colH,
      offsetX: colOffX,
      offsetY: colOffY
    } = getPlayerHitboxBounds(player);

    const isPlayerHit = (
      (worldX >= playerX && worldX <= playerX + spriteW && worldY >= playerY && worldY <= playerY + spriteH) ||
      (worldX >= playerX + colOffX && worldX <= playerX + colOffX + colW &&
       worldY >= playerY + colOffY && worldY <= playerY + colOffY + colH)
    );

    if (isPlayerHit) {
      onSelectPlayer?.(true);
      onSelectEntity?.(null);
      onSelectPlatform?.(null);

      dragRef.current = {
        active: true,
        type: 'player',
        startObjX: playerX,
        startObjY: playerY,
        mouseStartWorldX: worldX,
        mouseStartWorldY: worldY,
        clientStartX: clientX,
        startCamX: previewCamXRef.current
      };
      setCanvasCursor('move');
      return;
    }

    // 3. Check Platforms
    if (world.platforms) {
      for (let i = world.platforms.length - 1; i >= 0; i--) {
        const plat = world.platforms[i];
        if (
          worldX >= plat.x &&
          worldX <= plat.x + plat.width &&
          worldY >= plat.y &&
          worldY <= plat.y + plat.height
        ) {
          onSelectPlatform?.(plat.id);
          onSelectEntity?.(null);
          onSelectPlayer?.(false);

          dragRef.current = {
            active: true,
            type: 'platform',
            id: plat.id,
            startObjX: plat.x,
            startObjY: plat.y,
            mouseStartWorldX: worldX,
            mouseStartWorldY: worldY,
            clientStartX: clientX,
            startCamX: previewCamXRef.current
          };
          setCanvasCursor('move');
          return;
        }
      }
    }

    // 4. Clicked on Empty Area -> Start Camera Pan
    dragRef.current = {
      active: true,
      type: 'pan',
      startObjX: 0,
      startObjY: 0,
      mouseStartWorldX: worldX,
      mouseStartWorldY: worldY,
      clientStartX: clientX,
      startCamX: previewCamXRef.current
    };
    setCanvasCursor('grabbing');
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (mode !== 'preview') return;
    const { worldX, worldY } = getCanvasWorldCoords(clientX, clientY);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (dragRef.current && dragRef.current.active) {
      const drag = dragRef.current;

      if (drag.type === 'entity' && drag.id) {
        const deltaX = worldX - drag.mouseStartWorldX;
        const deltaY = worldY - drag.mouseStartWorldY;
        const newX = Math.max(0, Math.min(project.world.worldWidth - 50, drag.startObjX + deltaX));
        const newY = Math.max(0, Math.min(canvas.height - 50, drag.startObjY + deltaY));
        onUpdateEntityPosition?.(drag.id, Math.round(newX), Math.round(newY));
      } else if (drag.type === 'platform' && drag.id) {
        const deltaX = worldX - drag.mouseStartWorldX;
        const deltaY = worldY - drag.mouseStartWorldY;
        const plat = project.world.platforms.find(p => p.id === drag.id);
        const pWidth = plat ? plat.width : 100;
        const pHeight = plat ? plat.height : 24;
        const newX = Math.max(0, Math.min(project.world.worldWidth - pWidth, drag.startObjX + deltaX));
        const newY = Math.max(0, Math.min(canvas.height - pHeight, drag.startObjY + deltaY));
        onUpdatePlatformPosition?.(drag.id, Math.round(newX), Math.round(newY));
      } else if (drag.type === 'player') {
        const deltaX = worldX - drag.mouseStartWorldX;
        const deltaY = worldY - drag.mouseStartWorldY;
        const newX = Math.max(10, Math.min(project.world.worldWidth - 60, drag.startObjX + deltaX));
        const newY = Math.max(10, Math.min(canvas.height - 70, drag.startObjY + deltaY));
        onUpdatePlayerPosition?.(Math.round(newX), Math.round(newY));
      } else if (drag.type === 'pan') {
        const deltaClientX = clientX - drag.clientStartX;
        const maxCam = Math.max(0, project.world.worldWidth - canvas.width);
        const newCamX = Math.max(0, Math.min(maxCam, Math.round(drag.startCamX - deltaClientX)));
        previewCamXRef.current = newCamX;
        gameStateRef.current.cameraX = newCamX;
        onCameraChange?.(newCamX);
      }
      return;
    }

    // Hover detection to update cursor
    const { entities, world, player } = project;
    const playerX = player.startX ?? 100;
    const playerY = player.startY ?? (world.groundY ? world.groundY - 64 : 396);

    let isOverItem = false;
    for (const ent of entities) {
      if (worldX >= ent.x && worldX <= ent.x + ent.width && worldY >= ent.y && worldY <= ent.y + ent.height) {
        isOverItem = true;
        break;
      }
    }
    if (!isOverItem && worldX >= playerX && worldX <= playerX + 44 && worldY >= playerY && worldY <= playerY + 60) {
      isOverItem = true;
    }
    if (!isOverItem && world.platforms) {
      for (const plat of world.platforms) {
        if (worldX >= plat.x && worldX <= plat.x + plat.width && worldY >= plat.y && worldY <= plat.y + plat.height) {
          isOverItem = true;
          break;
        }
      }
    }

    setCanvasCursor(isOverItem ? 'pointer' : 'grab');
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
    }
    setCanvasCursor('default');
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerDown(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handlePointerUp();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (mode !== 'preview' || e.touches.length === 0) return;
    const t = e.touches[0];
    handlePointerDown(t.clientX, t.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (mode !== 'preview' || e.touches.length === 0) return;
    const t = e.touches[0];
    handlePointerMove(t.clientX, t.clientY);
  };

  const handleTouchEnd = () => {
    if (mode !== 'preview') return;
    handlePointerUp();
  };

  // Wheel panning in preview mode
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (mode !== 'preview') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const delta = Math.abs(e.deltaX) > 0 ? e.deltaX : e.deltaY;
    const maxCam = Math.max(0, project.world.worldWidth - canvas.width);
    const newCamX = Math.max(0, Math.min(maxCam, Math.round(previewCamXRef.current + delta * 0.8)));
    previewCamXRef.current = newCamX;
    gameStateRef.current.cameraX = newCamX;
    onCameraChange?.(newCamX);
  };

  // Trigger RSVP Submission
  const handleRSVPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim()) return;

    const ok = await addRSVPToProject(project.slug, {
      guestName: rsvpName,
      attendance: rsvpStatus,
      pax: Number(rsvpPax),
      message: rsvpMessage
    });
    if (!ok) {
      alert('Gagal mengirim RSVP. Silakan coba lagi.');
      return;
    }

    setRsvpSubmitted(true);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const canvasWidth = isPortrait ? 450 : 800;
  const canvasHeight = isPortrait ? 600 : 500;

  return (
    <div className={`relative flex flex-col items-center justify-center bg-slate-950 select-none overflow-hidden ${className}`}>
      {/* Canvas Viewport Container */}
      <div className={`relative w-full ${isPortrait ? 'max-w-md' : 'max-w-4xl'} flex items-center justify-center`}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            cursor: mode === 'preview' ? canvasCursor : 'default',
            touchAction: mode === 'preview' ? 'none' : 'auto'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`w-full h-auto bg-sky-200 rounded-2xl shadow-2xl border border-slate-800 ${
            isPortrait ? 'aspect-[3/4]' : 'aspect-[16/10]'
          }`}
        />

        {/* Top Overlay Controls */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-2">
          {/* Title or Guest Greeting */}
          <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 shadow-lg text-xs text-slate-100 flex items-center gap-1.5 sm:gap-2 truncate max-w-[65%]">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-semibold truncate">{project.title}</span>
            {guestName && (
              <span className="text-amber-300 font-medium border-l border-slate-700 pl-1.5 sm:pl-2 shrink-0">
                Tamu: {guestName}
              </span>
            )}
          </div>

          {/* Action buttons (Mute, Reset, Exit Test, Hitbox Debug) */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Hitbox visual toggle (Hanya tampil di Test Mode) */}
            {mode === 'test' && (
              <button
                type="button"
                onClick={() => setShowHitboxes(prev => !prev)}
                className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full text-[11px] font-semibold backdrop-blur shadow flex items-center gap-1 transition cursor-pointer border ${
                  showHitboxes
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title="Tampilkan / Sembunyikan Area Tabrakan (Hitbox)"
              >
                <Crosshair className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Hitbox:</span> {showHitboxes ? 'ON' : 'OFF'}
              </button>
            )}

            {mode === 'test' && (
              <button
                onClick={resetPlayer}
                className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] font-semibold shadow flex items-center gap-1 transition"
                title="Reset Posisi Karakter"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Reset Pos</span>
              </button>
            )}

            {mode === 'test' && onExitTestMode && (
              <button
                onClick={onExitTestMode}
                className="bg-rose-600 hover:bg-rose-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] font-semibold shadow flex items-center gap-1 transition cursor-pointer"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}

            {/* Toggle Virtual Controls Button */}
            {mode !== 'preview' && (
              <button
                type="button"
                onClick={toggleControls}
                className={`p-1.5 sm:p-2 rounded-full border backdrop-blur shadow transition cursor-pointer ${
                  effectiveShowControls
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title={effectiveShowControls ? 'Sembunyikan Tombol Virtual' : 'Tampilkan Tombol Virtual'}
              >
                <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            <button
              onClick={() => {
                const newMuted = !isAudioMuted;
                setIsAudioMuted(newMuted);
                audioEngine.setMuted(newMuted);
                if (!newMuted) {
                  audioEngine.startBGM(project.audio?.bgm);
                }
              }}
              className="p-1.5 sm:p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 backdrop-blur shadow transition cursor-pointer"
              title={isAudioMuted ? 'Nyalakan Musik & Suara' : 'Matikan Musik & Suara'}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>
          </div>
        </div>

        {/* Proximity Interaction Hint Pill in Play/Test mode */}
        {mode !== 'preview' && nearbyEntity && !activeEntity && (
          <div className="absolute top-14 sm:top-16 animate-bounce bg-amber-500 text-slate-950 font-bold px-3 sm:px-4 py-1.5 rounded-full shadow-xl border-2 border-white text-xs md:text-sm flex items-center gap-1.5 sm:gap-2 z-10 pointer-events-none">
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">Tekan [E] atau tombol Bicara</span>
          </div>
        )}
      </div>

      {/* VIRTUAL CONTROLLER BAR (DI BAGIAN BAWAH CANVAS) */}
      {mode !== 'preview' && effectiveShowControls && (
        <div className={`w-full ${isPortrait ? 'max-w-md' : 'max-w-4xl'} mt-2.5 sm:mt-3 px-3 py-2.5 sm:py-3.5 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between gap-2 sm:gap-4 select-none touch-none animate-in fade-in duration-200`}>
          {/* Left Thumb D-Pad (Left & Right) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.left = true;
                setActiveTouchKeys(prev => ({ ...prev, left: true }));
                if (!isAudioMuted) audioEngine.startBGM(project.audio?.bgm);
              }}
              onPointerUp={() => {
                keysRef.current.left = false;
                setActiveTouchKeys(prev => ({ ...prev, left: false }));
              }}
              onPointerCancel={() => {
                keysRef.current.left = false;
                setActiveTouchKeys(prev => ({ ...prev, left: false }));
              }}
              onPointerLeave={() => {
                keysRef.current.left = false;
                setActiveTouchKeys(prev => ({ ...prev, left: false }));
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-2xl transition border-2 shadow-lg select-none cursor-pointer active:scale-95 touch-none ${
                activeTouchKeys.left
                  ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/30'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 text-white border-slate-700'
              }`}
              aria-label="Gerak Kiri"
            >
              ◀
            </button>

            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.right = true;
                setActiveTouchKeys(prev => ({ ...prev, right: true }));
                if (!isAudioMuted) audioEngine.startBGM(project.audio?.bgm);
              }}
              onPointerUp={() => {
                keysRef.current.right = false;
                setActiveTouchKeys(prev => ({ ...prev, right: false }));
              }}
              onPointerCancel={() => {
                keysRef.current.right = false;
                setActiveTouchKeys(prev => ({ ...prev, right: false }));
              }}
              onPointerLeave={() => {
                keysRef.current.right = false;
                setActiveTouchKeys(prev => ({ ...prev, right: false }));
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-2xl transition border-2 shadow-lg select-none cursor-pointer active:scale-95 touch-none ${
                activeTouchKeys.right
                  ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/30'
                  : 'bg-slate-800/90 hover:bg-slate-700/90 text-white border-slate-700'
              }`}
              aria-label="Gerak Kanan"
            >
              ▶
            </button>
          </div>

          {/* Center: status / branding / proximity hint */}
          <div className="flex flex-col items-center justify-center text-center px-1">
            {nearbyEntity ? (
              <span className="text-[10px] sm:text-xs font-bold text-amber-400 animate-pulse flex items-center gap-1">
                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Bicara!
              </span>
            ) : (
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono tracking-wider">
                GemPad
              </span>
            )}
            <button
              type="button"
              onClick={resetPlayer}
              className="mt-0.5 text-[10px] text-slate-400 hover:text-amber-400 flex items-center gap-1 transition cursor-pointer"
              title="Reset Karakter"
            >
              <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              Reset
            </button>
          </div>

          {/* Right Thumb Action buttons (Interact & Jump) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Interact / Chat button */}
            <button
              type="button"
              onClick={() => {
                if (nearbyEntity) {
                  audioEngine.playInteraction(project.audio?.interact);
                  setActiveEntity(nearbyEntity);
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={!nearbyEntity}
              className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition border-2 shadow-lg select-none cursor-pointer active:scale-95 touch-none ${
                nearbyEntity
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-white ring-2 ring-amber-400/60 font-bold animate-pulse'
                  : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
              }`}
              aria-label="Bicara atau Interaksi"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
              <span className="text-[9px] sm:text-[10px] font-bold">Bicara</span>
            </button>

            {/* Jump button */}
            {project.player.canJump && (
              <button
                type="button"
                onPointerDown={() => {
                  keysRef.current.jump = true;
                  setActiveTouchKeys(prev => ({ ...prev, jump: true }));
                  if (!isAudioMuted) audioEngine.startBGM(project.audio?.bgm);
                }}
                onPointerUp={() => {
                  keysRef.current.jump = false;
                  setActiveTouchKeys(prev => ({ ...prev, jump: false }));
                }}
                onPointerCancel={() => {
                  keysRef.current.jump = false;
                  setActiveTouchKeys(prev => ({ ...prev, jump: false }));
                }}
                onPointerLeave={() => {
                  keysRef.current.jump = false;
                  setActiveTouchKeys(prev => ({ ...prev, jump: false }));
                }}
                onContextMenu={(e) => e.preventDefault()}
                className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-bold transition border-2 shadow-lg select-none cursor-pointer active:scale-95 touch-none ${
                  activeTouchKeys.jump
                    ? 'bg-emerald-400 text-slate-950 border-emerald-200 ring-2 ring-emerald-400/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                }`}
                aria-label="Lompat"
              >
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
                <span className="text-[9px] sm:text-[10px] font-bold">Lompat</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop Helper Bar for Play/Test Mode */}
      {mode !== 'preview' && (
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-400 mt-2">
          <span>Gunakan tombol <b>[A] / [D]</b> atau <b>Panah</b> untuk bergerak</span>
          {project.player.canJump && <span>• <b>[Spasi] / [W]</b> untuk Melompat</span>}
          <span>• <b>[E]</b> untuk Berinteraksi dengan Objek / NPC</span>
        </div>
      )}

      {/* POPUP MODAL DIALOGS */}
      {activeEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => {
                setActiveEntity(null);
                setRsvpSubmitted(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-300">
                  {activeEntity.interaction?.title || activeEntity.name}
                </h3>
                <p className="text-xs text-slate-400">Interaksi dengan {activeEntity.name}</p>
              </div>
            </div>

            {/* 1. INFO TYPE */}
            {activeEntity.interaction?.type === 'info' && (
              <div className="space-y-4">
                <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 text-slate-200 whitespace-pre-line leading-relaxed text-sm">
                  {activeEntity.interaction.content}
                </div>
                {activeEntity.interaction.actionUrl && (
                  <a
                    href={activeEntity.interaction.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-lg text-sm"
                  >
                    <span>{activeEntity.interaction.actionButtonText || 'Buka Tautan'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {/* 2. IMAGE LIGHTBOX */}
            {activeEntity.interaction?.type === 'image' && (
              <div className="space-y-4">
                {activeEntity.interaction.mediaUrl ? (
                  <div className="overflow-hidden rounded-xl border border-slate-700">
                    <img
                      src={activeEntity.interaction.mediaUrl}
                      alt={activeEntity.interaction.title || 'Foto Galeri'}
                      className="w-full h-auto max-h-72 object-cover hover:scale-105 transition duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-slate-800 flex items-center justify-center rounded-xl text-slate-400">
                    Tidak ada gambar
                  </div>
                )}
                {activeEntity.interaction.content && (
                  <p className="text-sm text-slate-300 italic text-center">
                    &ldquo;{activeEntity.interaction.content}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* 3. VIDEO PLAYER */}
            {activeEntity.interaction?.type === 'video' && (
              <div className="space-y-4">
                {activeEntity.interaction.mediaUrl ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-700 bg-black">
                    {activeEntity.interaction.mediaUrl.includes('youtube') ||
                    activeEntity.interaction.mediaUrl.includes('youtu.be') ? (
                      <iframe
                        src={activeEntity.interaction.mediaUrl}
                        title="Video Player"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={activeEntity.interaction.mediaUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-slate-800 flex items-center justify-center rounded-xl text-slate-400">
                    Tidak ada URL video
                  </div>
                )}
                {activeEntity.interaction.content && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {activeEntity.interaction.content}
                  </p>
                )}
              </div>
            )}

            {/* 4. RSVP FORM */}
            {activeEntity.interaction?.type === 'rsvp' && (
              <div>
                {rsvpSubmitted ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 flex items-center justify-center mx-auto text-2xl font-bold">
                      ✓
                    </div>
                    <h4 className="text-lg font-bold text-emerald-400">
                      Terima Kasih, {rsvpName}!
                    </h4>
                    <p className="text-sm text-slate-300">
                      Konfirmasi kehadiran Anda telah berhasil tersimpan. Sampai jumpa di hari bahagia kami!
                    </p>
                    <button
                      onClick={() => setActiveEntity(null)}
                      className="mt-4 px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition"
                    >
                      Lanjut Menjelajahi Game
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRSVPSubmit} className="space-y-3.5">
                    {activeEntity.interaction.content && (
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                        {activeEntity.interaction.content}
                      </p>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        required
                        value={rsvpName}
                        onChange={e => setRsvpName(e.target.value)}
                        placeholder="Masukkan nama Anda..."
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-base sm:text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Konfirmasi Kehadiran
                        </label>
                        <select
                          value={rsvpStatus}
                          onChange={e => setRsvpStatus(e.target.value as 'hadir' | 'tidak_hadir' | 'ragu')}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-base sm:text-sm focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="hadir">Pasti Hadir</option>
                          <option value="tidak_hadir">Maaf Tidak Bisa Hadir</option>
                          <option value="ragu">Masih Ragu</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Jumlah Tamu (Pax)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={rsvpPax}
                          onChange={e => setRsvpPax(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-base sm:text-sm focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Doa & Ucapan Selamat
                      </label>
                      <textarea
                        rows={2}
                        value={rsvpMessage}
                        onChange={e => setRsvpMessage(e.target.value)}
                        placeholder="Tuliskan pesan doa & restu untuk yang berhajat..."
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-base sm:text-sm focus:outline-none focus:border-amber-400 resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-lg text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                    >
                      <Send className="w-4 h-4" />
                      Kirim Konfirmasi Kehadiran
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
