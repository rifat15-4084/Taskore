# Taskora

Taskora is a complete, production-quality team task management web app built with Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, MongoDB/Mongoose, and JWT auth.

## Tech Stack
- **Framework:** Next.js 14+ (App Router), TypeScript, `src/` directory
- **UI:** Tailwind CSS v4, shadcn/ui, lucide-react, framer-motion, sonner, recharts, date-fns, @dnd-kit, react-hook-form, zod
- **Data:** MongoDB with Mongoose (cached connection for serverless)
- **Auth:** Email/password with bcryptjs, JWT via jose in httpOnly cookie
- **API:** Route Handlers in `src/app/api/**/route.ts` (nodejs runtime)
- **Cron:** Vercel Cron calling `/api/cron/notify` with `CRON_SECRET` bearer header (Hobby plan: once per day)
- **Email:** nodemailer (optional, controlled by `EMAIL_ENABLED`)

## Features

### Roles & Areas
- **Two roles:** `admin` and `member`, one login page, separate dashboards (`/admin/*` vs `/app/*`). Authorization is re-checked server-side in every API route.
- **Member area:** Kanban board (5 columns: To Do, In Progress, In Review, Hold, Completed) with drag-and-drop persisted via `/api/tasks/[id]/move` (optimistic updates + rollback on failure), task drawer, task detail with comments, dashboard, projects, tasks table.
- **Admin area:** dashboard with charts (recharts), team management (promote/demote, activate/deactivate, reset password), all projects, all tasks with member filter, whole-team board.

### Notifications & Activity
- **In-app notifications:** created on task assignment, status changes, comments, project membership, and role changes. Bell in the topbar shows the unread count.
- **Activity feed:** logged for task/project/user/comment actions and shown on the admin dashboard.
- **API:** `GET /api/notifications`, `PATCH /api/notifications/[id]`, `POST /api/notifications/read-all`.

### Reports
- **Daily report** (`/app/reports/daily`): one report per user per day (unique index on `user + date`), with hours worked, blockers, and task links. API: `/api/reports/daily`.
- **Team reports** (`/admin/reports`): per-member and per-project aggregates over a date range, plus **CSV export** (`?format=csv`). API: `/api/reports/team`.

### Cron
- **`/api/cron/notify`**: protected by `CRON_SECRET` (bearer header). Finds incomplete tasks due within 24h or overdue, creates deduped in-app notifications, and emails assignees when `notifyByEmail` is on. Scheduled via `vercel.json`.

### Profile
- **`/app/profile` & `/admin/profile`:** change display name (`PATCH /api/auth/profile`) and change password (`POST /api/auth/change-password`).

## Folder Structure
```
src/app/{(auth)/login, app/*, admin/*, api/*}
src/components, src/lib, src/models, src/services, src/validators, src/hooks, src/types
scripts/ (seed.ts, db-check.ts)
```

## Local Development

### 1) Install dependencies
```bash
npm install
```

### 2) Environment variables
Copy `.env.example` to `.env.local` and fill in values:
```bash
cp .env.example .env.local
```

Required:
- `MONGODB_URI` - MongoDB connection string (see below)
- `JWT_SECRET` - Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `APP_URL` - e.g. `http://localhost:3000`
- `CRON_SECRET` - Generate same as JWT_SECRET

Optional (email):
- `EMAIL_ENABLED` (`true`/`false`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`

Seed:
- `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`

### 3) MongoDB setup
**Option 1: MongoDB Atlas (Recommended)**
1. Create account at https://www.mongodb.com/atlas
2. Create a free M0 cluster
3. Database Access: create user + password (URL-encode special chars)
4. Network Access: allow `0.0.0.0/0` (for Vercel)
5. Connect -> Drivers -> copy connection string, add database name `taskora` (e.g. `...mongodb.net/taskora?retryWrites=true&w=majority`)
6. Put in `.env.local` as `MONGODB_URI`

**Option 2: Local MongoDB**
Use `mongodb://localhost:27017/taskora`

Verify:
```bash
npm run db:check
```

### 4) Create first admin
Set seed vars in `.env.local`, then:
```bash
npm run seed
```

### 5) Run dev server
```bash
npm run dev
```
Open http://localhost:3000

## Scripts
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run seed` - Create first admin from env
- `npm run db:check` - Test MongoDB connection

## Deployment (Vercel)
1. Push to GitHub
2. Import project in Vercel
3. Add all env vars from `.env.local` in Vercel Project Settings → Environment Variables
4. Update MongoDB Atlas Network Access if needed
5. Set `APP_URL` to your live URL
6. `vercel.json` includes cron for `/api/cron/notify` (Hobby: once per day)
7. Redeploy

## Security Notes
- Passwords hashed with bcryptjs
- JWT in httpOnly cookie (secure in production, sameSite=lax)
- All API routes re-authorize server-side
- Zod validation on all inputs
- `passwordHash` never returned
- No secrets committed (`.env*.local` ignored)
- Email failures never fail requests; logged to console

## Design Decisions (recorded)
- **Next.js App Router + src/** for colocated UI/API
- **Mongoose with global cache** to avoid connection exhaustion in serverless/hot reload
- **jose for JWT** (Edge-compatible) while Mongoose stays in Node runtime routes
- **middleware.ts edge-safe (jose only)** with real authorization enforced inside API routes
- **Vercel Cron** over node-cron (serverless-friendly)
- **Email optional via EMAIL_ENABLED** with console logging on failure
- **Kanban 5 columns**: To Do, In Progress, In Review, Hold, Completed with drag-and-drop via @dnd-kit
- **Dark premium SaaS theme** with Tailwind v4 and shadcn/ui
- **TanStack Query** for client data fetching with base fetch to `/api`
- **cacheComponents disabled** in `next.config.ts`: Next.js 16's experimental `cacheComponents` forces static prerendering of dynamic client pages (blocking on `params`/`fetch`). Standard App Router dynamic rendering is used instead, which matches the "Next.js 14+ App Router" requirement.
- **Login rate limiting**: in-memory sliding-window limiter (10 attempts / 15 min per IP)
