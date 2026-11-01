'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  ArrowDown,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpLeft,
  ArrowLeftRight,
  SlidersHorizontal,
  Code2
} from 'lucide-react';

export interface GradientColorStop {
  id: string;
  color: string; // '#rrggbb'
  opacity: number; // 0..100
  position: number; // 0..100
}

export type GradientMode = 'linear' | 'radial';

export interface ParsedGradient {
  mode: GradientMode;
  angle: number; // 0..360
  radialShape: 'circle' | 'ellipse';
  radialX: number; // 0..100
  radialY: number; // 0..100
  stops: GradientColorStop[];
}

let stopIdCounter = 1;
function createStopId(): string {
  stopIdCounter += 1;
  return `gstop-${stopIdCounter}`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return { r, g, b };
  }
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return { r, g, b };
}

function normalizeHex(input: string, fallback = '#1e1b4b'): string {
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const { r, g, b } = hexToRgb(trimmed);
    return rgbToHex(r, g, b);
  }
  return fallback;
}

function interpolateHex(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  const ratio = clamp(t, 0, 1);
  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio
  );
}

/** Split CSS argument list only at top-level commas (ignoring commas inside rgb/rgba/hsl) */
function splitTopLevelCommas(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);

    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseColorToken(token: string): { color: string; opacity: number } | null {
  const t = token.trim();
  const hexMatch = t.match(/^(#[0-9a-fA-F]{3,8})/);
  if (hexMatch) {
    const raw = hexMatch[1];
    if (raw.length === 9) {
      // #rrggbbaa
      const alpha = parseInt(raw.slice(7, 9), 16);
      return {
        color: raw.slice(0, 7).toLowerCase(),
        opacity: Math.round((alpha / 255) * 100)
      };
    }
    return { color: normalizeHex(raw), opacity: 100 };
  }

  const rgbaMatch = t.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*[,/]\s*([0-9.]+))?\s*\)/i
  );
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10);
    const g = parseInt(rgbaMatch[2], 10);
    const b = parseInt(rgbaMatch[3], 10);
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;
    return {
      color: rgbToHex(r, g, b),
      opacity: clamp(Math.round(a * 100), 0, 100)
    };
  }

  return null;
}

function parseStopPart(part: string): {
  color: string;
  opacity: number;
  position: number | null;
} | null {
  const trimmed = part.trim();
  const posEndMatch = trimmed.match(/(-?\d+(?:\.\d+)?)%\s*$/);
  let colorSegment = trimmed;
  let position: number | null = null;

  if (posEndMatch && posEndMatch.index !== undefined) {
    position = clamp(parseFloat(posEndMatch[1]), 0, 100);
    colorSegment = trimmed.slice(0, posEndMatch.index).trim();
  }

  const parsedColor = parseColorToken(colorSegment);
  if (!parsedColor) return null;

  return {
    color: parsedColor.color,
    opacity: parsedColor.opacity,
    position
  };
}

const DIRECTION_KEYWORD_ANGLES: Record<string, number> = {
  'to top': 0,
  'to top right': 45,
  'to right top': 45,
  'to right': 90,
  'to bottom right': 135,
  'to right bottom': 135,
  'to bottom': 180,
  'to bottom left': 225,
  'to left bottom': 225,
  'to left': 270,
  'to top left': 315,
  'to left top': 315
};

