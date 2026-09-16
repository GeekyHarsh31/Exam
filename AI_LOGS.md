The college AV room
The college AV room lends out gear — DSLR cameras, projectors, mics, tripods — and popular items have several units. Today it’s a paper register nobody keeps up to date, so kit goes missing and two clubs show up for the same projector. Students keep asking ‘is a DSLR free this weekend?’ and no one can say. Borrowers hang on to things far too long, so a sensible return date and a small per-day late fee would help, and a refundable deposit keeps people honest — returned minus any late fee. And one person shouldn’t be able to book out half the room at once.
Build something to track the gear and nudge people to return it.
(Notice the questions people ask and the gaps in the paper register — solving those is the job, for any lending desk and not just this one. Get borrowing, availability and returns solid first, then deposits and limits.)

this is the problem statement i have pls explain me the problem statement and list all the chalanges that is been ignored commonly in this problem and can cause problems as a real world end to end solution 

The core problem is transforming an informal, paper-based equipment checkout system into an automated, reliable lending platform that guarantees inventory visibility, enforces accountability, and prevents resource hoarding.

---

### Understanding the Problem Statement

The system serves three primary functions:

1. **Visibility & Tracking:** Answering real-time availability questions (e.g., *"Is a DSLR free this weekend?"*) across items with multiple identical units.
2. **Accountability & Lifecycle:** Managing checkout flow, expected return dates, refundable deposits, and calculating late fee deductions automatically upon return.
3. **Fair Usage Controls:** Enforcing borrow limits per user so one person cannot reserve or check out an excessive amount of gear simultaneously.

---

### Commonly Ignored Real-World Edge Cases & Challenges

Building a system that works on paper is straightforward; building one that survives human behavior and physical hardware constraints requires addressing several often-overlooked edge cases.

#### 1. Inventory & Asset Management Gaps

* **Serialized vs. Non-Serialized Tracking:** A camera body isn't just "a DSLR"—it has a specific serial number, shutter count, and lens mount condition. Tracking generic item counts rather than unique asset IDs makes it impossible to trace which specific unit was damaged or lost.
* **Component Kits & Accessories:** Gear rarely moves alone. A DSLR checked out without its battery, SD card, or lens cap causes disputes at return. The system must support checkout checklists or bundle child assets into a single parent package.
* **Maintenance & Repair States:** Items break or need servicing. If an item is marked as "available" in the database while undergoing repair, double-booking occurs.

#### 2. Time, Scheduling & Reservation Flaws

* **Turnaround & Buffer Times:** If User A returns a projector at 2:00 PM and User B reserves it for 2:00 PM, any minor delay or battery recharge time breaks the chain. The system needs built-in buffer windows between reservations.
* **Operating Hours vs. System Time:** Automatic late fees calculated purely on a 24-hour clock penalize students when the AV room is physically closed (e.g., overnight, weekends, or holidays).
* **The "No-Show" Dilemma:** A student reserves a camera for a weekend but never picks it up. If the system holds the reservation without auto-canceling after a grace period, other students are unfairly locked out.

#### 3. Financial & Deposit Realities

* **Deposit Floor Violations:** If late fees accumulate beyond the total deposit amount, the user has no financial incentive to return the gear. The system needs escalation triggers (e.g., blocking course registration or flag for administrative action).
* **Payment Gateway & Refund Processing:** Holding and partially refunding money involves processing fees, refund limits, and payout delay windows that vary by payment gateway. Manual cash tracking requires physical ledger reconciliation.

#### 4. Human & Operational Exceptions

* **Third-Party Returns:** Student A borrows the gear, but Student B drops it off at the desk. System identity verification must account for proxy handoffs or strictly enforce user verification.
* **Partial Returns:** Returning a tripod without the quick-release plate. Marking the entire item as "returned" releases a broken kit to the next user, while marking it "unreturned" keeps late fees running unfairly on the rest of the kit.

---

### Core Phased Roadmap

To keep the solution grounded, build features in logical dependency layers:

1. **Phase 1 (Core Lifecycle):** Item inventory, unique asset tagging (QR/Barcodes), checkout/check-in engine, real-time availability calendar.
2. **Phase 2 (Policy Enforcement):** Per-user category/item borrow limits, automated late fee calculation, buffer times, reservation auto-cancellation.
3. **Phase 3 (Financials & Notifications):** Refundable deposit ledger, automated return reminders (email/SMS), partial return handling.



i want the prompt that covers every thing to give it to antigravity for further operations

Here is the comprehensive master prompt tailored for **AntiGravity** (or any AI agent / developer tool) to execute, build, and deploy this complete AV Equipment Lending platform.

It integrates all the system requirements, business rules, database schema, edge-case logic, backend architecture, and React frontend into a single self-contained execution document.

---

### AntiGravity Execution Prompt: End-to-End AV Equipment Lending System

