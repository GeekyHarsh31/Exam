# University AV Room Equipment Lending & Inventory System

A production-grade, full-stack Equipment Lending & Inventory System designed for a university AV room. Built with **Node.js, Express, TypeScript, Prisma ORM, PostgreSQL / SQLite**, and a **React + Tailwind CSS** frontend dashboard.

---

## 🌟 Core Domain Specifications & Rules

### 1. Inventory & Serialization
- **Serialization**: Each physical unit has a unique **Barcode** (`BC-...`) and **Serial Number** (`SN-...`).
- **Asset Statuses**: `AVAILABLE`, `RESERVED`, `CHECKED_OUT`, `IN_MAINTENANCE`, `LOST`.

### 2. Concurrency & 1-Hour Buffer Windows
- **Serializable Transactions**: Database-level serializable transactions prevent double bookings during concurrent reservation requests.
- **1-Hour Maintenance Buffer**: Automatically inserts a 1-hour maintenance buffer window before and after every booking (`[startTime - 1 hr, endTime + 1 hr]`).
- **No-Show Auto-Cancellation**: `POST /api/cron/cleanup-noshows` automatically scans `PENDING` reservations past 45 minutes of `startTime` without checkout, updates status to `NO_SHOW`, and frees inventory.

### 3. Limits & Account Enforcement
- **Category Borrow Limit**: Enforces `maxBorrowLimit` across active loans + future reservations per category. Requesting a 3rd item in a category with a limit of 2 triggers a policy error response.
- **Account Status**: Users with `status == BLOCKED` or users with overdue items are rejected from making new reservations.

### 4. Financial Engine & Operating Hours Late Fees
- **Deposit Held**: Holds a refundable deposit at reservation checkout (`DEPOSIT_HELD`).
- **Operational Hours Awareness**: Late fees accumulate **ONLY** during AV Room operational hours (**Monday–Friday, 8:00 AM – 6:00 PM**, 10 operational hours/day). Late fees do **NOT** accumulate overnight, on weekends, or during holidays.
- **Late Fee Cap**: Late fee is strictly capped at the total deposit amount. Late fees are deducted from the deposit upon return (`LATE_FEE_DEDUCTED`) and the balance refunded via ledger transactions (`DEPOSIT_REFUNDED`).

---

## 🚀 Quick Start Guide

### 1. Run Automated Test Suite
```bash
cd backend
npm test
```
Verifies:
- ✅ **Concurrency**: Concurrent requests for the same physical asset reject overlapping slots.
- ✅ **Operating Hours Late Fee**: Gear due Friday 5 PM (17:00) and returned Monday 9 AM (09:00) incurs **exactly 1 hour** of late fee.
- ✅ **Category Limit**: Requesting a 3rd item in a category with a limit of 2 triggers a policy error.
- ✅ **Account Status & Maintenance Enforcement**: Blocks blocked users and maintenance items.
- ✅ **No-Show Auto-Cancellation**: Cleans up expired pending reservations >45 minutes.

### 2. Run Local Development Server
```bash
# Terminal 1: Backend API (port 5000)
cd backend
npm run dev

# Terminal 2: Frontend Dashboard (port 3000)
cd frontend
npm run dev
```

### 3. Run Production Containerized Deployment (Docker)
```bash
docker-compose up --build
```
- Access Frontend Dashboard: `http://localhost:80`
- Access Backend API: `http://localhost:5000`

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Jest, Supertest
- **Database**: PostgreSQL (Production/Docker), SQLite (Local zero-config dev & testing)
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Axios

---

## 📡 REST API Specification

- `GET /api/assets` - Returns all physical assets, category parameters, and current status.
- `GET /api/categories` - Returns asset categories and borrowing limits.
- `POST /api/reservations` - `{ userId, assetId, startTime, endTime }` (Enforces 1-hr buffers, category limits, user status).
- `POST /api/reservations/:id/checkout` - Desk check-out transforming `PENDING` reservation into active loan.
- `POST /api/loans/:id/return` - `{ returnNotes, returnTime? }` (Computes operating-hours late fee, records ledger entries, marks asset `AVAILABLE`).
- `POST /api/cron/cleanup-noshows` - Scans `PENDING` reservations past 45m of `startTime` and sets to `NO_SHOW`.
- `GET /api/ledger` - Views financial ledger transaction history (`DEPOSIT_HELD`, `LATE_FEE_DEDUCTED`, `DEPOSIT_REFUNDED`).
