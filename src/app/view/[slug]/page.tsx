'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PlatformerProject } from '@/types/platformer';
import { getProjectBySlug } from '@/lib/projectStorage';
import { DEFAULT_DEMO_PROJECT } from '@/lib/defaultProject';
import PlatformerEngine from '@/components/game/PlatformerEngine';
import { Share2, Sparkles, Check, ArrowLeft, Smartphone, Monitor, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { useDeviceProfile } from '@/lib/deviceDetection';

function GuestViewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || 'wedding-adventure';
  const guestName = searchParams?.get('to') || undefined;

  const [project, setProject] = useState<PlatformerProject | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Deteksi profil perangkat akurat (mobile vs tablet vs desktop)
  const { profile, isLoaded: isDeviceLoaded } = useDeviceProfile();
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [showControls, setShowControls] = useState<boolean>(false);
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProjectBySlug(slug)
      .then((p) => {
        if (!cancelled) setProject(p || DEFAULT_DEMO_PROJECT);
      })
      .catch((err) => {
        console.error('Gagal memuat undangan:', err);
        if (!cancelled) setProject(DEFAULT_DEMO_PROJECT);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Otomatis terapkan orientasi & kontrol default dari profil perangkat
  useEffect(() => {
    if (isDeviceLoaded && !manualOverride) {
      setOrientation(profile.defaultOrientation);
      setShowControls(profile.defaultShowControls);
    }
  }, [profile, isDeviceLoaded, manualOverride]);

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-300">
        Memuat Undangan Game...
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const handleToggleOrientation = () => {
    setManualOverride(true);
    const nextOrientation = orientation === 'portrait' ? 'landscape' : 'portrait';
    setOrientation(nextOrientation);
    if (nextOrientation === 'portrait') {
      setShowControls(true); // saat di potrait otomatis terbuka tombol virtual
    } else {
      setShowControls(false); // di mode landscape/desktop default tidak
    }
  };

  const handleToggleControls = () => {
    setManualOverride(true);
    setShowControls(prev => !prev);
  };

  const isPortrait = orientation === 'portrait';

  return (
    <main className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-between p-2 sm:p-4 select-none">
      {/* Top Floating Bar */}
      <header className={`w-full ${isPortrait ? 'max-w-md' : 'max-w-4xl'} flex items-center justify-between mb-2 sm:mb-3 px-1 gap-2`}>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Link
            href="/"
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
            title="Dashboard GemUndang"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-white truncate">{project.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Orientation Switcher (Otomatis: Mobile = Potrait, Desktop = Landscape) */}
          <button
            type="button"
            onClick={handleToggleOrientation}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
            title={isPortrait ? 'Ubah ke Mode Landscape (Desktop)' : 'Ubah ke Mode Potrait (Mobile)'}
          >
            {isPortrait ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Potrait</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Landscape</span>
              </>
            )}
          </button>

          {/* Virtual Controls Toggle Button (Desktop/Tablet support) */}
          <button
            type="button"
            onClick={handleToggleControls}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer ${
              showControls
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title={showControls ? 'Sembunyikan Tombol Virtual' : 'Tampilkan Tombol Virtual (Cocok untuk Tablet/Sentuh)'}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tombol:</span>
            <span>{showControls ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow transition cursor-pointer"
            title="Bagikan Tautan Undangan"
          >
            {copiedNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Tersalin!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Bagikan</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Game Screen with Portrait/Landscape Viewport & Bottom Virtual Controls */}
      <div className={`w-full ${isPortrait ? 'max-w-md' : 'max-w-4xl'} rounded-2xl overflow-hidden relative flex flex-col items-center`}>
        <PlatformerEngine
          project={project}
          mode="play"
          guestName={guestName}
          viewportOrientation={orientation}
          showControls={showControls}
          onToggleControls={(val) => {
            setManualOverride(true);
            setShowControls(val);
          }}
        />
      </div>

      {/* Footer Info */}
      <footer className="mt-2 sm:mt-3 text-center text-[11px] sm:text-xs text-slate-500 pb-1">
        Dibuat dengan <b className="text-amber-400">GemUndang</b> — Platformer Invitation Builder
      </footer>
    </main>
  );
}

export default function GuestViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Memuat Undangan...</div>}>
      <GuestViewContent />
    </Suspense>
  );
}
