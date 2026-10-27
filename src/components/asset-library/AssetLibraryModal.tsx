'use client';

import React, { useState } from 'react';
import { SpriteAsset, SpriteType } from '@/types/platformer';
import { BUILT_IN_SPRITES } from '@/lib/assetLibrary';
import { X, Upload, Plus, Play, Sparkles, Check, Image as ImageIcon } from 'lucide-react';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSprite: (sprite: SpriteAsset) => void;
  title?: string;
  categoryFilter?: 'player' | 'npc' | 'obstacle' | 'decoration' | 'all';
}

export default function AssetLibraryModal({
  isOpen,
  onClose,
  onSelectSprite,
  title = 'Pilih Sprite dari Asset Library',
  categoryFilter = 'all'
}: AssetLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload'>('presets');

  // Custom upload state
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<SpriteType>('static');
  const [customFrames, setCustomFrames] = useState<string[]>([]);
  const [customFps, setCustomFps] = useState(8);

  if (!isOpen) return null;

  // Filter presets
  const filteredPresets = BUILT_IN_SPRITES.filter(s => {
    if (categoryFilter === 'all') return true;
    return s.category === categoryFilter;
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
    const newSprite: SpriteAsset = {
      id: `custom-sprite-${Date.now()}`,
      name: customName.trim() || 'Custom Sprite',
      type: customType,
      frames: customFrames,
      frameRate: customFps,
      loop: true
    };
    onSelectSprite(newSprite);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800 px-6 pt-3 gap-6 text-sm">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-3 font-semibold transition border-b-2 ${
              activeTab === 'presets'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Pustaka Bawaan (Library Presets)
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 font-semibold transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Custom (Single / Image Sequence)
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'presets' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredPresets.map(sprite => (
                <div
                  key={sprite.id}
                  onClick={() => {
                    onSelectSprite(sprite);
                    onClose();
                  }}
                  className="group relative cursor-pointer p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-400 transition flex flex-col items-center text-center space-y-3"
                >
                  {/* Sprite Preview Box */}
                  <div className="w-20 h-20 bg-slate-950/80 rounded-lg flex items-center justify-center p-2 border border-slate-800 overflow-hidden">
                    <img
                      src={sprite.frames[0]}
                      alt={sprite.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-110 transition duration-200"
                    />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
                      {sprite.name}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 mt-1 inline-block rounded-full bg-slate-900 border border-slate-700 text-slate-400">
                      {sprite.type === 'sequence'
                        ? `${sprite.frames.length} Frames (Sequence)`
                        : 'Static Image'}
                    </span>
                  </div>

                  <button className="w-full py-1 text-xs font-medium rounded-lg bg-slate-700 group-hover:bg-amber-500 group-hover:text-slate-950 text-slate-300 transition flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Pilih
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-5 max-w-lg mx-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Sprite
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Contoh: Pengantin Adat / Kucing Lucu"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Format Animasi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomType('static');
                      if (customFrames.length > 1) setCustomFrames([customFrames[0]]);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      customType === 'static'
                        ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    Single Image (Static)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType('sequence')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      customType === 'sequence'
                        ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    Image Sequence (Multi-Frame)
                  </button>
                </div>
              </div>

              {customType === 'sequence' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Kecepatan Animasi (FPS): {customFps} frame/detik
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
                      ? 'Dapat memilih banyak file sekaligus'
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

              {/* Uploaded Frames Preview */}
              {customFrames.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Frame Terpilih ({customFrames.length} gambar)</span>
                    <button
                      type="button"
                      onClick={() => setCustomFrames([])}
                      className="text-rose-400 hover:underline"
                    >
                      Hapus Semua
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {customFrames.map((frame, i) => (
                      <div
                        key={i}
                        className="relative w-16 h-16 shrink-0 rounded-lg bg-slate-950 border border-slate-700 p-1 flex items-center justify-center"
                      >
                        <img
                          src={frame}
                          alt={`Frame ${i + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                        <span className="absolute bottom-0.5 right-1 text-[9px] bg-slate-800/90 text-amber-300 px-1 rounded">
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
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold transition shadow-lg text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Simpan & Gunakan Sprite Ini
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
