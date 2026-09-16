import { Router, Request, Response } from 'express';
import { lendingService } from '../services/lendingService';
import { PrismaClient } from '@prisma/client';
import { AccountStatus } from '../types/enums';

const router = Router();
const prisma = new PrismaClient();

// 1. GET /api/assets - Returns all physical assets along with category parameters and current status
router.get('/assets', async (req: Request, res: Response) => {
  try {
    const assets = await lendingService.getAllAssets();
    res.json({ success: true, data: assets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await lendingService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/users
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await lendingService.getUsers();
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users
router.post('/users', async (req: Request, res: Response) => {
  try {
    const { name, email, role } = req.body;
    const user = await lendingService.createUser({ name, email, role });
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/users/:id/status
router.patch('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;
    if (![AccountStatus.ACTIVE, AccountStatus.BLOCKED].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const user = await lendingService.updateUserStatus(userId, status);
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. POST /api/reservations - Create a reservation
router.post('/reservations', async (req: Request, res: Response) => {
  try {
    const { userId, assetId, startTime, endTime } = req.body;

    if (!userId || !assetId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, assetId, startTime, endTime',
      });
    }

    const reservation = await lendingService.createReservation({
      userId,
      assetId,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });

    res.status(201).json({ success: true, data: reservation });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/reservations - List all reservations
router.get('/reservations', async (req: Request, res: Response) => {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        asset: { include: { category: true } },
        user: true,
        loan: { include: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: reservations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reservations/:id/checkout - Desk Checkout operation
router.post('/reservations/:id/checkout', async (req: Request, res: Response) => {
  try {
    const reservationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { inspectionNotes } = req.body;
    const loan = await lendingService.checkoutLoan(reservationId, inspectionNotes);
    res.status(201).json({ success: true, data: loan });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/loans - List active and past loans
router.get('/loans', async (req: Request, res: Response) => {
  try {
    const loans = await prisma.loanTransaction.findMany({
      include: {
        asset: { include: { category: true } },
        user: true,
        payments: true,
        reservation: true,
      },
      orderBy: { checkoutTime: 'desc' },
    });
    res.json({ success: true, data: loans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/loans/:id/return - Return loan and calculate operating hours late fee
router.post('/loans/:id/return', async (req: Request, res: Response) => {
  try {
    const loanId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { returnNotes, returnTime } = req.body;
    const customTime = returnTime ? new Date(returnTime) : undefined;

    const result = await lendingService.returnLoan(loanId, returnNotes, customTime);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 4. POST /api/cron/cleanup-noshows - Cleanup expired PENDING reservations past 45m of startTime
router.post('/cron/cleanup-noshows', async (req: Request, res: Response) => {
  try {
    const { referenceTime } = req.body;
    const customRefTime = referenceTime ? new Date(referenceTime) : undefined;

    const result = await lendingService.cleanupNoShows(customRefTime);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ledger - View all financial ledger transactions
router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const ledger = await prisma.ledgerTransaction.findMany({
      include: {
        loan: {
          include: {
            user: true,
            asset: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: ledger });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
