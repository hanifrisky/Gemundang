import { BaseProject, GameThemeType } from './base';
import { PlatformerProject } from './platformer';
import { VerticalScrollProject } from './verticalScroll';

export * from './base';
export * from './platformer';
export * from './verticalScroll';

export type AnyGemUndangProject = PlatformerProject | VerticalScrollProject;
