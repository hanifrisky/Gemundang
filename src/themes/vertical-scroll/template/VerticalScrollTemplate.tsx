'use client';

import React, { useState } from 'react';
import {
  VerticalScrollProject,
  PageLayerElement
} from '@/types/verticalScroll';
import VerticalScrollEngine from '../runtime/VerticalScrollEngine';
import AssetLibraryModal from '@/components/asset-library/AssetLibraryModal';
import { SpriteAsset } from '@/types/base';
import {
  Save,
  Eye,
  Edit3,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Layers,
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import Link from 'next/link';

interface VerticalScrollTemplateProps {
  project: VerticalScrollProject;
  onSave: (updated: VerticalScrollProject) => Promise<boolean>;
}

export default function VerticalScrollTemplate({
  project: initialProject,
  onSave
}: VerticalScrollTemplateProps) {
  const [project, setProject] = useState<VerticalScrollProject>(initialProject);
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);

  // Asset library selection target
  const [assetTargetElementId, setAssetTargetElementId] = useState<string | null>(null);

  // Mobile layout switcher (form vs preview)
  const [mobileTab, setMobileTab] = useState<'form' | 'preview'>('form');

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(project);
    setIsSaving(false);
    if (success) {
      setSaveNotice(true);
      setTimeout(() => setSaveNotice(false), 2500);
    }
  };

  // Update specific element content or media
  const updateElementData = (
    pageId: string,
    elementId: string,
    updates: Partial<PageLayerElement>
  ) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        return {
          ...p,
          elements: p.elements.map((el) =>
            el.id === elementId ? { ...el, ...updates } : el
          )
        };
      })
    }));
  };

  // Filter sections that contain at least one editable element
  const editablePages = project.pages.map((page) => ({
    ...page,
    editableElements: page.elements.filter(
      (el) => el.editable_appearance || el.editable_content
    )
  })).filter((page) => page.editableElements.length > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* HEADER */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between shrink-0 z-30">
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
              <span className="font-bold text-white text-base truncate max-w-[200px] md:max-w-md">
                {project.title}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                Mode Template (Form Customizer)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kustomisasi teks dan foto undangan dengan mudah melalui form terarah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Tab Switcher */}
          <div className="flex lg:hidden bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setMobileTab('form')}
              className={`px-3 py-1.5 rounded-lg transition ${
                mobileTab === 'form' ? 'bg-sky-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              Form
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`px-3 py-1.5 rounded-lg transition ${
                mobileTab === 'preview' ? 'bg-sky-500 text-slate-950' : 'text-slate-300'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Link to Level Editor */}
          <Link
            href={`/editor/${project.slug}`}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Buka Level Editor</span>
          </Link>

          {/* Link to View */}
          <Link
            href={`/view/${project.slug}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">View</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </header>

      {/* SAVE TOAST */}
      {saveNotice && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          Template berhasil disimpan!
        </div>
      )}

      {/* SPLIT-SCREEN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: DYNAMIC TEMPLATE FORM */}
        <div
          className={`w-full lg:w-[480px] xl:w-[540px] border-r border-slate-800 bg-slate-900/60 overflow-y-auto p-6 space-y-6 shrink-0 ${
            mobileTab === 'form' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-sky-400" />
              Kustomisasi Undangan
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Semua perubahan pada form ini langsung ter-update secara real-time pada tampilan game di sebelah kanan.
            </p>
          </div>

          {/* GLOBAL EVENT DETAILS */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              Informasi Utama Undangan
            </h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Judul Undangan / Acara</label>
              <input
                type="text"
                value={project.title}
                onChange={(e) => setProject({ ...project, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Subjudul / Deskripsi Pendek</label>
              <input
                type="text"
                value={project.subtitle || ''}
                onChange={(e) => setProject({ ...project, subtitle: e.target.value })}
                placeholder="Contoh: Undangan Pernikahan Romantis"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* DYNAMIC EDITABLE SECTIONS ACCORDION */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              Bagian-Bagian yang Dapat Diedit
            </h3>

            {editablePages.map((page) => (
              <div
                key={page.id}
                className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4"
              >
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                    {page.order}
                  </span>
                  <span className="text-sm font-bold text-white">{page.title}</span>
                </div>

                <div className="space-y-4">
                  {page.editableElements.map((el) => (
                    <div
                      key={el.id}
                      className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/90 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-300">
                          {el.contentLabel || el.appearanceLabel || el.name}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-slate-500">
                          {el.type}
                        </span>
                      </div>

                      {/* EDITABLE APPEARANCE: FOTO / GAMBAR */}
                      {el.editable_appearance && (
                        <div className="space-y-2">
                          <label className="block text-[11px] text-slate-400">
                            {el.appearanceLabel || 'Pilihan Foto / Gambar'}
                          </label>
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-xl bg-slate-950 p-1 flex items-center justify-center border border-slate-700 overflow-hidden shrink-0">
                              <img
                                src={el.mediaUrl || el.spriteAsset?.frames?.[0] || 'https://via.placeholder.com/150'}
                                alt=""
                                className="max-h-full max-w-full object-cover"
                              />
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <input
                                type="text"
                                value={el.mediaUrl || ''}
                                onChange={(e) =>
                                  updateElementData(page.id, el.id, {
                                    mediaUrl: e.target.value,
                                    spriteAsset: undefined
                                  })
                                }
                                placeholder="https://..."
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                              />
                              <button
                                type="button"
                                onClick={() => setAssetTargetElementId(el.id)}
                                className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" /> Pilih dari Asset Library
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* EDITABLE CONTENT: TEKS JUDUL / DIALOG */}
                      {el.editable_content && (
                        <div className="space-y-2">
                          <label className="block text-[11px] text-slate-400">
                            {el.contentLabel || 'Teks / Isi Keterangan'}
                          </label>
                          <textarea
                            rows={el.type === 'text' && (el.content?.length || 0) > 40 ? 3 : 2}
                            value={el.content || ''}
                            onChange={(e) =>
                              updateElementData(page.id, el.id, {
                                content: e.target.value
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-400 resize-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE SIDE-BY-SIDE REACTIVE PREVIEW */}
        <div
          className={`flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center overflow-auto ${
            mobileTab === 'preview' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="w-full max-w-3xl space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Playable Preview — Scroll ke bawah untuk mencoba langsung perubahan form
              </span>
              <span className="text-slate-400">Perubahan form langsung ter-update seketika</span>
            </div>

            <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
              <VerticalScrollEngine project={project} mode="preview" />
            </div>
          </div>
        </div>
      </div>

      {/* ASSET LIBRARY MODAL */}
      <AssetLibraryModal
        isOpen={assetTargetElementId !== null}
        onClose={() => setAssetTargetElementId(null)}
        onSelectSprite={(sprite: SpriteAsset) => {
          if (assetTargetElementId) {
            // Find which page contains this element
            project.pages.forEach((page) => {
              const el = page.elements.find((e) => e.id === assetTargetElementId);
              if (el) {
                updateElementData(page.id, el.id, {
                  mediaUrl: sprite.frames[0],
                  spriteAsset: sprite
                });
              }
            });
          }
          setAssetTargetElementId(null);
        }}
      />
    </div>
  );
}
