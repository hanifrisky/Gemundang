'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AnyGemUndangProject } from '@/types';
import { getProjectBySlug } from '@/lib/projectStorage';
import { DEFAULT_DEMO_PROJECT } from '@/lib/defaultProject';
import { getThemeDefinition } from '@/themes/registry';
import { Share2, Sparkles, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function GuestViewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = (params?.slug as string) || 'wedding-adventure';
  const guestName = searchParams?.get('to') || undefined;

  const [project, setProject] = useState<AnyGemUndangProject | null>(null);
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
        Memuat Undangan...
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2000);
  };

  const themeDef = getThemeDefinition(project.theme_type);
  const RuntimeComponent = themeDef.RuntimeComponent;

  // Untuk tema vertical scroll, layout dibuat fullscreen scrollable (Light Mode default)
  if (project.theme_type === 'vertical_scroll') {
    return (
      <main className="min-h-screen bg-white text-slate-900 flex flex-col relative select-none">
        {/* Floating Top Bar */}
        <header className="fixed top-3 left-3 right-3 z-50 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white/90 border border-slate-200/90 hover:bg-slate-50 text-slate-700 hover:text-slate-950 transition shadow-md backdrop-blur"
              title="Dashboard GemUndang"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/90 backdrop-blur shadow-md flex items-center gap-2 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs">{project.title}</span>
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            className="pointer-events-auto px-3 py-2 rounded-xl bg-white/90 hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-md backdrop-blur transition cursor-pointer"
            title="Bagikan Tautan Undangan"
          >
            {copiedNotice ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Tersalin!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Bagikan</span>
              </>
            )}
          </button>
        </header>

        {/* Runtime Engine */}
        <RuntimeComponent project={project} mode="play" guestName={guestName} />
      </main>
    );
  }

  // Fallback platformer runtime layout (dengan kontrol landscape/portrait)
  return (
    <main className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-between p-2 sm:p-4 select-none">
      {/* Top Floating Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-2 sm:mb-3 px-1 gap-2">
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
      </header>

      {/* Main Game Screen */}
      <div className="w-full max-w-4xl rounded-2xl overflow-hidden relative flex flex-col items-center">
        <RuntimeComponent project={project} mode="play" guestName={guestName} />
      </div>

      {/* Footer Info */}
      <footer className="mt-2 sm:mt-3 text-center text-[11px] sm:text-xs text-slate-500 pb-1">
        Dibuat dengan <b className="text-amber-400">GemUndang</b> — Platform Undangan Interaktif
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
