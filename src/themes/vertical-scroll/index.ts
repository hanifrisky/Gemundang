import { ThemeDefinition } from '../types';
import { VerticalScrollProject } from '@/types/verticalScroll';
import { createDefaultVerticalScrollProject } from './defaultProject';
import VerticalScrollEditor from './editor/VerticalScrollEditor';
import VerticalScrollTemplate from './template/VerticalScrollTemplate';
import VerticalScrollEngine from './runtime/VerticalScrollEngine';
import { LayoutTemplate } from 'lucide-react';

export const VerticalScrollThemeDefinition: ThemeDefinition<VerticalScrollProject> = {
  id: 'vertical_scroll',
  name: 'Vertical Scroll Reveal',
  description: 'Undangan bergaya website modern yang di-scroll ke bawah dengan animasi layer visual kaya.',
  badge: 'Web Interaktif',
  icon: LayoutTemplate,
  defaultProject: (slug: string, title: string) => createDefaultVerticalScrollProject(slug, title),
  EditorComponent: VerticalScrollEditor,
  TemplateComponent: VerticalScrollTemplate,
  RuntimeComponent: VerticalScrollEngine
};
