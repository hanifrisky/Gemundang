'use server';

import path from 'path';
import { prisma } from './prisma';
import { auth } from '@/auth';
import { isValidSlug } from './defaultProject';
import type { AnyGemUndangProject } from '@/types';
import type { GameThemeType } from '@/types/base';
import { getDefaultProjectForTheme } from '@/themes/defaults';
import {
  ensureProjectDirectories,
  writeAtomicJsonFile,
  readProjectJsonFile,
  createVersionSnapshot,
  deleteProjectStorageFolder,
  type ProjectVersionItem
} from './fileStorage';
import type { Project, Rsvp } from '@/generated/prisma/client';

export type TemplateVisibility = 'PRIVATE' | 'PUBLIC';

export type ProjectSummary = {
  id: number;
  uuid: string;
  slug: string;
  title: string;
  subtitle?: string;
  theme_type: GameThemeType;
  is_template_enabled: boolean;
  isTemplate: boolean;
  visibility: TemplateVisibility;
  ownerName: string;
  isOwner: boolean;
  currentVersion: number;
  rsvpCount: number;
};

type ProjectRow = Project & { rsvps?: Rsvp[] };

async function currentUserId(): Promise<number | null> {
  const session = await auth();
  const id = Number(session?.user?.id);
  return id || null;
}

async function requireUserId(): Promise<number> {
  const id = await currentUserId();
  if (!id) throw new Error('Unauthorized');
  return id;
}

function toSummary(
  row: Project & { owner: { name: string }; _count: { rsvps: number } },
  userId: number | null
): ProjectSummary {
  const isOwner = row.ownerId === userId;
  return {
    id: row.id,
    uuid: row.uuid,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    theme_type: (row.themeType as GameThemeType) || 'platformer',
    is_template_enabled: row.isTemplateEnabled,
    isTemplate: row.isTemplate,
    visibility: row.visibility,
    ownerName: row.owner.name,
    isOwner,
    currentVersion: row.currentVersion,
    rsvpCount: isOwner ? row._count.rsvps : 0,
  };
}

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
};

const summaryInclude = {
  owner: { select: { name: true } },
  _count: { select: { rsvps: true } },
} as const;

