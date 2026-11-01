'use client';

import React, { useEffect, useState } from 'react';
import {
  PageLayerElement,
  PageSection,
  PageSectionBackground,
  VerticalScrollProject
} from '@/types/verticalScroll';
import { ChevronDown } from 'lucide-react';

export const DEFAULT_STAGE_WIDTH = 800;

export const DEFAULT_GLOBAL_BACKGROUND: PageSectionBackground = {
  type: 'gradient',
  value: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
  overlayOpacity: 0,
  backgroundPosition: 'center'
};

export const DEFAULT_OUTER_BACKDROP: PageSectionBackground = {
  type: 'gradient',
  value: 'linear-gradient(135deg, #EFF4F0 0%, #E2EDE6 50%, #D2E5DA 100%)',
  overlayOpacity: 0,
  backgroundPosition: 'center'
};

export function getGlobalBackground(project: VerticalScrollProject): PageSectionBackground {
  return project.globalTheme?.globalBackground || DEFAULT_GLOBAL_BACKGROUND;
}

export function getOuterBackdrop(project: VerticalScrollProject): PageSectionBackground {
  return project.globalTheme?.outerBackdrop || DEFAULT_OUTER_BACKDROP;
}

export function getEffectivePageBackground(
  page: PageSection,
  project: VerticalScrollProject
): PageSectionBackground {
  if (page.useGlobalBackground) {
    return getGlobalBackground(project);
  }
  return page.background;
}

