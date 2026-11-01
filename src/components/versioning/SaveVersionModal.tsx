'use client';

import React, { useState } from 'react';
import { BookmarkPlus, Lock, X, Loader2 } from 'lucide-react';

interface SaveVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextSuggestedNumber: number;
  onSaveVersion: (versionName: string, isLocked: boolean) => Promise<boolean>;
}

export default function SaveVersionModal({
  isOpen,
  onClose,
  nextSuggestedNumber,
  onSaveVersion,
}: SaveVersionModalProps) {
  const [versionName, setVersionName] = useState(`Versi ${nextSuggestedNumber} - Revisi Desain`);
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const ok = await onSaveVersion(versionName.trim(), isLocked);
      if (ok) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#D2E5DA] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-[#E2EDE6] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#E8F3ED] text-[#2D5A43] border border-[#D2E5DA]">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#1C2E24] text-base">Simpan Snapshot Versi Baru</h3>
              <p className="text-xs text-[#5A7765]">Buat checkpoint desain yang dapat dipulihkan kapan saja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5A7765] hover:text-[#1C2E24] hover:bg-[#F4F8F5] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#446050] mb-1.5">
              Nama / Catatan Versi
            </label>
            <input
              type="text"
              required
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Contoh: Revisi layout akad & foto mempelai"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBFDFB] border border-[#D2E5DA] text-sm text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
              autoFocus
            />
            <p className="text-[11px] text-[#5A7765] mt-1">
              Beri nama yang deskriptif agar mudah dikenali di kemudian hari.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-[#2D5A43] cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-[#1C2E24] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#2D5A43]" /> Kunci Versi Ini (Lock / Pin)
                </span>
                <p className="text-[11px] text-[#5A7765] mt-0.5 leading-relaxed">
                  Versi yang dikunci kebal dari rotasi otomatis dan tidak akan pernah terhapus saat kuota 10 versi penuh.
                </p>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full bg-[#F4F8F5] hover:bg-[#E8F3ED] text-[#1C2E24] text-xs font-semibold transition border border-[#D2E5DA]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !versionName.trim()}
              className="px-5 py-2 rounded-full bg-[#2D5A43] hover:bg-[#234734] disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-[#2D5A43]/20 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Simpan Versi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
