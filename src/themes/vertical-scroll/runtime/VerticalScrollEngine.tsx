'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  VerticalScrollProject,
  PageLayerElement
} from '@/types/verticalScroll';
import {
  IDLE_KEYFRAMES_CSS,
  computeEntryExitStyles,
  computeIdleAnimationStyle
} from './animations';
import {
  LayerElementVisual,
  getStageWidth,
  getPageStageHeight,
  getGlobalBackground,
  getOuterBackdrop,
  buildBackgroundCSS
} from './LayerElementView';
import confetti from 'canvas-confetti';
import {
  Volume2,
  VolumeX,
  X,
  Send,
  ExternalLink,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { addRSVPToProject } from '@/lib/projectStorage';

interface VerticalScrollEngineProps {
  project: VerticalScrollProject;
  mode?: 'play' | 'test' | 'preview';
  guestName?: string;
  onExitTestMode?: () => void;
  className?: string;
}

export default function VerticalScrollEngine({
  project,
  mode = 'play',
  guestName,
  onExitTestMode,
  className = ''
}: VerticalScrollEngineProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);

  // Active modal interaction state
  const [activeElement, setActiveElement] = useState<PageLayerElement | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Visible sections tracker (by section id): 'initial' | 'entered' | 'exited'
  const [sectionStates, setSectionStates] = useState<Record<string, 'initial' | 'entered' | 'exited'>>({});

  // Individual element animation stages: 'initial' | 'entered' | 'exited'
  const [elementStages, setElementStages] = useState<Record<string, 'initial' | 'entered' | 'exited'>>({});

  // RSVP Form internal state
  const [rsvpName, setRsvpName] = useState(guestName || '');
  const [rsvpStatus, setRsvpStatus] = useState<'hadir' | 'tidak_hadir' | 'ragu'>('hadir');
  const [rsvpPax, setRsvpPax] = useState(1);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  // Measure container width for responsive WYSIWYG stage scaling
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      setContainerWidth(node.clientWidth);
      setContainerHeight(node.clientHeight);
    };
    updateSize();

    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Scroll Progress listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const progress = scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * 100 : 0;
      setScrollProgress(progress);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver to reveal / exit sections
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const sectionNodes = container.querySelectorAll<HTMLElement>('[data-section-id]');
    if (sectionNodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const containerBounds = container.getBoundingClientRect();
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute('data-section-id');
          if (!sectionId) return;

          if (entry.isIntersecting) {
            setSectionStates((prev) => ({ ...prev, [sectionId]: 'entered' }));
          } else if (entry.boundingClientRect.bottom <= containerBounds.top + 40) {
            setSectionStates((prev) => ({ ...prev, [sectionId]: 'exited' }));
          } else if (entry.boundingClientRect.top >= containerBounds.bottom - 40) {
            setSectionStates((prev) => ({ ...prev, [sectionId]: 'initial' }));
          }
        });
      },
      {
        root: container,
        threshold: 0.12
      }
    );

    sectionNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [project.pages]);

  // Update element stages when sections change state or on timer
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    project.pages.forEach((page) => {
      const secState = sectionStates[page.id] ?? 'initial';

      page.elements.forEach((el) => {
        const trigger = el.animation?.entry?.trigger || 'scroll_reveal';

        if (trigger === 'scroll_reveal') {
          setElementStages((prev) =>
            prev[el.id] === secState ? prev : { ...prev, [el.id]: secState }
          );
        } else if (trigger === 'timer') {
          if (secState === 'entered') {
            const delayMs = ((el.animation?.entry?.delay || 0) + 0.1) * 1000;
            const t = setTimeout(() => {
              setElementStages((prev) => ({ ...prev, [el.id]: 'entered' }));
            }, delayMs);
            timers.push(t);
          } else {
            setElementStages((prev) =>
              prev[el.id] === 'initial' ? prev : { ...prev, [el.id]: 'initial' }
            );
          }
        } else if (trigger === 'click_tap') {
          setElementStages((prev) =>
            prev[el.id] ? prev : { ...prev, [el.id]: 'initial' }
          );
        }
      });
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [project.pages, sectionStates]);

  // Handle element interaction
  const handleElementClick = (el: PageLayerElement) => {
    if (el.animation?.entry?.trigger === 'click_tap') {
      setElementStages((prev) => ({
        ...prev,
        [el.id]: prev[el.id] === 'entered' ? 'initial' : 'entered'
      }));
    }

    if (!el.hasInteraction || !el.interaction) return;

    if (el.interaction.type === 'scroll_to_page' && el.interaction.targetPageId) {
      const targetSec = containerRef.current?.querySelector(`[data-section-id="${el.interaction.targetPageId}"]`);
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    setActiveElement(el);
  };

  // RSVP Form submit
  const handleRSVPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName.trim()) return;

    addRSVPToProject(project.slug, {
      guestName: rsvpName,
      attendance: rsvpStatus,
      pax: Number(rsvpPax),
      message: rsvpMessage
    });

    setRsvpSubmitted(true);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const stageWidth = getStageWidth(project);
  const hostWidth = containerWidth > 0 ? Math.min(containerWidth, stageWidth) : stageWidth;
  const stageScale = hostWidth / stageWidth;

  const layoutMode = project.globalTheme?.layoutMode || 'fluid';
  const fixedAlign = project.globalTheme?.fixedAlign || 'center';
  const globalBg = getGlobalBackground(project);
  const outerBackdrop = getOuterBackdrop(project);
  const alignJustifyClass =
    fixedAlign === 'left'
      ? 'justify-start'
      : fixedAlign === 'right'
      ? 'justify-end'
      : 'justify-center';
  const showColumnEdgeShadow = layoutMode === 'fixed' && containerWidth > hostWidth + 2;

  const viewportHeightClass =
    mode === 'play' ? 'h-[100dvh]' : mode === 'test' ? 'h-full' : 'h-[640px] md:h-[720px]';

  return (
    <div
      className={`relative w-full ${viewportHeightClass} overflow-hidden text-slate-900 select-none ${className}`}
    >
      <style>{IDLE_KEYFRAMES_CSS}</style>

      {/* Top Floating Progress Bar */}
      {(project.globalTheme?.showScrollIndicator ?? true) && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200/50 z-40 pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      )}

      {/* Top Floating Bar (shown in test/preview mode; play mode uses /view/[slug] header) */}
      {mode !== 'play' && (
        <div className="absolute top-3 left-3 right-3 max-w-3xl mx-auto flex items-center justify-between px-4 py-2 bg-white/85 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-lg z-30 pointer-events-auto">
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-800 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-500 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
            <span className="font-bold truncate max-w-[180px] md:max-w-md">{project.title}</span>
            {guestName && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-xs border border-amber-200 shrink-0">
                Tamu: {guestName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {mode === 'test' && onExitTestMode && (
              <button
                onClick={onExitTestMode}
                className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow flex items-center gap-1 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Keluar Test
              </button>
            )}

            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
              title={isAudioMuted ? 'Nyalakan Audio' : 'Matikan Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-600" />}
            </button>
          </div>
        </div>
      )}

      {/* STATIC 60FPS BACKGROUND & OUTER BACKDROP LAYERS */}
      {layoutMode === 'fluid' ? (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={buildBackgroundCSS(globalBg)}
        >
          {globalBg.overlayOpacity && globalBg.overlayOpacity > 0 ? (
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: globalBg.overlayOpacity }}
            />
          ) : null}
        </div>
      ) : (
        <>
          {/* Outer Static Backdrop (visible on wide tablet/desktop side space) */}
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={buildBackgroundCSS(outerBackdrop)}
          >
            {outerBackdrop.overlayOpacity && outerBackdrop.overlayOpacity > 0 ? (
              <div
                className="absolute inset-0 bg-black"
                style={{ opacity: outerBackdrop.overlayOpacity }}
              />
            ) : null}
          </div>

          {/* Static Global Column Background aligned left / center / right */}
          <div className={`absolute inset-0 z-[1] pointer-events-none flex ${alignJustifyClass}`}>
            <div
              className={`relative h-full shrink-0 overflow-hidden ${
                showColumnEdgeShadow ? 'shadow-[0_0_50px_rgba(0,0,0,0.38)]' : ''
              }`}
              style={{
                width: `${hostWidth}px`,
                ...buildBackgroundCSS(globalBg)
              }}
            >
              {globalBg.overlayOpacity && globalBg.overlayOpacity > 0 ? (
                <div
                  className="absolute inset-0 bg-black"
                  style={{ opacity: globalBg.overlayOpacity }}
                />
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* FULL-WIDTH SCROLLABLE CONTAINER (captures mouse wheel anywhere on screen) */}
      <div
        ref={containerRef}
        className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden"
        style={{ scrollBehavior: project.globalTheme?.smoothScroll ? 'smooth' : 'auto' }}
      >
        <div
          className={
            layoutMode === 'fixed'
              ? `w-full min-h-full flex ${alignJustifyClass}`
              : 'w-full'
          }
        >
          <div
            className="relative flex flex-col shrink-0"
            style={{ width: layoutMode === 'fixed' ? `${hostWidth}px` : '100%' }}
          >
            {project.pages
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((page, pIdx) => {
                const secState = sectionStates[page.id] ?? (pIdx === 0 ? 'entered' : 'initial');
                const stageHeight = getPageStageHeight(page, stageWidth);
                const scaledStageHeight = Math.round(stageHeight * stageScale);

                // Compute responsive section minHeight
                let sectionMinHeight: string;
                if (page.minHeight === '100vh') {
                  if (stageScale >= 0.72) {
                    if (containerHeight > 0) {
                      sectionMinHeight = `${Math.max(containerHeight, scaledStageHeight)}px`;
                    } else {
                      sectionMinHeight = mode === 'play' ? '100dvh' : '640px';
                    }
                  } else {
                    sectionMinHeight = `${Math.max(scaledStageHeight + 48, 360)}px`;
                  }
                } else {
                  sectionMinHeight = `${scaledStageHeight}px`;
                }

                const usesGlobalBg = Boolean(page.useGlobalBackground);
                const sectionStyle: React.CSSProperties = usesGlobalBg
                  ? { minHeight: sectionMinHeight }
                  : {
                      minHeight: sectionMinHeight,
                      ...buildBackgroundCSS(page.background)
                    };

                return (
                  <section
                    key={page.id}
                    data-section-id={page.id}
                    className="relative w-full overflow-hidden flex flex-col items-center justify-center"
                    style={sectionStyle}
                  >
                    {/* Subtle Overlay for custom per-page background */}
                    {!usesGlobalBg &&
                    page.background.overlayOpacity &&
                    page.background.overlayOpacity > 0 ? (
                      <div
                        className="absolute inset-0 bg-black pointer-events-none"
                        style={{ opacity: page.background.overlayOpacity }}
                      />
                    ) : null}

                    {/* Proportional Freeform Coordinate Stage */}
                    <div
                      className="relative z-10 mx-auto shrink-0 overflow-hidden"
                      style={{
                        width: `${hostWidth}px`,
                        height: `${scaledStageHeight}px`
                      }}
                    >
                      <div
                        className="relative"
                        style={{
                          width: `${stageWidth}px`,
                          height: `${stageHeight}px`,
                          transform: `scale(${stageScale})`,
                          transformOrigin: 'top left'
                        }}
                      >
                        {page.elements
                          .filter((el) => !el.hidden)
                          .slice()
                          .sort((a, b) => a.zIndex - b.zIndex)
                          .map((el) => {
                            const stage = elementStages[el.id] ?? secState;
                            const entryExitStyle = computeEntryExitStyles(el.animation, stage);
                            const idleStyle = computeIdleAnimationStyle(el.animation, stage);
                            const rotation = el.rotation ?? 0;
                            const scale = el.scale ?? 1;
                            const isInteractive =
                              el.hasInteraction || el.animation?.entry?.trigger === 'click_tap';

                            return (
                              <div
                                key={el.id}
                                style={{
                                  position: 'absolute',
                                  left: `${el.x}%`,
                                  top: `${el.y}%`,
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: el.zIndex
                                }}
                              >
                                {/* 1. Entry / Exit Transition Wrapper */}
                                <div style={entryExitStyle}>
                                  {/* 2. Idle Loop Wrapper */}
                                  <div style={idleStyle}>
                                    {/* 3. User Freeform Rotation & Scale Wrapper */}
                                    <div
                                      onClick={() => handleElementClick(el)}
                                      style={{
                                        transform: `rotate(${rotation}deg) scale(${scale})`,
                                        transformOrigin: 'center center'
                                      }}
                                    >
                                      <div
                                        className={
                                          isInteractive
                                            ? 'cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95'
                                            : ''
                                        }
                                      >
                                        <LayerElementVisual
                                          element={el}
                                          defaultFontFamily={project.globalTheme?.fontFamily}
                                          showScrollChevron
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Page Number Indicator */}
                    <div className="absolute bottom-3 right-4 text-[10px] text-slate-500/70 font-mono z-20 pointer-events-none">
                      {pIdx + 1} / {project.pages.length}
                    </div>
                  </section>
                );
              })}
          </div>
        </div>
      </div>

      {/* Play Mode Floating Audio Toggle (bottom-right) */}
      {mode === 'play' && project.musicUrl && (
        <button
          onClick={() => setIsAudioMuted(!isAudioMuted)}
          className="fixed bottom-4 right-4 z-40 p-2.5 rounded-full bg-white/90 hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-lg backdrop-blur transition cursor-pointer"
          title={isAudioMuted ? 'Nyalakan Audio' : 'Matikan Audio'}
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-600" />}
        </button>
      )}

      {/* POPUP INTERACTION MODALS (Lightbox Foto, Pemutar Video, Info Acara, RSVP) */}
      {activeElement && activeElement.interaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#FBFDFB] border border-[#D2E5DA] rounded-3xl p-6 shadow-2xl text-[#1C2E24]">
            {/* Close Button */}
            <button
              onClick={() => {
                setActiveElement(null);
                setRsvpSubmitted(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-[#F4F8F5] hover:bg-[#E8F3ED] text-[#5A7765] hover:text-[#1C2E24] border border-[#D2E5DA] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4 border-b border-[#E2EDE6] pb-3">
              <div className="w-10 h-10 rounded-2xl bg-[#E8F3ED] border border-[#D2E5DA] flex items-center justify-center text-[#2D5A43]">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1C2E24]">
                  {activeElement.interaction.title || activeElement.name}
                </h3>
                <p className="text-xs text-[#5A7765]">Interaksi Undangan</p>
              </div>
            </div>

            {/* 1. INFO TYPE */}
            {activeElement.interaction.type === 'info' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 whitespace-pre-line leading-relaxed text-sm">
                  {activeElement.interaction.content}
                </div>
                {activeElement.interaction.actionUrl && (
                  <a
                    href={activeElement.interaction.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-md text-sm"
                  >
                    <span>{activeElement.interaction.actionButtonText || 'Buka Tautan'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {/* 2. IMAGE LIGHTBOX */}
            {activeElement.interaction.type === 'image' && (
              <div className="space-y-4">
                {activeElement.interaction.mediaUrl ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <img
                      src={activeElement.interaction.mediaUrl}
                      alt={activeElement.interaction.title || 'Foto Galeri'}
                      className="w-full h-auto max-h-80 object-cover hover:scale-105 transition duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-slate-100 flex items-center justify-center rounded-xl text-slate-500">
                    Tidak ada gambar
                  </div>
                )}
                {activeElement.interaction.content && (
                  <p className="text-sm text-slate-600 italic text-center">
                    &ldquo;{activeElement.interaction.content}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* 3. VIDEO PLAYER */}
            {activeElement.interaction.type === 'video' && (
              <div className="space-y-4">
                {activeElement.interaction.mediaUrl ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-black">
                    {activeElement.interaction.mediaUrl.includes('youtube') ||
                    activeElement.interaction.mediaUrl.includes('youtu.be') ? (
                      <iframe
                        src={activeElement.interaction.mediaUrl}
                        title="Video Player"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={activeElement.interaction.mediaUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-48 bg-slate-100 flex items-center justify-center rounded-xl text-slate-500">
                    Tidak ada URL video
                  </div>
                )}
                {activeElement.interaction.content && (
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {activeElement.interaction.content}
                  </p>
                )}
              </div>
            )}

            {/* 4. RSVP FORM */}
            {activeElement.interaction.type === 'rsvp' && (
              <div>
                {rsvpSubmitted ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto text-2xl font-bold">
                      ✓
                    </div>
                    <h4 className="text-lg font-bold text-emerald-700">
                      Terima Kasih, {rsvpName}!
                    </h4>
                    <p className="text-sm text-slate-600">
                      Konfirmasi kehadiran Anda telah berhasil tersimpan. Sampai jumpa di hari bahagia kami!
                    </p>
                    <button
                      onClick={() => setActiveElement(null)}
                      className="mt-4 px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-sm transition cursor-pointer"
                    >
                      Lanjut Menjelajahi Undangan
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRSVPSubmit} className="space-y-3.5">
                    {activeElement.interaction.content && (
                      <p className="text-xs text-[#5A7765] leading-relaxed bg-[#F4F8F5] p-3 rounded-2xl border border-[#E2EDE6]">
                        {activeElement.interaction.content}
                      </p>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-[#1C2E24] mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        required
                        value={rsvpName}
                        onChange={(e) => setRsvpName(e.target.value)}
                        placeholder="Masukkan nama Anda..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] placeholder:text-[#5A7765]/60 text-sm focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#1C2E24] mb-1">
                          Konfirmasi Kehadiran
                        </label>
                        <select
                          value={rsvpStatus}
                          onChange={(e) => setRsvpStatus(e.target.value as 'hadir' | 'tidak_hadir' | 'ragu')}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] text-sm focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                        >
                          <option value="hadir">Pasti Hadir</option>
                          <option value="tidak_hadir">Maaf Tidak Bisa Hadir</option>
                          <option value="ragu">Masih Ragu</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1C2E24] mb-1">
                          Jumlah Tamu (Pax)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={rsvpPax}
                          onChange={(e) => setRsvpPax(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] text-sm focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C2E24] mb-1">
                        Doa &amp; Ucapan Selamat
                      </label>
                      <textarea
                        rows={2}
                        value={rsvpMessage}
                        onChange={(e) => setRsvpMessage(e.target.value)}
                        placeholder="Tuliskan doa restu untuk kedua mempelai..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] placeholder:text-[#5A7765]/60 text-sm focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#2D5A43] hover:bg-[#234735] text-white font-bold transition shadow-md text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      Kirim Konfirmasi Kehadiran
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