// Projects owned by the logged-in user with pagination / lazy loading support
export async function getMyProjects(
  options?: { page?: number; limit?: number }
): Promise<PaginatedResult<ProjectSummary>> {
  const userId = await requireUserId();
  const page = Math.max(1, options?.page || 1);
  const limit = Math.max(1, Math.min(50, options?.limit || 6));
  const skip = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    prisma.project.count({ where: { ownerId: userId } }),
    prisma.project.findMany({
      where: { ownerId: userId },
      include: summaryInclude,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    items: rows.map((r) => toSummary(r, userId)),
    total,
    hasMore: skip + rows.length < total,
    page,
    limit,
  };
}

// Templates visible to the current visitor: all PUBLIC ones + the user's own PRIVATE ones (with pagination)
export async function getTemplates(
  options?: { page?: number; limit?: number }
): Promise<PaginatedResult<ProjectSummary>> {
  const userId = await currentUserId();
  const page = Math.max(1, options?.page || 1);
  const limit = Math.max(1, Math.min(50, options?.limit || 6));
  const skip = (page - 1) * limit;

  const where = {
    isTemplate: true,
    OR: [{ visibility: 'PUBLIC' as const }, ...(userId ? [{ ownerId: userId }] : [])],
  };

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: summaryInclude,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return {
    items: rows.map((r) => toSummary(r, userId)),
    total,
    hasMore: skip + rows.length < total,
    page,
    limit,
  };
}

// Check slug availability
export async function isSlugAvailable(slug: string, currentSlugToIgnore?: string): Promise<boolean> {
  if (!slug || slug.trim().length < 3) return false;
  if (!isValidSlug(slug)) return false;
  if (slug === currentSlugToIgnore) return true;
  const count = await prisma.project.count({ where: { slug } });
  return count === 0;
}

// Public invitation view: anyone with the link can play. RSVPs are only included for the owner.
export async function getProjectBySlug(slug: string): Promise<AnyGemUndangProject | null> {
  const userId = await currentUserId();
  const row = await prisma.project.findUnique({
    where: { slug },
    include: { rsvps: { orderBy: { createdAt: 'desc' } } },
  });
  if (!row) return null;

  const filePayload = await readProjectJsonFile<AnyGemUndangProject>(row.currentFilePath);
  if (!filePayload) return null;

  const rsvps = (row.ownerId === userId ? (row.rsvps ?? []) : []).map((r) => ({
    id: `rsvp-${r.id}`,
    guestName: r.guestName,
    attendance: r.attendance,
    pax: r.pax,
    message: r.message,
    createdAt: r.createdAt.toLocaleString('id-ID'),
  }));

  return {
    ...filePayload,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    theme_type: (row.themeType as GameThemeType) || 'platformer',
    is_template_enabled: row.isTemplateEnabled,
    rsvps,
  } as AnyGemUndangProject;
}

export type EditableProjectResult =
  | { status: 'ok'; project: AnyGemUndangProject; currentVersion: number }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not_found' };

// Load a project for editing; only the owner may edit
export async function getProjectForEdit(slug: string): Promise<EditableProjectResult> {
  const userId = await currentUserId();
  if (!userId) return { status: 'unauthenticated' };
  const row = await prisma.project.findUnique({
    where: { slug },
    include: { rsvps: { orderBy: { createdAt: 'desc' } } },
  });
  if (!row) return { status: 'not_found' };
  if (row.ownerId !== userId) return { status: 'forbidden' };

  const filePayload = await readProjectJsonFile<AnyGemUndangProject>(row.currentFilePath);
  if (!filePayload) return { status: 'not_found' };

  const rsvps = (row.rsvps ?? []).map((r) => ({
    id: `rsvp-${r.id}`,
    guestName: r.guestName,
    attendance: r.attendance,
    pax: r.pax,
    message: r.message,
    createdAt: r.createdAt.toLocaleString('id-ID'),
  }));

  return {
    status: 'ok',
    currentVersion: row.currentVersion,
    project: {
      ...filePayload,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      theme_type: (row.themeType as GameThemeType) || 'platformer',
      is_template_enabled: row.isTemplateEnabled,
      rsvps,
    } as AnyGemUndangProject,
  };
}

// Update an existing project owned by the user (Fast Save to current.json)
export async function saveProject(project: AnyGemUndangProject): Promise<boolean> {
  try {
    const userId = await requireUserId();
    const row = await prisma.project.findFirst({
      where: { slug: project.slug, ownerId: userId },
    });
    if (!row) return false;

    // Hapus rsvps dari payload file agar tidak duplikasi
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { slug, title, subtitle, is_template_enabled, rsvps, ...rest } = project;
    const cleanPayload = {
      ...rest,
      slug: row.slug,
      title: project.title,
      subtitle: project.subtitle,
      theme_type: row.themeType,
      is_template_enabled: project.is_template_enabled,
    };

    // Tulis ke current.json secara atomik
    await writeAtomicJsonFile(row.currentFilePath, cleanPayload);

    // Update metadata di MySQL
    await prisma.project.update({
      where: { id: row.id },
      data: {
        title: String(project.title ?? '').slice(0, 255) || 'Projek Undangan',
        subtitle: project.subtitle ? String(project.subtitle).slice(0, 255) : null,
        isTemplateEnabled: project.is_template_enabled ?? true,
      },
    });

    return true;
  } catch (err) {
    console.error('Failed to save project:', err);
    return false;
  }
}

export type CreateProjectResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

// Create a new project for the user, optionally duplicated from a visible template or with chosen theme
export async function createNewProject(input: {
  slug: string;
  title: string;
  theme_type?: GameThemeType;
  isTemplateEnabled?: boolean;
  isTemplate?: boolean;
  visibility?: TemplateVisibility;
  fromTemplateSlug?: string;
}): Promise<CreateProjectResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Silakan login terlebih dahulu.' };
  if (!(await isSlugAvailable(input.slug))) return { ok: false, error: 'Slug tidak valid atau sudah dipakai.' };

  const chosenTheme = input.theme_type || 'platformer';
  let base: AnyGemUndangProject = getDefaultProjectForTheme(chosenTheme, input.slug, input.title);

  if (input.fromTemplateSlug) {
    const tpl = await prisma.project.findUnique({ where: { slug: input.fromTemplateSlug } });
    const canUse = tpl && tpl.isTemplate && (tpl.visibility === 'PUBLIC' || tpl.ownerId === userId);
    if (!canUse) return { ok: false, error: 'Template tidak ditemukan atau bersifat private.' };

    const tplPayload = await readProjectJsonFile<AnyGemUndangProject>(tpl.currentFilePath);
    if (tplPayload) {
      base = tplPayload;
    }
  }

  const projectTitle = input.title.trim() || 'Projek Undangan Baru';
  const initialPayload = {
    ...base,
    slug: input.slug,
    title: projectTitle,
    theme_type: chosenTheme,
    is_template_enabled: input.isTemplateEnabled ?? base.is_template_enabled ?? true,
    rsvps: [],
  } as AnyGemUndangProject;

  // Buat UUID projek
  const projectUuid = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const { projectDir } = await ensureProjectDirectories(projectUuid);
  const currentFilePath = path.join(projectDir, 'current.json');
  const relativeCurrentFilePath = path.relative(process.cwd(), currentFilePath).replace(/\\/g, '/');

  // Tulis file aktif perdana
  await writeAtomicJsonFile(currentFilePath, initialPayload);

  // Buat record di DB
  const createdProject = await prisma.project.create({
    data: {
      uuid: projectUuid,
      slug: input.slug,
      title: projectTitle,
      themeType: chosenTheme,
      currentFilePath: relativeCurrentFilePath,
      currentVersion: 1,
      isTemplateEnabled: input.isTemplateEnabled ?? true,
      isTemplate: input.isTemplate ?? false,
      visibility: input.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
      ownerId: userId,
    },
  });

  // Otomatis buat snapshot v1 perdana
  await createVersionSnapshot(
    createdProject.id,
    createdProject.uuid,
    initialPayload,
    'Versi Awal (Dibuat)',
    false
  );

  return { ok: true, slug: input.slug };
}

