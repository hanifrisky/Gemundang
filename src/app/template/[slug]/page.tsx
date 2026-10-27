'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import {
  PlatformerProject,
  InteractiveEntity,
  SpriteAsset
} from '@/types/platformer';
import { getProjectForEdit, saveProject } from '@/lib/projectStorage';
import AccessNotice from '@/components/auth/AccessNotice';
import PlatformerEngine from '@/components/game/PlatformerEngine';
import AssetLibraryModal from '@/components/asset-library/AssetLibraryModal';
import {
  Sparkles,
  Save,
  Eye,
  Edit3,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
  User,
  Image as ImageIcon,
  Video,
  FileText,
  SlidersHorizontal,
  Layers
} from 'lucide-react';
import Link from 'next/link';
import { presetGroom, presetBride } from '@/lib/assetLibrary';

function TemplateCustomizerContent() {
  const params = useParams();
  const slug = (params?.slug as string) || 'wedding-adventure';

  const [project, setProject] = useState<PlatformerProject | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');

  // Asset Modal State
  const [assetTarget, setAssetTarget] = useState<{
    type: 'player' | 'entity_appearance';
    entityId?: string;
  } | null>(null);

  const [accessError, setAccessError] = useState<'unauthenticated' | 'forbidden' | 'not_found' | null>(null);

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
        Memuat Form Template...
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

  // Helper to update entity content
  const updateEntityContent = (id: string, updates: Partial<InteractiveEntity['interaction']>) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        entities: prev.entities.map(e => {
          if (e.id === id) {
            return {
              ...e,
              interaction: {
                ...(e.interaction || { type: 'info' }),
                ...updates
              }
            };
          }
          return e;
        })
      };
    });
  };

  // Helper to update entity sprite/appearance
  const updateEntityAppearance = (id: string, sprite: SpriteAsset) => {
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        entities: prev.entities.map(e => (e.id === id ? { ...e, sprite } : e))
      };
    });
  };

  // Filter elements that have editable flags enabled
  const editableEntities = project.entities.filter(
    e => e.editable_content || e.editable_appearance
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* HEADER BAR */}
      <header className="min-h-16 h-auto border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 py-2.5 sm:px-4 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 max-w-[50%] sm:max-w-none">
          <Link
            href="/"
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
          <div className="truncate">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-white text-sm sm:text-base truncate">{project.title}</span>
              <span className="hidden sm:inline text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 shrink-0">
                Mode Template
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 truncate">
              Kustomisasi konten & tampilan melalui formulir mudah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Link to Level Editor */}
          <Link
            href={`/editor/${project.slug}`}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition"
            title="Buka Level Editor"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Editor</span>
          </Link>

          {/* Link to Playable View */}
          <Link
            href={`/view/${project.slug}`}
            target="_blank"
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">View</span>
            <ExternalLink className="w-3 h-3 text-slate-400 hidden sm:inline" />
          </Link>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Simpan</span>
          </button>
        </div>
      </header>

      {/* MOBILE TAB SWITCHER (VISIBLE ON SCREENS < 1024px) */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            mobileTab === 'form'
              ? 'bg-sky-500 text-slate-950 shadow'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Formulir Undangan
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            mobileTab === 'preview'
              ? 'bg-sky-500 text-slate-950 shadow'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Live Preview Game
        </button>
      </div>

      {/* SUCCESS TOAST */}
      {saveSuccessNotice && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          Template berhasil disimpan!
        </div>
      )}

      {/* SPLIT-SCREEN WORKSPACE: FORM ON LEFT, LIVE PLAYABLE ENGINE ON RIGHT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: DYNAMIC FORM BASED ON EDITABLE FLAGS */}
        <div className={`w-full lg:w-[480px] xl:w-[540px] border-r border-slate-800 bg-slate-900/60 overflow-y-auto p-4 sm:p-6 space-y-6 shrink-0 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-sky-400" />
              Kustomisasi Undangan
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Setiap perubahan pada formulir ini langsung ter-update secara real-time pada game di sebelah kanan.
            </p>
          </div>

          {/* GLOBAL EVENT DETAILS */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Informasi Umum Acara
            </h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Judul Undangan / Acara</label>
              <input
                type="text"
                value={project.title}
                onChange={e => setProject({ ...project, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Subjudul / Deskripsi Pendek</label>
              <input
                type="text"
                value={project.subtitle || ''}
                onChange={e => setProject({ ...project, subtitle: e.target.value })}
                placeholder="Contoh: Undangan Pernikahan Romantis"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* SECTION 1: PLAYER APPEARANCE (IF EDITABLE) */}
          {project.player.editable_appearance && (
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {project.player.editableLabel || 'Pilihan Karakter Utama (Avatar)'}
              </h3>
              <p className="text-xs text-slate-400">
                Pilih avatar yang akan dimainkan oleh tamu undangan:
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Groom preset */}
                <div
                  onClick={() =>
                    setProject({
                      ...project,
                      player: {
                        ...project.player,
                        idleSprite: presetGroom.idle,
                        runSprite: presetGroom.run
                      }
                    })
                  }
                  className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${
                    project.player.idleSprite.id === presetGroom.idle.id
                      ? 'border-sky-400 bg-sky-500/10'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-9 h-9 bg-slate-950 rounded-lg p-1 flex items-center justify-center">
                    <img src={presetGroom.idle.frames[0]} alt="Groom" className="max-h-full" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Mempelai Pria</div>
                    <div className="text-[10px] text-slate-400">Jas Hitam & Mawar</div>
                  </div>
                </div>

                {/* Bride preset */}
                <div
                  onClick={() =>
                    setProject({
                      ...project,
                      player: {
                        ...project.player,
                        idleSprite: presetBride.idle,
                        runSprite: presetBride.run
                      }
                    })
                  }
                  className={`p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${
                    project.player.idleSprite.id === presetBride.idle.id
                      ? 'border-sky-400 bg-sky-500/10'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-9 h-9 bg-slate-950 rounded-lg p-1 flex items-center justify-center">
                    <img src={presetBride.idle.frames[0]} alt="Bride" className="max-h-full" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Mempelai Wanita</div>
                    <div className="text-[10px] text-slate-400">Gaun Putih & Buket</div>
                  </div>
                </div>
              </div>

              {/* Custom library selector button */}
              <button
                type="button"
                onClick={() => setAssetTarget({ type: 'player' })}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Pilih Karakter Lain dari Library / Upload Sendiri
              </button>
            </div>
          )}

          {/* SECTION 2: EDITABLE ENTITIES (APPEARANCE & CONTENT) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              Bagian Undangan yang Dapat Diubah ({editableEntities.length} Objek)
            </h3>

            {editableEntities.map((ent) => (
              <div
                key={ent.id}
                className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-950 p-1 flex items-center justify-center border border-slate-800">
                      <img
                        src={ent.sprite?.frames?.[0]}
                        alt={ent.name}
                        className="max-h-full max-w-full"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white">
                        {ent.contentLabel || ent.appearanceLabel || ent.name}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {ent.name} • Tipe:{' '}
                        <span className="text-amber-400 uppercase font-semibold">
                          {ent.interaction?.type}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* EDITABLE APPEARANCE: Can change sprite */}
                {ent.editable_appearance && (
                  <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        {ent.appearanceLabel || 'Tampilan Visual Objek / NPC'}
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setAssetTarget({ type: 'entity_appearance', entityId: ent.id })
                        }
                        className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                      >
                        Ganti Tampilan ➔
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Saat ini:</span>
                      <span className="text-slate-200 font-medium">{ent.sprite.name}</span>
                    </div>
                  </div>
                )}

                {/* EDITABLE CONTENT: Can change text, photo, video */}
                {ent.editable_content && (
                  <div className="space-y-3">
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Judul Dialog
                      </label>
                      <input
                        type="text"
                        value={ent.interaction?.title || ''}
                        onChange={e => updateEntityContent(ent.id, { title: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-base sm:text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>

                    {/* Text description */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Teks Keterangan / Dialog
                      </label>
                      <textarea
                        rows={3}
                        value={ent.interaction?.content || ''}
                        onChange={e => updateEntityContent(ent.id, { content: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-base sm:text-xs text-white focus:outline-none focus:border-sky-400 resize-none"
                      />
                    </div>

                    {/* Image URL (if type === 'image') */}
                    {ent.interaction?.type === 'image' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                          URL Foto Galeri (JPG / PNG / WebP)
                        </label>
                        <input
                          type="text"
                          value={ent.interaction?.mediaUrl || ''}
                          onChange={e => updateEntityContent(ent.id, { mediaUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-base sm:text-xs text-white focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    )}

                    {/* Video URL (if type === 'video') */}
                    {ent.interaction?.type === 'video' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-rose-400" />
                          URL Video (YouTube Embed atau Video MP4)
                        </label>
                        <input
                          type="text"
                          value={ent.interaction?.mediaUrl || ''}
                          onChange={e => updateEntityContent(ent.id, { mediaUrl: e.target.value })}
                          placeholder="https://www.youtube.com/embed/..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-base sm:text-xs text-white focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE INTERACTIVE PLAYABLE PREVIEW */}
        <div className={`flex-1 bg-slate-950 p-3 sm:p-6 flex flex-col items-center justify-center overflow-auto ${mobileTab === 'form' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="w-full max-w-4xl space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Playable Preview — Mainkan game langsung di sini untuk menguji!
              </span>
              <span className="text-slate-400">
                Gunakan [A][D]/Panah untuk jalan, [E] untuk bicara dengan objek
              </span>
            </div>

            {/* Interactive Game Engine Runtime */}
            <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
              <PlatformerEngine project={project} mode="play" />
            </div>
          </div>
        </div>
      </div>

      {/* ASSET LIBRARY MODAL FOR TEMPLATE MODE */}
      <AssetLibraryModal
        isOpen={assetTarget !== null}
        onClose={() => setAssetTarget(null)}
        categoryFilter="character"
        title={assetTarget?.type === 'player' ? 'Pilih Karakter Pemain' : 'Pilih Sprite Karakter / Tampilan Objek'}
        onSelectSprite={sprite => {
          if (!assetTarget) return;
          if (assetTarget.type === 'player') {
            setProject(prev =>
              prev
                ? {
                    ...prev,
                    player: {
                      ...prev.player,
                      idleSprite: sprite,
                      runSprite: sprite
                    }
                  }
                : prev
            );
          } else if (assetTarget.type === 'entity_appearance' && assetTarget.entityId) {
            updateEntityAppearance(assetTarget.entityId, sprite);
          }
          setAssetTarget(null);
        }}
      />
    </div>
  );
}

export default function TemplateCustomizerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Memuat Form Template...</div>}>
      <TemplateCustomizerContent />
    </Suspense>
  );
}
