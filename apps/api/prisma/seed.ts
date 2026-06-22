/**
 * Dev seed - one Organization, one OWNER user (with a credential password),
 * the default editable lists, and a handful of sample records.
 *
 * The OWNER password is hashed with bcryptjs, matching the custom hasher
 * configured in the Better Auth setup (apps/api/src/auth/auth.config.ts), so
 * the seeded credentials log in normally.
 *
 * Run: pnpm --filter @velvich/api prisma:seed
 */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_SETTINGS, rupeesToPaise } from '@velvich/shared';

const prisma = new PrismaClient();

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? 'owner@velvichinfra.test';
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? 'Owner@12345';

async function main() {
  // --- Organization (single tenant) ----------------------------------------
  const existingOrg = await prisma.organization.findFirst();
  if (!existingOrg) {
    await prisma.organization.create({
      data: {
        name: 'Velvich Infra',
        address: 'Salem, Tamil Nadu',
        settings: DEFAULT_SETTINGS as unknown as Prisma.InputJsonValue,
      },
    });
    console.log('✓ Organization created');
  }

  // --- Owner user + credential account --------------------------------------
  let owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) {
    const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12);
    owner = await prisma.user.create({
      data: {
        name: 'Er. V. Udhayakumar',
        email: OWNER_EMAIL,
        emailVerified: true,
        role: 'OWNER',
        status: 'ACTIVE',
        accounts: {
          create: {
            providerId: 'credential',
            accountId: OWNER_EMAIL,
            password: passwordHash,
          },
        },
      },
    });
    console.log(`✓ Owner created - login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
  }

  // --- Sample data (dev only) -----------------------------------------------
  if (process.env.SEED_SAMPLES !== 'false') {
    const client = await prisma.client.upsert({
      where: { id: 'seed-client-pwd' },
      update: {},
      create: {
        id: 'seed-client-pwd',
        name: 'PWD Salem Division',
        deptType: 'PWD',
        city: 'Salem',
        contacts: {
          create: [
            { name: 'A. Murugan', role: 'Executive Engineer', phone: '+91 98000 00001' },
            { name: 'S. Lakshmi', role: 'Assistant Engineer', phone: '+91 98000 00002' },
          ],
        },
      },
    });

    const staff = await prisma.staff.upsert({
      where: { id: 'seed-staff-1' },
      update: {},
      create: {
        id: 'seed-staff-1',
        name: 'R. Karthik',
        role: 'Survey Engineer',
        phone: '+91 98000 10001',
        skills: 'DGPS, Total Station',
      },
    });

    const project = await prisma.project.upsert({
      where: { id: 'seed-project-1' },
      update: {},
      create: {
        id: 'seed-project-1',
        name: 'Rasipuram Bypass DPR',
        type: 'DPR',
        deptType: 'PWD',
        district: 'Namakkal',
        clientId: client.id,
        contractAmount: BigInt(rupeesToPaise(2500000)),
        stage: 'DPR_PREPARATION',
        staff: { create: { staffId: staff.id } },
        milestones: {
          create: [
            { label: 'Mobilization Advance', expectedAmount: BigInt(rupeesToPaise(500000)) },
            { label: 'Final', expectedAmount: BigInt(rupeesToPaise(2000000)) },
          ],
        },
        stageHistory: {
          create: { stage: 'DPR_PREPARATION', changedBy: owner.id, note: 'Seed' },
        },
      },
    });

    await prisma.transaction.upsert({
      where: { id: 'seed-txn-1' },
      update: {},
      create: {
        id: 'seed-txn-1',
        type: 'INCOME',
        category: 'Mobilization Advance',
        amount: BigInt(rupeesToPaise(500000)),
        date: new Date('2026-05-01T06:00:00Z'),
        projectId: project.id,
        incomeStatus: 'RECEIVED',
        source: 'manual',
        createdBy: owner.id,
      },
    });

    await prisma.transaction.upsert({
      where: { id: 'seed-txn-2' },
      update: {},
      create: {
        id: 'seed-txn-2',
        type: 'EXPENSE',
        category: 'Travel & Fuel',
        description: 'Diesel for site survey',
        amount: BigInt(rupeesToPaise(4500)),
        date: new Date('2026-05-03T06:00:00Z'),
        projectId: project.id,
        paidVia: 'CASH',
        source: 'manual',
        createdBy: owner.id,
      },
    });

    await prisma.receivable.upsert({
      where: { id: 'seed-recv-1' },
      update: {},
      create: {
        id: 'seed-recv-1',
        projectId: project.id,
        expectedAmount: BigInt(rupeesToPaise(2000000)),
        dueDate: new Date('2026-06-15T06:00:00Z'),
        status: 'PENDING',
      },
    });

    console.log('✓ Sample client, staff, project, transactions, receivable created');
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
