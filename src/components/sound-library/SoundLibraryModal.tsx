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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#D2E5DA] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] text-[#1C2E24]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-[#E2EDE6] bg-[#F4F8F5]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E8F3ED] border border-[#D2E5DA] flex items-center justify-center text-[#2D5A43] shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#1C2E24] text-sm sm:text-base leading-tight">{title}</h3>
              <p className="text-[11px] sm:text-xs text-[#5A7765] mt-0.5">
                Koleksi sound bawaan, upload file audio kustom, atau gunakan URL
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="text-[#5A7765] hover:text-[#1C2E24] p-2 rounded-full hover:bg-white transition cursor-pointer border border-transparent hover:border-[#D2E5DA]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Selector Tabs */}
        <div className="px-3 sm:px-6 pt-2.5 sm:pt-3 pb-2 border-b border-[#E2EDE6] bg-[#FBFDFB]">
          <div className="text-[11px] sm:text-xs font-semibold text-[#5A7765] mb-1.5 sm:mb-2">Target Suara / Event Permainan:</div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
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
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                    active
                      ? 'bg-[#2D5A43] text-white border-[#2D5A43] shadow-sm font-bold'
                      : 'bg-[#F4F8F5] text-[#5A7765] border-[#D2E5DA] hover:bg-[#E8F3ED] hover:text-[#1C2E24]'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  {cat === 'bgm' && 'Musik BGM'}
                  {cat === 'jump' && 'Lompat'}
                  {cat === 'footstep' && 'Langkah'}
                  {cat === 'idle' && 'Idle'}
                  {cat === 'proximity' && 'Mendekati'}
                  {cat === 'interact' && 'Interaksi'}
                </button>
              );
            })}
          </div>

          <div className="mt-2 px-3 py-1.5 sm:py-2 rounded-xl bg-[#F4F8F5] border border-[#E2EDE6] text-xs flex items-center justify-between">
            <span className="text-[#2D5A43] font-semibold truncate">{currentCategoryInfo.title}</span>
            <span className="text-[#5A7765] text-[11px] truncate max-w-[200px] sm:max-w-sm hidden sm:inline">{currentCategoryInfo.subtitle}</span>
          </div>
        </div>

        {/* Source Mode Tabs (Presets / Upload / URL) */}
        <div className="flex border-b border-[#E2EDE6] px-3 sm:px-6 gap-3 sm:gap-6 text-xs font-bold bg-[#FBFDFB] overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveSourceTab('presets');
              audioEngine.stopPreview();
              setPlayingId(null);
            }}
            className={`py-2.5 sm:py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSourceTab === 'presets'
                ? 'border-[#2D5A43] text-[#2D5A43]'
                : 'border-transparent text-[#5A7765] hover:text-[#1C2E24]'
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
            className={`py-2.5 sm:py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSourceTab === 'upload'
                ? 'border-[#2D5A43] text-[#2D5A43]'
                : 'border-transparent text-[#5A7765] hover:text-[#1C2E24]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File Audio
          </button>
          <button
            onClick={() => {
              setActiveSourceTab('url');
              audioEngine.stopPreview();
              setPlayingId(null);
            }}
            className={`py-2.5 sm:py-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSourceTab === 'url'
                ? 'border-[#2D5A43] text-[#2D5A43]'
                : 'border-transparent text-[#5A7765] hover:text-[#1C2E24]'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Direct URL / Link
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PRESETS */}
          {activeSourceTab === 'presets' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPresets.map((sound) => {
                  const isPlaying = playingId === sound.id;
                  return (
                    <div
                      key={sound.id}
                      className="bg-[#FBFDFB] border border-[#E2EDE6] hover:border-[#2D5A43]/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition hover:shadow-md group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handlePlayPreview(sound)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer ${
                            isPlaying
                              ? 'bg-[#2D5A43] text-white shadow-md animate-pulse'
                              : 'bg-[#E8F3ED] hover:bg-[#D2E5DA] text-[#2D5A43]'
                          }`}
                          title={isPlaying ? 'Hentikan Preview' : 'Putar Preview'}
                        >
                          {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                        <div className="overflow-hidden">
                          <h4 className="text-sm font-semibold text-[#1C2E24] group-hover:text-[#2D5A43] transition truncate">
                            {sound.name}
                          </h4>
                          <span className="text-[11px] text-[#5A7765] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A43]" />
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
                        className="px-3.5 py-1.5 rounded-xl bg-[#E8F3ED] hover:bg-[#2D5A43] text-[#2D5A43] hover:text-white text-xs font-semibold transition shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Pilih
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredPresets.length === 0 && (
                <div className="text-center py-12 text-[#5A7765] text-sm">
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
                className="border-2 border-dashed border-[#D2E5DA] hover:border-[#2D5A43] rounded-2xl p-8 text-center cursor-pointer transition bg-[#F4F8F5] hover:bg-[#E8F3ED] group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="audio/*,.mp3,.wav,.ogg,.aac,.m4a,.webm"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#E8F3ED] border border-[#D2E5DA] flex items-center justify-center text-[#2D5A43] group-hover:scale-110 transition">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="text-sm font-semibold text-[#1C2E24] mb-1">
                  Klik untuk Memilih File Audio
                </div>
                <p className="text-xs text-[#5A7765]">
                  Mendukung format MP3, WAV, OGG, AAC, M4A, WebM (Disarankan &lt; 5MB)
                </p>
              </div>

              {uploadedDataUrl && (
                <div className="bg-[#F4F8F5] border border-[#D2E5DA] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C2E24] flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-[#2D5A43]" />
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
                      className="px-2.5 py-1 rounded bg-white border border-[#D2E5DA] hover:bg-[#E8F3ED] text-[#2D5A43] text-xs font-semibold flex items-center gap-1 cursor-pointer"
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
                    <label className="text-xs text-[#5A7765] block mb-1">Nama Suara:</label>
                    <input
                      type="text"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      placeholder="Contoh: Lagu Pengantin Kustom"
                      className="w-full px-3 py-2 bg-white border border-[#D2E5DA] rounded-xl text-sm text-[#1C2E24] focus:outline-none focus:border-[#2D5A43]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-[#5A7765] mb-1">
                      <span>Volume Default:</span>
                      <span className="font-mono text-[#2D5A43] font-bold">{Math.round(uploadVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={uploadVolume}
                      onChange={(e) => setUploadVolume(Number(e.target.value))}
                      className="w-full accent-[#2D5A43] cursor-pointer h-2 bg-[#E2EDE6] rounded-lg"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveUpload}
                    className="w-full py-2.5 rounded-full bg-[#2D5A43] hover:bg-[#234734] text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-[#2D5A43]/20 cursor-pointer mt-2"
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
              <div className="bg-[#F4F8F5] border border-[#E2EDE6] rounded-2xl p-4 text-xs text-[#5A7765] space-y-1">
                <p className="font-semibold text-[#1C2E24]">Gunakan Link / URL Audio Eksternal:</p>
                <p>
                  Masukkan URL file audio publik yang dapat diakses langsung (contoh:{' '}
                  <code className="text-[#2D5A43] font-semibold">https://domain.com/musik.mp3</code>).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#5A7765] block mb-1">URL Audio (MP3 / WAV / OGG):</label>
                  <input
                    type="url"
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                    className="w-full px-3 py-2 bg-white border border-[#D2E5DA] rounded-xl text-sm text-[#1C2E24] focus:outline-none focus:border-[#2D5A43]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#5A7765] block mb-1">Nama Tampilan:</label>
                  <input
                    type="text"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    placeholder="Contoh: Backsound Akustik"
                    className="w-full px-3 py-2 bg-white border border-[#D2E5DA] rounded-xl text-sm text-[#1C2E24] focus:outline-none focus:border-[#2D5A43]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-[#5A7765] mb-1">
                    <span>Volume Default:</span>
                    <span className="font-mono text-[#2D5A43] font-bold">{Math.round(directVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={directVolume}
                    onChange={(e) => setDirectVolume(Number(e.target.value))}
                    className="w-full accent-[#2D5A43] cursor-pointer h-2 bg-[#E2EDE6] rounded-lg"
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
                    className="flex-1 py-2 px-3 rounded-full bg-[#F4F8F5] hover:bg-[#E8F3ED] text-[#2D5A43] text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer border border-[#D2E5DA]"
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
                    className="flex-1 py-2 px-3 rounded-full bg-[#2D5A43] hover:bg-[#234734] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-[#2D5A43]/20"
                  >
                    <Check className="w-3.5 h-3.5" /> Pilih Audio URL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E2EDE6] bg-[#F4F8F5] flex items-center justify-between text-xs text-[#5A7765]">
          <span>
            💡 Preview audio otomatis disesuaikan dengan volume perangkat Anda.
          </span>
          <button
            onClick={handleModalClose}
            className="px-4 py-1.5 rounded-full bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] text-[#1C2E24] font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
