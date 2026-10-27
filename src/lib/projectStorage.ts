'use server';

import { prisma } from './prisma';
import { auth } from '@/auth';
import { DEFAULT_DEMO_PROJECT, isValidSlug } from './defaultProject';
import type { PlatformerProject } from '@/types/platformer';
import type { Prisma, Project, Rsvp } from '@/generated/prisma/client';

export type TemplateVisibility = 'PRIVATE' | 'PUBLIC';

export type ProjectSummary = {
  slug: string;
  title: string;
  subtitle?: string;
  is_template_enabled: boolean;
  isTemplate: boolean;
  visibility: TemplateVisibility;
  ownerName: string;
  isOwner: boolean;
  entityCount: number;
  platformCount: number;
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

function toPlatformerProject(row: ProjectRow): PlatformerProject {
  const data = row.data as unknown as Omit<
    PlatformerProject,
    'slug' | 'title' | 'subtitle' | 'is_template_enabled' | 'rsvps'
  >;
  return {
    ...data,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    is_template_enabled: row.isTemplateEnabled,
    rsvps: (row.rsvps ?? []).map((r) => ({
      id: `rsvp-${r.id}`,
      guestName: r.guestName,
      attendance: r.attendance,
      pax: r.pax,
      message: r.message,
      createdAt: r.createdAt.toLocaleString('id-ID'),
    })),
  } as PlatformerProject;
}

function toSummary(
  row: Project & { owner: { name: string }; _count: { rsvps: number } },
  userId: number | null
): ProjectSummary {
  const data = row.data as unknown as Partial<PlatformerProject>;
  const isOwner = row.ownerId === userId;
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? undefined,
    is_template_enabled: row.isTemplateEnabled,
    isTemplate: row.isTemplate,
    visibility: row.visibility,
    ownerName: row.owner.name,
    isOwner,
    entityCount: data.entities?.length ?? 0,
    platformCount: data.world?.platforms?.length ?? 0,
    // Guest RSVP data is only visible to the owner
    rsvpCount: isOwner ? row._count.rsvps : 0,
  };
}

function projectFields(project: PlatformerProject) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { slug, title, subtitle, is_template_enabled, rsvps, ...rest } = project;
  return {
    title: String(title ?? '').slice(0, 255) || 'Projek Undangan',
    subtitle: subtitle ? String(subtitle).slice(0, 255) : null,
    isTemplateEnabled: is_template_enabled ?? true,
    data: JSON.parse(JSON.stringify(rest)) as Prisma.InputJsonValue,
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
export async function getProjectBySlug(slug: string): Promise<PlatformerProject | null> {
  const userId = await currentUserId();
  const row = await prisma.project.findUnique({
    where: { slug },
    include: { rsvps: { orderBy: { createdAt: 'desc' } } },
  });
  if (!row) return null;
  return toPlatformerProject(row.ownerId === userId ? row : { ...row, rsvps: [] });
}

export type EditableProjectResult =
  | { status: 'ok'; project: PlatformerProject }
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
  return { status: 'ok', project: toPlatformerProject(row) };
}

// Update an existing project owned by the user (RSVPs and ownership are never changed here)
export async function saveProject(project: PlatformerProject): Promise<boolean> {
  try {
    const userId = await requireUserId();
    const result = await prisma.project.updateMany({
      where: { slug: project.slug, ownerId: userId },
      data: projectFields(project),
    });
    return result.count === 1;
  } catch (err) {
    console.error('Failed to save project:', err);
    return false;
  }
}

export type CreateProjectResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

// Create a new project for the user, optionally duplicated from a visible template
export async function createNewProject(input: {
  slug: string;
  title: string;
  isTemplateEnabled?: boolean;
  isTemplate?: boolean;
  visibility?: TemplateVisibility;
  fromTemplateSlug?: string;
}): Promise<CreateProjectResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: 'Silakan login terlebih dahulu.' };
  if (!(await isSlugAvailable(input.slug))) return { ok: false, error: 'Slug tidak valid atau sudah dipakai.' };

  let base: PlatformerProject = JSON.parse(JSON.stringify(DEFAULT_DEMO_PROJECT));
  if (input.fromTemplateSlug) {
    const tpl = await prisma.project.findUnique({ where: { slug: input.fromTemplateSlug } });
    const canUse = tpl && tpl.isTemplate && (tpl.visibility === 'PUBLIC' || tpl.ownerId === userId);
    if (!canUse) return { ok: false, error: 'Template tidak ditemukan atau bersifat private.' };
    base = toPlatformerProject({ ...tpl, rsvps: [] });
  }

  const project: PlatformerProject = {
    ...base,
    slug: input.slug,
    title: input.title.trim() || 'Projek Undangan Baru',
    is_template_enabled: input.isTemplateEnabled ?? base.is_template_enabled ?? true,
    rsvps: [],
  };

  await prisma.project.create({
    data: {
      slug: input.slug,
      ...projectFields(project),
      isTemplate: input.isTemplate ?? false,
      visibility: input.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
      ownerId: userId,
    },
  });
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
  const result = await prisma.project.deleteMany({ where: { slug, ownerId: userId } });
  return result.count === 1;
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
