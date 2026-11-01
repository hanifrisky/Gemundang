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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Riwayat Versi Projek</h3>
              <p className="text-xs text-slate-400">
                Pilih versi sebelumnya untuk dipulihkan atau kunci versi penting agar tidak terhapus.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quota Notice */}
        <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-300">Slot Versi Biasa:</span>
            <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] ${
              unlockedCount >= 9 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
            }`}>
              {unlockedCount} / 10
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Versi terkunci tidak dibatasi kuota</span>
          </div>
        </div>

        {/* Version List */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {versions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
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
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 shrink-0 mt-0.5">
                      <FileCode className="w-4 h-4 text-amber-400" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                            placeholder="Nama versi..."
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(v.id)}
                            className="p-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                            title="Simpan nama"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 rounded-lg bg-slate-750 text-slate-400 hover:text-white"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800 font-bold">
                            v{v.versionNumber}
                          </span>
                          <span className="font-semibold text-white text-xs truncate max-w-xs sm:max-w-md">
                            {v.name}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              Aktif
                            </span>
                          )}
                          <button
                            onClick={() => handleStartRename(v)}
                            className="text-slate-500 hover:text-slate-300 text-xs"
                            title="Ganti nama versi"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{v.createdAt}</span>
                        <span>•</span>
                        <span>{(v.fileSize / 1024).toFixed(1)} KB</span>
                        {v.isLocked && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 flex items-center gap-1 font-semibold">
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
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border-slate-700'
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
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-800 text-slate-600 border border-slate-800 cursor-not-allowed'
                          : 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold'
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
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>💡 Mengunci versi (Lock) mencegah versi tersebut terhapus saat rotasi 10 versi berjalan.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
