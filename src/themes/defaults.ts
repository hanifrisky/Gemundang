import { GameThemeType, BaseProject } from '@/types/base';
import { DEFAULT_DEMO_PROJECT } from '@/lib/defaultProject';
import { createDefaultVerticalScrollProject } from './vertical-scroll/defaultProject';

export type ThemeMetadata = {
  id: GameThemeType;
  name: string;
  description: string;
  badge: string;
  defaultProject: (slug: string, title: string) => BaseProject;
};

export const THEME_DEFAULTS: Record<GameThemeType, (slug: string, title: string) => any> = {
  platformer: (slug: string, title: string) => ({
    ...JSON.parse(JSON.stringify(DEFAULT_DEMO_PROJECT)),
    slug,
    title,
    rsvps: []
  }),
  vertical_scroll: (slug: string, title: string) => createDefaultVerticalScrollProject(slug, title)
};

export function getDefaultProjectForTheme(themeType: GameThemeType = 'platformer', slug: string, title: string) {
  const factory = THEME_DEFAULTS[themeType] || THEME_DEFAULTS.platformer;
  return factory(slug, title);
}
