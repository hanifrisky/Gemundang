'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { PlatformerProject } from '@/types/platformer';
import { getProjectBySlug } from '@/lib/projectStorage';
import { DEFAULT_DEMO_PROJECT } from '@/lib/defaultProject';
import PlatformerEngine from '@/components/game/PlatformerEngine';
import { Share2, Sparkles, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function GuestViewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || 'wedding-adventure';
  const guestName = searchParams?.get('to') || undefined;

  const [project, setProject] = useState<PlatformerProject | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

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

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 select-none">
      {/* Top Floating Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Dashboard GemUndang"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white">{project.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow transition"
          >
            {copiedNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link Tersalin!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Bagikan Link</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Game Screen */}
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-slate-800 relative bg-slate-900">
        <PlatformerEngine
          project={project}
          mode="play"
          guestName={guestName}
        />
      </div>

      {/* Footer Info */}
      <footer className="mt-3 text-center text-xs text-slate-500">
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
