import React from 'react';
import { LucideIcon } from 'lucide-react';
import { BaseProject, GameThemeType } from '@/types/base';

export interface ThemeEditorProps<T extends BaseProject = any> {
  project: T;
  currentVersion?: number;
  onSave: (updated: T) => Promise<boolean>;
  onReload?: () => Promise<void>;
}

export interface ThemeTemplateProps<T extends BaseProject = any> {
  project: T;
  onSave: (updated: T) => Promise<boolean>;
}

export interface ThemeRuntimeProps<T extends BaseProject = any> {
  project: T;
  mode?: 'play' | 'test' | 'preview';
  guestName?: string;
  onExitTestMode?: () => void;
  className?: string;
}

export interface ThemeDefinition<T extends BaseProject = any> {
  id: GameThemeType;
  name: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  defaultProject: (slug: string, title: string) => T;
  EditorComponent: React.ComponentType<ThemeEditorProps<T>>;
  TemplateComponent: React.ComponentType<ThemeTemplateProps<T>>;
  RuntimeComponent: React.ComponentType<ThemeRuntimeProps<T>>;
}
