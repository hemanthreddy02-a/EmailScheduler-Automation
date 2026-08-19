# ReachInbox — Production-Grade Full-Stack Email Scheduler

A production-grade, full-stack email scheduling platform built with Node.js, TypeScript, Express, BullMQ, Redis, PostgreSQL, Prisma, Nodemailer (Ethereal SMTP), and React. Designed to handle delayed execution, restart persistence, distributed rate limiting per sender, worker concurrency, and bulk CSV email scheduling.

---

## 🖼️ Application Screenshots

### 🔑 Login Page (Google OAuth & Dev Login)
![Login Page](assets/login_page.png)

### 📊 Campaign Dashboard & Email Queue Table
![Dashboard Page](assets/dashboard.png)

---

## 🏗️ Architecture Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                        Browser (React 18 + Vite)              │
│  Login → Dashboard → Compose Modal → Scheduled/Sent Tables   │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP (REST + Cookies / Sessions)
┌────────────────────────▼─────────────────────────────────────┐
│                     Express API Server (Port 4000)           │
│  /auth/google  /api/emails  /api/senders  /health            │
│  Zod Validation │ Session Auth │ Error Handling               │
└────────┬─────────────────────────────────────────────────────┘
         │                         │
┌────────▼────────┐    ┌──────────▼──────────────────────────┐
│   PostgreSQL    │    │              Redis 7                │
│   (Prisma ORM)  │    │  BullMQ Delayed Queues + Sorted Sets │
│                 │    │  email-queue                         │
│  Users          │    │  email-rate:{senderId}:{hourWindow}  │
│  Senders        │    └──────────────────────────────────────┘
│  EmailBatch     │                    │
│  EmailJob       │    ┌───────────────▼───────────────────┐
│                 │    │  BullMQ Worker (Background Process)│
└─────────────────┘    │  processEmail()                   │
                       │  1. Load EmailJob from DB         │
                       │  2. Check SENT → skip (Idempotent)│
                       │  3. Rate limit check → reschedule │
                       │  4. SCHEDULED → PROCESSING        │
                       │  5. Send via Ethereal SMTP        │
                       │  6. PROCESSING → SENT             │
                       └───────────────────────────────────┘
```

### 1. How Scheduling Works
- **No Cron / In-Memory Schedulers**: Scheduling does *not* rely on `node-cron`, `setInterval`, or in-memory timers.
- **PostgreSQL Source of Truth**: When emails are composed (e.g. 500 recipients starting at 10:00 AM with 2-second delay), records are inserted into PostgreSQL with an initial status of `SCHEDULED` and exact target `scheduledAt` timestamps.
- **BullMQ Delayed Jobs**: Each job is added to the Redis-backed BullMQ queue (`email-queue`) with a calculated `delay` parameter (`delay = targetTimestamp - currentTime`). BullMQ stores these in a Redis sorted set (ZSET) indexed by target execution time.

### 2. How Persistence on Restart is Handled
- **Durable Redis Storage**: Delayed jobs reside in Redis ZSETs rather than memory. If the Express API or BullMQ Worker crashes or restarts, BullMQ picks up right where it left off when restarted without losing pending jobs or duplicate sends.
- **Atomic DB State Machine**: Database records move through `SCHEDULED` → `PROCESSING` → `SENT` (or `FAILED`).
- **Idempotent Worker Execution**: Before delivering an email, the worker conditionally updates `EmailJob` in PostgreSQL using `WHERE status = 'SCHEDULED'`. If a job was already processed or marked `SENT`, execution terminates safely without duplicate sending.

### 3. How Rate Limiting & Concurrency are Implemented
- **Distributed Rate Limiting**: Enforced per sender per hourly window (e.g. max 100 emails/hour per sender).
- **Atomic Redis Counters**: The worker runs an atomic Lua script incrementing key `email-rate:{senderId}:{hourWindow}`. If the sender exceeds their hourly limit, the job is **not dropped**; instead, the worker automatically **reschedules** the job to the start of the next hourly window with a revised BullMQ delay.
- **Configurable Worker Concurrency**: BullMQ Worker runs with `WORKER_CONCURRENCY` (default: 10 parallel jobs). Database locks (`WHERE status = 'SCHEDULED'`) guarantee thread-safety across concurrent workers.

---

## ⚡ Features Implemented

### 🖥️ Backend (Express API & BullMQ Worker)
- **Persistent Email Scheduler**: Calculates exact scheduled timestamps per recipient based on configured delays and hourly limits, adding them into BullMQ as delayed Redis jobs.
- **Restart Recovery & Idempotency**: State transitions (`SCHEDULED` → `PROCESSING` → `SENT`) with atomic DB queries; job status checked prior to SMTP calls to guarantee zero duplicate emails upon worker restart.
- **Distributed Rate Limiting**: Per-sender hourly limit tracking (`MAX_EMAILS_PER_HOUR_PER_SENDER=100`) via Redis Lua scripts with automatic next-window rescheduling.
- **Configurable Concurrency**: Multi-threaded BullMQ queue worker pool (`WORKER_CONCURRENCY=10`).
- **Ethereal SMTP Integration**: Automatic creation & seeding of Ethereal test email credentials with live preview link logs (`ethereal.email/message/...`).
- **Security & Validation**: Zod request schema validation, Passport.js session auth, and Google OAuth 2.0 integration with Dev Login fallback.

### 🎨 Frontend (React 18 + Vite + Tailwind CSS)
- **Modern Dark/Light UI**: Slate/indigo aesthetic with animated micro-interactions and glassmorphic card elements.
- **Authentication Flow**: Google OAuth sign-in button & passwordless Dev Login button for instant local development access.
- **Real-Time Campaign Dashboard**: Metric cards displaying aggregate counters (Scheduled, Processing, Sent, Failed).
- **Compose Email Modal**:
  - Drag-and-drop CSV & TXT recipient parser (powered by PapaParse) with instant email validation.
  - Sender dropdown selector with sender hourly rate limit display.
  - Subject line & rich body text inputs.
  - Customizable start time picker, delay between emails (seconds), and hourly rate limit parameters.
- **Scheduled Emails Table**: Status badge indicators, scheduled send time, sender email, recipient count, and subject line.
- **Sent Emails Table**: Sent timestamp, recipient count, delivery status, and direct clickable **Ethereal Email Preview Links**.
- **State Management**: TanStack Query v5 (React Query) with auto-invalidation and refetching.

---

## 🛠️ Tech Stack & Prerequisites

- **Node.js**: >= 20.0.0
- **Package Manager**: pnpm >= 9.0.0
- **Database**: PostgreSQL 16 (Prisma ORM)
- **In-Memory Store / Queue**: Redis 7 + BullMQ
- **Backend Framework**: Express.js (TypeScript, Zod, Passport)
- **Frontend Framework**: React 18, Vite, Tailwind CSS, Lucide Icons, TanStack Query v5

---

## 🚀 Step-by-Step Setup Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/hemanthreddy02-a/ReachInbox-Assignment.git
cd ReachInbox-Assignment
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `.env` contains your database and Redis credentials:
```env
NODE_ENV=development
PORT=4000

