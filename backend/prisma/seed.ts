import { PrismaClient } from '@prisma/client';
import { Role, AccountStatus, AssetStatus } from '../src/types/enums';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Seeding University AV Room Database...');

  // Clean existing data
  await prisma.ledgerTransaction.deleteMany({});
  await prisma.loanTransaction.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.physicalAsset.deleteMany({});
  await prisma.assetCategory.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Asset Categories
  const dslrCat = await prisma.assetCategory.create({
    data: {
      name: 'DSLR Cameras',
      description: 'Professional Canon & Sony full-frame DSLR camera kits.',
      maxBorrowLimit: 2,
      depositRequired: 100.0,
      lateFeePerDay: 20.0,
    },
  });

  const projectorCat = await prisma.assetCategory.create({
    data: {
      name: 'HD Projectors',
      description: 'High-lumen portable HD projectors with HDMI/Wireless inputs.',
      maxBorrowLimit: 1,
      depositRequired: 75.0,
      lateFeePerDay: 15.0,
    },
  });

  const micCat = await prisma.assetCategory.create({
    data: {
      name: 'Wireless Microphones',
      description: 'Shure Lavalier & Handheld wireless microphone systems.',
      maxBorrowLimit: 3,
      depositRequired: 30.0,
      lateFeePerDay: 5.0,
    },
  });

  // 2. Create Physical Assets
  const asset1 = await prisma.physicalAsset.create({
    data: {
      barcode: 'BC-DSLR-001',
      serialNumber: 'SN-CANON-9042',
      model: 'Canon EOS 5D Mark IV',
      categoryId: dslrCat.id,
      status: AssetStatus.AVAILABLE,
      conditionNotes: 'Excellent condition, includes 24-70mm lens and strap.',
    },
  });

  const asset2 = await prisma.physicalAsset.create({
    data: {
      barcode: 'BC-DSLR-002',
      serialNumber: 'SN-SONY-7731',
      model: 'Sony A7 IV Mirrorless',
      categoryId: dslrCat.id,
      status: AssetStatus.AVAILABLE,
      conditionNotes: 'Minor scuffs on body, sensor cleaned.',
    },
  });

  const asset3 = await prisma.physicalAsset.create({
    data: {
      barcode: 'BC-PROJ-001',
      serialNumber: 'SN-EPSON-4410',
      model: 'Epson PowerLite 1781W',
      categoryId: projectorCat.id,
      status: AssetStatus.AVAILABLE,
      conditionNotes: 'Bulb counter at 120 hours.',
    },
  });

  const asset4 = await prisma.physicalAsset.create({
    data: {
      barcode: 'BC-MIC-001',
      serialNumber: 'SN-SHURE-1188',
      model: 'Shure BLX288/PG58 Dual',
      categoryId: micCat.id,
      status: AssetStatus.AVAILABLE,
      conditionNotes: 'Includes dual mic transmitters and receiver unit.',
    },
  });

  const asset5 = await prisma.physicalAsset.create({
    data: {
      barcode: 'BC-MIC-002',
      serialNumber: 'SN-SENN-3301',
      model: 'Sennheiser EW 112P G4',
      categoryId: micCat.id,
      status: AssetStatus.IN_MAINTENANCE,
      conditionNotes: 'XLR output cable damaged - awaiting repair replacement.',
    },
  });

  // 3. Create Users
  const student1 = await prisma.user.create({
    data: {
      name: 'Alex Johnson',
      email: 'alex.j@university.edu',
      role: Role.STUDENT,
      status: AccountStatus.ACTIVE,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      name: 'Samantha Lee',
      email: 'samantha.l@university.edu',
      role: Role.STUDENT,
      status: AccountStatus.ACTIVE,
    },
  });

  const faculty1 = await prisma.user.create({
    data: {
      name: 'Dr. Robert Carter',
      email: 'rcarter@university.edu',
      role: Role.FACULTY,
      status: AccountStatus.ACTIVE,
    },
  });

  const blockedUser = await prisma.user.create({
    data: {
      name: 'Marcus Vance',
      email: 'mvance@university.edu',
      role: Role.STUDENT,
      status: AccountStatus.BLOCKED,
    },
  });

  console.log('✅ Database successfully seeded!');
  console.log({
    categories: 3,
    assets: 5,
    users: 4,
  });
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