export function parseCssGradient(cssValue: string): ParsedGradient {
  const defaultGrad: ParsedGradient = {
    mode: 'linear',
    angle: 135,
    radialShape: 'circle',
    radialX: 50,
    radialY: 50,
    stops: [
      { id: createStopId(), color: '#ffffff', opacity: 100, position: 0 },
      { id: createStopId(), color: '#f8fafc', opacity: 100, position: 50 },
      { id: createStopId(), color: '#f1f5f9', opacity: 100, position: 100 }
    ]
  };

  if (!cssValue || typeof cssValue !== 'string') return defaultGrad;
  const raw = cssValue.trim();

  // If plain hex color was passed (e.g. switched from solid color)
  if (raw.startsWith('#')) {
    const startHex = normalizeHex(raw, '#ffffff');
    const secondHex = startHex === '#ffffff' ? '#f1f5f9' : '#ffffff';
    return {
      ...defaultGrad,
      stops: [
        { id: createStopId(), color: startHex, opacity: 100, position: 0 },
        { id: createStopId(), color: secondHex, opacity: 100, position: 100 }
      ]
    };
  }

  const fnMatch = raw.match(/^(linear-gradient|radial-gradient)\(([\s\S]*)\)$/i);
  if (!fnMatch) return defaultGrad;

  const fnName = fnMatch[1].toLowerCase();
  const inner = fnMatch[2].trim();
  const tokens = splitTopLevelCommas(inner);
  if (tokens.length === 0) return defaultGrad;

  const mode: GradientMode = fnName === 'radial-gradient' ? 'radial' : 'linear';
  let angle = 135;
  let radialShape: 'circle' | 'ellipse' = 'circle';
  let radialX = 50;
  let radialY = 50;
  let stopStartIdx = 0;

  const first = tokens[0].trim().toLowerCase();

  if (mode === 'linear') {
    const degMatch = first.match(/^(-?\d+(?:\.\d+)?)deg$/);
    if (degMatch) {
      angle = ((Math.round(parseFloat(degMatch[1])) % 360) + 360) % 360;
      stopStartIdx = 1;
    } else if (DIRECTION_KEYWORD_ANGLES[first] !== undefined) {
      angle = DIRECTION_KEYWORD_ANGLES[first];
      stopStartIdx = 1;
    } else if (parseStopPart(tokens[0]) === null) {
      stopStartIdx = 1;
    }
  } else {
    // Radial header e.g. "circle at 50% 30%" or "ellipse at center"
    if (parseStopPart(tokens[0]) === null) {
      stopStartIdx = 1;
      if (first.includes('ellipse')) radialShape = 'ellipse';
      else radialShape = 'circle';

      const atMatch = first.match(/at\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
      if (atMatch) {
        radialX = clamp(Math.round(parseFloat(atMatch[1])), 0, 100);
        radialY = clamp(Math.round(parseFloat(atMatch[2])), 0, 100);
      }
    }
  }

  const rawStops = tokens
    .slice(stopStartIdx)
    .map(parseStopPart)
    .filter((s): s is NonNullable<ReturnType<typeof parseStopPart>> => s !== null);

  if (rawStops.length < 2) {
    return { ...defaultGrad, mode, angle, radialShape, radialX, radialY };
  }

  const count = rawStops.length;
  const stops: GradientColorStop[] = rawStops.map((s, idx) => ({
    id: createStopId(),
    color: s.color,
    opacity: s.opacity,
    position:
      s.position !== null
        ? s.position
        : Math.round((idx / Math.max(1, count - 1)) * 100)
  }));

  return {
    mode,
    angle,
    radialShape,
    radialX,
    radialY,
    stops
  };
}

function formatStopColorCss(stop: GradientColorStop): string {
  if (stop.opacity >= 100) {
    return `${normalizeHex(stop.color)} ${Math.round(stop.position)}%`;
  }
  const { r, g, b } = hexToRgb(stop.color);
  const alpha = (clamp(stop.opacity, 0, 100) / 100).toFixed(2);
  return `rgba(${r}, ${g}, ${b}, ${alpha}) ${Math.round(stop.position)}%`;
}

export function serializeCssGradient(grad: ParsedGradient): string {
  const sortedStops = grad.stops
    .slice()
    .sort((a, b) => a.position - b.position);

  const stopsStr = sortedStops.map(formatStopColorCss).join(', ');

  if (grad.mode === 'radial') {
    return `radial-gradient(${grad.radialShape} at ${Math.round(grad.radialX)}% ${Math.round(
      grad.radialY
    )}%, ${stopsStr})`;
  }

  const normAngle = ((Math.round(grad.angle) % 360) + 360) % 360;
  return `linear-gradient(${normAngle}deg, ${stopsStr})`;
}

export function extractPrimaryHexFromBackground(value: string): string {
  if (value.trim().startsWith('#')) {
    return normalizeHex(value, '#ffffff');
  }
  const parsed = parseCssGradient(value);
  return parsed.stops[0]?.color || '#ffffff';
}

const GRADIENT_PRESETS: Array<{ name: string; css: string }> = [
  {
    name: 'Putih Mutiara (Pearl White)',
    css: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)'
  },
  {
    name: 'Putih Gading (Ivory Gold)',
    css: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 55%, #fef3c7 100%)'
  },
  {
    name: 'Putih Rose (Blush Light)',
    css: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 55%, #ffe4e6 100%)'
  },
  {
    name: 'Putih Sage (Mint Light)',
    css: 'linear-gradient(150deg, #ffffff 0%, #f0fdf4 55%, #dcfce7 100%)'
  },
  {
    name: 'Putih Lavender',
    css: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 55%, #f3e8ff 100%)'
  },
  {
    name: 'Cahaya Radial Hangat',
    css: 'radial-gradient(circle at 50% 40%, #ffffff 0%, #fffbeb 55%, #fde68a 100%)'
  }
];

