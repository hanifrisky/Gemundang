import { ThemeDefinition } from '../types';
import { PlatformerProject } from '@/types/platformer';
import { DEFAULT_DEMO_PROJECT } from '@/lib/defaultProject';
import PlatformerEditor from './PlatformerEditor';
import PlatformerTemplate from './PlatformerTemplate';
import PlatformerEngine from '@/components/game/PlatformerEngine';
import { Gamepad2 } from 'lucide-react';

export const PlatformerThemeDefinition: ThemeDefinition<PlatformerProject> = {
  id: 'platformer',
  name: '2D Platformer Quest',
  description: 'Undangan interaktif bergaya game 2D retro dengan karakter berjalan, melompat, dan eksplorasi dunia.',
  badge: 'Game 2D',
  icon: Gamepad2,
  defaultProject: (slug: string, title: string) => ({
    ...JSON.parse(JSON.stringify(DEFAULT_DEMO_PROJECT)),
    slug,
    title,
    rsvps: []
  }),
  EditorComponent: PlatformerEditor,
  TemplateComponent: PlatformerTemplate,
  RuntimeComponent: PlatformerEngine
};
