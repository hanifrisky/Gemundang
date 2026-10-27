'use client';

import React, { useState, useEffect } from 'react';
import { SpriteAsset, SpriteType } from '@/types/platformer';
import { BUILT_IN_SPRITES } from '@/lib/assetLibrary';
import {
  X,
  Upload,
  Plus,
  Play,
  Film,
  Sparkles,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  Layers,
  User,
  Sliders,
  TreePine
} from 'lucide-react';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSprite: (sprite: SpriteAsset) => void;
  title?: string;
  categoryFilter?: 'character' | 'player' | 'npc' | 'obstacle' | 'decoration' | 'platform' | 'background' | 'all';
}

function normalizeCategory(cat?: string): string {
  if (!cat || cat === 'all') return 'all';
  if (cat === 'character' || cat === 'player' || cat === 'npc') return 'character';
  if (cat === 'object' || cat === 'obstacle' || cat === 'decoration') return 'object';
  if (cat === 'platform') return 'platform';
  if (cat === 'background') return 'background';
  return 'all';
}

function formatCategoryBadge(category?: string) {
  if (category === 'character' || category === 'player' || category === 'npc') {
    return 'Karakter';
  }
  if (category === 'obstacle' || category === 'decoration') {
    return 'Objek';
  }
  if (category === 'platform') return 'Platform';
  if (category === 'background') return 'Background';
  return 'Aset';
}

// Mini animated component for sequence previews
function AnimatedSpriteThumbnail({ sprite }: { sprite: SpriteAsset }) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (sprite.type !== 'sequence' || !sprite.frames || sprite.frames.length <= 1) {
      return;
    }
    const fps = sprite.frameRate || 4;
    const intervalMs = Math.max(100, Math.floor(1000 / fps));
    const timer = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % sprite.frames.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [sprite]);

  const currentFrame = sprite.frames?.[frameIndex] || sprite.frames?.[0] || '';

  return (
    <img
      src={currentFrame}
      alt={sprite.name}
      className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-200"
    />
  );
}

