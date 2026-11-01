'use client';

import React, { useState } from 'react';
import { ProjectVersionItem } from '@/lib/fileStorage';
import {
  History,
  Lock,
  Unlock,
  RotateCcw,
  Edit2,
  Check,
  X,
  FileCode,
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ProjectVersionItem[];
  currentVersionNumber: number;
  onRestore: (versionId: number) => Promise<boolean>;
  onToggleLock: (versionId: number) => Promise<boolean>;
  onRename: (versionId: number, newName: string) => Promise<boolean>;
  onRefresh: () => void;
}

export default function VersionHistoryModal({
  isOpen,
  onClose,
  versions,
  currentVersionNumber,
  onRestore,
  onToggleLock,
  onRename,
  onRefresh,
}: VersionHistoryModalProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleStartRename = (v: ProjectVersionItem) => {
    setEditingId(v.id);
    setEditingName(v.name);
  };

  const handleSaveRename = async (id: number) => {
    if (!editingName.trim()) return;
    setProcessingId(id);
    try {
      const ok = await onRename(id, editingName.trim());
      if (ok) {
        setEditingId(null);
        onRefresh();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleLock = async (id: number) => {
    setProcessingId(id);
    try {
      const ok = await onToggleLock(id);
      if (ok) onRefresh();
    } finally {
      setProcessingId(null);
    }
  };

  const handleRestore = async (v: ProjectVersionItem) => {
    if (
      !confirm(
        `Pulihkan projek ke "${v.name}" (v${v.versionNumber})?\nPerubahan draft yang belum disimpan sebagai versi baru akan tertimpa.`
      )
    )
      return;

    setProcessingId(v.id);
    try {
      const ok = await onRestore(v.id);
      if (ok) {
        alert(`Berhasil memulihkan versi: ${v.name}`);
        onClose();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const unlockedCount = versions.filter((v) => !v.isLocked).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#D2E5DA] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-[#E2EDE6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#E8F3ED] text-[#2D5A43] border border-[#D2E5DA]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#1C2E24] text-base">Riwayat Versi Projek</h3>
              <p className="text-xs text-[#5A7765]">
                Pilih versi sebelumnya untuk dipulihkan atau kunci versi penting agar tidak terhapus.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#5A7765] hover:text-[#1C2E24] hover:bg-[#F4F8F5] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quota Notice */}
        <div className="px-5 py-2.5 bg-[#F4F8F5] border-b border-[#E2EDE6] flex items-center justify-between text-xs text-[#5A7765]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#1C2E24]">Slot Versi Biasa:</span>
            <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold ${
              unlockedCount >= 9 ? 'bg-amber-100 text-amber-800' : 'bg-white border border-[#D2E5DA] text-[#1C2E24]'
            }`}>
              {unlockedCount} / 10
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#5A7765]">
            <Lock className="w-3.5 h-3.5 text-[#2D5A43]" />
            <span>Versi terkunci tidak dibatasi kuota</span>
          </div>
        </div>

        {/* Version List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {versions.length === 0 ? (
            <div className="text-center py-12 text-[#5A7765] text-xs">
              Belum ada snapshot versi untuk projek ini.
            </div>
          ) : (
            versions.map((v) => {
              const isCurrent = v.versionNumber === currentVersionNumber;
              const isEditing = editingId === v.id;
              const isBusy = processingId === v.id;

              return (
                <div
                  key={v.id}
                  className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-[#E8F3ED]/60 border-[#2D5A43]/40'
                      : 'bg-[#FBFDFB] border-[#E2EDE6] hover:border-[#D2E5DA]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-white border border-[#D2E5DA] text-[#2D5A43] shrink-0 mt-0.5">
                      <FileCode className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2.5 py-1 rounded-lg bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43]"
                            placeholder="Nama versi..."
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(v.id)}
                            className="p-1 rounded-lg bg-[#2D5A43] text-white hover:bg-[#234734]"
                            title="Simpan nama"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-lg bg-gray-100 text-[#5A7765] hover:text-[#1C2E24]"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white text-[#2D5A43] border border-[#D2E5DA] font-bold">
                            v{v.versionNumber}
                          </span>
                          <span className="font-semibold text-[#1C2E24] text-xs truncate max-w-xs sm:max-w-md">
                            {v.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8F3ED] text-[#2D5A43] border border-[#2D5A43]/30 font-bold">
                              Aktif
                            </span>
                          )}
                          <button
                            onClick={() => handleStartRename(v)}
                            className="text-[#5A7765] hover:text-[#1C2E24] text-xs"
                            title="Ganti nama versi"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-[#5A7765]">
                        <span>{v.createdAt}</span>
                        <span>•</span>
                        <span>{(v.fileSize / 1024).toFixed(1)} KB</span>
                        {v.isLocked && (
                          <>
                            <span>•</span>
                            <span className="text-[#2D5A43] flex items-center gap-1 font-semibold">
                              <Lock className="w-3 h-3" /> Terkunci (Aman)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => handleToggleLock(v.id)}
                      disabled={isBusy}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        v.isLocked
                          ? 'bg-[#E8F3ED] text-[#2D5A43] border-[#2D5A43]/40 hover:bg-[#D2E5DA]'
                          : 'bg-white hover:bg-[#F4F8F5] text-[#5A7765] hover:text-[#1C2E24] border-[#D2E5DA]'
                      }`}
                      title={v.isLocked ? 'Buka kunci versi' : 'Kunci versi agar kebal dari penghapusan'}
                    >
                      {v.isLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Terkunci</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Kunci</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRestore(v)}
                      disabled={isBusy || isCurrent}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        isCurrent
                          ? 'bg-[#F4F8F5] text-[#5A7765]/50 border border-[#E2EDE6] cursor-not-allowed'
                          : 'bg-[#2D5A43] hover:bg-[#234734] text-white shadow-sm'
                      }`}
                      title={isCurrent ? 'Versi ini sudah aktif saat ini' : 'Pulihkan projek ke versi ini'}
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>{isCurrent ? 'Aktif' : 'Pulihkan'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F4F8F5] border-t border-[#E2EDE6] flex items-center justify-between text-xs text-[#5A7765]">
          <span>💡 Mengunci versi (Lock) mencegah versi tersebut terhapus saat rotasi 10 versi berjalan.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] text-[#1C2E24] font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