export function buildBackgroundCSS(bg: PageSectionBackground): React.CSSProperties {
  const pos =
    bg.backgroundPosition === 'left'
      ? 'left center'
      : bg.backgroundPosition === 'right'
      ? 'right center'
      : 'center center';

  if (bg.type === 'color') {
    return {
      backgroundColor: bg.value || '#ffffff'
    };
  }

  if (bg.type === 'gradient') {
    return {
      backgroundColor: '#ffffff',
      backgroundImage: bg.value
    };
  }

  return {
    backgroundColor: '#0f172a',
    backgroundImage: bg.value ? `url(${bg.value})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: pos
  };
}

export function getStageWidth(project: VerticalScrollProject): number {
  const w = project.globalTheme?.stageWidth;
  if (typeof w === 'number' && w >= 320 && w <= 1600) {
    return w;
  }
  return DEFAULT_STAGE_WIDTH;
}

export function getPageStageHeight(page: PageSection, stageWidth = DEFAULT_STAGE_WIDTH): number {
  if (typeof page.stageHeight === 'number' && page.stageHeight >= 240 && page.stageHeight <= 2400) {
    return page.stageHeight;
  }
  if (page.minHeight && page.minHeight.endsWith('px')) {
    const parsed = parseInt(page.minHeight, 10);
    if (!Number.isNaN(parsed) && parsed >= 240) {
      return parsed;
    }
  }
  return stageWidth <= 540 ? 820 : 600;
}

function getBoxShadowCSS(shadow?: string): string | undefined {
  switch (shadow) {
    case 'none':
      return 'none';
    case 'sm':
      return '0 2px 6px rgba(15, 23, 42, 0.08)';
    case 'md':
      return '0 6px 16px rgba(15, 23, 42, 0.12)';
    case 'lg':
      return '0 12px 26px rgba(15, 23, 42, 0.16)';
    case 'xl':
      return '0 18px 36px rgba(15, 23, 42, 0.2)';
    case '2xl':
      return '0 24px 48px rgba(15, 23, 42, 0.26)';
    default:
      return undefined;
  }
}

function getDropShadowCSS(shadow?: string): string | undefined {
  switch (shadow) {
    case 'none':
      return undefined;
    case 'sm':
      return 'drop-shadow(0 2px 4px rgba(15, 23, 42, 0.12))';
    case 'md':
      return 'drop-shadow(0 5px 10px rgba(15, 23, 42, 0.16))';
    case 'lg':
      return 'drop-shadow(0 10px 18px rgba(15, 23, 42, 0.2))';
    case 'xl':
      return 'drop-shadow(0 14px 24px rgba(15, 23, 42, 0.24))';
    case '2xl':
      return 'drop-shadow(0 20px 32px rgba(15, 23, 42, 0.3))';
    default:
      return undefined;
  }
}

function getFontWeightValue(weight?: string): number {
  switch (weight) {
    case 'normal':
      return 400;
    case 'medium':
      return 500;
    case 'semibold':
      return 600;
    case 'bold':
      return 700;
    case 'extrabold':
      return 800;
    default:
      return 500;
  }
}

function getFontFamilyCSS(family?: string): string | undefined {
  switch (family) {
    case 'serif':
      return 'Georgia, Cambria, "Times New Roman", Times, serif';
    case 'mono':
      return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    case 'sans':
      return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    default:
      return undefined;
  }
}

interface LayerElementVisualProps {
  element: PageLayerElement;
  defaultFontFamily?: string;
  showScrollChevron?: boolean;
}

export function LayerElementVisual({
  element: el,
  defaultFontFamily,
  showScrollChevron = false
}: LayerElementVisualProps) {
  const [frameIdx, setFrameIdx] = useState(0);

  const isSequence =
    el.type === 'image' &&
    el.spriteAsset?.type === 'sequence' &&
    Array.isArray(el.spriteAsset.frames) &&
    el.spriteAsset.frames.length > 1;

  useEffect(() => {
    if (!isSequence || !el.spriteAsset) return;
    const fps = el.spriteAsset.frameRate || 6;
    const intervalMs = Math.max(80, Math.floor(1000 / fps));
    const timer = setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % el.spriteAsset!.frames.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isSequence, el.spriteAsset]);

  const flipTransform =
    el.flipX || el.flipY
      ? `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})`
      : undefined;

  const opacity = el.styleOptions?.opacity ?? 1;
  const fontFamily = getFontFamilyCSS(el.styleOptions?.fontFamily || defaultFontFamily);

  // 1. IMAGE / SPRITE
  if (el.type === 'image') {
    const frames = el.spriteAsset?.frames;
    const activeFrame =
      isSequence && frames && frames.length > 0
        ? frames[frameIdx % frames.length]
        : el.mediaUrl || frames?.[0] || 'https://via.placeholder.com/300';

    const objectFit = el.styleOptions?.objectFit || (el.spriteAsset ? 'contain' : 'cover');
    const borderRadius = el.styleOptions?.borderRadius ?? (el.spriteAsset ? 0 : 16);
    const shadowPref = el.styleOptions?.shadow ?? (el.spriteAsset ? 'none' : 'md');
    const useContourShadow = objectFit === 'contain' && borderRadius === 0;

    return (
      <div
        className="flex items-center justify-center select-none"
        style={{
          width: el.width ? `${el.width}px` : '200px',
          height: el.height ? `${el.height}px` : '200px',
          borderRadius: `${borderRadius}px`,
          overflow: borderRadius > 0 || objectFit === 'cover' ? 'hidden' : 'visible',
          backgroundColor: el.styleOptions?.backgroundColor || undefined,
          boxShadow: useContourShadow ? undefined : getBoxShadowCSS(shadowPref),
          filter: useContourShadow ? getDropShadowCSS(shadowPref) : undefined,
          opacity,
          transform: flipTransform
        }}
      >
        <img
          src={activeFrame}
          alt={el.name}
          draggable={false}
          className="w-full h-full pointer-events-none select-none"
          style={{ objectFit }}
        />
      </div>
    );
  }

  // 2. TEXT
  if (el.type === 'text') {
    const textAlign = el.styleOptions?.textAlign || 'center';
    const hasBg = Boolean(el.styleOptions?.backgroundColor);
    const borderRadius = el.styleOptions?.borderRadius ?? (hasBg ? 16 : 0);
    const shadowPref = el.styleOptions?.shadow ?? 'none';

    return (
      <div
        className="px-3.5 py-2 leading-relaxed whitespace-pre-line flex flex-col justify-center select-none"
        style={{
          width: el.width ? `${el.width}px` : 'auto',
          minHeight: el.height ? `${el.height}px` : undefined,
          color: el.styleOptions?.color || '#0f172a',
          backgroundColor: el.styleOptions?.backgroundColor || undefined,
          fontSize: `${el.styleOptions?.fontSize || 16}px`,
          fontWeight: getFontWeightValue(el.styleOptions?.fontWeight),
          fontFamily,
          textAlign,
          alignItems:
            textAlign === 'left'
              ? 'flex-start'
              : textAlign === 'right'
              ? 'flex-end'
              : 'center',
          borderRadius: borderRadius ? `${borderRadius}px` : undefined,
          boxShadow: hasBg ? getBoxShadowCSS(shadowPref) : undefined,
          textShadow:
            !hasBg && shadowPref !== 'none'
              ? '0 2px 8px rgba(15, 23, 42, 0.18)'
              : undefined,
          opacity,
          transform: flipTransform
        }}
      >
        <span className="w-full break-words">{el.content}</span>
      </div>
    );
  }

  // 3. BUTTON / INTERACTIVE WIDGET
  const borderRadius = el.styleOptions?.borderRadius ?? 12;
  const shadowPref = el.styleOptions?.shadow ?? 'lg';

  return (
    <div
      className="px-5 py-2.5 flex items-center justify-center gap-2 select-none"
      style={{
        width: el.width ? `${el.width}px` : 'auto',
        minHeight: el.height ? `${el.height}px` : undefined,
        borderRadius: `${borderRadius}px`,
        backgroundColor: el.styleOptions?.backgroundColor ?? '#d97706',
        color: el.styleOptions?.color ?? '#ffffff',
        fontSize: `${el.styleOptions?.fontSize || 14}px`,
        fontWeight: getFontWeightValue(el.styleOptions?.fontWeight || 'bold'),
        fontFamily,
        textAlign: el.styleOptions?.textAlign || 'center',
        boxShadow: getBoxShadowCSS(shadowPref),
        opacity,
        transform: flipTransform
      }}
    >
      <span>{el.content || 'Klik di Sini'}</span>
      {showScrollChevron && el.interaction?.type === 'scroll_to_page' && (
        <ChevronDown className="w-4 h-4 animate-bounce shrink-0" />
      )}
    </div>
  );
}
