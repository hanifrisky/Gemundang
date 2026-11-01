import 'dotenv/config';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs/promises';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { DEFAULT_DEMO_PROJECT } from '../src/lib/defaultProject';

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@gemundang.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin12345';

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: 'Admin GemUndang', email, passwordHash: await bcrypt.hash(password, 10) },
  });

  const { slug, title, subtitle, is_template_enabled, rsvps, ...rest } = DEFAULT_DEMO_PROJECT;
  const projectUuid = 'proj_seed_demo_platformer';
  const storageDir = path.join(process.cwd(), 'storage', 'projects', projectUuid);
  await fs.mkdir(storageDir, { recursive: true });

  const currentFilePath = path.join(storageDir, 'current.json');
  const cleanPayload = {
    ...rest,
    slug,
    title,
    subtitle,
    theme_type: 'platformer',
    is_template_enabled,
    rsvps: [],
  };
  await fs.writeFile(currentFilePath, JSON.stringify(cleanPayload, null, 2), 'utf-8');

  const relativePath = path.relative(process.cwd(), currentFilePath).replace(/\\/g, '/');

  const fields = {
    title,
    subtitle,
    themeType: 'platformer',
    currentFilePath: relativePath,
    currentVersion: 1,
    isTemplateEnabled: is_template_enabled,
    isTemplate: true,
    visibility: 'PUBLIC' as const,
    ownerId: admin.id,
  };

  const project = await prisma.project.upsert({
    where: { slug },
    update: fields,
    create: { slug, uuid: projectUuid, ...fields },
  });

  await prisma.rsvp.deleteMany({ where: { projectId: project.id } });
  await prisma.rsvp.createMany({
    data: (rsvps ?? []).map((r) => ({
      projectId: project.id,
      guestName: r.guestName,
      attendance: r.attendance,
      pax: r.pax,
      message: r.message,
    })),
  });

  console.log(`Seeded admin "${email}" and public template "${slug}" with ${rsvps?.length ?? 0} RSVP(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
