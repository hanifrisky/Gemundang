'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import {
  PlatformerProject,
  InteractiveEntity,
  Platform,
  ParallaxLayer,
  SpriteAsset,
  InteractionType,
  PlayerColliderConfig,
  getPlayerHitboxBounds,
  SoundAsset,
  SoundEventType
} from '@/types/platformer';
import { getProjectForEdit, saveProject } from '@/lib/projectStorage';
import AccessNotice from '@/components/auth/AccessNotice';
import PlatformerEngine from '@/components/game/PlatformerEngine';
import AssetLibraryModal from '@/components/asset-library/AssetLibraryModal';
import SoundLibraryModal from '@/components/sound-library/SoundLibraryModal';
import { PRESET_PLATFORM_TEXTURES, defaultCloudLayer } from '@/lib/assetLibrary';
import { DEFAULT_PROJECT_AUDIO, getSoundEventInfo } from '@/lib/soundLibrary';
import { audioEngine } from '@/lib/audioEngine';
import {
  Play,
  Pause,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  User,
  Sliders,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Eye,
  Edit3,
  Image as ImageIcon,
  Crosshair,
  ChevronUp,
  ChevronDown,
  TreePine,
  Shield,
  RotateCcw,
  Volume2,
  Music,
  Footprints,
  ArrowUp,
  Coffee,
  Bell,
  Square
} from 'lucide-react';
import Link from 'next/link';