```text
Act as a Lead Systems Architect and Full-Stack Software Engineer. Your goal is to build, configure, and prepare for deployment a full-stack, production-grade Equipment Lending & Inventory System for a university AV room. 

Follow all specifications, schema definitions, and business logic detailed below.

---

### 1. CORE REQUIREMENTS & DOMAIN RULES

1. Inventory & Serialization:
   - Equipment items are categorized (e.g., DSLRs, Projectors, Mics).
   - Each individual physical unit has a unique Barcode and Serial Number.
   - Equipment state tracks: AVAILABLE, RESERVED, CHECKED_OUT, IN_MAINTENANCE, LOST.

2. Concurrency & Buffer Windows:
   - Enforce database-level serializable transactions / row-locking to prevent double bookings.
   - Buffer Window: Automatically insert a 1-hour maintenance buffer before and after every booking (`startTime - 1 hr` to `endTime + 1 hr`).
   - No-Show Auto-Cancellation: Automatically mark reservations as NO_SHOW and free up inventory if not picked up within 45 minutes of `startTime`.

3. Limits & Account Enforcement:
   - Users cannot exceed the Category `maxBorrowLimit` across active loans + future reservations.
   - Blocked users (`status == BLOCKED`) or users with overdue items / unpaid fees cannot create new reservations.

4. Financial Engine & Operating Hours Late Fees:
   - Charge a refundable deposit held at reservation.
   - Operating Hours Awareness: Late fees accumulate ONLY during AV Room operational hours (Monday–Friday, 8:00 AM – 6:00 PM). Do NOT accumulate late fees overnight, on weekends, or during holidays.
   - Late Fee Cap: Maximum late fee is capped at the total deposit amount. Deduct late fees from the deposit upon return and refund the balance via ledger transactions.

---

### 2. DATABASE SCHEMA (Prisma ORM)

File: `prisma/schema.prisma`

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  STUDENT
  FACULTY
  ADMIN
}

enum AccountStatus {
  ACTIVE
  BLOCKED
}

enum AssetStatus {
  AVAILABLE
  RESERVED
  CHECKED_OUT
  IN_MAINTENANCE
  LOST
}

enum ReservationStatus {
  PENDING
  ACTIVE
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum PaymentType {
  DEPOSIT_HELD
  LATE_FEE_DEDUCTED
  DEPOSIT_REFUNDED
}

model User {
  id           String            @id @default(uuid())
  name         String
  email        String            @unique
  role         Role              @default(STUDENT)
  status       AccountStatus     @default(ACTIVE)
  reservations Reservation[]
  loans        LoanTransaction[]
  createdAt    DateTime          @default(now())
}

model AssetCategory {
  id              String          @id @default(uuid())
  name            String          @unique
  description     String?
  maxBorrowLimit  Int             @default(2)
  depositRequired Float           @default(50.0)
  lateFeePerDay   Float           @default(10.0)
  assets          PhysicalAsset[]
}

model PhysicalAsset {
  id             String            @id @default(uuid())
  barcode        String            @unique
  categoryId     String
  category       AssetCategory     @relation(fields: [categoryId], references: [id])
  serialNumber   String            @unique
  model          String
  status         AssetStatus       @default(AVAILABLE)
  conditionNotes String?
  reservations   Reservation[]
  loans          LoanTransaction[]
}

model Reservation {
  id        String            @id @default(uuid())
  userId    String
  user      User              @relation(fields: [userId], references: [id])
  assetId   String
  asset     PhysicalAsset     @relation(fields: [assetId], references: [id])
  startTime DateTime
  endTime   DateTime
  status    ReservationStatus @default(PENDING)
  loan      LoanTransaction?
  createdAt DateTime          @default(now())
}

model LoanTransaction {
  id                      String              @id @default(uuid())
  reservationId           String?             @unique
  reservation             Reservation?        @relation(fields: [reservationId], references: [id])
  assetId                 String
  asset                   PhysicalAsset       @relation(fields: [assetId], references: [id])
  userId                  String
  user                    User                @relation(fields: [userId], references: [id])
  checkoutTime            DateTime            @default(now())
  expectedReturnTime      DateTime
  actualReturnTime        DateTime?
  depositAmount           Float
  lateFeeAccrued          Float               @default(0.0)
  inspectionNotesCheckout String?
  inspectionNotesReturn   String?
  payments                LedgerTransaction[]
}

model LedgerTransaction {
  id        String          @id @default(uuid())
  loanId    String
  loan      LoanTransaction @relation(fields: [loanId], references: [id])
  amount    Float
  type      PaymentType
  createdAt DateTime        @default(now())
}

---

### 3. BACKEND API SPECIFICATION (Node.js / Express / TypeScript)

Implement the following endpoints with strict error handling and transactional logic:

1. `GET /api/assets`
   - Returns all physical assets along with their category parameters and current status.

2. `POST /api/reservations`
   - Payload: `{ userId, assetId, startTime, endTime }`
   - Checks:
     a. User account status is `ACTIVE`.
     b. Active user borrowings in this category < `category.maxBorrowLimit`.
     c. Target asset status is NOT `IN_MAINTENANCE`.
     d. Overlap check including 1-hour buffer windows.
   - Transaction: Creates reservation record set to `PENDING`.

3. `POST /api/loans/:id/return`
   - Payload: `{ returnNotes }`
   - Calculates operational-hours late fees (8 AM - 6 PM, Mon-Fri only).
   - Deducts late fee from deposit, creates `DEPOSIT_REFUNDED` and `LATE_FEE_DEDUCTED` ledger entries.
   - Updates `PhysicalAsset` status back to `AVAILABLE` and marks `Reservation` as `COMPLETED`.

4. `POST /api/cron/cleanup-noshows`
   - Scans `PENDING` reservations past 45 minutes of `startTime` without checkout, updates status to `NO_SHOW`, and frees inventory.

---

### 4. FRONTEND APPLICATION SPECIFICATION (React + Tailwind CSS)

Build a clean dashboard containing:
1. Equipment Browser: Displays available assets with categories, barcodes, and deposit costs.
2. Booking Panel: Allows date/time picker selection with real-time feedback on user limits, 1-hour buffer notices, and operational hours rules.
3. Desk Admin View: Quick action interface to trigger check-ins, returns, inspection notes, and fee breakdowns.

---

### 5. VERIFICATION & TEST CRITERIA

Ensure the generated project includes tests verifying:
1. Concurrency: Concurrent requests for the same physical asset reject overlapping slots.
2. Operating Hours Late Fee: Gear due Friday 5 PM and returned Monday 9 AM incurs exactly 1 hour of late fee.
3. Category Limit: Requesting a 3rd item in a category with a limit of 2 triggers a policy error response.

```


