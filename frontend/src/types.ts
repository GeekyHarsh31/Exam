export enum Role {
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  ADMIN = 'ADMIN',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum AssetStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  CHECKED_OUT = 'CHECKED_OUT',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  LOST = 'LOST',
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum PaymentType {
  DEPOSIT_HELD = 'DEPOSIT_HELD',
  LATE_FEE_DEDUCTED = 'LATE_FEE_DEDUCTED',
  DEPOSIT_REFUNDED = 'DEPOSIT_REFUNDED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  reservations?: Reservation[];
  loans?: LoanTransaction[];
}

export interface AssetCategory {
  id: string;
  name: string;
  description?: string;
  maxBorrowLimit: number;
  depositRequired: number;
  lateFeePerDay: number;
  assets?: PhysicalAsset[];
}

export interface PhysicalAsset {
  id: string;
  barcode: string;
  categoryId: string;
  category: AssetCategory;
  serialNumber: string;
  model: string;
  status: AssetStatus;
  conditionNotes?: string;
  reservations?: Reservation[];
  loans?: LoanTransaction[];
}

export interface Reservation {
  id: string;
  userId: string;
  user: User;
  assetId: string;
  asset: PhysicalAsset;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  loan?: LoanTransaction;
  createdAt: string;
}

export interface LedgerTransaction {
  id: string;
  loanId: string;
  loan?: LoanTransaction;
  amount: number;
  type: PaymentType;
  createdAt: string;
}

export interface LoanTransaction {
  id: string;
  reservationId?: string;
  reservation?: Reservation;
  assetId: string;
  asset: PhysicalAsset;
  userId: string;
  user: User;
  checkoutTime: string;
  expectedReturnTime: string;
  actualReturnTime?: string;
  depositAmount: number;
  lateFeeAccrued: number;
  inspectionNotesCheckout?: string;
  inspectionNotesReturn?: string;
  payments: LedgerTransaction[];
}