// Publish/unpublish a project as a template and set its visibility
export async function updateTemplateSettings(
  slug: string,
  settings: { isTemplate: boolean; visibility: TemplateVisibility }
): Promise<boolean> {
  const userId = await requireUserId();
  const result = await prisma.project.updateMany({
    where: { slug, ownerId: userId },
    data: {
      isTemplate: Boolean(settings.isTemplate),
      visibility: settings.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
    },
  });
  return result.count === 1;
}

export async function deleteProject(slug: string): Promise<boolean> {
  const userId = await requireUserId();
  const row = await prisma.project.findFirst({
    where: { slug, ownerId: userId },
    select: { id: true, uuid: true },
  });
  if (!row) return false;

  await prisma.project.delete({ where: { id: row.id } });
  await deleteProjectStorageFolder(row.uuid);
  return true;
}

// =====================================================================
// VERSIONING SERVER ACTIONS
// =====================================================================

export async function getProjectVersions(slug: string): Promise<ProjectVersionItem[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const proj = await prisma.project.findFirst({
    where: { slug, ownerId: userId },
    select: { id: true },
  });
  if (!proj) return [];

  const rows = await prisma.projectVersion.findMany({
    where: { projectId: proj.id },
    orderBy: { versionNumber: 'desc' },
  });

  return rows.map((r) => ({
    id: r.id,
    versionNumber: r.versionNumber,
    name: r.name,
    filePath: r.filePath,
    fileSize: r.fileSize,
    isLocked: r.isLocked,
    createdAt: r.createdAt.toLocaleString('id-ID'),
  }));
}