listen i have to give the project to github codespace so have to install all the dependencies which are been used in the project antigravity is making the project ready but i want you to give me the dependencies list which i can run on the codespac eterminal to make my project run flawless on github

To ensure your project runs without missing package errors on GitHub Codespaces, you need to install both the **system-level dependencies** (Node.js engine, Prisma CLI) and the **application packages** for both the backend and frontend.

Run these exact commands in your GitHub Codespaces terminal.

---

### Step 1: System & Global Dependencies

Ensure Node.js and global package managers are ready:

```bash
# Update package lists and install basic system utilities
sudo apt-get update && sudo apt-get install -y curl git build-essential

# Ensure correct Node.js version (v18 or v20 recommended)
node -v

# Install Prisma globally for CLI migrations and inspection
npm install -g prisma typescript ts-node

```

---

### Step 2: Backend Dependencies

Navigate to your backend directory (or run from root if it's a monorepo) and install the core server, database, and TypeScript packages:

```bash
# Core Production Dependencies
npm install express @prisma/client cors dotenv dotenv-expand zod

# TypeScript & Development Dependencies
npm install -D typescript @types/node @types/express @types/cors ts-node-dev prisma jest supertest @types/jest @types/supertest

```

---

### Step 3: Frontend Dependencies (React + Tailwind CSS)

Navigate to your frontend application directory (e.g., `cd client` or `cd frontend`) and install the UI dependencies:

```bash
# Core React Production Dependencies
npm install react react-dom lucide-react clsx tailwind-merge

# Tailwind CSS & Build Dependencies
npm install -D tailwindcss postcss autoprefixer vite @vitejs/plugin-react @types/react @types/react-dom

```

---

### Step 4: Quick Initialization Script

After installing the packages, initialize Tailwind CSS and Prisma in your project workspace:

```bash
# Initialize Tailwind Config (Run inside frontend folder)
npx tailwindcss init -p

# Generate Prisma Client & Push Database Schema (Run inside backend folder)
npx prisma generate
npx prisma db push

```

---

### Complete `package.json` Quick-Start Template

If AntiGravity is creating a single root or monorepo structure, you can save this unified `package.json` file in your root folder and simply run `npm install`:

```json
{
  "name": "av-lending-system",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:backend": "ts-node-dev --respawn --transpile-only src/server.ts",
    "dev:frontend": "vite",
    "build": "tsc && vite build",
    "prisma:db:push": "prisma db push",
    "prisma:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "clsx": "^2.1.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "lucide-react": "^0.350.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tailwind-merge": "^2.2.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.24",
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@types/supertest": "^6.0.2",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "jest": "^29.7.0",
    "postcss": "^8.4.35",
    "prisma": "^5.10.0",
    "supertest": "^6.3.4",
    "tailwindcss": "^3.4.1",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3",
    "vite": "^5.1.5"
  }
}

```
