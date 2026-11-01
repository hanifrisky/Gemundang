import { GameThemeType } from '@/types/base';
import { ThemeDefinition } from './types';
import { PlatformerThemeDefinition } from './platformer';
import { VerticalScrollThemeDefinition } from './vertical-scroll';

export const THEME_REGISTRY: Record<GameThemeType, ThemeDefinition<any>> = {
  platformer: PlatformerThemeDefinition,
  vertical_scroll: VerticalScrollThemeDefinition
};

export const ALL_THEMES: ThemeDefinition<any>[] = [
  PlatformerThemeDefinition,
  VerticalScrollThemeDefinition
];

export function getThemeDefinition(themeType?: string): ThemeDefinition<any> {
  if (themeType && themeType in THEME_REGISTRY) {
    return THEME_REGISTRY[themeType as GameThemeType];
  }
  return THEME_REGISTRY.platformer; // Safe backward-compatible fallback
}