interface GradientPickerProps {
  value: string;
  onChange: (cssGradient: string) => void;
  onBeforeTransform?: () => void;
}

export default function GradientPicker({
  value,
  onChange,
  onBeforeTransform
}: GradientPickerProps) {
  const [grad, setGrad] = useState<ParsedGradient>(() => parseCssGradient(value));
  const [lastSyncedValue, setLastSyncedValue] = useState<string>(value);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [showRawCss, setShowRawCss] = useState<boolean>(false);

  if (value !== lastSyncedValue) {
    const nextParsed = parseCssGradient(value);
    setLastSyncedValue(value);
    setGrad(nextParsed);
  }

  const activeStop =
    grad.stops.find((s) => s.id === selectedStopId) || grad.stops[0];

  const barRef = useRef<HTMLDivElement | null>(null);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const draggingStopRef = useRef<{ stopId: string; moved: boolean } | null>(null);
  const draggingDialRef = useRef<boolean>(false);
  const latestGradRef = useRef<ParsedGradient>(grad);

  useEffect(() => {
    latestGradRef.current = grad;
  }, [grad]);

  const commit = (next: ParsedGradient) => {
    const css = serializeCssGradient(next);
    setGrad(next);
    setLastSyncedValue(css);
    onChange(css);
  };

  // Global pointer handlers for stop bar dragging and angle dial dragging
  useEffect(() => {
    const handlePointerMove = (ev: PointerEvent) => {
      if (draggingStopRef.current && barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        if (rect.width <= 0) return;
        if (!draggingStopRef.current.moved) {
          draggingStopRef.current.moved = true;
          onBeforeTransform?.();
        }
        const pct = clamp(
          Math.round(((ev.clientX - rect.left) / rect.width) * 100),
          0,
          100
        );
        const stopId = draggingStopRef.current.stopId;
        const curr = latestGradRef.current;
        const next: ParsedGradient = {
          ...curr,
          stops: curr.stops.map((s) =>
            s.id === stopId ? { ...s, position: pct } : s
          )
        };
        const css = serializeCssGradient(next);
        setGrad(next);
        setLastSyncedValue(css);
        onChange(css);
      } else if (draggingDialRef.current && dialRef.current) {
        const rect = dialRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        // CSS 0deg points UP, 90deg points RIGHT
        let deg =
          Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI) + 90;
        deg = ((Math.round(deg) % 360) + 360) % 360;
        if (ev.shiftKey) {
          deg = (Math.round(deg / 15) * 15) % 360;
        }
        const curr = latestGradRef.current;
        const next: ParsedGradient = { ...curr, angle: deg };
        const css = serializeCssGradient(next);
        setGrad(next);
        setLastSyncedValue(css);
        onChange(css);
      }
    };

    const handlePointerUp = () => {
      draggingStopRef.current = null;
      draggingDialRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [onChange, onBeforeTransform]);

  // Add a new stop at a specific position (interpolating neighbor colors)
  const addStopAtPosition = (pos: number) => {
    onBeforeTransform?.();
    const sorted = grad.stops.slice().sort((a, b) => a.position - b.position);
    let interpColor = '#f59e0b';

    if (sorted.length > 0) {
      if (pos <= sorted[0].position) {
        interpColor = sorted[0].color;
      } else if (pos >= sorted[sorted.length - 1].position) {
        interpColor = sorted[sorted.length - 1].color;
      } else {
        for (let i = 0; i < sorted.length - 1; i += 1) {
          const left = sorted[i];
          const right = sorted[i + 1];
          if (pos >= left.position && pos <= right.position) {
            const span = Math.max(1, right.position - left.position);
            interpColor = interpolateHex(
              left.color,
              right.color,
              (pos - left.position) / span
            );
            break;
          }
        }
      }
    }

    const newStop: GradientColorStop = {
      id: createStopId(),
      color: interpColor,
      opacity: 100,
      position: clamp(Math.round(pos), 0, 100)
    };

    setSelectedStopId(newStop.id);
    commit({
      ...grad,
      stops: [...grad.stops, newStop]
    });
  };

  // Add stop via button (places midpoint in largest gap)
  const handleAddStopButton = () => {
    const sorted = grad.stops.slice().sort((a, b) => a.position - b.position);
    let bestMid = 50;
    let maxGap = -1;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const gap = sorted[i + 1].position - sorted[i].position;
      if (gap > maxGap) {
        maxGap = gap;
        bestMid = Math.round((sorted[i].position + sorted[i + 1].position) / 2);
      }
    }
    addStopAtPosition(bestMid);
  };

  const handleRemoveStop = (id: string) => {
    if (grad.stops.length <= 2) return;
    onBeforeTransform?.();
    const remaining = grad.stops.filter((s) => s.id !== id);
    if (selectedStopId === id) {
      setSelectedStopId(remaining[0]?.id || null);
    }
    commit({ ...grad, stops: remaining });
  };

  const handleDistributeStops = () => {
    onBeforeTransform?.();
    const sorted = grad.stops.slice().sort((a, b) => a.position - b.position);
    const total = sorted.length;
    const evenStops = sorted.map((s, idx) => ({
      ...s,
      position: Math.round((idx / Math.max(1, total - 1)) * 100)
    }));
    commit({ ...grad, stops: evenStops });
  };

  const handleReverseStops = () => {
    onBeforeTransform?.();
    const reversed = grad.stops.map((s) => ({
      ...s,
      position: 100 - s.position
    }));
    commit({ ...grad, stops: reversed });
  };

  const updateStop = (id: string, updates: Partial<GradientColorStop>) => {
    commit({
      ...grad,
      stops: grad.stops.map((s) => (s.id === id ? { ...s, ...updates } : s))
    });
  };

  const horizontalPreviewCss = serializeCssGradient({
    ...grad,
    mode: 'linear',
    angle: 90
  });

  const livePreviewCss = serializeCssGradient(grad);

  return (
    <div className="space-y-3 p-2.5 rounded-xl bg-[#F4F8F5] border border-[#E2EDE6] text-[#1C2E24]">
      {/* 1. MODE SELECTOR (LINEAR VS RADIAL) & LIVE PREVIEW SWATCH */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex bg-white p-0.5 rounded-lg border border-[#D2E5DA] text-[11px] font-bold flex-1">
          <button
            type="button"
            onClick={() => {
              onBeforeTransform?.();
              commit({ ...grad, mode: 'linear' });
            }}
            className={`flex-1 py-1 rounded-md transition cursor-pointer ${
              grad.mode === 'linear'
                ? 'bg-[#2D5A43] text-white shadow'
                : 'text-[#5A7765] hover:text-[#1C2E24]'
            }`}
          >
            Linear (Garis)
          </button>
          <button
            type="button"
            onClick={() => {
              onBeforeTransform?.();
              commit({ ...grad, mode: 'radial' });
            }}
            className={`flex-1 py-1 rounded-md transition cursor-pointer ${
              grad.mode === 'radial'
                ? 'bg-[#2D5A43] text-white shadow'
                : 'text-[#5A7765] hover:text-[#1C2E24]'
            }`}
          >
            Radial (Pusat)
          </button>
        </div>

        {/* Live 2D Swatch */}
        <div
          className="w-9 h-7 rounded-lg border border-[#D2E5DA] shadow-inner shrink-0"
          style={{ backgroundImage: livePreviewCss }}
          title="Pratinjau Gradien Aktual"
        />
      </div>

      {/* 2. INTERACTIVE GRADIENT BAR WITH DRAGGABLE COLOR STOPS */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-[#5A7765]">
          <span>Klik bar untuk tambah titik warna</span>
          <span className="font-mono text-[#2D5A43] font-semibold">{grad.stops.length} Warna</span>
        </div>

        <div className="relative pt-1 pb-3 select-none">
          <div
            ref={barRef}
            onClick={(e) => {
              if (!barRef.current) return;
              const rect = barRef.current.getBoundingClientRect();
              const pct = ((e.clientX - rect.left) / rect.width) * 100;
              addStopAtPosition(pct);
            }}
            className="h-6 w-full rounded-lg border border-[#D2E5DA] cursor-copy relative overflow-hidden shadow-inner"
            style={{
              backgroundImage: `${horizontalPreviewCss}, repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%)`,
              backgroundSize: '100% 100%, 10px 10px'
            }}
            title="Klik di titik mana saja pada bar ini untuk menambah warna baru"
          />

          {/* Draggable Stop Handles */}
          {grad.stops.map((stop) => {
            const isSelected = activeStop?.id === stop.id;
            return (
              <button
                key={stop.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStopId(stop.id);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setSelectedStopId(stop.id);
                  draggingStopRef.current = { stopId: stop.id, moved: false };
                }}
                style={{
                  left: `${stop.position}%`,
                  backgroundColor: stop.color,
                  touchAction: 'none'
                }}
                title={`${stop.color} (${Math.round(stop.position)}%) — Geser kiri/kanan`}
                className={`absolute top-2 -translate-x-1/2 w-4 h-4 rounded-full cursor-ew-resize transition-transform ${
                  isSelected
                    ? 'ring-2 ring-white border-2 border-[#2D5A43] scale-125 z-20 shadow-lg'
                    : 'border-2 border-white/90 shadow z-10 hover:scale-110'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* 3. DIRECTION / ANGLE OR RADIAL POSITION CONTROLS */}
      {grad.mode === 'linear' ? (
        <div className="space-y-2 pt-1 border-t border-[#E2EDE6]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#1C2E24] uppercase tracking-wider">
              Arah &amp; Sudut Gradien
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={360}
                value={Math.round(grad.angle)}
                onChange={(e) => {
                  const deg =
                    (((parseInt(e.target.value, 10) || 0) % 360) + 360) % 360;
                  commit({ ...grad, angle: deg });
                }}
                className="w-14 px-1.5 py-0.5 rounded bg-white border border-[#D2E5DA] text-right font-mono text-[11px] text-[#2D5A43]"
              />
              <span className="text-[10px] text-[#5A7765]">°</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Interactive Circular Angle Dial */}
            <div
              ref={dialRef}
              onPointerDown={(e) => {
                e.preventDefault();
                onBeforeTransform?.();
                draggingDialRef.current = true;
              }}
              style={{ touchAction: 'none' }}
              title="Putar kompas arah gradien (Tahan Shift = kelipatan 15°)"
              className="w-10 h-10 rounded-full bg-white border-2 border-[#D2E5DA] hover:border-[#2D5A43] relative flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 shadow-inner"
            >
              <div
                style={{ transform: `rotate(${grad.angle}deg)` }}
                className="w-full h-full flex flex-col items-center justify-start pt-1 pointer-events-none"
              >
                <div className="w-2 h-2 rounded-full bg-[#2D5A43] shadow" />
                <div className="w-0.5 h-2.5 bg-[#2D5A43]/70" />
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={grad.angle}
                onPointerDown={() => onBeforeTransform?.()}
                onChange={(e) =>
                  commit({ ...grad, angle: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#2D5A43] cursor-pointer"
              />

              {/* 8 Quick Direction Buttons */}
              <div className="grid grid-cols-8 gap-1">
                {[
                  { deg: 0, Icon: ArrowUp, label: 'Atas (0°)' },
                  { deg: 45, Icon: ArrowUpRight, label: 'Kanan Atas (45°)' },
                  { deg: 90, Icon: ArrowRight, label: 'Kanan (90°)' },
                  { deg: 135, Icon: ArrowDownRight, label: 'Kanan Bawah (135°)' },
                  { deg: 180, Icon: ArrowDown, label: 'Bawah (180°)' },
                  { deg: 225, Icon: ArrowDownLeft, label: 'Kiri Bawah (225°)' },
                  { deg: 270, Icon: ArrowLeft, label: 'Kiri (270°)' },
                  { deg: 315, Icon: ArrowUpLeft, label: 'Kiri Atas (315°)' }
                ].map(({ deg, Icon, label }) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => {
                      onBeforeTransform?.();
                      commit({ ...grad, angle: deg });
                    }}
                    title={label}
                    className={`p-1 rounded border flex items-center justify-center transition cursor-pointer ${
                      Math.round(grad.angle) === deg
                        ? 'bg-[#2D5A43] border-[#2D5A43] text-white shadow-xs'
                        : 'bg-white hover:bg-[#E8F3ED] border-[#D2E5DA] text-[#5A7765] hover:text-[#1C2E24]'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* RADIAL SHAPE & CENTER CONTROLS */
        <div className="space-y-2 pt-1 border-t border-[#E2EDE6]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#1C2E24] uppercase tracking-wider">
              Bentuk &amp; Titik Pusat Radial
            </span>
            <select
              value={grad.radialShape}
              onChange={(e) => {
                onBeforeTransform?.();
                commit({
                  ...grad,
                  radialShape: e.target.value as 'circle' | 'ellipse'
                });
              }}
              className="px-2 py-0.5 rounded bg-white border border-[#D2E5DA] text-[10px] text-[#1C2E24]"
            >
              <option value="circle">Bulat (Circle)</option>
              <option value="ellipse">Elips (Ellipse)</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            {/* 3x3 Quick Radial Focal Anchor Matrix */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-white border border-[#D2E5DA] shrink-0">
              {[15, 50, 85].map((ry) =>
                [15, 50, 85].map((rx) => {
                  const active =
                    Math.abs(grad.radialX - rx) < 10 &&
                    Math.abs(grad.radialY - ry) < 10;
                  return (
                    <button
                      key={`${rx}-${ry}`}
                      type="button"
                      onClick={() => {
                        onBeforeTransform?.();
                        commit({ ...grad, radialX: rx, radialY: ry });
                      }}
                      title={`Pusat ${rx}%, ${ry}%`}
                      className={`w-3.5 h-3.5 rounded-sm transition cursor-pointer ${
                        active
                          ? 'bg-[#2D5A43] ring-1 ring-[#D2E5DA]'
                          : 'bg-[#E2EDE6] hover:bg-[#D2E5DA]'
                      }`}
                    />
                  );
                })
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-[#5A7765]">
                <span>Pusat X ({grad.radialX}%)</span>
                <span>Pusat Y ({grad.radialY}%)</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={grad.radialX}
                onPointerDown={() => onBeforeTransform?.()}
                onChange={(e) =>
                  commit({ ...grad, radialX: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#2D5A43]"
              />
              <input
                type="range"
                min={0}
                max={100}
                value={grad.radialY}
                onPointerDown={() => onBeforeTransform?.()}
                onChange={(e) =>
                  commit({ ...grad, radialY: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#2D5A43]"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. COLOR STOPS LIST (ADD, REMOVE, REORDER, OPACITY, DISTRIBUTE) */}
      <div className="space-y-2 pt-2 border-t border-[#E2EDE6]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#1C2E24] uppercase tracking-wider">
            Daftar Warna ({grad.stops.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDistributeStops}
              className="px-1.5 py-0.5 rounded bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] text-[10px] text-[#5A7765] hover:text-[#1C2E24] flex items-center gap-0.5 cursor-pointer transition"
              title="Ratakan jarak persen antar titik warna"
            >
              <SlidersHorizontal className="w-2.5 h-2.5 text-[#2D5A43]" /> Ratakan
            </button>
            <button
              type="button"
              onClick={handleReverseStops}
              className="px-1.5 py-0.5 rounded bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] text-[10px] text-[#5A7765] hover:text-[#1C2E24] flex items-center gap-0.5 cursor-pointer transition"
              title="Balik urutan warna"
            >
              <ArrowLeftRight className="w-2.5 h-2.5 text-[#2D5A43]" /> Balik
            </button>
            <button
              type="button"
              onClick={handleAddStopButton}
              className="px-2 py-0.5 rounded bg-[#2D5A43] hover:bg-[#234735] text-[10px] font-bold text-white flex items-center gap-0.5 cursor-pointer transition shadow-xs"
              title="Tambah titik warna baru"
            >
              <Plus className="w-2.5 h-2.5" /> Warna
            </button>
          </div>
        </div>

        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
          {grad.stops
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((stop) => {
              const isSelected = activeStop?.id === stop.id;
              return (
                <div
                  key={stop.id}
                  onClick={() => setSelectedStopId(stop.id)}
                  className={`p-1.5 rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8F3ED] border-[#2D5A43]/50 shadow-xs'
                      : 'bg-white border-[#E2EDE6] hover:border-[#D2E5DA]'
                  }`}
                >
                  {/* Color Picker Swatch */}
                  <input
                    type="color"
                    value={normalizeHex(stop.color)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      updateStop(stop.id, { color: e.target.value })
                    }
                    className="w-6 h-6 rounded bg-transparent border border-[#D2E5DA] cursor-pointer shrink-0"
                  />

                  {/* Hex Input */}
                  <input
                    type="text"
                    value={stop.color}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                        if (v.length === 7 || v.length === 4) {
                          updateStop(stop.id, { color: normalizeHex(v) });
                        } else {
                          setGrad({
                            ...grad,
                            stops: grad.stops.map((s) =>
                              s.id === stop.id ? { ...s, color: v } : s
                            )
                          });
                        }
                      }
                    }}
                    className="w-16 px-1.5 py-0.5 rounded bg-white border border-[#D2E5DA] font-mono text-[10px] text-[#1C2E24]"
                  />

                  {/* Position % */}
                  <div
                    className="flex items-center gap-0.5 ml-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(stop.position)}
                      onChange={(e) =>
                        updateStop(stop.id, {
                          position: clamp(parseInt(e.target.value, 10) || 0, 0, 100)
                        })
                      }
                      className="w-11 px-1 py-0.5 rounded bg-white border border-[#D2E5DA] font-mono text-[10px] text-right text-[#2D5A43] font-semibold"
                      title="Posisi titik warna (0% - 100%)"
                    />
                    <span className="text-[9px] text-[#5A7765]">%</span>
                  </div>

                  {/* Opacity % */}
                  <div
                    className="flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(stop.opacity)}
                      onChange={(e) =>
                        updateStop(stop.id, {
                          opacity: clamp(parseInt(e.target.value, 10) || 0, 0, 100)
                        })
                      }
                      className="w-11 px-1 py-0.5 rounded bg-white border border-[#D2E5DA] font-mono text-[10px] text-right text-[#5A7765]"
                      title="Opasitas warna (0% - 100%)"
                    />
                    <span className="text-[9px] text-[#5A7765]">α</span>
                  </div>

                  {/* Delete Stop (disabled if only 2 stops left) */}
                  <button
                    type="button"
                    disabled={grad.stops.length <= 2}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveStop(stop.id);
                    }}
                    className="p-1 rounded hover:bg-rose-50 text-[#5A7765] hover:text-rose-600 disabled:opacity-25 cursor-pointer transition"
                    title={
                      grad.stops.length <= 2
                        ? 'Minimal 2 warna untuk gradien'
                        : 'Hapus warna ini'
                    }
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
        </div>
      </div>

      {/* 5. QUICK PRESET SWATCHES & OPTIONAL RAW CSS */}
      <div className="pt-2 border-t border-[#E2EDE6] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#5A7765]">Preset Cepat</span>
          <button
            type="button"
            onClick={() => setShowRawCss(!showRawCss)}
            className="text-[10px] text-[#5A7765] hover:text-[#2D5A43] flex items-center gap-1 cursor-pointer transition font-semibold"
          >
            <Code2 className="w-3 h-3" /> {showRawCss ? 'Tutup CSS' : 'Kode CSS'}
          </button>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {GRADIENT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                onBeforeTransform?.();
                setLastSyncedValue(preset.css);
                setGrad(parseCssGradient(preset.css));
                onChange(preset.css);
              }}
              style={{ backgroundImage: preset.css }}
              title={preset.name}
              className="h-6 rounded-md border border-[#D2E5DA] hover:border-[#2D5A43] hover:scale-105 transition shadow cursor-pointer"
            />
          ))}
        </div>

        {showRawCss && (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="linear-gradient(135deg, #090d16 0%, #312e81 100%)"
            className="w-full px-2 py-1 rounded bg-white border border-[#D2E5DA] text-[10px] text-[#1C2E24] font-mono"
          />
        )}
      </div>
    </div>
  );
}
