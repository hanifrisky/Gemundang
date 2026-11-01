'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PageLayerElement, PageSection } from '@/types/verticalScroll';
import {
  LayerElementVisual,
  getPageStageHeight
} from '../runtime/LayerElementView';
import {
  RotateCw,
  Copy,
  Trash2,
  Lock,
  Unlock,
  FlipHorizontal2,
  Image as ImageIcon,
  Type,
  MousePointer
} from 'lucide-react';

type TransformMode =
  | 'move'
  | 'rotate'
  | 'scale'
  | 'resize-e'
  | 'resize-w'
  | 'resize-n'
  | 'resize-s';

interface StagePageCanvasProps {
  page: PageSection;
  pageIndex: number;
  totalPages: number;
  stageWidth: number;
  defaultFontFamily?: string;
  isActivePage: boolean;
  selectedElementId: string | null;
  showGrid: boolean;
  containerDomRef?: (node: HTMLDivElement | null) => void;
  onSelectPage: (pageId: string) => void;
  onSelectElement: (pageId: string, elementId: string | null) => void;
  onTransformStart: () => void;
  onUpdateElement: (
    pageId: string,
    elementId: string,
    updates: Partial<PageLayerElement>
  ) => void;
  onOpenAssetLibraryForElement: (pageId: string, elementId: string) => void;
  onDuplicateElement: (pageId: string, elementId: string) => void;
  onRemoveElement: (pageId: string, elementId: string) => void;
  onAddElementToPage: (pageId: string, type: 'image' | 'text' | 'button') => void;
}