DATABASE_URL=postgresql://reachinbox:reachinbox@localhost:5432/reachinbox
REDIS_URL=redis://localhost:6379

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

SESSION_SECRET=your_super_secret_session_key_min_32_chars

ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=
ETHEREAL_PASSWORD=

WORKER_CONCURRENCY=10
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=100

FRONTEND_URL=http://localhost:5173
```

---

## ⚙️ Setting Up Ethereal Email

Ethereal is a fake SMTP service designed for development testing. All sent emails are captured by Ethereal and assigned a public web preview URL.

### Automated Setup (Recommended)
When you run `pnpm db:seed`, the system automatically checks if `ETHEREAL_USER` and `ETHEREAL_PASSWORD` are present. If they are blank, it calls `nodemailer.createTestAccount()`, generates fresh credentials, updates your sender record in PostgreSQL, and prints them out in the console:

```bash
pnpm db:seed
```
*Console output:*
```text
Created fresh Ethereal account:
  User: xjs6tmmidfgmsejk@ethereal.email
  Pass: xxxxxx
Updated Ethereal sender: xjs6tmmidfgmsejk@ethereal.email
```

### Manual Setup
1. Go to [https://ethereal.email/create](https://ethereal.email/create).
2. Click **Create Ethereal Account**.
3. Copy the generated Username and Password into your `.env` file under `ETHEREAL_USER` and `ETHEREAL_PASSWORD`.

---

## 💻 Running the Backend (Express, Redis, DB, BullMQ Worker)

### Step 1: Start PostgreSQL & Redis Services
Launch database and Redis containers in the background using Docker Compose:
```bash
docker compose up -d
```

### Step 2: Run Database Migrations & Seed
Generate Prisma client, apply database schema migrations, and seed the default user & Ethereal SMTP sender:
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### Step 3: Start Express API Server & BullMQ Worker
You can run the API server and Worker process together or in separate terminals.

**Option A — Concurrent Execution (Recommended):**
```bash
pnpm dev
```
*(Starts Express API on port 4000, BullMQ Worker process, and Vite Frontend on port 5173)*

**Option B — Separate Terminals:**
```bash
# Terminal 1: Express API Server
pnpm dev:api

# Terminal 2: BullMQ Background Worker Process
pnpm dev:worker
```

- API Health Check URL: `http://localhost:4000/health`

---

## 🖥️ Running the Frontend

Start the Vite React development server:
```bash
pnpm dev:web
```

Open your browser and navigate to:
**`http://localhost:5173`**

Click **Dev Login (No OAuth)** to sign in instantly with the seeded account (`dev@reachinbox.local`).

---

## 🧪 Load Testing (1,000 Emails)

Verify queue handling and rate limiting under high volume:
```bash
pnpm test:load
```

Run automated tests:
```bash
pnpm test
```

---

## ⚡ API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | DB, Redis & Queue health check |
| `GET` | `/auth/google` | Initiate Google OAuth 2.0 flow |
| `GET` | `/auth/google/callback` | OAuth 2.0 redirect callback |
| `GET` | `/auth/dev-login` | Passwordless development login |
| `POST` | `/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Fetch authenticated user details |
| `POST` | `/api/emails/schedule` | Schedule a new email campaign |
| `GET` | `/api/emails/scheduled` | Fetch pending/scheduled email jobs |
| `GET` | `/api/emails/sent` | Fetch sent email delivery logs |
| `GET` | `/api/emails/stats` | Aggregate dashboard job count metrics |
| `GET` | `/api/senders` | List configured email senders |

---

## 📜 License

MIT License © 2026 ReachInbox.
