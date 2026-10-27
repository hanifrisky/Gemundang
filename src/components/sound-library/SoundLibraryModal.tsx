'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SoundAsset, SoundEventType } from '@/types/platformer';
import { BUILT_IN_SOUNDS, getSoundEventInfo } from '@/lib/soundLibrary';
import { audioEngine } from '@/lib/audioEngine';
import {
  X,
  Volume2,
  Play,
  Square,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Music,
  Check,
  Disc3,
  Footprints,
  ArrowUp,
  Coffee,
  Bell
} from 'lucide-react';

interface SoundLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (sound: SoundAsset) => void;
  initialCategory?: SoundEventType;
  title?: string;
}

export default function SoundLibraryModal({
  isOpen,
  onClose,
  onSelectSound,
  initialCategory = 'bgm',
  title = 'Pilih Audio / Efek Suara'
}: SoundLibraryModalProps) {
  const [activeSourceTab, setActiveSourceTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [categoryOverride, setCategoryOverride] = useState<SoundEventType | null>(null);
  const [prevInitialCategory, setPrevInitialCategory] = useState(initialCategory);

  if (initialCategory !== prevInitialCategory) {
    setPrevInitialCategory(initialCategory);
    setCategoryOverride(null);
  }
  const selectedCategory = categoryOverride ?? initialCategory;
  const setSelectedCategory = (cat: SoundEventType) => setCategoryOverride(cat);

  const [playingId, setPlayingId] = useState<string | null>(null);

  // Upload state
  const [uploadName, setUploadName] = useState('');
  const [uploadedDataUrl, setUploadedDataUrl] = useState<string | null>(null);
  const [uploadVolume, setUploadVolume] = useState<number>(0.85);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // URL state
  const [directUrl, setDirectUrl] = useState('');
  const [directName, setDirectName] = useState('');
  const [directVolume, setDirectVolume] = useState<number>(0.85);

  // Stop any audio preview on unmount
  useEffect(() => {
    return () => {
      audioEngine.stopPreview();
    };
  }, []);

  const handleModalClose = () => {
    audioEngine.stopPreview();
    setPlayingId(null);
    onClose();
  };

  if (!isOpen) return null;

  const handlePlayPreview = (sound: SoundAsset) => {
    if (playingId === sound.id) {
      audioEngine.stopPreview();
      setPlayingId(null);
      return;
    }

    setPlayingId(sound.id);
    audioEngine.previewSound(sound, () => {
      setPlayingId((prev) => (prev === sound.id ? null : prev));
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|aac|m4a|webm)$/i)) {
      alert('Mohon pilih file audio valid (.mp3, .wav, .ogg, .aac, .m4a)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedDataUrl(dataUrl);
      if (!uploadName.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setUploadName(cleanName);
      }

      // Quick preview
      const previewAsset: SoundAsset = {
        id: 'upload-preview',
        name: file.name,
        category: selectedCategory,
        url: dataUrl,
        volume: uploadVolume
      };
      setPlayingId('upload-preview');
      audioEngine.previewSound(previewAsset, () => {
        setPlayingId((prev) => (prev === 'upload-preview' ? null : prev));
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = () => {
    if (!uploadedDataUrl) return;
    const sound: SoundAsset = {
      id: `custom-sound-${Date.now()}`,
      name: uploadName.trim() || `Audio Upload (${selectedCategory})`,
      category: selectedCategory,
      url: uploadedDataUrl,
      volume: uploadVolume,
      loop: selectedCategory === 'bgm'
    };
    audioEngine.stopPreview();
    onSelectSound(sound);
    onClose();
  };

  const handleSaveDirectUrl = () => {
    if (!directUrl.trim()) return;
    const sound: SoundAsset = {
      id: `custom-url-${Date.now()}`,
      name: directName.trim() || `Link Audio (${selectedCategory})`,
      category: selectedCategory,
      url: directUrl.trim(),
      volume: directVolume,
      loop: selectedCategory === 'bgm'
    };
    audioEngine.stopPreview();
    onSelectSound(sound);
    onClose();
  };

  const filteredPresets = BUILT_IN_SOUNDS.filter((s) => s.category === selectedCategory);
  const currentCategoryInfo = getSoundEventInfo(selectedCategory);

  const getCategoryIcon = (cat: SoundEventType) => {
    switch (cat) {
      case 'bgm':
        return <Music className="w-3.5 h-3.5" />;
      case 'jump':
        return <ArrowUp className="w-3.5 h-3.5" />;
      case 'footstep':
        return <Footprints className="w-3.5 h-3.5" />;
      case 'idle':
        return <Coffee className="w-3.5 h-3.5" />;
      case 'proximity':
        return <Bell className="w-3.5 h-3.5" />;
      case 'interact':
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">{title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Koleksi sound bawaan, upload file audio kustom, atau gunakan URL
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Selector Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-900/60">
          <div className="text-xs font-semibold text-slate-400 mb-2">Target Suara / Event Permainan:</div>
          <div className="flex flex-wrap gap-1.5">
            {(['bgm', 'jump', 'footstep', 'idle', 'proximity', 'interact'] as SoundEventType[]).map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    audioEngine.stopPreview();
                    setPlayingId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  {cat === 'bgm' && 'Musik BGM'}
                  {cat === 'jump' && 'Lompat'}
                  {cat === 'footstep' && 'Langkah'}
                  {cat === 'idle' && 'Idle / Santai'}
                  {cat === 'proximity' && 'Mendekati'}
                  {cat === 'interact' && 'Interaksi'}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-amber-400 font-semibold">{currentCategoryInfo.title}</span>
            <span className="text-slate-400 text-[11px] truncate max-w-sm">{currentCategoryInfo.subtitle}</span>
          </div>
        </div>

        {/* Source Mode Tabs (Presets / Upload / URL) */}
        <div className="flex border-b border-slate-800 px-6 gap-6 text-xs font-bold bg-slate-950/30">
          <button
            onClick={() => {
              setActiveSourceTab('presets');
              audioEngine.stopPreview();
              setPlayingId(null);
            }}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeSourceTab === 'presets'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            Pustaka Bawaan ({filteredPresets.length})
          </button>
          <button
            onClick={() => {
              setActiveSourceTab('upload');
              audioEngine.stopPreview();
              setPlayingId(null);
            }}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeSourceTab === 'upload'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File Audio (.mp3, .wav, .ogg)
          </button>
          <button
            onClick={() => {
              setActiveSourceTab('url');
              audioEngine.stopPreview();
              setPlayingId(null);
            }}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeSourceTab === 'url'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Direct URL / Link Audio
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PRESETS */}
          {activeSourceTab === 'presets' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPresets.map((sound) => {
                  const isPlaying = playingId === sound.id;
                  return (
                    <div
                      key={sound.id}
                      className="bg-slate-800/60 border border-slate-700/60 hover:border-amber-400/50 rounded-xl p-3.5 flex items-center justify-between gap-3 transition hover:shadow-lg group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handlePlayPreview(sound)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer ${
                            isPlaying
                              ? 'bg-amber-400 text-slate-950 shadow-md animate-pulse'
                              : 'bg-slate-700 hover:bg-slate-600 text-amber-400'
                          }`}
                          title={isPlaying ? 'Hentikan Preview' : 'Putar Preview'}
                        >
                          {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                        <div className="overflow-hidden">
                          <h4 className="text-sm font-semibold text-white group-hover:text-amber-400 transition truncate">
                            {sound.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Audio Web Synth (Instan, Ringan)
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.stopPreview();
                          onSelectSound(sound);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 text-xs font-bold transition shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Pilih
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredPresets.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Belum ada preset bawaan untuk kategori ini. Anda dapat mengupload file audio kustom!
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD AUDIO */}
          {activeSourceTab === 'upload' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-800/30 hover:bg-slate-800/60 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.webm"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="text-sm font-semibold text-white mb-1">
                  Klik untuk Memilih File Audio
                </div>
                <p className="text-xs text-slate-400">
                  Mendukung format MP3, WAV, OGG, AAC, M4A, WebM (Disarankan &lt; 5MB)
                </p>
              </div>

              {uploadedDataUrl && (
                <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      File Audio Siap Digunakan
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const previewAsset: SoundAsset = {
                          id: 'upload-preview',
                          name: uploadName || 'Audio Upload',
                          category: selectedCategory,
                          url: uploadedDataUrl,
                          volume: uploadVolume
                        };
                        handlePlayPreview(previewAsset);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-amber-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {playingId === 'upload-preview' ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" /> Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" /> Dengar Audio
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nama Suara:</label>
                    <input
                      type="text"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      placeholder="Contoh: Lagu Pengantin Kustom"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Volume Default:</span>
                      <span className="font-mono text-amber-400">{Math.round(uploadVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={uploadVolume}
                      onChange={(e) => setUploadVolume(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveUpload}
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer mt-2"
                  >
                    <Check className="w-4 h-4" /> Terapkan & Pilih Suara Ini
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DIRECT URL */}
          {activeSourceTab === 'url' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-200">Gunakan Link / URL Audio Eksternal:</p>
                <p>
                  Masukkan URL file audio publik yang dapat diakses langsung (contoh:{' '}
                  <code className="text-amber-400">https://domain.com/musik.mp3</code>).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">URL Audio (MP3 / WAV / OGG):</label>
                  <input
                    type="url"
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nama Tampilan:</label>
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="Contoh: Backsound Akustik"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Volume Default:</span>
                    <span className="font-mono text-amber-400">{Math.round(directVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={directVolume}
                    onChange={(e) => setDirectVolume(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!directUrl.trim()}
                    onClick={() => {
                      const testAsset: SoundAsset = {
                        id: 'url-test',
                        name: directName || 'Test Audio',
                        category: selectedCategory,
                        url: directUrl.trim(),
                        volume: directVolume
                      };
                      handlePlayPreview(testAsset);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {playingId === 'url-test' ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" /> Hentikan Test
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" /> Tes Putar URL
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!directUrl.trim()}
                    onClick={handleSaveDirectUrl}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    <Check className="w-3.5 h-3.5" /> Pilih Audio URL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            💡 Preview audio otomatis disesuaikan dengan volume perangkat Anda.
          </span>
          <button
            onClick={handleModalClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