export default function StagePageCanvas({
  page,
  pageIndex,
  totalPages,
  stageWidth,
  defaultFontFamily,
  isActivePage,
  selectedElementId,
  showGrid,
  containerDomRef,
  onSelectPage,
  onSelectElement,
  onTransformStart,
  onUpdateElement,
  onOpenAssetLibraryForElement,
  onDuplicateElement,
  onRemoveElement,
  onAddElementToPage
}: StagePageCanvasProps) {
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const elementNodesRef = useRef<Record<string, HTMLDivElement | null>>({});

  const [wrapperWidth, setWrapperWidth] = useState<number>(0);
  const [measuredSize, setMeasuredSize] = useState<{
    id: string;
    width: number;
    height: number;
  } | null>(null);

  const [activeTransform, setActiveTransform] = useState<{
    mode: TransformMode;
    hudText: string;
    snapX: boolean;
    snapY: boolean;
  } | null>(null);

  const dragSessionRef = useRef<{
    mode: TransformMode;
    elementId: string;
    locked: boolean;
    startClientX: number;
    startClientY: number;
    rect: DOMRect;
    stageScale: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startScale: number;
    startRotation: number;
    centerX: number;
    centerY: number;
    startDist: number;
    startPointerAngle: number;
    hasMoved: boolean;
  } | null>(null);

  // Measure outer stage wrapper width
  useEffect(() => {
    const node = stageWrapperRef.current;
    if (!node) return;
    const update = () => setWrapperWidth(node.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [stageWidth]);

  const selectedEl = isActivePage
    ? page.elements.find((e) => e.id === selectedElementId && !e.hidden) || null
    : null;
  const selId = selectedEl?.id;
  const selWidthProp = selectedEl?.width;
  const selHeightProp = selectedEl?.height;
  const selContent = selectedEl?.content;
  const selFontSize = selectedEl?.styleOptions?.fontSize;

  // Measure selected element's untransformed layout box in stage coordinates
  useEffect(() => {
    if (!selId) return;
    const elNode = elementNodesRef.current[selId];
    if (!elNode) return;

    const updateBox = () => {
      setMeasuredSize({
        id: selId,
        width: elNode.offsetWidth || selWidthProp || 160,
        height: elNode.offsetHeight || selHeightProp || 80
      });
    };
    updateBox();

    const ro = new ResizeObserver(updateBox);
    ro.observe(elNode);
    return () => ro.disconnect();
  }, [selId, selWidthProp, selHeightProp, selContent, selFontSize]);

  const effectiveWidth = wrapperWidth > 0 ? wrapperWidth : stageWidth;
  const stageScale = effectiveWidth / stageWidth;
  const stageHeight = getPageStageHeight(page, stageWidth);
  const effectiveHeight = Math.round(stageHeight * stageScale);

  // Global pointermove / pointerup listeners for active transform
  useEffect(() => {
    const handlePointerMove = (ev: PointerEvent) => {
      const s = dragSessionRef.current;
      if (!s || s.locked) return;

      const moveDist = Math.hypot(
        ev.clientX - s.startClientX,
        ev.clientY - s.startClientY
      );
      if (!s.hasMoved) {
        if (moveDist < 2) return;
        s.hasMoved = true;
        onTransformStart();
      }

      if (s.mode === 'move') {
        const dxPct = ((ev.clientX - s.startClientX) / s.rect.width) * 100;
        const dyPct = ((ev.clientY - s.startClientY) / s.rect.height) * 100;
        let nextX = Math.round((s.startX + dxPct) * 10) / 10;
        let nextY = Math.round((s.startY + dyPct) * 10) / 10;

        let snapX = false;
        let snapY = false;
        if (!ev.altKey) {
          if (Math.abs(nextX - 50) < 0.9) {
            nextX = 50;
            snapX = true;
          }
          if (Math.abs(nextY - 50) < 0.9) {
            nextY = 50;
            snapY = true;
          }
        }

        nextX = Math.max(-45, Math.min(145, nextX));
        nextY = Math.max(-45, Math.min(145, nextY));

        onUpdateElement(page.id, s.elementId, { x: nextX, y: nextY });
        setActiveTransform({
          mode: 'move',
          hudText: `Posisi X: ${nextX.toFixed(1)}% • Y: ${nextY.toFixed(1)}%`,
          snapX,
          snapY
        });
        return;
      }

      if (s.mode === 'rotate') {
        const currentAngle =
          Math.atan2(ev.clientY - s.centerY, ev.clientX - s.centerX) *
          (180 / Math.PI);
        let nextRot = s.startRotation + (currentAngle - s.startPointerAngle);
        // Normalize to [-180, 180]
        nextRot = ((((nextRot + 180) % 360) + 360) % 360) - 180;

        if (ev.shiftKey) {
          nextRot = Math.round(nextRot / 15) * 15;
        } else {
          if (!ev.altKey) {
            for (const cardinal of [0, 90, -90, 180, -180]) {
              if (Math.abs(nextRot - cardinal) < 2) {
                nextRot = cardinal;
                break;
              }
            }
          }
          nextRot = Math.round(nextRot);
        }
        if (nextRot === -180) nextRot = 180;

        onUpdateElement(page.id, s.elementId, { rotation: nextRot });
        setActiveTransform({
          mode: 'rotate',
          hudText: `Rotasi: ${nextRot}°`,
          snapX: false,
          snapY: false
        });
        return;
      }

      if (s.mode === 'scale') {
        const dist = Math.hypot(
          ev.clientX - s.centerX,
          ev.clientY - s.centerY
        );
        let nextScale = s.startScale * (dist / s.startDist);
        nextScale = Math.max(0.1, Math.min(5, Math.round(nextScale * 100) / 100));

        if (!ev.altKey && Math.abs(nextScale - 1) < 0.03) {
          nextScale = 1;
        }

        onUpdateElement(page.id, s.elementId, { scale: nextScale });
        setActiveTransform({
          mode: 'scale',
          hudText: `Skala: ${Math.round(nextScale * 100)}% (${nextScale.toFixed(2)}x)`,
          snapX: false,
          snapY: false
        });
        return;
      }

      // Side box resize handles (width / height in logical stage px)
      const dxStage = (ev.clientX - s.startClientX) / s.stageScale;
      const dyStage = (ev.clientY - s.startClientY) / s.stageScale;
      const rad = (s.startRotation * Math.PI) / 180;
      const localDx = dxStage * Math.cos(rad) + dyStage * Math.sin(rad);
      const localDy = -dxStage * Math.sin(rad) + dyStage * Math.cos(rad);
      const effScale = Math.max(0.1, s.startScale);

      if (s.mode === 'resize-e' || s.mode === 'resize-w') {
        const sign = s.mode === 'resize-e' ? 1 : -1;
        const nextWidth = Math.max(
          24,
          Math.min(1400, Math.round(s.startWidth + (sign * localDx * 2) / effScale))
        );
        onUpdateElement(page.id, s.elementId, { width: nextWidth });
        setActiveTransform({
          mode: s.mode,
          hudText: `Lebar: ${nextWidth}px × Tinggi: ${s.startHeight}px`,
          snapX: false,
          snapY: false
        });
      } else {
        const sign = s.mode === 'resize-s' ? 1 : -1;
        const nextHeight = Math.max(
          24,
          Math.min(1600, Math.round(s.startHeight + (sign * localDy * 2) / effScale))
        );
        onUpdateElement(page.id, s.elementId, { height: nextHeight });
        setActiveTransform({
          mode: s.mode,
          hudText: `Lebar: ${s.startWidth}px × Tinggi: ${nextHeight}px`,
          snapX: false,
          snapY: false
        });
      }
    };

    const handlePointerUp = () => {
      if (dragSessionRef.current) {
        dragSessionRef.current = null;
        setActiveTransform(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [page.id, onTransformStart, onUpdateElement]);

  const beginTransform = (
    e: React.PointerEvent,
    el: PageLayerElement,
    mode: TransformMode
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    onSelectElement(page.id, el.id);

    const stageNode = stageWrapperRef.current;
    if (!stageNode) return;
    const rect = stageNode.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const elNode = elementNodesRef.current[el.id];
    const baseW = elNode?.offsetWidth || el.width || 160;
    const baseH = elNode?.offsetHeight || el.height || 80;
    const centerX = rect.left + (el.x / 100) * rect.width;
    const centerY = rect.top + (el.y / 100) * rect.height;

    dragSessionRef.current = {
      mode,
      elementId: el.id,
      locked: Boolean(el.locked),
      startClientX: e.clientX,
      startClientY: e.clientY,
      rect,
      stageScale: rect.width / stageWidth,
      startX: el.x,
      startY: el.y,
      startWidth: baseW,
      startHeight: baseH,
      startScale: el.scale ?? 1,
      startRotation: el.rotation ?? 0,
      centerX,
      centerY,
      startDist: Math.max(12, Math.hypot(e.clientX - centerX, e.clientY - centerY)),
      startPointerAngle:
        Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI),
      hasMoved: false
    };
  };

  // Compute Gizmo Box in outer stage wrapper screen pixels
  const selBaseW =
    selectedEl && measuredSize?.id === selectedEl.id
      ? measuredSize.width
      : selectedEl?.width || 160;
  const selBaseH =
    selectedEl && measuredSize?.id === selectedEl.id
      ? measuredSize.height
      : selectedEl?.height || 80;
  const selScale = selectedEl?.scale ?? 1;
  const selRot = selectedEl?.rotation ?? 0;
  const gizmoW = Math.max(20, selBaseW * selScale * stageScale);
  const gizmoH = Math.max(20, selBaseH * selScale * stageScale);

  // Bounding radius so floating toolbar never overlaps rotated element
  const radAbs = (Math.abs(selRot) * Math.PI) / 180;
  const visualHalfH =
    (Math.abs(gizmoW * Math.sin(radAbs)) + Math.abs(gizmoH * Math.cos(radAbs))) / 2;
  const placeToolbarAbove = (selectedEl?.y ?? 50) > 78;

  return (
    <div
      ref={containerDomRef}
      onClick={() => onSelectPage(page.id)}
      className="w-full flex flex-col items-center"
      style={{ maxWidth: `${stageWidth}px` }}
    >
      {/* Per-page header bar */}
      <div className="w-full flex items-center justify-between text-xs mb-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
              isActivePage
                ? 'bg-indigo-500 text-white shadow'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            Hal {pageIndex + 1}/{totalPages}
          </span>
          <span className="font-bold text-slate-200 truncate">{page.title}</span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            ({stageWidth}×{stageHeight}px)
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddElementToPage(page.id, 'image');
            }}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] font-semibold text-sky-400 flex items-center gap-1 transition cursor-pointer"
            title="Tambah Gambar / Ornamen Bebas ke Halaman Ini"
          >
            <ImageIcon className="w-3 h-3" /> +Gambar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddElementToPage(page.id, 'text');
            }}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] font-semibold text-amber-400 flex items-center gap-1 transition cursor-pointer"
            title="Tambah Teks ke Halaman Ini"
          >
            <Type className="w-3 h-3" /> +Teks
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddElementToPage(page.id, 'button');
            }}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] font-semibold text-emerald-400 flex items-center gap-1 transition cursor-pointer"
            title="Tambah Tombol ke Halaman Ini"
          >
            <MousePointer className="w-3 h-3" /> +Tombol
          </button>
        </div>
      </div>

      {/* Stage Outer Host (unclipped so gizmo handles stay accessible near edges!) */}
      <div
        ref={stageWrapperRef}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            onSelectElement(page.id, null);
          }
        }}
        className={`relative w-full rounded-2xl transition-shadow ${
          isActivePage
            ? 'ring-2 ring-indigo-500/80 shadow-[0_20px_60px_rgba(0,0,0,0.65)]'
            : 'ring-1 ring-slate-800 hover:ring-slate-700 shadow-xl'
        }`}
        style={{ height: `${effectiveHeight}px` }}
      >
        {/* Clipped Visual Page Surface */}
        <div
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) {
              onSelectElement(page.id, null);
            }
          }}
          className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{
            backgroundColor:
              page.background.type === 'color' ? page.background.value : '#ffffff',
            backgroundImage:
              page.background.type === 'gradient'
                ? page.background.value
                : page.background.type === 'image'
                ? `url(${page.background.value})`
                : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Background Overlay */}
          {page.background.overlayOpacity && page.background.overlayOpacity > 0 ? (
            <div
              className="absolute inset-0 bg-black pointer-events-none"
              style={{ opacity: page.background.overlayOpacity }}
            />
          ) : null}

          {/* Optional Helper Grid */}
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none opacity-35"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(100,116,139,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.28) 1px, transparent 1px)',
                backgroundSize: '10% 10%'
              }}
            />
          )}

          {/* Snap Center Alignment Guides */}
          {(showGrid || activeTransform?.snapX) && (
            <div
              className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-20 ${
                activeTransform?.snapX
                  ? 'border-l border-dashed border-cyan-500 opacity-95'
                  : 'border-l border-dashed border-indigo-500/35'
              }`}
            />
          )}
          {(showGrid || activeTransform?.snapY) && (
            <div
              className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none z-20 ${
                activeTransform?.snapY
                  ? 'border-t border-dashed border-cyan-500 opacity-95'
                  : 'border-t border-dashed border-indigo-500/35'
              }`}
            />
          )}

          {/* Empty Page Hint */}
          {page.elements.filter((el) => !el.hidden).length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
              <div className="bg-white/85 backdrop-blur-sm border border-slate-200/80 rounded-2xl px-5 py-3.5 shadow-sm max-w-sm">
                <p className="text-sm font-semibold text-slate-700">
                  Kanvas Halaman Kosong
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Klik +Gambar, +Teks, atau +Tombol di atas, lalu geser, putar, dan atur skalanya sesuka hati di mana saja!
                </p>
              </div>
            </div>
          )}

          {/* Logical Coordinate Stage (stageWidth × stageHeight scaled to fit) */}
          <div
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) {
                onSelectElement(page.id, null);
              }
            }}
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
                const isSelected = isActivePage && selectedElementId === el.id;
                const rotation = el.rotation ?? 0;
                const scale = el.scale ?? 1;

                return (
                  <div
                    key={el.id}
                    style={{
                      position: 'absolute',
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
                      transformOrigin: 'center center',
                      zIndex: el.zIndex,
                      touchAction: 'none'
                    }}
                    onPointerDown={(e) => beginTransform(e, el, 'move')}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (el.type === 'image') {
                        onOpenAssetLibraryForElement(page.id, el.id);
                      }
                    }}
                    className={`group select-none ${
                      el.locked
                        ? 'cursor-not-allowed'
                        : 'cursor-move'
                    } ${
                      !isSelected
                        ? 'hover:outline hover:outline-1 hover:outline-indigo-400/70 rounded'
                        : ''
                    }`}
                  >
                    <div
                      ref={(node) => {
                        elementNodesRef.current[el.id] = node;
                      }}
                    >
                      <LayerElementVisual
                        element={el}
                        defaultFontFamily={defaultFontFamily}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* UNCLIPPED SELECTION TRANSFORM GIZMO (Move, Rotate, Corner Scale, Side Resize) */}
        {selectedEl && (
          <>
            <div
              style={{
                position: 'absolute',
                left: `${selectedEl.x}%`,
                top: `${selectedEl.y}%`,
                width: `${gizmoW}px`,
                height: `${gizmoH}px`,
                transform: `translate(-50%, -50%) rotate(${selRot}deg)`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
                zIndex: 40
              }}
              className={`border-2 ${
                selectedEl.locked
                  ? 'border-amber-400 border-dashed'
                  : 'border-indigo-400'
              } shadow-[0_0_0_1px_rgba(15,23,42,0.5)]`}
            >
              {/* Z-Index & Lock Badge */}
              <span className="absolute -top-2.5 right-1 bg-indigo-600 text-white font-bold text-[9px] px-1.5 py-0.2 rounded shadow">
                z:{selectedEl.zIndex}
                {selectedEl.locked ? ' 🔒' : ''}
              </span>

              {!selectedEl.locked && (
                <>
                  {/* Top Rotation Handle */}
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <button
                      type="button"
                      onPointerDown={(e) => beginTransform(e, selectedEl, 'rotate')}
                      style={{ touchAction: 'none' }}
                      className="w-6 h-6 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white border-2 border-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto transition-transform hover:scale-110"
                      title="Tarik untuk Memutar (Rotasi) • Tahan Shift untuk kelipatan 15°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-0.5 h-3 bg-indigo-400" />
                  </div>

                  {/* 4 Corner Proportional Scale Handles */}
                  <div
                    onPointerDown={(e) => beginTransform(e, selectedEl, 'scale')}
                    style={{ touchAction: 'none' }}
                    title="Tarik sudut untuk mengatur Skala (Scale)"
                    className="absolute -top-2 -left-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-500 shadow-md cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => beginTransform(e, selectedEl, 'scale')}
                    style={{ touchAction: 'none' }}
                    title="Tarik sudut untuk mengatur Skala (Scale)"
                    className="absolute -top-2 -right-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-500 shadow-md cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => beginTransform(e, selectedEl, 'scale')}
                    style={{ touchAction: 'none' }}
                    title="Tarik sudut untuk mengatur Skala (Scale)"
                    className="absolute -bottom-2 -left-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-500 shadow-md cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
                  />
                  <div
                    onPointerDown={(e) => beginTransform(e, selectedEl, 'scale')}
                    style={{ touchAction: 'none' }}
                    title="Tarik sudut untuk mengatur Skala (Scale)"
                    className="absolute -bottom-2 -right-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-500 shadow-md cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
                  />

                  {/* 4 Side Box Width / Height Handles */}
                  <div
                    onPointerDown={(e) => beginTransform(e, selectedEl, 'resize-e')}
                    style={{ touchAction: 'none' }}
                    title="Tarik sisi kanan untuk mengatur Lebar Kotak (Width)"
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-5 rounded-full bg-white border border-indigo-500 shadow cursor-ew-resize pointer-events-auto hover:bg-indigo-100"
                  />
                  <div
                    onPointerDown={(e) => beginTransform(e, selectedEl, 'resize-w')}
                    style={{ touchAction: 'none' }}
                    title="Tarik sisi kiri untuk mengatur Lebar Kotak (Width)"
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-5 rounded-full bg-white border border-indigo-500 shadow cursor-ew-resize pointer-events-auto hover:bg-indigo-100"
                  />
                  <div
                    onPointerDown={(e) => beginTransform(e, selectedEl, 'resize-n')}
                    style={{ touchAction: 'none' }}
                    title="Tarik sisi atas untuk mengatur Tinggi Kotak (Height)"
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-2.5 w-5 rounded-full bg-white border border-indigo-500 shadow cursor-ns-resize pointer-events-auto hover:bg-indigo-100"
                  />
                  <div
                    onPointerDown={(e) => beginTransform(e, selectedEl, 'resize-s')}
                    style={{ touchAction: 'none' }}
                    title="Tarik sisi bawah untuk mengatur Tinggi Kotak (Height)"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2.5 w-5 rounded-full bg-white border border-indigo-500 shadow cursor-ns-resize pointer-events-auto hover:bg-indigo-100"
                  />
                </>
              )}
            </div>

            {/* Upright Floating HUD / Quick Action Pill */}
            <div
              style={{
                position: 'absolute',
                left: `${Math.max(18, Math.min(82, selectedEl.x))}%`,
                top: placeToolbarAbove
                  ? `calc(${selectedEl.y}% - ${Math.round(visualHalfH + 46)}px)`
                  : `calc(${selectedEl.y}% + ${Math.round(visualHalfH + 14)}px)`,
                transform: 'translateX(-50%)',
                zIndex: 45
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {activeTransform ? (
                <div className="px-3 py-1 rounded-full bg-slate-950/95 border border-indigo-400/70 text-indigo-200 font-mono text-[11px] font-bold shadow-2xl whitespace-nowrap">
                  {activeTransform.hudText}
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur text-[11px] whitespace-nowrap">
                  <span className="font-mono text-[10px] text-slate-300 px-1.5 border-r border-slate-700">
                    {Math.round(selectedEl.x)}%,{Math.round(selectedEl.y)}% • {Math.round(selRot)}° •{' '}
                    {Math.round(selScale * 100)}%
                  </span>

                  {selectedEl.type === 'image' && (
                    <button
                      type="button"
                      onClick={() => onOpenAssetLibraryForElement(page.id, selectedEl.id)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition cursor-pointer"
                      title="Ganti / Upload Gambar"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onTransformStart();
                      onUpdateElement(page.id, selectedEl.id, {
                        flipX: !selectedEl.flipX
                      });
                    }}
                    className={`p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer ${
                      selectedEl.flipX ? 'text-indigo-400' : 'text-slate-300'
                    }`}
                    title="Cermin Horizontal (Flip X)"
                  >
                    <FlipHorizontal2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicateElement(page.id, selectedEl.id)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                    title="Duplikat Elemen"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateElement(page.id, selectedEl.id, {
                        locked: !selectedEl.locked
                      })
                    }
                    className={`p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer ${
                      selectedEl.locked ? 'text-amber-400' : 'text-slate-300'
                    }`}
                    title={selectedEl.locked ? 'Buka Kunci Posisi' : 'Kunci Posisi Elemen'}
                  >
                    {selectedEl.locked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {!selectedEl.locked && (
                    <button
                      type="button"
                      onClick={() => onRemoveElement(page.id, selectedEl.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                      title="Hapus Elemen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
