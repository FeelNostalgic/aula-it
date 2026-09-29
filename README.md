# Aula IT

**A learning dashboard and LMS for Spanish IT vocational programs** — SMR, ASIR, DAW and DAM.
Built with Next.js 16 (App Router), React 19, Supabase and Tailwind CSS 4, with an
industrial dark-mode aesthetic inspired by Vercel, GitHub and Linear.

> [!IMPORTANT]
> **This repository is published as-is, without an active deployment or a running backend.**
> The unit test suite runs with zero configuration. The end-to-end suite and the database
> schema are **not** reproducible from this repository alone — see
> [Project status](#project-status) before you invest time in it.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-087ea4.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)](https://www.typescriptlang.org)

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Database setup](#database-setup)
- [Project structure](#project-structure)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Continuous integration](#continuous-integration)
- [Deployment](#deployment)
- [Project status](#project-status)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## What it does

A dual-role platform: teachers author course material and grade it, students complete
activities and submit deliverables.

### For teachers

- **Activity builder** — compose activities from ordered phases and typed steps: theory
  (Markdown with KaTeX), quizzes, deliverables, presentations, resources and embedded
  animations. Steps can be nested, reordered, weighted, and scoped to a visible audience.
- **Modules, units and milestones** — organise the curriculum, with per-unit objectives,
  challenges, deadlines and closure.
- **Groups** — split a module into working groups, assign roles and representatives, and
  keep a per-group work log.
- **Grading** — weighted gradebook, rubrics, quiz attempts, peer evaluation between
  students, CSV export of grades and quiz responses, and PDF export.
- **Google Drive integration** — connect a teacher account and copy deliverable templates
  into each student's own Drive, with lock, share and status tracking.
- **Question banks** — reusable MCQ pools with per-student selection, lockdown and
  structured answer capture. Import from Google Forms.
- **Gamification** — XP awards, badges, class milestones, streaks and a leaderboard.
- **Administration** — a separate `/admin` panel to manage teacher and student accounts.

### For students

- Dashboard of enrolled modules with progress, XP, rank and earned badges.
- Activity viewer with progress tracking, step completion and attempt limits.
- Deliverable submission through Google Drive or direct file upload.
- Quizzes with attempt history, scoring, and feedback.
- Peer evaluation of classmates' submissions.
- Interactive unit map visualisation.

---

## Tech stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.1.6 (App Router, React 19.2, Server Actions) |
| **Language** | TypeScript 5.9 |
| **Database & auth** | Supabase (PostgreSQL, Auth, RLS) via `@supabase/ssr` |
| **Styling** | Tailwind CSS 4, shadcn/ui, Radix UI, `class-variance-authority` |
| **Forms** | React Hook Form 7 + Zod 4 |
| **Client state** | Zustand 5 |
| **Tables** | TanStack Table 8 |
| **Flow / map UI** | `@xyflow/react` 12 |
| **Charts** | Recharts 2 |
| **Animation** | Framer Motion 12, GSAP 3 |
| **Content** | `react-markdown` + `remark-gfm` + `remark-math` + `rehype-katex`, `highlight.js` |
| **Drag & drop** | `@dnd-kit` |
| **Toasts** | `sonner` |
| **Theming** | `next-themes` |
| **PDF / export** | `jspdf`, `md-to-pdf`, `html2canvas`, headless Chromium (`puppeteer-core` + `@sparticuz/chromium-min`) |
| **Google APIs** | `googleapis` (Drive, Forms) |
| **Unit tests** | Vitest 4 with V8 coverage |
| **E2E tests** | Playwright 1.58 |
| **Database CLI** | Supabase CLI |

---

## Quick start

### Prerequisites

- **Node.js 20.9 or newer** (Next.js 16 requirement). The CI workflow uses Node 24.
- **npm** 10+ (the repository ships a `package-lock.json`; use `npm ci` to reproduce it).
- A **Supabase project** — the free tier is enough to start.

### Install

```bash
git clone https://github.com/FeelNostalgic/aula-it.git
cd aula-it
npm ci

cp .env.example .env.local    # then edit it — see below
```

### Configure the environment

`.env.local` is git-ignored. Fill in the values described in [`.env.example`](.env.example):

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public anon key (RLS applies) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Bypasses RLS — never expose it |
| `NEXT_PUBLIC_SITE_URL` | yes | Origin used to build auth callback redirects |
| `GOOGLE_CLIENT_ID` | for Drive | OAuth 2.0 client id |
| `GOOGLE_CLIENT_SECRET` | for Drive | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | for Drive | Must be `${NEXT_PUBLIC_SITE_URL}/api/drive/callback` |
| `NEXT_PUBLIC_GOOGLE_API_KEY` | optional | Enables the in-app Google Drive Picker |
| `NEXT_PUBLIC_GOOGLE_APP_ID` | optional | Enables the in-app Google Drive Picker |
| `NEXT_PUBLIC_ANIMATIONS_URL` | optional | Standalone animations service. Defaults to `http://localhost:3001` |
| `CHROMIUM_EXECUTABLE_URL` | optional | Chromium download URL for server-side PDF export |

The API key and the anon key are different things, and mixing them up is the most common
setup error. The anon key is the safe one meant for the browser. The service role key
grants full access with Row Level Security switched off.

### Run

```bash
npm run dev
```

Open <http://localhost:3000>.

Two dev servers are available: `npm run dev` uses webpack, `npm run dev:turbo` uses
Turbopack.

### Get the tests running first

If you just want to confirm the checkout is sane before touching Supabase:

```bash
npm run test:unit
```

That suite is fully mocked, needs no database, no `.env.local` and no network, and runs in
about 20 seconds. Everything else in this document depends on a working backend.

---

## Database setup

> [!WARNING]
> **The migrations in `supabase/migrations/` are not a complete schema.**
> They start from a database that already existed. Six core tables are modified by the
> migrations but never created by any of them:
>
> `profiles`, `modules`, `units`, `activities`, `module_enrollments`, `activity_connections`
>
> A fresh project will not work by running the migrations alone — the very first migration
> begins with `ALTER TABLE public.activities`, which fails against an empty database. See
> [Project status](#project-status) for the options.

To apply the migrations that *are* present to a linked project:

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

There is no `supabase/config.toml` in this repository, so `supabase migration up` and
`supabase start` (local stack) will not work as-is.

### Roles and the first admin

`profiles.role` is one of `student`, `teacher` or `admin`. There is no self-service path to
`admin`. Register through `/login/teacher`, then run this in the Supabase SQL editor:

```sql
UPDATE public.profiles SET role = 'admin' WHERE id = '<user-uuid>';
```

The `/admin` panel stays hidden until that user exists with the `admin` role.

---

## Project structure

```
aula-it/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login and registration
│   ├── actions/                  # Server actions
│   ├── activities/[id]/          # Student activity view + builder
│   ├── admin/                    # Account administration
│   ├── alumnos/                  # Student management
│   ├── api/                      # Route handlers
│   │   ├── drive/                # Google Drive endpoints (9 routes)
│   │   └── drive-image/          # Drive image proxy
│   ├── auth/                     # Auth callbacks and sign-out
│   ├── dashboard/                # Protected application
│   │   ├── modules/[id]/         # Modules: dashboard, alumnos, grupos, ranking…
│   │   ├── units/[id]/           # Units: evaluacion, hitos, insignias, notas, retos…
│   │   └── teacher/gamification/ # Badge and XP management
│   ├── settings/                 # User settings
│   ├── units/[id]/map/           # Unit map visualisation
│   └── cambiar-contrasena/       # Forced password change
│
├── components/
│   ├── dashboard/
│   │   ├── activities/activity-builder/
│   │   │   ├── editors/          # Step editors
│   │   │   └── viewers/          # Step viewers
│   │   ├── badges/  layout/  modules/  shared/  units/
│   ├── map-ide/                  # React Flow unit map
│   ├── students/  auth/  icons/
│   └── ui/                       # shadcn/ui primitives
│
├── lib/                          # Domain logic
│   ├── authorization.ts          # Permission checks
│   ├── module-access.ts          # Module membership and access
│   ├── gamification/             # XP and badge rule engine
│   ├── google-drive-*.ts         # Drive integration
│   ├── google-forms-api.ts       # Google Forms import
│   ├── activity-*.ts             # Activity tree, progression, step audience
│   └── store/ui-store.ts         # Zustand UI store
│
├── hooks/                        # use-presence, use-gamification, use-google-drive-picker
├── utils/supabase/               # Browser, server, admin and middleware clients
├── types/                        # Shared TypeScript definitions
│
├── supabase/migrations/          # 66 SQL migrations
├── __tests__/                    # Vitest unit tests (41 files)
├── tests/                        # Playwright E2E tests (19 specs)
├── docs/                         # Architecture, database and API reference
│
├── proxy.ts                      # Auth/session middleware (Next 16 `proxy` convention)
├── next.config.ts
├── vitest.config.ts              # Unit test config and coverage thresholds
├── playwright.config.ts          # E2E config
└── .agent/ .agents/ .claude/     # Vendored AI agent skills (see THIRD_PARTY_NOTICES.md)
```

---

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server (webpack) on port 3000 |
| `npm run dev:turbo` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run test:unit` | Run the unit suite once |
| `npm run test:unit:watch` | Unit suite in watch mode |
| `npm run test:unit:coverage` | Unit suite with V8 coverage report |
| `npm run test:e2e` | Run the Playwright suite (needs a real backend) |
| `npm run agents:sync` | Copy `AGENTS.md` to `CLAUDE.md` and `GEMINI.md` (Windows / PowerShell) |
| `npm run agents:setup` | Create agent symlinks (Windows / PowerShell) |

There is no `lint` script. Next.js 16 removed `next lint`, and this repository has no
ESLint configuration — see [Project status](#project-status).

---

## Testing

### Unit tests — Vitest

**41 files, 599 tests. No database, no network, no `.env.local` required.**

```bash
npm run test:unit
npm run test:unit:watch
npm run test:unit:coverage
```

`__tests__/setup.ts` mocks `next/headers`, `next/cache`, `next/navigation`, the Supabase
server and admin clients, and the Google Drive layer, then injects dummy environment
variables. Coverage thresholds are enforced in `vitest.config.ts`: 85% statements, 75%
branches, 90% functions, 88% lines.

### E2E tests — Playwright

**19 specs against `tests/`. These require a working backend** and cannot run in this
repository as published.

`playwright.config.ts` loads `.env.local` and starts a dev server automatically. The
suites exercise real auth, real Supabase queries and real Google Drive OAuth against a
live database, so they need a populated Supabase project with the full schema applied, plus
Google Cloud credentials.

```bash
npx playwright install chromium   # one-time
npm run test:e2e
npx playwright test --ui
```

---

## Continuous integration

`.github/workflows/ci.yml` runs the **unit suite only**, on every push to `main` and on
every pull request targeting `main`. It needs no secrets and no services.

```yaml
push ──► npm ci ──► npx vitest run
```

The workflow previously ran Playwright end-to-end tests, bumped the version from
[Conventional Commits](https://www.conventionalcommits.org/), created a GitHub release and
deployed to Vercel. Those stages have been removed. Releases are now manual.

### Troubleshooting

**`Type error: Cannot find module '.../app/animations/[slug]/page.js'`** — a stale
`.next/` directory, usually after moving or renaming the checkout. Next.js keeps generated
type stubs that point at absolute paths from whenever they were first created, so they
reference files and folders that no longer exist.

```bash
rm -rf .next        # macOS / Linux
Remove-Item -Recurse -Force .next   # Windows PowerShell
npm run build
```

**`relation not found` from Supabase** — the schema is not applied. See
[Database setup](#database-setup); the migrations in this repository are not a complete
schema.

**Port 3000 already in use**

```bash
npm run dev -- -p 3001
```

---

## Deployment

There is no deployment pipeline in this repository. The application is a standard Next.js
16 app and can be hosted anywhere that runs Next.js — Vercel, a container platform, or a
Node server.

```bash
npm run build
npm run start          # self-hosted
```

If you deploy it yourself, set every variable from [`.env.example`](.env.example) in your
host's environment, and be aware that `SUPABASE_SERVICE_ROLE_KEY` and
`GOOGLE_CLIENT_SECRET` are server-side secrets that must never reach the client bundle.

---

## Project status

Read this before adopting the project. It is published for reference and contribution, and
these are its known limitations.

**Works today.** The unit test suite (599 tests) is green and is kept honest by CI. The
application builds.

**The database schema cannot be reproduced from this repository.** The 66 migrations in
`supabase/migrations/` are incremental changes layered on top of a base schema that was
created outside version control. Six core tables — `profiles`, `modules`, `units`,
`activities`, `module_enrollments` and `activity_connections` — are modified by the
migrations but never created by any of them. Running the migrations against an empty
project fails on the first one.

A seventh table, `unit_map_configs`, is described in `docs/DATABASE.md` but appears in no
migration and in no application code, which suggests stale documentation rather than a
missing migration.

[`docs/DATABASE.md`](docs/DATABASE.md) documents the columns, constraints and RLS policies
of those tables in prose, which is enough to reconstruct a base migration, but it is
documentation rather than executable SQL and it is partly out of date (it predates the
`admin` role, `module_enrollments.updated_at`, `modules.order_index` and later additions).
Treat any reconstruction as a starting point to be verified, not as authoritative.

**The E2E suite is dormant.** It was written against a live Supabase project that no longer
exists. It is not run in CI and is expected to fail as published.

**No linter is configured.** `eslint` and `eslint-config-next` are declared as dependencies
but there is no ESLint configuration file, and Next.js 16 removed the `next lint` command
the old script relied on. The `lint` script was removed rather than left pointing at a
command that no longer exists. Adding a flat ESLint config is a reasonable first
contribution.

**Some documentation is out of date.** The architecture and API references predate the
gamification, groups and peer-evaluation subsystems.

**Windows-oriented tooling.** `scripts/*.ps1` and the `agents:*` scripts require
PowerShell.

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, patterns, data flow
- [`docs/DATABASE.md`](docs/DATABASE.md) — tables, columns, relationships, RLS policies
- [`docs/API.md`](docs/API.md) — endpoints, request and response shapes
- [`docs/gamification-xp-guide.md`](docs/gamification-xp-guide.md) — XP and badge rules
- [`PRD.md`](PRD.md) — original product requirements and design system

---

## Contributing

Contributions are welcome, and the unit suite is the fastest way to get feedback:

```bash
npm ci
npm run test:unit
```

The project follows [Conventional Commits](https://www.conventionalcommits.org/), so
please prefix commit messages (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
CI only runs the unit suite, so a green unit run is what a reviewer will check first.

If you can supply the missing base schema migration, or a working `.eslintrc` flat config,
those would be among the most valuable contributions — see
[Project status](#project-status).

---

## License

Copyright (c) 2026 **Francisco Aragonés**. Released under the [MIT License](LICENSE).

The vendored AI agent skills under `.agent/`, `.agents/` and `.claude/` are **not** covered
by the MIT License and remain under their own terms — including Apache-2.0 and MIT, plus two
skills whose licensing is unresolved. See
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the full inventory before
redistributing.
