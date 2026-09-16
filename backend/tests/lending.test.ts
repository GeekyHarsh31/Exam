import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import { AssetStatus, AccountStatus, ReservationStatus, PaymentType } from '../src/types/enums';
import { getOperatingHoursBetween, calculateLateFee } from '../src/utils/operatingHours';

const prisma = new PrismaClient();

describe('Equipment Lending & Inventory System Test Suite', () => {
  let testUser1Id: string;
  let testUser2Id: string;
  let blockedUserId: string;
  let categoryDslrId: string;
  let asset1Id: string;
  let asset2Id: string;
  let asset3Id: string;
  let maintenanceAssetId: string;

  beforeAll(async () => {
    // Reset DB state for clean tests
    await prisma.ledgerTransaction.deleteMany({});
    await prisma.loanTransaction.deleteMany({});
    await prisma.reservation.deleteMany({});
    await prisma.physicalAsset.deleteMany({});
    await prisma.assetCategory.deleteMany({});
    await prisma.user.deleteMany({});

    // Seed test Category with maxBorrowLimit = 2
    const dslrCat = await prisma.assetCategory.create({
      data: {
        name: 'Test DSLRs',
        maxBorrowLimit: 2,
        depositRequired: 50.0,
        lateFeePerDay: 10.0,
      },
    });
    categoryDslrId = dslrCat.id;

    // Create Physical Assets
    const a1 = await prisma.physicalAsset.create({
      data: {
        barcode: 'TEST-BC-01',
        serialNumber: 'TEST-SN-01',
        model: 'Canon EOS 80D',
        categoryId: categoryDslrId,
        status: AssetStatus.AVAILABLE,
      },
    });
    asset1Id = a1.id;

    const a2 = await prisma.physicalAsset.create({
      data: {
        barcode: 'TEST-BC-02',
        serialNumber: 'TEST-SN-02',
        model: 'Nikon D750',
        categoryId: categoryDslrId,
        status: AssetStatus.AVAILABLE,
      },
    });
    asset2Id = a2.id;

    const a3 = await prisma.physicalAsset.create({
      data: {
        barcode: 'TEST-BC-03',
        serialNumber: 'TEST-SN-03',
        model: 'Sony A6600',
        categoryId: categoryDslrId,
        status: AssetStatus.AVAILABLE,
      },
    });
    asset3Id = a3.id;

    const mAsset = await prisma.physicalAsset.create({
      data: {
        barcode: 'TEST-BC-MAINT',
        serialNumber: 'TEST-SN-MAINT',
        model: 'Broken Camera',
        categoryId: categoryDslrId,
        status: AssetStatus.IN_MAINTENANCE,
      },
    });
    maintenanceAssetId = mAsset.id;

    // Create Users
    const u1 = await prisma.user.create({
      data: {
        name: 'Test Student One',
        email: 'student1@test.com',
        status: AccountStatus.ACTIVE,
      },
    });
    testUser1Id = u1.id;

    const u2 = await prisma.user.create({
      data: {
        name: 'Test Student Two',
        email: 'student2@test.com',
        status: AccountStatus.ACTIVE,
      },
    });
    testUser2Id = u2.id;

    const bu = await prisma.user.create({
      data: {
        name: 'Blocked User',
        email: 'blocked@test.com',
        status: AccountStatus.BLOCKED,
      },
    });
    blockedUserId = bu.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ----------------------------------------------------------------------
  // TEST CRITERIA 1: CONCURRENCY & OVERLAP (1-Hour Buffer Window)
  // ----------------------------------------------------------------------
  describe('1. Concurrency & Overlap Buffer Enforcement', () => {
    it('should reject overlapping slots for concurrent requests for the same physical asset', async () => {
      const now = new Date();
      // Future window: tomorrow 10:00 to 14:00
      const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(startTime.getTime() + 4 * 60 * 60 * 1000); // 14:00

      // Fire two concurrent requests for the EXACT same time slot on asset1Id
      const [res1, res2] = await Promise.all([
        request(app).post('/api/reservations').send({
          userId: testUser1Id,
          assetId: asset1Id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
        request(app).post('/api/reservations').send({
          userId: testUser2Id,
          assetId: asset1Id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      ]);

      const successCount = [res1, res2].filter((r) => r.status === 201).length;
      const failureCount = [res1, res2].filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      const failedRes = [res1, res2].find((r) => r.status === 400);
      expect(failedRes?.body.error).toMatch(/unavailable|buffer window/i);
    });

    it('should reject booking within 1 hour buffer of existing reservation', async () => {
      // Find existing reservation start/end time
      const existing = await prisma.reservation.findFirst({
        where: { assetId: asset1Id, status: ReservationStatus.PENDING },
      });
      expect(existing).not.toBeNull();

      // Attempt to book starting 30 minutes after existing reservation ends (violates 1hr buffer requirement)
      const invalidStart = new Date(existing!.endTime.getTime() + 30 * 60 * 1000);
      const invalidEnd = new Date(invalidStart.getTime() + 2 * 60 * 60 * 1000);

      const res = await request(app).post('/api/reservations').send({
        userId: testUser2Id,
        assetId: asset1Id,
        startTime: invalidStart.toISOString(),
        endTime: invalidEnd.toISOString(),
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/buffer window/i);
    });
  });

  // ----------------------------------------------------------------------
  // TEST CRITERIA 2: OPERATING HOURS LATE FEE
  // ----------------------------------------------------------------------
  describe('2. Operating Hours Late Fee Calculation', () => {
    it('Gear due Friday 5 PM (17:00) and returned Monday 9 AM (09:00) incurs exactly 1 hour of late fee', async () => {
      // Friday 17:00
      const fridayDue = new Date('2026-09-18T17:00:00.000Z');
      // Monday 09:00
      const mondayReturn = new Date('2026-09-21T09:00:00.000Z');

      const lateFeePerDay = 10.0; // $10 per day -> $1.00 per operating hour
      const depositAmount = 50.0;

      const result = calculateLateFee(fridayDue, mondayReturn, lateFeePerDay, depositAmount);

      expect(result.operatingHoursLate).toBe(1); // Exactly 1 hour
      expect(result.ratePerHour).toBe(1.0); // $10 / 10 hrs = $1/hr
      expect(result.finalLateFee).toBe(1.0); // Exactly $1.00 fee
    });

    it('should cap late fee at the deposit amount upon return', async () => {
      // Returned 20 operating days late
      const dueTime = new Date('2026-09-01T10:00:00.000Z');
      const returnTime = new Date('2026-09-30T10:00:00.000Z');

      const result = calculateLateFee(dueTime, returnTime, 10.0, 50.0);

      expect(result.uncappedLateFee).toBeGreaterThan(50.0);
      expect(result.finalLateFee).toBe(50.0); // Capped at deposit
    });
  });

  // ----------------------------------------------------------------------
  // TEST CRITERIA 3: CATEGORY BORROW LIMIT
  // ----------------------------------------------------------------------
  describe('3. Category Limit Enforcement', () => {
    it('Requesting a 3rd item in a category with a limit of 2 triggers a policy error response', async () => {
      // Clean up previous reservations for user 1
      await prisma.reservation.deleteMany({ where: { userId: testUser1Id } });

      const startTime1 = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endTime1 = new Date(startTime1.getTime() + 2 * 60 * 60 * 1000);

      const startTime2 = new Date(Date.now() + 10 * 60 * 60 * 1000);
      const endTime2 = new Date(startTime2.getTime() + 2 * 60 * 60 * 1000);

      const startTime3 = new Date(Date.now() + 20 * 60 * 60 * 1000);
      const endTime3 = new Date(startTime3.getTime() + 2 * 60 * 60 * 1000);

      // Book item 1 (Success)
      const res1 = await request(app).post('/api/reservations').send({
        userId: testUser1Id,
        assetId: asset1Id,
        startTime: startTime1.toISOString(),
        endTime: endTime1.toISOString(),
      });
      expect(res1.status).toBe(201);

      // Book item 2 (Success - reaches limit of 2)
      const res2 = await request(app).post('/api/reservations').send({
        userId: testUser1Id,
        assetId: asset2Id,
        startTime: startTime2.toISOString(),
        endTime: endTime2.toISOString(),
      });
      expect(res2.status).toBe(201);

      // Attempt to book 3rd item in category with limit 2 (Should trigger policy error)
      const res3 = await request(app).post('/api/reservations').send({
        userId: testUser1Id,
        assetId: asset3Id,
        startTime: startTime3.toISOString(),
        endTime: endTime3.toISOString(),
      });

      expect(res3.status).toBe(400);
      expect(res3.body.error).toMatch(/Category borrow limit reached/i);
    });
  });

  // ----------------------------------------------------------------------
  // TEST CASE 4: ACCOUNT ENFORCEMENT & MAINTENANCE
  // ----------------------------------------------------------------------
  describe('4. Account Status & Maintenance Enforcement', () => {
    it('should block BLOCKED user from creating a reservation', async () => {
      const startTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const res = await request(app).post('/api/reservations').send({
        userId: blockedUserId,
        assetId: asset3Id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/BLOCKED/i);
    });

    it('should prevent reserving an asset that is IN_MAINTENANCE', async () => {
      const startTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

      const res = await request(app).post('/api/reservations').send({
        userId: testUser2Id,
        assetId: maintenanceAssetId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/IN_MAINTENANCE/i);
    });
  });

  // ----------------------------------------------------------------------
  // TEST CASE 5: NO-SHOW AUTO-CANCELLATION CRON
  // ----------------------------------------------------------------------
  describe('5. No-Show Auto-Cancellation Cleanup', () => {
    it('should mark PENDING reservations past 45 minutes of startTime as NO_SHOW', async () => {
      // Create a reservation with startTime in the past (e.g. 60 minutes ago)
      const pastStart = new Date(Date.now() - 60 * 60 * 1000);
      const pastEnd = new Date(pastStart.getTime() + 2 * 60 * 60 * 1000);

      const expiredRes = await prisma.reservation.create({
        data: {
          userId: testUser2Id,
          assetId: asset3Id,
          startTime: pastStart,
          endTime: pastEnd,
          status: ReservationStatus.PENDING,
        },
      });

      // Call cleanup cron endpoint
      const response = await request(app).post('/api/cron/cleanup-noshows').send({});

      expect(response.status).toBe(200);
      expect(response.body.data.cleanedCount).toBeGreaterThanOrEqual(1);
      expect(response.body.data.noShowReservationIds).toContain(expiredRes.id);

      // Verify status in DB
      const updatedRes = await prisma.reservation.findUnique({ where: { id: expiredRes.id } });
      expect(updatedRes?.status).toBe(ReservationStatus.NO_SHOW);
    });
  });
});