export default function AssetLibraryModal({
  isOpen,
  onClose,
  onSelectSprite,
  title = 'Pilih Sprite dari Asset Library',
  categoryFilter = 'all'
}: AssetLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  
  // Track category filter changes from props without cascading renders in useEffect
  const [categoryOverride, setCategoryOverride] = useState<string | null>(null);
  const [prevCategoryFilter, setPrevCategoryFilter] = useState(categoryFilter);

  if (categoryFilter !== prevCategoryFilter) {
    setPrevCategoryFilter(categoryFilter);
    setCategoryOverride(null);
  }
  const selectedCategory = categoryOverride ?? normalizeCategory(categoryFilter);
  const setSelectedCategory = (cat: string) => setCategoryOverride(cat);

  // Custom upload state
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<SpriteType>('static');
  const [customFrames, setCustomFrames] = useState<string[]>([]);
  const [customFps, setCustomFps] = useState(8);
  const [previewUploadFrame, setPreviewUploadFrame] = useState(0);

  // Direct URL state
  const [directUrl, setDirectUrl] = useState('');
  const [directUrlName, setDirectUrlName] = useState('');

  // Animate custom uploaded sequence
  useEffect(() => {
    if (customType !== 'sequence' || customFrames.length <= 1) {
      return;
    }
    const intervalMs = Math.max(80, Math.floor(1000 / customFps));
    const timer = setInterval(() => {
      setPreviewUploadFrame(prev => (prev + 1) % customFrames.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [customType, customFrames.length, customFps]);

  const activeUploadFrame = customType === 'sequence' && customFrames.length > 0
    ? previewUploadFrame % customFrames.length
    : 0;

  if (!isOpen) return null;

  // Filter presets (NPC is grouped under Character!)
  const filteredPresets = BUILT_IN_SPRITES.filter(s => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'character') {
      return s.category === 'character' || s.category === 'player' || s.category === 'npc';
    }
    if (selectedCategory === 'object') {
      return s.category === 'obstacle' || s.category === 'decoration';
    }
    if (selectedCategory === 'platform') {
      return s.category === 'platform';
    }
    if (selectedCategory === 'background') {
      return s.category === 'background';
    }
    return true;
  });

  // Handle file uploads (converts file to base64 DataURL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readFilesPromises = Array.from(files).map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readFilesPromises).then(results => {
      if (customType === 'static') {
        setCustomFrames([results[0]]);
      } else {
        setCustomFrames(prev => [...prev, ...results]);
      }
    });
  };

  const handleSaveCustomSprite = () => {
    if (customFrames.length === 0) return;
    const defaultCat = (
      selectedCategory === 'object'
        ? 'decoration'
        : selectedCategory !== 'all'
        ? selectedCategory
        : 'character'
    ) as SpriteAsset['category'];
    const newSprite: SpriteAsset = {
      id: `custom-sprite-${Date.now()}`,
      name: customName.trim() || 'Custom Asset',
      type: customType,
      frames: customFrames,
      frameRate: customFps,
      loop: true,
      category: defaultCat
    };
    onSelectSprite(newSprite);
    onClose();
  };

  const handleUseDirectUrl = () => {
    const trimmed = directUrl.trim();
    if (!trimmed) return;
    const defaultCat = (selectedCategory !== 'all' ? selectedCategory : 'background') as SpriteAsset['category'];
    const newSprite: SpriteAsset = {
      id: `url-asset-${Date.now()}`,
      name: directUrlName.trim() || 'Custom URL Image',
      type: 'static',
      frames: [trimmed],
      category: defaultCat
    };
    onSelectSprite(newSprite);
    onClose();
  };

  const categoryTabs = [
    { id: 'all', label: 'Semua', icon: Layers },
    { id: 'character', label: 'Karakter (Player & NPC)', icon: User },
    { id: 'object', label: 'Objek & Properti', icon: Sparkles },
    { id: 'platform', label: 'Pijakan (Platform)', icon: Sliders },
    { id: 'background', label: 'Background (Parallax)', icon: TreePine },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base md:text-lg text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Mode Tabs */}
        <div className="flex border-b border-slate-800 px-3 sm:px-6 pt-2.5 sm:pt-3 gap-3 sm:gap-6 text-xs md:text-sm overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-2.5 sm:pb-3 font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'presets'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Pustaka Bawaan
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 sm:pb-3 font-semibold transition border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'upload'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 sm:pb-3 font-semibold transition border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'url'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            URL / Link
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PRESET CATALOG */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none pb-1">
                <span className="text-slate-400 text-[11px] mr-1">Filter Kategori:</span>
                {categoryTabs.map(cat => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Grid of Presets */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                {filteredPresets.map(sprite => {
                  const isSeq = sprite.type === 'sequence';
                  return (
                    <div
                      key={sprite.id}
                      onClick={() => {
                        onSelectSprite(sprite);
                        onClose();
                      }}
                      className="group relative cursor-pointer p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-400 transition flex flex-col items-center text-center space-y-2.5 shadow-md"
                    >
                      {/* Preview Container with Live Animation */}
                      <div className="relative w-full h-24 bg-slate-950/80 rounded-lg flex items-center justify-center p-2 border border-slate-800 overflow-hidden">
                        <AnimatedSpriteThumbnail sprite={sprite} />

                        {/* Top-Right Badge: SEQUENCE vs STATIC */}
                        {isSeq ? (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-600/90 text-indigo-100 shadow flex items-center gap-1 backdrop-blur-xs tracking-wider">
                            <Film className="w-2.5 h-2.5" />
                            SEQUENCE
                          </span>
                        ) : (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-700/90 text-slate-200 shadow flex items-center gap-1 backdrop-blur-xs tracking-wider">
                            <ImageIcon className="w-2.5 h-2.5" />
                            STATIC
                          </span>
                        )}
                      </div>

                      <div className="w-full space-y-1">
                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-300 truncate" title={sprite.name}>
                          {sprite.name}
                        </h4>

                        {/* Badges: Marker Type & Category */}
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {isSeq ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold flex items-center gap-1">
                              <Play className="w-2 h-2 fill-current" />
                              {sprite.frames.length} Frame ({sprite.frameRate || 4} FPS)
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-1">
                              <ImageIcon className="w-2 h-2" />
                              Static
                            </span>
                          )}

                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-400 font-medium">
                            {formatCategoryBadge(sprite.category)}
                          </span>
                        </div>
                      </div>

                      <button className="w-full py-1 text-xs font-semibold rounded-lg bg-slate-700 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer">
                        <Check className="w-3.5 h-3.5" />
                        Pilih
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-5 max-w-lg mx-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Aset
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Contoh: Tokoh Penghulu / Tekstur Kayu / Latar Resepsi"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Format Animasi / Gambar (Pilih Tipe Aset)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomType('static');
                      if (customFrames.length > 1) setCustomFrames([customFrames[0]]);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      customType === 'static'
                        ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-sm'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Single Image (Static)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType('sequence')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      customType === 'sequence'
                        ? 'border-indigo-400 bg-indigo-500/15 text-indigo-300 shadow-sm'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Film className="w-4 h-4" />
                    <span>Image Sequence (Animasi)</span>
                  </button>
                </div>
              </div>

              {customType === 'sequence' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Kecepatan Animasi: {customFps} FPS (Frame/Detik)
                    </label>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={24}
                    value={customFps}
                    onChange={e => setCustomFps(parseInt(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              )}

              {/* Upload Drop Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {customType === 'static'
                    ? 'Pilih File Gambar (PNG/JPG/SVG/WebP)'
                    : 'Pilih Beberapa Gambar Berurutan (Frame 1, 2, 3...)'}
                </label>
                <label className="border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-800/40 hover:bg-slate-800/80 transition group">
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-amber-400 mb-2 transition" />
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                    Klik untuk memilih file dari komputer
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    {customType === 'sequence'
                      ? 'Dapat memilih banyak file sekaligus untuk dianimasikan berurutan'
                      : 'Mendukung PNG transparan, WebP, JPG, SVG'}
                  </span>
                  <input
                    type="file"
                    multiple={customType === 'sequence'}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploaded Frames & Preview */}
              {customFrames.length > 0 && (
                <div className="space-y-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        Pratinjau ({customFrames.length} gambar)
                      </span>
                      {customType === 'sequence' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                          <Film className="w-2.5 h-2.5" />
                          SEQUENCE ({customFps} FPS)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <ImageIcon className="w-2.5 h-2.5" />
                          STATIC
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomFrames([])}
                      className="text-rose-400 hover:underline cursor-pointer text-xs"
                    >
                      Hapus Semua
                    </button>
                  </div>

                  {/* Animated sequence player */}
                  {customType === 'sequence' && (
                    <div className="w-full h-28 bg-slate-950 rounded-lg flex items-center justify-center p-2 border border-slate-800">
                      <img
                        src={customFrames[activeUploadFrame] || customFrames[0]}
                        alt="Sequence Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}

                  {/* Frame Thumbnails */}
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {customFrames.map((frame, i) => (
                      <div
                        key={i}
                        className={`relative w-14 h-14 shrink-0 rounded-lg bg-slate-950 border p-1 flex items-center justify-center ${
                          customType === 'sequence' && activeUploadFrame === i
                            ? 'border-indigo-400'
                            : 'border-slate-800'
                        }`}
                      >
                        <img
                          src={frame}
                          alt={`Frame ${i + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                        <span className="absolute bottom-0.5 right-1 text-[8px] bg-slate-800/90 text-amber-300 px-1 rounded font-mono">
                          #{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={customFrames.length === 0}
                onClick={handleSaveCustomSprite}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold transition shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Gunakan Aset Ini
              </button>
            </div>
          )}

          {/* TAB 3: DIRECT IMAGE URL */}
          {activeTab === 'url' && (
            <div className="space-y-4 max-w-lg mx-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Aset (Opsional)
                </label>
                <input
                  type="text"
                  value={directUrlName}
                  onChange={e => setDirectUrlName(e.target.value)}
                  placeholder="Contoh: Background Gunung Unsplash"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  URL / Tautan Gambar (https://... atau data:image/...)
                </label>
                <input
                  type="text"
                  value={directUrl}
                  onChange={e => setDirectUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Live Preview Box */}
              {directUrl.trim() && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Pratinjau Gambar:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <ImageIcon className="w-2.5 h-2.5" />
                      STATIC
                    </span>
                  </div>
                  <div className="w-full h-40 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden p-2">
                    <img
                      src={directUrl}
                      alt="Pratinjau Gambar"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).alt = 'Gagal memuat URL gambar';
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={!directUrl.trim()}
                onClick={handleUseDirectUrl}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold transition shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Gunakan URL Gambar Ini
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
