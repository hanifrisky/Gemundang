import 'dotenv/config';
import bcrypt from 'bcryptjs';
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
  const data = JSON.parse(JSON.stringify(rest));
  const fields = {
    title,
    subtitle,
    isTemplateEnabled: is_template_enabled,
    isTemplate: true,
    visibility: 'PUBLIC' as const,
    data,
    ownerId: admin.id,
  };

  const project = await prisma.project.upsert({
    where: { slug },
    update: fields,
    create: { slug, ...fields },
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
  .finally(() => prisma.$disconnect());
