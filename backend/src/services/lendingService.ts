import { PrismaClient } from '@prisma/client';
import { AssetStatus, ReservationStatus, AccountStatus, PaymentType } from '../types/enums';
import { calculateLateFee } from '../utils/operatingHours';

const prisma = new PrismaClient();

export class LendingService {
  /**
   * Get all physical assets with category information and current status.
   */
  async getAllAssets() {
    return prisma.physicalAsset.findMany({
      include: {
        category: true,
        reservations: {
          where: {
            status: { in: [ReservationStatus.PENDING, ReservationStatus.ACTIVE] },
          },
        },
        loans: {
          where: { actualReturnTime: null },
        },
      },
    });
  }

  /**
   * Get asset categories
   */
  async getCategories() {
    return prisma.assetCategory.findMany({
      include: {
        assets: true,
      },
    });
  }

  /**
   * Get all users
   */
  async getUsers() {
    return prisma.user.findMany({
      include: {
        reservations: true,
        loans: true,
      },
    });
  }

  /**
   * Create a user
   */
  async createUser(data: { name: string; email: string; role?: 'STUDENT' | 'FACULTY' | 'ADMIN' }) {
    return prisma.user.create({ data });
  }

  /**
   * Toggle user account status
   */
  async updateUserStatus(userId: string, status: AccountStatus) {
    return prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  /**
   * Create a reservation with serializable transaction and strict business rules.
   */
  async createReservation(data: {
    userId: string;
    assetId: string;
    startTime: Date;
    endTime: Date;
  }) {
    const { userId, assetId, startTime, endTime } = data;

    if (endTime <= startTime) {
      throw new Error('End time must be after start time');
    }

    // Execute in serializable transaction for concurrency protection
    return prisma.$transaction(async (tx) => {
      // 1. Check User Account Status
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          loans: {
            where: { actualReturnTime: null },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === AccountStatus.BLOCKED) {
        throw new Error('User account is BLOCKED. Cannot create new reservations.');
      }

      // Check for overdue loans
      const now = new Date();
      const hasOverdueLoans = user.loans.some(
        (loan) => loan.expectedReturnTime < now && loan.actualReturnTime === null
      );
      if (hasOverdueLoans) {
        throw new Error('User has overdue items. Please return them before making new reservations.');
      }

      // 2. Check Physical Asset Maintenance / Status
      const asset = await tx.physicalAsset.findUnique({
        where: { id: assetId },
        include: { category: true },
      });

      if (!asset) {
        throw new Error('Physical asset not found');
      }

      if (asset.status === AssetStatus.IN_MAINTENANCE) {
        throw new Error('Asset is currently IN_MAINTENANCE and unavailable for reservation.');
      }

      if (asset.status === AssetStatus.LOST) {
        throw new Error('Asset is marked as LOST and unavailable.');
      }

      // 3. Category Borrow Limit Check across active loans + future/pending reservations
      const activeCategoryLoansCount = await tx.loanTransaction.count({
        where: {
          userId,
          actualReturnTime: null,
          asset: { categoryId: asset.categoryId },
        },
      });

      const activeCategoryReservationsCount = await tx.reservation.count({
        where: {
          userId,
          status: { in: [ReservationStatus.PENDING, ReservationStatus.ACTIVE] },
          asset: { categoryId: asset.categoryId },
        },
      });

      const totalCategoryBorrowing = activeCategoryLoansCount + activeCategoryReservationsCount;
      if (totalCategoryBorrowing >= asset.category.maxBorrowLimit) {
        throw new Error(
          `Category borrow limit reached! Maximum allowed for '${asset.category.name}' is ${asset.category.maxBorrowLimit}. Current active/pending: ${totalCategoryBorrowing}.`
        );
      }

      // 4. Overlap Check including 1-hour Buffer Windows
      // Buffer window: [startTime - 1 hour, endTime + 1 hour]
      const bufferedStart = new Date(startTime.getTime() - 60 * 60 * 1000);
      const bufferedEnd = new Date(endTime.getTime() + 60 * 60 * 1000);

      // Fetch existing pending/active reservations for this asset
      const existingReservations = await tx.reservation.findMany({
        where: {
          assetId,
          status: { in: [ReservationStatus.PENDING, ReservationStatus.ACTIVE] },
        },
      });

      for (const res of existingReservations) {
        const existingBufferedStart = new Date(res.startTime.getTime() - 60 * 60 * 1000);
        const existingBufferedEnd = new Date(res.endTime.getTime() + 60 * 60 * 1000);

        // Check window overlap: A.start < B.end AND A.end > B.start
        if (bufferedStart < existingBufferedEnd && bufferedEnd > existingBufferedStart) {
          throw new Error(
            `Asset is unavailable due to an existing booking/buffer window between ${res.startTime.toISOString()} and ${res.endTime.toISOString()}`
          );
        }
      }

      // Check active loans for this asset
      const activeLoans = await tx.loanTransaction.findMany({
        where: {
          assetId,
          actualReturnTime: null,
        },
      });

      for (const loan of activeLoans) {
        const loanBufferedEnd = new Date(loan.expectedReturnTime.getTime() + 60 * 60 * 1000);
        if (bufferedStart < loanBufferedEnd && bufferedEnd > loan.checkoutTime) {
          throw new Error('Asset is currently checked out by another user during this time slot.');
        }
      }

      // 5. Create Reservation
      const reservation = await tx.reservation.create({
        data: {
          userId,
          assetId,
          startTime,
          endTime,
          status: ReservationStatus.PENDING,
        },
        include: {
          asset: { include: { category: true } },
          user: true,
        },
      });

      // Update asset status to RESERVED if not already checked out
      if (asset.status === AssetStatus.AVAILABLE) {
        await tx.physicalAsset.update({
          where: { id: assetId },
          data: { status: AssetStatus.RESERVED },
        });
      }

      return reservation;
    });
  }

  /**
   * Checkout gear for a reservation (Desk Admin operation)
   */
  async checkoutLoan(reservationId: string, inspectionNotes?: string) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          asset: { include: { category: true } },
          user: true,
        },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.status !== ReservationStatus.PENDING) {
        throw new Error(`Reservation is not PENDING (current status: ${reservation.status})`);
      }

      const depositAmount = reservation.asset.category.depositRequired;

      // Create LoanTransaction
      const loan = await tx.loanTransaction.create({
        data: {
          reservationId: reservation.id,
          assetId: reservation.assetId,
          userId: reservation.userId,
          checkoutTime: new Date(),
          expectedReturnTime: reservation.endTime,
          depositAmount,
          inspectionNotesCheckout: inspectionNotes || 'Checked out at desk',
          payments: {
            create: {
              amount: depositAmount,
              type: PaymentType.DEPOSIT_HELD,
            },
          },
        },
        include: {
          payments: true,
          asset: true,
          user: true,
        },
      });

      // Update Reservation to ACTIVE
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.ACTIVE },
      });

      // Update Physical Asset to CHECKED_OUT
      await tx.physicalAsset.update({
        where: { id: reservation.assetId },
        data: { status: AssetStatus.CHECKED_OUT },
      });

      return loan;
    });
  }

  /**
   * Return gear and compute operating-hours late fee (POST /api/loans/:id/return)
   */
  async returnLoan(
    loanId: string,
    returnNotes?: string,
    customReturnTime?: Date
  ) {
    const actualReturnTime = customReturnTime || new Date();

    return prisma.$transaction(async (tx) => {
      const loan = await tx.loanTransaction.findUnique({
        where: { id: loanId },
        include: {
          asset: { include: { category: true } },
          reservation: true,
          payments: true,
        },
      });

      if (!loan) {
        throw new Error('Loan transaction not found');
      }

      if (loan.actualReturnTime !== null) {
        throw new Error('Loan has already been returned.');
      }

      // Calculate Operating Hours Late Fee
      const lateFeeResult = calculateLateFee(
        loan.expectedReturnTime,
        actualReturnTime,
        loan.asset.category.lateFeePerDay,
        loan.depositAmount
      );

      const lateFeeDeducted = lateFeeResult.finalLateFee;
      const depositRefunded = Math.max(0, loan.depositAmount - lateFeeDeducted);

      // Create Ledger Entries
      const ledgerEntries = [];

      if (lateFeeDeducted > 0) {
        ledgerEntries.push({
          loanId: loan.id,
          amount: lateFeeDeducted,
          type: PaymentType.LATE_FEE_DEDUCTED,
        });
      }

      ledgerEntries.push({
        loanId: loan.id,
        amount: depositRefunded,
        type: PaymentType.DEPOSIT_REFUNDED,
      });

      await tx.ledgerTransaction.createMany({
        data: ledgerEntries,
      });

      // Update Loan
      const updatedLoan = await tx.loanTransaction.update({
        where: { id: loanId },
        data: {
          actualReturnTime,
          lateFeeAccrued: lateFeeDeducted,
          inspectionNotesReturn: returnNotes || 'Item returned and inspected',
        },
        include: {
          payments: true,
          asset: { include: { category: true } },
          user: true,
        },
      });

      // Update Physical Asset to AVAILABLE
      await tx.physicalAsset.update({
        where: { id: loan.assetId },
        data: { status: AssetStatus.AVAILABLE },
      });

      // Update Reservation to COMPLETED if associated
      if (loan.reservationId) {
        await tx.reservation.update({
          where: { id: loan.reservationId },
          data: { status: ReservationStatus.COMPLETED },
        });
      }

      return {
        loan: updatedLoan,
        lateFeeBreakdown: lateFeeResult,
        depositRefunded,
      };
    });
  }

  /**
   * No-Show Auto-Cancellation Cleanup (POST /api/cron/cleanup-noshows)
   * Scans PENDING reservations past 45 minutes of startTime without checkout.
   */
  async cleanupNoShows(referenceTime?: Date) {
    const now = referenceTime || new Date();
    // 45 minutes ago
    const threshold = new Date(now.getTime() - 45 * 60 * 1000);

    return prisma.$transaction(async (tx) => {
      // Find expired pending reservations
      const expiredReservations = await tx.reservation.findMany({
        where: {
          status: ReservationStatus.PENDING,
          startTime: {
            lt: threshold,
          },
        },
        include: {
          asset: true,
        },
      });

      const updatedIds: string[] = [];

      for (const res of expiredReservations) {
        // Mark reservation as NO_SHOW
        await tx.reservation.update({
          where: { id: res.id },
          data: { status: ReservationStatus.NO_SHOW },
        });

        // Check if asset has any other active/pending reservations
        const activeRes = await tx.reservation.findFirst({
          where: {
            assetId: res.assetId,
            status: { in: [ReservationStatus.PENDING, ReservationStatus.ACTIVE] },
            id: { not: res.id },
          },
        });

        if (!activeRes && res.asset.status === AssetStatus.RESERVED) {
          await tx.physicalAsset.update({
            where: { id: res.assetId },
            data: { status: AssetStatus.AVAILABLE },
          });
        }

        updatedIds.push(res.id);
      }

      return {
        cleanedCount: updatedIds.length,
        noShowReservationIds: updatedIds,
        timestamp: now.toISOString(),
      };
    });
  }
}

export const lendingService = new LendingService();