function EditorContent() {
  const params = useParams();
  const slug = (params?.slug as string) || 'wedding-adventure';

  const [project, setProject] = useState<PlatformerProject | null>(null);
  const [isTestPlayMode, setIsTestPlayMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'entities' | 'world' | 'player' | 'parallax' | 'audio'>('entities');

  // Selected item state
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);
  const [isPlayerSelected, setIsPlayerSelected] = useState(false);

  // Editor camera position state
  const [editorCameraX, setEditorCameraX] = useState(0);

  // Unified Asset modal state (covers player, entity, platform texture, and parallax background)
  const [assetModalTarget, setAssetModalTarget] = useState<{
    target: 'player_idle' | 'player_run' | 'entity' | 'parallax' | 'platform';
    entityId?: string;
    layerId?: string;
    platformId?: string;
    categoryFilter?: 'character' | 'player' | 'npc' | 'obstacle' | 'decoration' | 'platform' | 'background' | 'all';
    title?: string;
  } | null>(null);

  // Sound selection modal state
  const [soundModalCategory, setSoundModalCategory] = useState<SoundEventType | null>(null);
  const [sidebarPlayingSound, setSidebarPlayingSound] = useState<string | null>(null);

  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [accessError, setAccessError] = useState<'unauthenticated' | 'forbidden' | 'not_found' | null>(null);

  // Load project on mount or slug change
  useEffect(() => {
    let cancelled = false;
    getProjectForEdit(slug)
      .then((res) => {
        if (cancelled) return;
        if (res.status === 'ok') setProject(res.project);
        else setAccessError(res.status);
      })
      .catch((err) => console.error('Gagal memuat projek:', err));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (accessError) return <AccessNotice status={accessError} />;

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        Memuat Level Editor GemUndang...
      </div>
    );
  }

  // Handle Save
  const handleSave = async () => {
    if (!project) return;
    const ok = await saveProject(project);
    if (!ok) {
      alert('Gagal menyimpan projek ke database.');
      return;
    }
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  // Camera pan helpers
  const panCamera = (delta: number) => {
    setEditorCameraX(prev => Math.max(0, Math.min(project.world.worldWidth - 800, prev + delta)));
  };

  const focusCameraOn = (x: number) => {
    setEditorCameraX(Math.max(0, Math.min(project.world.worldWidth - 800, Math.round(x - 350))));
  };

  // Entity mutations
  const updateEntity = (id: string, updates: Partial<InteractiveEntity>) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        entities: prev.entities.map(e => (e.id === id ? { ...e, ...updates } : e))
      };
    });
  };

  const updateEntityPosition = (id: string, x: number, y: number) => {
    updateEntity(id, { x, y });
  };

  const removeEntity = (id: string) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        entities: prev.entities.filter(e => e.id !== id)
      };
    });
    if (selectedEntityId === id) setSelectedEntityId(null);
  };

  const addEntity = (type: 'npc' | 'obstacle' | 'decoration') => {
    const defaultX = Math.min(project.world.worldWidth - 100, Math.max(50, editorCameraX + 350));
    const defaultY = project.world.groundY ? project.world.groundY - 64 : 396;
    const newEnt: InteractiveEntity = {
      id: `ent-${Date.now()}`,
      name: `Objek Baru ${project.entities.length + 1}`,
      type,
      x: defaultX,
      y: defaultY,
      width: 48,
      height: 64,
      sprite: project.player.idleSprite,
      hasInteraction: true,
      interaction: {
        type: 'info',
        title: 'Info Baru',
        content: 'Tuliskan deskripsi informasi di sini...'
      },
      editable_appearance: true,
      appearanceLabel: 'Kostum Objek',
      editable_content: true,
      contentLabel: 'Isi Informasi'
    };
    setProject(prev => prev ? { ...prev, entities: [...prev.entities, newEnt] } : prev);
    setSelectedEntityId(newEnt.id);
    setSelectedPlatformId(null);
    setIsPlayerSelected(false);
    setActiveTab('entities');
  };

  // Platform mutations
  const updatePlatform = (id: string, updates: Partial<Platform>) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        world: {
          ...prev.world,
          platforms: prev.world.platforms.map(p => (p.id === id ? { ...p, ...updates } : p))
        }
      };
    });
  };

  const updatePlatformPosition = (id: string, x: number, y: number) => {
    updatePlatform(id, { x, y });
  };

  const addPlatform = () => {
    const defaultX = Math.min(project.world.worldWidth - 200, Math.max(50, editorCameraX + 300));
    const newPlat: Platform = {
      id: `plat-${Date.now()}`,
      x: defaultX,
      y: 340,
      width: 140,
      height: 24,
      tileColor: '#4ade80'
    };
    setProject(prev => prev ? { ...prev, world: { ...prev.world, platforms: [...(prev.world.platforms || []), newPlat] } } : prev);
    setSelectedPlatformId(newPlat.id);
    setSelectedEntityId(null);
    setIsPlayerSelected(false);
    setActiveTab('world');
  };

  const removePlatform = (id: string) => {
    setProject(prev => prev ? { ...prev, world: { ...prev.world, platforms: prev.world.platforms.filter(p => p.id !== id) } } : prev);
    if (selectedPlatformId === id) setSelectedPlatformId(null);
  };

  // Player position update
  const updatePlayerPosition = (x: number, y: number) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        player: {
          ...prev.player,
          startX: x,
          startY: y
        }
      };
    });
  };

  // Player visual dimensions update
  const updatePlayerDimensions = (width: number, height: number) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        player: {
          ...prev.player,
          width: Math.max(16, width),
          height: Math.max(16, height)
        }
      };
    });
  };

  // Player collider & offset update
  const updatePlayerCollider = (colliderUpdates: Partial<PlayerColliderConfig>) => {
    setProject(prev => {
      if (!prev) return prev;
      const currentCollider = prev.player.collider || {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      };

      return {
        ...prev,
        player: {
          ...prev.player,
          collider: {
            ...currentCollider,
            ...colliderUpdates
          }
        }
      };
    });
  };

  // Parallax Layer mutations (Add, Remove, Move, Update)
  const updateParallaxLayer = (id: string, updates: Partial<ParallaxLayer>) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        world: {
          ...prev.world,
          parallaxLayers: prev.world.parallaxLayers.map(l => (l.id === id ? { ...l, ...updates } : l))
        }
      };
    });
  };

  const addParallaxLayer = () => {
    const newLayer: ParallaxLayer = {
      id: `layer-${Date.now()}`,
      name: `Layer Parallax ${project.world.parallaxLayers.length + 1}`,
      imageUrl: defaultCloudLayer,
      speedRatio: 0.3,
      yOffset: 30,
      editable_appearance: false
    };
    setProject(prev => prev ? { ...prev, world: { ...prev.world, parallaxLayers: [...prev.world.parallaxLayers, newLayer] } } : prev);
  };

  const removeParallaxLayer = (id: string) => {
    setProject(prev => prev ? { ...prev, world: { ...prev.world, parallaxLayers: prev.world.parallaxLayers.filter(l => l.id !== id) } } : prev);
  };

  const moveParallaxLayer = (id: string, direction: 'up' | 'down') => {
    setProject(prev => {
      if (!prev) return prev;
      const layers = [...prev.world.parallaxLayers];
      const index = layers.findIndex(l => l.id === id);
      if (index < 0) return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= layers.length) return prev;
      const temp = layers[index];
      layers[index] = layers[targetIndex];
      layers[targetIndex] = temp;
      return {
        ...prev,
        world: {
          ...prev.world,
          parallaxLayers: layers
        }
      };
    });
  };

  // Handle selection from unified Asset Library Modal
  const handleSelectSprite = (sprite: SpriteAsset) => {
    if (!assetModalTarget) return;

    if (assetModalTarget.target === 'player_idle') {
      setProject(prev => prev ? { ...prev, player: { ...prev.player, idleSprite: sprite } } : prev);
    } else if (assetModalTarget.target === 'player_run') {
      setProject(prev => prev ? { ...prev, player: { ...prev.player, runSprite: sprite } } : prev);
    } else if (assetModalTarget.target === 'entity' && assetModalTarget.entityId) {
      updateEntity(assetModalTarget.entityId, { sprite });
    } else if (assetModalTarget.target === 'platform' && assetModalTarget.platformId) {
      updatePlatform(assetModalTarget.platformId, { tileTextureUrl: sprite.frames[0] });
    } else if (assetModalTarget.target === 'parallax' && assetModalTarget.layerId) {
      updateParallaxLayer(assetModalTarget.layerId, { imageUrl: sprite.frames[0] });
    }
    setAssetModalTarget(null);
  };

  // Audio configuration updates
  const updateProjectAudio = (category: SoundEventType, sound: SoundAsset | undefined) => {
    setProject(prev => {
      if (!prev) return prev;
      const currentAudio = prev.audio || { ...DEFAULT_PROJECT_AUDIO };
      return {
        ...prev,
        audio: {
          ...currentAudio,
          [category]: sound
        }
      };
    });
  };

  const updateAudioVolume = (category: SoundEventType, volume: number) => {
    setProject(prev => {
      if (!prev) return prev;
      const currentAudio = prev.audio || { ...DEFAULT_PROJECT_AUDIO };
      const currentSound = currentAudio[category] || DEFAULT_PROJECT_AUDIO[category];
      if (!currentSound) return prev;
      return {
        ...prev,
        audio: {
          ...currentAudio,
          [category]: {
            ...currentSound,
            volume
          }
        }
      };
    });
  };

  const resetAudioToDefault = (category: SoundEventType) => {
    updateProjectAudio(category, DEFAULT_PROJECT_AUDIO[category]);
  };

  const handleToggleSidebarAudioPreview = (category: SoundEventType, sound?: SoundAsset) => {
    const soundToPlay = sound || (project?.audio?.[category] ?? DEFAULT_PROJECT_AUDIO[category]);
    if (!soundToPlay) return;

    if (sidebarPlayingSound === soundToPlay.id || sidebarPlayingSound === category) {
      audioEngine.stopPreview();
      setSidebarPlayingSound(null);
      return;
    }

    setSidebarPlayingSound(soundToPlay.id || category);
    audioEngine.previewSound(soundToPlay, () => {
      setSidebarPlayingSound(null);
    });
  };

  const selectedEntity = project.entities.find(e => e.id === selectedEntityId);
  const selectedPlatform = project.world.platforms.find(p => p.id === selectedPlatformId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* TOP HEADER & ACTION BAR */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">{project.title}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                slug: {project.slug}
              </span>
            </div>
            <p className="text-xs text-slate-400">Platformer Level & World Editor</p>
          </div>
        </div>

        {/* Action Controls & Navigation Switcher */}
        <div className="flex items-center gap-3">
          {/* Instant Test Play Mode Toggle */}
          <button
            onClick={() => setIsTestPlayMode(!isTestPlayMode)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer ${
              isTestPlayMode
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isTestPlayMode ? (
              <>
                <Pause className="w-4 h-4" />
                Kembali ke Mode Edit
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Coba Game (Test Play)
              </>
            )}
          </button>

          {/* Direct Link to Template Mode */}
          <Link
            href={`/template/${project.slug}`}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Buka Formulir Mode Template"
          >
            <Edit3 className="w-4 h-4 text-sky-400" />
            Mode Template
          </Link>

          {/* Direct Link to Playable View */}
          <Link
            href={`/view/${project.slug}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Buka Undangan Tamu Fullscreen"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            View Game
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Projek
          </button>
        </div>
      </header>

      {/* SUCCESS NOTIFICATION TOAST */}
      {saveSuccessNotice && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          Perubahan level berhasil disimpan!
        </div>
      )}

      {/* MAIN EDITOR WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* CENTER VIEWPORT (CANVAS & LEVEL NAVIGATION) */}
        <div className="flex-1 bg-slate-950 p-4 md:p-6 flex flex-col items-center justify-start overflow-y-auto">
          {isTestPlayMode ? (
            <div className="w-full max-w-4xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Play className="w-3.5 h-3.5" />
                  Mode Uji Coba Game Aktif — Gravitasi & pergerakan aktif. Kendalikan dengan [A]/[D]/[Spasi]
                </span>
                <button
                  onClick={() => setIsTestPlayMode(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer"
                >
                  Kembali ke Editor
                </button>
              </div>
              <PlatformerEngine
                project={project}
                mode="test"
                onExitTestMode={() => setIsTestPlayMode(false)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center max-w-4xl w-full space-y-3">
              <div className="w-full flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" /> Viewport Editor Canvas
                </span>
                <span className="text-amber-400 font-medium">
                  Klik & geser langsung objek / platform / karakter di canvas
                </span>
              </div>

              {/* Interactive Engine Canvas */}
              <div className="w-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
                <PlatformerEngine
                  project={project}
                  mode="preview"
                  selectedEntityId={selectedEntityId}
                  onSelectEntity={(id) => {
                    setSelectedEntityId(id);
                    if (id) {
                      setSelectedPlatformId(null);
                      setIsPlayerSelected(false);
                      setActiveTab('entities');
                    }
                  }}
                  onUpdateEntityPosition={updateEntityPosition}
                  selectedPlatformId={selectedPlatformId}
                  onSelectPlatform={(id) => {
                    setSelectedPlatformId(id);
                    if (id) {
                      setSelectedEntityId(null);
                      setIsPlayerSelected(false);
                      setActiveTab('world');
                    }
                  }}
                  onUpdatePlatformPosition={updatePlatformPosition}
                  isPlayerSelected={isPlayerSelected}
                  onSelectPlayer={(sel) => {
                    setIsPlayerSelected(sel);
                    if (sel) {
                      setSelectedEntityId(null);
                      setSelectedPlatformId(null);
                      setActiveTab('player');
                    }
                  }}
                  onUpdatePlayerPosition={updatePlayerPosition}
                  editorCameraX={editorCameraX}
                  onCameraChange={setEditorCameraX}
                />

                {/* Overlay edit badge */}
                <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 flex items-center gap-2 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Editor (Gravitasi Off) — Total Panjang: {project.world.worldWidth}px</span>
                </div>
              </div>

              {/* HORIZONTAL CAMERA NAVIGATION & SLIDER BAR */}
              <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-200">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold">Scroll & Navigasi Kamera:</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                      X={editorCameraX}px / {project.world.worldWidth}px
                    </span>
                  </div>

                  {/* Quick Jump Buttons */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => focusCameraOn(0)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Ke Awal Level"
                    >
                      ⏮ Awal
                    </button>
                    <button
                      type="button"
                      onClick={() => panCamera(-250)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Geser 250px ke Kiri"
                    >
                      ◀ -250px
                    </button>
                    <button
                      type="button"
                      onClick={() => focusCameraOn(project.player.startX ?? 100)}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold transition cursor-pointer"
                      title="Pusatkan Kamera ke Karakter"
                    >
                      👤 Karakter
                    </button>
                    <button
                      type="button"
                      onClick={() => panCamera(250)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Geser 250px ke Kanan"
                    >
                      +250px ▶
                    </button>
                    <button
                      type="button"
                      onClick={() => focusCameraOn(project.world.worldWidth)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Ke Akhir Level"
                    >
                      Akhir ⏭
                    </button>
                  </div>
                </div>

                {/* Range Slider for Level Camera */}
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, project.world.worldWidth - 800)}
                  step={10}
                  value={editorCameraX}
                  onChange={(e) => setEditorCameraX(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>💡 <b>Seleksi & geser</b>: Klik objek, karakter, atau platform langsung di canvas untuk memindahkan posisi.</span>
                  <span>💡 <b>Scroll kamera</b>: Drag area kosong canvas atau gunakan scroll mouse.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR / INSPECTOR PANEL */}
        {!isTestPlayMode && (
          <aside className="w-96 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-slate-800 px-4 pt-3 gap-3 text-xs font-bold overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('entities')}
                className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'entities'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                Objek & NPC ({project.entities.length})
              </button>
              <button
                onClick={() => setActiveTab('world')}
                className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'world'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-4 h-4" />
                Pijakan
              </button>
              <button
                onClick={() => setActiveTab('player')}
                className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'player'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-4 h-4" />
                Player
              </button>
              <button
                onClick={() => setActiveTab('parallax')}
                className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'parallax'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Parallax ({project.world.parallaxLayers.length})
              </button>
              <button
                onClick={() => setActiveTab('audio')}
                className={`pb-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'audio'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                Audio
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="p-4 overflow-y-auto flex-1 space-y-6 text-sm">
              {/* TAB 1: ENTITIES (NPC, OBSTACLE, DECORATION) */}
              {activeTab === 'entities' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Daftar Objek Interaktif
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => addEntity('npc')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> +NPC
                      </button>
                      <button
                        onClick={() => addEntity('obstacle')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> +Media
                      </button>
                      <button
                        onClick={() => addEntity('decoration')}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> +Dekor
                      </button>
                    </div>
                  </div>

                  {/* List of Entities */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {project.entities.map(ent => (
                      <div
                        key={ent.id}
                        onClick={() => {
                          setSelectedEntityId(ent.id);
                          setSelectedPlatformId(null);
                          setIsPlayerSelected(false);
                        }}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                          selectedEntityId === ent.id
                            ? 'border-amber-400 bg-amber-500/10'
                            : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-950 rounded-lg flex items-center justify-center p-1 shrink-0">
                            <img
                              src={ent.sprite?.frames?.[0]}
                              alt=""
                              className="max-h-full max-w-full"
                            />
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-white block truncate">{ent.name}</span>
                            <span className="text-[10px] text-slate-400">
                              X={ent.x}, Y={ent.y} • {ent.type}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              focusCameraOn(ent.x);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-amber-300 cursor-pointer"
                            title="Fokus Kamera ke Objek"
                          >
                            <Crosshair className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeEntity(ent.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            title="Hapus Objek"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Entity Detail Editor Form */}
                  {selectedEntity && (
                    <div className="p-4 bg-slate-800/40 border border-slate-700/80 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <span className="font-bold text-amber-400 text-xs">
                          Edit Objek: {selectedEntity.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => focusCameraOn(selectedEntity.x)}
                          className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-amber-300 flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
                        >
                          <Crosshair className="w-3 h-3" /> Fokus Kamera
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Nama Objek</label>
                          <input
                            type="text"
                            value={selectedEntity.name}
                            onChange={e => updateEntity(selectedEntity.id, { name: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Posisi X (px)</label>
                            <input
                              type="number"
                              value={selectedEntity.x}
                              onChange={e => updateEntity(selectedEntity.id, { x: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Posisi Y (px)</label>
                            <input
                              type="number"
                              value={selectedEntity.y}
                              onChange={e => updateEntity(selectedEntity.id, { y: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>

                        {/* Ukuran Objek (Width & Height) & Reset */}
                        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-750 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-300">
                              Ukuran Objek ({selectedEntity.width} x {selectedEntity.height} px)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const defaultW = selectedEntity.type === 'npc' ? 48 : 48;
                                const defaultH = selectedEntity.type === 'npc' ? 64 : 48;
                                updateEntity(selectedEntity.id, { width: defaultW, height: defaultH });
                              }}
                              className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                              title="Reset ukuran objek ke default"
                            >
                              <RotateCcw className="w-3 h-3" /> Reset Ukuran
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">Lebar (Width px)</label>
                              <input
                                type="number"
                                min={16}
                                max={400}
                                value={selectedEntity.width}
                                onChange={e =>
                                  updateEntity(selectedEntity.id, { width: Math.max(16, parseInt(e.target.value) || 16) })
                                }
                                className="w-full px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-0.5">Tinggi (Height px)</label>
                              <input
                                type="number"
                                min={16}
                                max={400}
                                value={selectedEntity.height}
                                onChange={e =>
                                  updateEntity(selectedEntity.id, { height: Math.max(16, parseInt(e.target.value) || 16) })
                                }
                                className="w-full px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Sprite Selector from Library */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Sprite / Tampilan Objek</label>
                          <button
                            type="button"
                            onClick={() => setAssetModalTarget({
                              target: 'entity',
                              entityId: selectedEntity.id,
                              categoryFilter: 'character',
                              title: 'Pilih Sprite Karakter / NPC / Objek'
                            })}
                            className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-400 flex items-center justify-between text-xs text-slate-200 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-slate-950 rounded flex items-center justify-center p-0.5">
                                <img
                                  src={selectedEntity.sprite?.frames?.[0]}
                                  alt=""
                                  className="max-h-full max-w-full"
                                />
                              </div>
                              <span className="truncate">{selectedEntity.sprite?.name || 'Pilih Sprite'}</span>
                              {selectedEntity.sprite?.type === 'sequence' ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                                  Sequence
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                                  Static
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-amber-400 font-semibold">Ganti ➔</span>
                          </button>
                        </div>

                        {/* Interaction Configuration */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-3">
                          <span className="text-xs font-bold text-slate-300">
                            Aksi Interaksi Dialog / Modal
                          </span>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Tipe Interaksi</label>
                            <select
                              value={selectedEntity.interaction?.type || 'info'}
                              onChange={e =>
                                updateEntity(selectedEntity.id, {
                                  interaction: {
                                    ...(selectedEntity.interaction || {}),
                                    type: e.target.value as InteractionType
                                  }
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                            >
                              <option value="info">Teks Informasi (Rundown / Sambutan)</option>
                              <option value="image">Galeri Foto (Lightbox)</option>
                              <option value="video">Pemutar Video (YouTube / MP4)</option>
                              <option value="rsvp">Form RSVP & Ucapan Selamat</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Judul Dialog / Modal</label>
                            <input
                              type="text"
                              value={selectedEntity.interaction?.title || ''}
                              onChange={e =>
                                updateEntity(selectedEntity.id, {
                                  interaction: {
                                    ...(selectedEntity.interaction || { type: 'info' }),
                                    title: e.target.value
                                  }
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Isi Pesan / Keterangan</label>
                            <textarea
                              rows={3}
                              value={selectedEntity.interaction?.content || ''}
                              onChange={e =>
                                updateEntity(selectedEntity.id, {
                                  interaction: {
                                    ...(selectedEntity.interaction || { type: 'info' }),
                                    content: e.target.value
                                  }
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                            />
                          </div>

                          {['image', 'video'].includes(selectedEntity.interaction?.type || '') && (
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">
                                {selectedEntity.interaction?.type === 'image'
                                  ? 'URL Gambar / Foto'
                                  : 'URL Video (YouTube Embed / MP4)'}
                              </label>
                              <input
                                type="text"
                                value={selectedEntity.interaction?.mediaUrl || ''}
                                onChange={e =>
                                  updateEntity(selectedEntity.id, {
                                    interaction: {
                                      ...(selectedEntity.interaction || { type: 'image' }),
                                      mediaUrl: e.target.value
                                    }
                                  })
                                }
                                placeholder="https://..."
                                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          )}
                        </div>

                        {/* Granular Template Form Editable Flags */}
                        <div className="pt-3 border-t border-slate-800/80 bg-slate-950/60 p-3 rounded-xl space-y-3">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5" />
                            Pengaturan Template Form (Granular Editable)
                          </span>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedEntity.editable_appearance}
                                onChange={e => updateEntity(selectedEntity.id, { editable_appearance: e.target.checked })}
                                className="w-4 h-4 rounded accent-amber-500"
                              />
                              <span>Boleh Ganti Tampilan / Sprite</span>
                            </label>
                            {selectedEntity.editable_appearance && (
                              <input
                                type="text"
                                value={selectedEntity.appearanceLabel || ''}
                                onChange={e => updateEntity(selectedEntity.id, { appearanceLabel: e.target.value })}
                                placeholder="Label form (contoh: Kostum NPC)"
                                className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-amber-300"
                              />
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-200 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedEntity.editable_content}
                                onChange={e => updateEntity(selectedEntity.id, { editable_content: e.target.checked })}
                                className="w-4 h-4 rounded accent-amber-500"
                              />
                              <span>Boleh Ganti Isi Informasi / Foto</span>
                            </label>
                            {selectedEntity.editable_content && (
                              <input
                                type="text"
                                value={selectedEntity.contentLabel || ''}
                                onChange={e => updateEntity(selectedEntity.id, { contentLabel: e.target.value })}
                                placeholder="Label form (contoh: Rundown Acara)"
                                className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-amber-300"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: WORLD, GROUND & PLATFORM SETTINGS */}
              {activeTab === 'world' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      Mode Tanah (Ground Mode)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setProject(prev =>
                            prev ? { ...prev, world: { ...prev.world, groundMode: 'endless' } } : prev
                          )
                        }
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          project.world.groundMode === 'endless'
                            ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                            : 'border-slate-800 bg-slate-800 text-slate-400'
                        }`}
                      >
                        Endless Ground (Tanah Penuh)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setProject(prev =>
                            prev ? { ...prev, world: { ...prev.world, groundMode: 'platform' } } : prev
                          )
                        }
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          project.world.groundMode === 'platform'
                            ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                            : 'border-slate-800 bg-slate-800 text-slate-400'
                        }`}
                      >
                        Platform Only (Pijakan Melayang)
                      </button>
                    </div>
                  </div>

                  {project.world.groundMode === 'endless' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Ketinggian Tanah (Ground Y: {project.world.groundY}px)
                      </label>
                      <input
                        type="range"
                        min={300}
                        max={490}
                        value={project.world.groundY}
                        onChange={e =>
                          setProject(prev =>
                            prev ? { ...prev, world: { ...prev.world, groundY: parseInt(e.target.value) } } : prev
                          )
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Panjang Level Dunia: {project.world.worldWidth}px
                    </label>
                    <input
                      type="range"
                      min={1500}
                      max={6000}
                      step={100}
                      value={project.world.worldWidth}
                      onChange={e =>
                        setProject(prev =>
                          prev ? { ...prev, world: { ...prev.world, worldWidth: parseInt(e.target.value) } } : prev
                        )
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  {/* PLATFORMS MANAGER & DETAIL INSPECTOR */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Blok Pijakan (Platforms: {project.world.platforms.length})
                      </span>
                      <button
                        onClick={addPlatform}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> +Platform
                      </button>
                    </div>

                    {/* Platform List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {project.world.platforms.map(plat => (
                        <div
                          key={plat.id}
                          onClick={() => {
                            setSelectedPlatformId(plat.id);
                            setSelectedEntityId(null);
                            setIsPlayerSelected(false);
                          }}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                            selectedPlatformId === plat.id
                              ? 'border-sky-400 bg-sky-500/10'
                              : 'border-slate-800 bg-slate-800/40 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded border border-slate-600 shrink-0"
                              style={{
                                backgroundColor: plat.tileColor || '#4ade80',
                                backgroundImage: plat.tileTextureUrl ? `url(${plat.tileTextureUrl})` : undefined,
                                backgroundSize: 'cover'
                              }}
                            />
                            <div>
                              <span className="font-semibold text-white">Platform #{plat.id.slice(-4)}</span>
                              <div className="text-[10px] text-slate-400">
                                X={plat.x}, Y={plat.y} • {plat.width}x{plat.height}px
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                focusCameraOn(plat.x);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-sky-300 cursor-pointer"
                              title="Fokus Kamera ke Platform"
                            >
                              <Crosshair className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                removePlatform(plat.id);
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                              title="Hapus Platform"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* DETAIL INSPECTOR FOR SELECTED PLATFORM */}
                    {selectedPlatform && (
                      <div className="p-4 bg-slate-800/50 border border-sky-500/40 rounded-2xl space-y-4 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                          <span className="font-bold text-sky-400 text-xs">
                            Properti Platform #{selectedPlatform.id.slice(-4)}
                          </span>
                          <button
                            type="button"
                            onClick={() => focusCameraOn(selectedPlatform.x)}
                            className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-sky-300 flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
                          >
                            <Crosshair className="w-3 h-3" /> Fokus Kamera
                          </button>
                        </div>

                        {/* Location Inputs (X, Y) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Posisi X (px)</label>
                            <input
                              type="number"
                              value={selectedPlatform.x}
                              onChange={e => updatePlatform(selectedPlatform.id, { x: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Posisi Y (px)</label>
                            <input
                              type="number"
                              value={selectedPlatform.y}
                              onChange={e => updatePlatform(selectedPlatform.id, { y: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400"
                            />
                          </div>
                        </div>

                        {/* Dimensions (Width, Height) */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Lebar ({selectedPlatform.width}px)</label>
                            <input
                              type="number"
                              min={40}
                              max={800}
                              value={selectedPlatform.width}
                              onChange={e => updatePlatform(selectedPlatform.id, { width: parseInt(e.target.value) || 40 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">Tinggi ({selectedPlatform.height}px)</label>
                            <input
                              type="number"
                              min={12}
                              max={100}
                              value={selectedPlatform.height}
                              onChange={e => updatePlatform(selectedPlatform.id, { height: parseInt(e.target.value) || 12 })}
                              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400"
                            />
                          </div>
                        </div>

                        {/* Platform Color */}
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Warna Pijakan (Tile Color)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={selectedPlatform.tileColor || '#4ade80'}
                              onChange={e => updatePlatform(selectedPlatform.id, { tileColor: e.target.value })}
                              className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                            />
                            <input
                              type="text"
                              value={selectedPlatform.tileColor || '#4ade80'}
                              onChange={e => updatePlatform(selectedPlatform.id, { tileColor: e.target.value })}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                            />
                          </div>
                        </div>

                        {/* PLATFORM IMAGE & TEXTURE SETTINGS VIA UNIFIED ASSET LIBRARY */}
                        <div className="pt-2 border-t border-slate-700/80 space-y-3">
                          <label className="block text-xs font-semibold text-slate-200">
                            Gambar / Tekstur Pijakan
                          </label>

                          {/* Unified Asset Modal Trigger */}
                          <button
                            type="button"
                            onClick={() => setAssetModalTarget({
                              target: 'platform',
                              platformId: selectedPlatform.id,
                              categoryFilter: 'platform',
                              title: 'Pilih Tekstur / Gambar Pijakan'
                            })}
                            className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-sky-400 flex items-center justify-between text-xs text-slate-200 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div
                                className="w-7 h-7 rounded-lg border border-slate-600 shrink-0 flex items-center justify-center bg-slate-950"
                                style={{
                                  backgroundColor: selectedPlatform.tileColor || '#4ade80',
                                  backgroundImage: selectedPlatform.tileTextureUrl ? `url(${selectedPlatform.tileTextureUrl})` : undefined,
                                  backgroundSize: 'cover'
                                }}
                              >
                                {!selectedPlatform.tileTextureUrl && <ImageIcon className="w-3.5 h-3.5 text-slate-400" />}
                              </div>
                              <span className="font-semibold text-white truncate">
                                {selectedPlatform.tileTextureUrl ? 'Ganti Tekstur Pijakan' : 'Pilih Gambar dari Asset Library'}
                              </span>
                            </div>
                            <span className="text-[10px] text-sky-400 font-bold shrink-0">
                              Asset Library ➔
                            </span>
                          </button>

                          {/* Reset to Plain Color */}
                          {selectedPlatform.tileTextureUrl && (
                            <button
                              type="button"
                              onClick={() => updatePlatform(selectedPlatform.id, { tileTextureUrl: undefined })}
                              className="w-full py-1 text-xs text-rose-400 hover:bg-slate-800 rounded-lg transition text-center cursor-pointer"
                            >
                              Hapus Tekstur (Gunakan Warna Polos)
                            </button>
                          )}

                          {/* Quick Preset Texture Chips */}
                          <div className="space-y-1">
                            <span className="text-[11px] text-slate-400">Preset Cepat:</span>
                            <div className="grid grid-cols-2 gap-1.5">
                              {PRESET_PLATFORM_TEXTURES.map(tex => (
                                <button
                                  key={tex.id}
                                  type="button"
                                  onClick={() => updatePlatform(selectedPlatform.id, { tileTextureUrl: tex.url, tileColor: tex.tileColor })}
                                  className={`p-1.5 rounded-lg border text-[11px] flex items-center gap-1.5 text-left transition cursor-pointer ${
                                    selectedPlatform.tileTextureUrl === tex.url
                                      ? 'border-sky-400 bg-sky-500/20 text-white'
                                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'
                                  }`}
                                >
                                  <div
                                    className="w-4 h-4 rounded shrink-0 border border-slate-600"
                                    style={{ backgroundImage: `url(${tex.url})`, backgroundSize: 'cover' }}
                                  />
                                  <span className="truncate">{tex.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Delete platform button */}
                        <div className="pt-2 border-t border-slate-700">
                          <button
                            type="button"
                            onClick={() => removePlatform(selectedPlatform.id)}
                            className="w-full py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus Platform Ini
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: PLAYER CONFIGURATION */}
              {activeTab === 'player' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Pengaturan Karakter Pemain
                    </span>
                    <button
                      type="button"
                      onClick={() => focusCameraOn(project.player.startX ?? 100)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-amber-300 flex items-center gap-1 hover:bg-slate-700 cursor-pointer"
                    >
                      <Crosshair className="w-3 h-3" /> Fokus Kamera
                    </button>
                  </div>

                  {/* Player Start Position */}
                  <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Posisi Mulai Karakter (Spawn)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayerSelected(true);
                          setSelectedEntityId(null);
                          setSelectedPlatformId(null);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 font-medium cursor-pointer"
                      >
                        Pilih di Canvas
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Mulai X (px)</label>
                        <input
                          type="number"
                          value={project.player.startX ?? 100}
                          onChange={e => updatePlayerPosition(parseInt(e.target.value) || 0, project.player.startY ?? 400)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Mulai Y (px)</label>
                        <input
                          type="number"
                          value={project.player.startY ?? 400}
                          onChange={e => updatePlayerPosition(project.player.startX ?? 100, parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Player Visual Image Dimensions with Reset */}
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> Ukuran Gambar Visual Karakter
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePlayerDimensions(44, 60)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        title="Reset ukuran gambar ke default (44x60 px)"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset Ukuran (44x60)
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Lebar Gambar</label>
                          <span className="text-[10px] font-mono text-amber-400 font-semibold">{project.player.width ?? 44}px</span>
                        </div>
                        <input
                          type="number"
                          min={16}
                          max={300}
                          value={project.player.width ?? 44}
                          onChange={e =>
                            updatePlayerDimensions(parseInt(e.target.value) || 44, project.player.height ?? 60)
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] text-slate-400">Tinggi Gambar</label>
                          <span className="text-[10px] font-mono text-amber-400 font-semibold">{project.player.height ?? 60}px</span>
                        </div>
                        <input
                          type="number"
                          min={16}
                          max={300}
                          value={project.player.height ?? 60}
                          onChange={e =>
                            updatePlayerDimensions(project.player.width ?? 44, parseInt(e.target.value) || 60)
                          }
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Player Collision Detection (Hitbox Offset Margin/Padding) */}
                  {(() => {
                    const hitboxInfo = getPlayerHitboxBounds(project.player);
                    return (
                      <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-300">
                              Hitbox Offset (Area Tabrakan)
                            </span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                            {hitboxInfo.hitboxWidth} x {hitboxInfo.hitboxHeight} px
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Atur offset tepi tabrakan dari gambar (seperti padding/margin). Nilai <b>negatif (-)</b> memperkecil hitbox ke dalam gambar, nilai <b>positif (+)</b> memperlebar melebihi gambar. Reset ke 0 tepat mengikuti ukuran gambar.
                        </p>

                        {/* Quick Preset Buttons */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              updatePlayerCollider({
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0
                              });
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 hover:text-white border border-slate-700 flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-400" />
                            Reset ke 0 (Ikuti Gambar)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updatePlayerCollider({
                                left: -6,
                                right: -6,
                                top: -4,
                                bottom: 0
                              });
                            }}
                            className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-300 border border-emerald-500/40 cursor-pointer font-medium"
                          >
                            Presisi Humanoid (-6, -6, -4, 0)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              updatePlayerCollider({
                                bottom: 0
                              });
                            }}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white border border-slate-700 cursor-pointer font-medium"
                          >
                            Ratakan Kaki (Bottom: 0)
                          </button>
                        </div>

                        {/* 4 Offset Sliders: Left, Right, Top, Bottom */}
                        <div className="space-y-3 pt-1">
                          {/* Offset Kiri (Left) */}
                          <div>
                            <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                              <span>Offset Kiri (Left)</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                {hitboxInfo.offLeft > 0 ? `+${hitboxInfo.offLeft}` : hitboxInfo.offLeft} px
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={-40}
                                max={40}
                                value={hitboxInfo.offLeft}
                                onChange={e => updatePlayerCollider({ left: parseInt(e.target.value) || 0 })}
                                className="w-full accent-emerald-400 cursor-pointer"
                              />
                              <input
                                type="number"
                                value={hitboxInfo.offLeft}
                                onChange={e => updatePlayerCollider({ left: parseInt(e.target.value) || 0 })}
                                className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-center text-white"
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              (-) Masuk ke dalam | (+) Melebihi ke kiri
                            </span>
                          </div>

                          {/* Offset Kanan (Right) */}
                          <div>
                            <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                              <span>Offset Kanan (Right)</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                {hitboxInfo.offRight > 0 ? `+${hitboxInfo.offRight}` : hitboxInfo.offRight} px
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={-40}
                                max={40}
                                value={hitboxInfo.offRight}
                                onChange={e => updatePlayerCollider({ right: parseInt(e.target.value) || 0 })}
                                className="w-full accent-emerald-400 cursor-pointer"
                              />
                              <input
                                type="number"
                                value={hitboxInfo.offRight}
                                onChange={e => updatePlayerCollider({ right: parseInt(e.target.value) || 0 })}
                                className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-center text-white"
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              (-) Masuk ke dalam | (+) Melebihi ke kanan
                            </span>
                          </div>

                          {/* Offset Atas (Top) */}
                          <div>
                            <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                              <span>Offset Atas (Top / Kepala)</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                {hitboxInfo.offTop > 0 ? `+${hitboxInfo.offTop}` : hitboxInfo.offTop} px
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={-40}
                                max={40}
                                value={hitboxInfo.offTop}
                                onChange={e => updatePlayerCollider({ top: parseInt(e.target.value) || 0 })}
                                className="w-full accent-emerald-400 cursor-pointer"
                              />
                              <input
                                type="number"
                                value={hitboxInfo.offTop}
                                onChange={e => updatePlayerCollider({ top: parseInt(e.target.value) || 0 })}
                                className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-center text-white"
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              (-) Masuk ke dalam | (+) Melebihi ke atas
                            </span>
                          </div>

                          {/* Offset Bawah (Bottom) */}
                          <div>
                            <div className="flex justify-between items-center text-[11px] text-slate-300 mb-1">
                              <span>Offset Bawah (Bottom / Kaki)</span>
                              <span className="font-mono text-emerald-400 font-bold">
                                {hitboxInfo.offBottom > 0 ? `+${hitboxInfo.offBottom}` : hitboxInfo.offBottom} px
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={-40}
                                max={40}
                                value={hitboxInfo.offBottom}
                                onChange={e => updatePlayerCollider({ bottom: parseInt(e.target.value) || 0 })}
                                className="w-full accent-emerald-400 cursor-pointer"
                              />
                              <input
                                type="number"
                                value={hitboxInfo.offBottom}
                                onChange={e => updatePlayerCollider({ bottom: parseInt(e.target.value) || 0 })}
                                className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-center text-white"
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              (-) Kaki naik | (+) Kaki menembus ke bawah | (0) Tepat di bawah gambar
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Jump Toggle */}
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-bold text-white">Aktifkan Mekanik Lompat (Jump)</span>
                      <input
                        type="checkbox"
                        checked={project.player.canJump}
                        onChange={e =>
                          setProject(prev =>
                            prev ? { ...prev, player: { ...prev.player, canJump: e.target.checked } } : prev
                          )
                        }
                        className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Jika dinonaktifkan, tamu cukup berjalan maju/mundur tanpa risiko jatuh atau kesulitan melompat.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Kecepatan Jalan ({project.player.speed})</label>
                      <input
                        type="range"
                        min={2}
                        max={8}
                        value={project.player.speed}
                        onChange={e =>
                          setProject(prev =>
                            prev ? { ...prev, player: { ...prev.player, speed: parseInt(e.target.value) } } : prev
                          )
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                    {project.player.canJump && (
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Kekuatan Lompat ({project.player.jumpForce})</label>
                        <input
                          type="range"
                          min={8}
                          max={18}
                          value={project.player.jumpForce}
                          onChange={e =>
                            setProject(prev =>
                              prev ? { ...prev, player: { ...prev.player, jumpForce: parseInt(e.target.value) } } : prev
                            )
                          }
                          className="w-full accent-amber-400 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Player Sprites (Idle & Run) */}
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Sprite Animasi Diam (Idle State)</label>
                      <button
                        type="button"
                        onClick={() => setAssetModalTarget({
                          target: 'player_idle',
                          categoryFilter: 'character',
                          title: 'Pilih Sprite Karakter (Idle)'
                        })}
                        className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-400 flex items-center justify-between text-xs text-slate-200 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-950 rounded p-1 flex items-center justify-center">
                            <img
                              src={project.player.idleSprite?.frames?.[0]}
                              alt=""
                              className="max-h-full max-w-full"
                            />
                          </div>
                          <span className="truncate">{project.player.idleSprite?.name || 'Pilih Idle Sprite'}</span>
                          {project.player.idleSprite?.type === 'sequence' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                              Sequence
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                              Static
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-amber-400 font-semibold">Ganti ➔</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Sprite Animasi Lari (Run Sequence)</label>
                      <button
                        type="button"
                        onClick={() => setAssetModalTarget({
                          target: 'player_run',
                          categoryFilter: 'character',
                          title: 'Pilih Sprite Karakter (Run)'
                        })}
                        className="w-full p-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-amber-400 flex items-center justify-between text-xs text-slate-200 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-950 rounded p-1 flex items-center justify-center">
                            <img
                              src={project.player.runSprite?.frames?.[0]}
                              alt=""
                              className="max-h-full max-w-full"
                            />
                          </div>
                          <span className="truncate">{project.player.runSprite?.name || 'Pilih Run Sprite'}</span>
                          {project.player.runSprite?.type === 'sequence' ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                              Sequence
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                              Static
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-amber-400 font-semibold">Ganti ➔</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PARALLAX BACKGROUND LAYERS (ADD, REMOVE, CHANGE IMAGE) */}
              {activeTab === 'parallax' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Lapisan Background Parallax ({project.world.parallaxLayers.length})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Urutan lapisan dari belakang ke depan
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={addParallaxLayer}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> + Tambah Layer
                    </button>
                  </div>

                  <div className="space-y-4">
                    {project.world.parallaxLayers.map((layer, index) => (
                      <div
                        key={layer.id}
                        className="p-3.5 bg-slate-800/50 rounded-2xl border border-slate-700/70 space-y-3 shadow-md"
                      >
                        {/* Layer Title & Order Actions */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              #{index + 1}
                            </span>
                            <input
                              type="text"
                              value={layer.name}
                              onChange={e => updateParallaxLayer(layer.id, { name: e.target.value })}
                              className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-white font-semibold flex-1 focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Move Up/Down Buttons */}
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => moveParallaxLayer(layer.id, 'up')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                              title="Pindahkan Layer ke Belakang"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === project.world.parallaxLayers.length - 1}
                              onClick={() => moveParallaxLayer(layer.id, 'down')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                              title="Pindahkan Layer ke Depan"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => removeParallaxLayer(layer.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer ml-1"
                              title="Hapus Layer Background Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Image Preview & Change Image Button */}
                        <div className="space-y-1.5">
                          <div className="h-20 w-full rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative flex items-center justify-center">
                            <img
                              src={layer.imageUrl}
                              alt={layer.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setAssetModalTarget({
                              target: 'parallax',
                              layerId: layer.id,
                              categoryFilter: 'background',
                              title: `Pilih Gambar Background: ${layer.name}`
                            })}
                            className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-400 text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <TreePine className="w-3.5 h-3.5" />
                            <span>Ganti Gambar Background (Asset Library)</span>
                          </button>
                        </div>

                        {/* Parallax Sliders: Speed & Y Offset */}
                        <div className="space-y-2 pt-1 border-t border-slate-700/50">
                          <div>
                            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                              <span>Kecepatan Gerak Parallax:</span>
                              <span className="font-mono text-amber-400 font-bold">{layer.speedRatio}x</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={layer.speedRatio}
                              onChange={e => updateParallaxLayer(layer.id, { speedRatio: parseFloat(e.target.value) })}
                              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-900 rounded"
                            />
                            <span className="text-[10px] text-slate-500">
                              0x = Diam (Langit jauh), 1x = Secepat tanah
                            </span>
                          </div>

                          <div>
                            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
                              <span>Posisi Vertikal (Y Offset):</span>
                              <span className="font-mono text-amber-400 font-bold">{layer.yOffset || 0}px</span>
                            </div>
                            <input
                              type="range"
                              min={-100}
                              max={200}
                              step={5}
                              value={layer.yOffset || 0}
                              onChange={e => updateParallaxLayer(layer.id, { yOffset: parseInt(e.target.value) || 0 })}
                              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-900 rounded"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: AUDIO & SOUND EFFECTS */}
              {activeTab === 'audio' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-amber-400" />
                        Pengaturan Audio Permainan
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Atur musik latar dan efek suara interaktif game
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {(['bgm', 'jump', 'footstep', 'idle', 'proximity', 'interact'] as SoundEventType[]).map((cat) => {
                      const info = getSoundEventInfo(cat);
                      const currentSound = project.audio?.[cat] ?? DEFAULT_PROJECT_AUDIO[cat];
                      const soundName = currentSound?.name || 'Default Web Audio Synth';
                      const soundVolume = currentSound?.volume ?? 0.85;
                      const isCustom = !!currentSound?.url;
                      const isPlaying = sidebarPlayingSound === (currentSound?.id || cat);

                      return (
                        <div
                          key={cat}
                          className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-3 hover:border-slate-600 transition"
                        >
                          {/* Event Title & Description */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                                {cat === 'bgm' && <Music className="w-3.5 h-3.5" />}
                                {cat === 'jump' && <ArrowUp className="w-3.5 h-3.5" />}
                                {cat === 'footstep' && <Footprints className="w-3.5 h-3.5" />}
                                {cat === 'idle' && <Coffee className="w-3.5 h-3.5" />}
                                {cat === 'proximity' && <Bell className="w-3.5 h-3.5" />}
                                {cat === 'interact' && <Sparkles className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <h5 className="font-semibold text-white text-xs leading-tight">{info.title}</h5>
                                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{info.subtitle}</p>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-medium border shrink-0 ${
                                isCustom
                                  ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                                  : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                              }`}
                            >
                              {isCustom ? 'Upload / URL' : 'Bawaan'}
                            </span>
                          </div>

                          {/* Sound Card Details */}
                          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
                            <div className="overflow-hidden">
                              <span className="text-[10px] text-slate-400 block">Suara Aktif:</span>
                              <span className="text-xs font-semibold text-amber-300 truncate block">
                                {soundName}
                              </span>
                            </div>

                            {/* Play / Test Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleSidebarAudioPreview(cat, currentSound)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                isPlaying
                                  ? 'bg-amber-400 text-slate-950 animate-pulse shadow'
                                  : 'bg-slate-800 hover:bg-slate-700 text-amber-400'
                              }`}
                              title={isPlaying ? 'Hentikan Suara' : 'Dengar Preview Suara'}
                            >
                              {isPlaying ? (
                                <>
                                  <Square className="w-3 h-3 fill-current" /> Stop
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" /> Tes
                                </>
                              )}
                            </button>
                          </div>

                          {/* Volume Slider */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                              <span>Volume Suara:</span>
                              <span className="font-mono text-amber-400 font-bold">{Math.round(soundVolume * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={soundVolume}
                              onChange={(e) => updateAudioVolume(cat, parseFloat(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-900 rounded"
                            />
                          </div>

                          {/* Action Buttons: Ganti Suara (Pilih/Upload) & Reset */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-700/40">
                            <button
                              type="button"
                              onClick={() => setSoundModalCategory(cat)}
                              className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-400 text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>Pilih / Upload Suara</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => resetAudioToDefault(cat)}
                              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                              title="Reset ke suara default bawaan"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* UNIFIED ASSET LIBRARY MODAL PICKER */}
      {assetModalTarget && (
        <AssetLibraryModal
          isOpen={true}
          onClose={() => setAssetModalTarget(null)}
          onSelectSprite={handleSelectSprite}
          title={assetModalTarget.title || 'Pilih Asset dari Library'}
          categoryFilter={assetModalTarget.categoryFilter || 'all'}
        />
      )}

      {/* UNIFIED SOUND LIBRARY MODAL PICKER */}
      {soundModalCategory && (
        <SoundLibraryModal
          isOpen={true}
          onClose={() => setSoundModalCategory(null)}
          onSelectSound={(sound) => {
            updateProjectAudio(soundModalCategory, sound);
            setSoundModalCategory(null);
          }}
          initialCategory={soundModalCategory}
          title={`Pilih Suara: ${getSoundEventInfo(soundModalCategory).title}`}
        />
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
          Memuat Editor...
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
