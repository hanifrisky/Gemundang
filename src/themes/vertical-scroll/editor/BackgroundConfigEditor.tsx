'use client';

import React from 'react';
import {
  BackgroundPositionPreset,
  PageSectionBackground
} from '@/types/verticalScroll';
import GradientPicker, { extractPrimaryHexFromBackground } from './GradientPicker';
import { Sparkles, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface BackgroundConfigEditorProps {
  value: PageSectionBackground;
  onChange: (next: PageSectionBackground) => void;
  onBeforeTransform?: () => void;
  onOpenAssetLibrary: () => void;
  uploadButtonLabel?: string;
}

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80';

export default function BackgroundConfigEditor({
  value,
  onChange,
  onBeforeTransform,
  onOpenAssetLibrary,
  uploadButtonLabel = 'Pilih / Upload Background'
}: BackgroundConfigEditorProps) {
  const handleSwitchType = (nextType: 'color' | 'gradient' | 'image') => {
    if (nextType === value.type) return;
    onBeforeTransform?.();

    const prevVal = value.value || '';
    let nextVal = prevVal;

    if (nextType === 'gradient') {
      if (!prevVal.toLowerCase().includes('gradient(')) {
        const startHex = prevVal.startsWith('#') ? prevVal : '#ffffff';
        const endHex =
          startHex.toLowerCase() === '#ffffff' ? '#f1f5f9' : '#ffffff';
        nextVal = `linear-gradient(180deg, ${startHex} 0%, #f8fafc 50%, ${endHex} 100%)`;
      }
    } else if (nextType === 'color') {
      if (!prevVal.startsWith('#')) {
        nextVal = extractPrimaryHexFromBackground(prevVal);
      }
    } else if (nextType === 'image') {
      if (prevVal.startsWith('#') || prevVal.toLowerCase().includes('gradient(') || !prevVal) {
        nextVal = DEFAULT_FALLBACK_IMAGE;
      }
    }

    onChange({
      ...value,
      type: nextType,
      value: nextVal,
      backgroundPosition: value.backgroundPosition || 'center'
    });
  };

  const activePos: BackgroundPositionPreset = value.backgroundPosition || 'center';

  return (
    <div className="space-y-3">
      {/* 1. Background Type Segmented Control */}
      <div>
        <label className="block text-[10px] text-[#5A7765] mb-1 font-semibold">
          Tipe Latar
        </label>
        <div className="grid grid-cols-3 gap-1 bg-[#F4F8F5] p-1 rounded-xl border border-[#D2E5DA] text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => handleSwitchType('color')}
            className={`py-1 px-2 rounded-lg transition cursor-pointer ${
              value.type === 'color'
                ? 'bg-[#2D5A43] text-white shadow'
                : 'text-[#5A7765] hover:text-[#1C2E24]'
            }`}
          >
            Solid
          </button>
          <button
            type="button"
            onClick={() => handleSwitchType('gradient')}
            className={`py-1 px-2 rounded-lg transition cursor-pointer ${
              value.type === 'gradient'
                ? 'bg-[#2D5A43] text-white shadow'
                : 'text-[#5A7765] hover:text-[#1C2E24]'
            }`}
          >
            Gradien
          </button>
          <button
            type="button"
            onClick={() => handleSwitchType('image')}
            className={`py-1 px-2 rounded-lg transition cursor-pointer ${
              value.type === 'image'
                ? 'bg-[#2D5A43] text-white shadow'
                : 'text-[#5A7765] hover:text-[#1C2E24]'
            }`}
          >
            Gambar
          </button>
        </div>
      </div>

      {/* 2A. SOLID COLOR PICKER */}
      {value.type === 'color' && (
        <div>
          <label className="block text-[10px] text-[#5A7765] mb-1 font-semibold">
            Warna Solid
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value.value.startsWith('#') ? value.value : '#ffffff'}
              onPointerDown={() => onBeforeTransform?.()}
              onChange={(e) =>
                onChange({
                  ...value,
                  value: e.target.value
                })
              }
              className="w-9 h-8 rounded-lg bg-white border border-[#D2E5DA] cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={value.value}
              onChange={(e) =>
                onChange({
                  ...value,
                  value: e.target.value
                })
              }
              placeholder="#ffffff"
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] font-mono"
            />
          </div>
        </div>
      )}

      {/* 2B. GRADIENT PICKER */}
      {value.type === 'gradient' && (
        <GradientPicker
          value={value.value}
          onBeforeTransform={onBeforeTransform}
          onChange={(nextCss) =>
            onChange({
              ...value,
              value: nextCss
            })
          }
        />
      )}

      {/* 2C. IMAGE PICKER + HORIZONTAL FOCAL POSITION */}
      {value.type === 'image' && (
        <div className="space-y-2.5">
          <div>
            <label className="block text-[10px] text-[#5A7765] mb-1 font-semibold">
              URL Gambar Latar
            </label>
            <input
              type="text"
              value={value.value}
              onChange={(e) =>
                onChange({
                  ...value,
                  value: e.target.value
                })
              }
              placeholder="https://..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] font-mono"
            />
          </div>

          <button
            type="button"
            onClick={onOpenAssetLibrary}
            className="w-full py-1.5 px-2.5 rounded-lg bg-[#E8F3ED] hover:bg-[#D2E5DA] border border-[#D2E5DA] text-xs text-[#2D5A43] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> {uploadButtonLabel}
          </button>

          <div>
            <label className="block text-[10px] text-[#5A7765] mb-1 font-semibold">
              Fokus Posisi Gambar
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#F4F8F5] p-1 rounded-xl border border-[#D2E5DA] text-[11px] font-semibold">
              {(
                [
                  { pos: 'left', label: 'Kiri', Icon: AlignLeft },
                  { pos: 'center', label: 'Tengah', Icon: AlignCenter },
                  { pos: 'right', label: 'Kanan', Icon: AlignRight }
                ] as const
              ).map(({ pos, label, Icon }) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => {
                    onBeforeTransform?.();
                    onChange({
                      ...value,
                      backgroundPosition: pos
                    });
                  }}
                  className={`py-1 px-1.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                    activePos === pos
                      ? 'bg-[#E8F3ED] text-[#2D5A43] border border-[#D2E5DA] font-bold shadow-xs'
                      : 'text-[#5A7765] hover:text-[#1C2E24]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. OVERLAY DARKNESS SLIDER */}
      <div className="pt-2 border-t border-[#E2EDE6]">
        <div className="flex items-center justify-between text-[10px] text-[#5A7765] mb-1 font-semibold">
          <span>Redup Latar (Overlay Gelap)</span>
          <span className="font-mono text-[#2D5A43]">
            {Math.round((value.overlayOpacity ?? 0) * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={0.85}
          step={0.05}
          value={value.overlayOpacity ?? 0}
          onPointerDown={() => onBeforeTransform?.()}
          onChange={(e) =>
            onChange({
              ...value,
              overlayOpacity: parseFloat(e.target.value)
            })
          }
          className="w-full accent-[#2D5A43] cursor-pointer"
        />
      </div>
    </div>
  );
}