export async function createNamedVersion(
  slug: string,
  versionName: string,
  isLocked = false
): Promise<{ ok: boolean; versionItem?: ProjectVersionItem; error?: string }> {
  try {
    const userId = await requireUserId();
    const proj = await prisma.project.findFirst({
      where: { slug, ownerId: userId },
    });
    if (!proj) return { ok: false, error: 'Projek tidak ditemukan.' };

    const payload = await readProjectJsonFile<AnyGemUndangProject>(proj.currentFilePath);
    if (!payload) return { ok: false, error: 'File projek aktif tidak terbaca.' };

    const versionItem = await createVersionSnapshot(
      proj.id,
      proj.uuid,
      payload,
      versionName,
      isLocked
    );
    if (!versionItem) return { ok: false, error: 'Gagal membuat snapshot versi.' };

    return { ok: true, versionItem };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Gagal membuat versi baru.' };
  }
}

export async function toggleVersionLock(versionId: number): Promise<{ ok: boolean; isLocked?: boolean }> {
  try {
    const userId = await requireUserId();
    const v = await prisma.projectVersion.findUnique({
      where: { id: versionId },
      include: { project: { select: { ownerId: true } } },
    });
    if (!v || v.project.ownerId !== userId) return { ok: false };

    const updated = await prisma.projectVersion.update({
      where: { id: versionId },
      data: { isLocked: !v.isLocked },
    });
    return { ok: true, isLocked: updated.isLocked };
  } catch (err) {
    return { ok: false };
  }
}

export async function renameVersion(versionId: number, newName: string): Promise<boolean> {
  try {
    const userId = await requireUserId();
    const v = await prisma.projectVersion.findUnique({
      where: { id: versionId },
      include: { project: { select: { ownerId: true } } },
    });
    if (!v || v.project.ownerId !== userId) return false;

    const trimmed = newName.trim();
    if (!trimmed) return false;

    await prisma.projectVersion.update({
      where: { id: versionId },
      data: { name: trimmed.slice(0, 150) },
    });
    return true;
  } catch (err) {
    return false;
  }
}

export async function restoreVersion(slug: string, versionId: number): Promise<{ ok: boolean; restoredProject?: AnyGemUndangProject; error?: string }> {
  try {
    const userId = await requireUserId();
    const proj = await prisma.project.findFirst({
      where: { slug, ownerId: userId },
    });
    if (!proj) return { ok: false, error: 'Projek tidak ditemukan.' };

    const targetVersion = await prisma.projectVersion.findFirst({
      where: { id: versionId, projectId: proj.id },
    });
    if (!targetVersion) return { ok: false, error: 'Versi target tidak ditemukan.' };

    const snapshotPayload = await readProjectJsonFile<AnyGemUndangProject>(targetVersion.filePath);
    if (!snapshotPayload) return { ok: false, error: 'File versi korup atau tidak ditemukan.' };

    // Tulis kembali payload snapshot ke current.json
    await writeAtomicJsonFile(proj.currentFilePath, snapshotPayload);

    // Update versi aktif di metadata DB
    await prisma.project.update({
      where: { id: proj.id },
      data: {
        currentVersion: targetVersion.versionNumber,
        title: snapshotPayload.title || proj.title,
        subtitle: snapshotPayload.subtitle ?? proj.subtitle,
      },
    });

    return { ok: true, restoredProject: snapshotPayload };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Gagal memulihkan versi.' };
  }
}

// Add RSVP record (public: guests don't need an account)
export async function addRSVPToProject(
  slug: string,
  rsvp: { guestName: string; attendance: 'hadir' | 'tidak_hadir' | 'ragu'; pax: number; message: string }
): Promise<boolean> {
  const guestName = rsvp.guestName?.trim();
  if (!guestName) return false;
  if (!['hadir', 'tidak_hadir', 'ragu'].includes(rsvp.attendance)) return false;
  const project = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (!project) return false;
  await prisma.rsvp.create({
    data: {
      projectId: project.id,
      guestName: guestName.slice(0, 255),
      attendance: rsvp.attendance,
      pax: Math.max(1, Math.min(20, Math.floor(Number(rsvp.pax) || 1))),
      message: String(rsvp.message ?? '').slice(0, 5000),
    },
  });
  return true;
}
