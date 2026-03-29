# Aula IT Documentation

Welcome to the Aula IT developer documentation. Start here to understand the project, then dive into specific areas based on your needs.

## Quick Navigation

### New to the Project?

Start with these in order:

1. **[../README.md](../README.md)** — Project overview, tech stack, getting started, environment setup
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — System design, folder structure, core patterns, data flow

### Need to Understand Something Specific?

- **Building features?** → [ARCHITECTURE.md](ARCHITECTURE.md) (Folder Structure, Server vs Client Components, State Management)
- **Working with the database?** → [DATABASE.md](DATABASE.md) (Schema, tables, relationships, RLS policies)
- **Calling an API?** → [API.md](API.md) (All endpoints, request/response formats, authentication)
- **Deploying or setting up?** → [../README.md](../README.md) (Environment variables, CI/CD pipeline)

---

## Document Overview

### README.md (Project Root)

**Location:** `/README.md`

**Contents:**
- Project description and purpose
- Quick start guide (installation, environment setup)
- Tech stack overview
- Project structure (high-level)
- Key features for teachers and students
- Development workflow (running dev server, testing, linting)
- Versioning and release process
- Troubleshooting common issues
- Deployment information

**When to read:** First thing when starting with the project

---

### ARCHITECTURE.md

**Location:** `/docs/ARCHITECTURE.md`

**Contents:**
- System overview and key concepts
- Detailed folder structure with file descriptions
- Core architectural patterns (Server Components, Server Actions, Forms)
- Authentication flow (middleware, OAuth, session management)
- Activity builder data model (types, database structure)
- Student activity view and submission workflow
- Google Drive integration (Phase 3) flow
- Real-time activity map (React Flow)
- Server vs Client Components guide
- State management approach (Zustand, Server State, React Hook Form)
- Data flow diagrams
- Performance considerations
- Security measures

**When to read:**
- Understanding the codebase structure
- Building new features
- Debugging data flow issues
- Understanding patterns (Server Components, Server Actions, RLS)

---

### DATABASE.md

**Location:** `/docs/DATABASE.md`

**Contents:**
- Database overview and design decisions
- All tables: `profiles`, `modules`, `units`, `activities`, `activity_phases`, `activity_steps`, `activity_submissions`, `teacher_drive_tokens`
- Column definitions, types, constraints, and purposes
- Table relationships and foreign keys
- RLS (Row-Level Security) policies for each table
- Indexes for performance
- Step content schema (JSONB structure for different step types)
- Migration history and descriptions
- Querying best practices (N+1 prevention, RLS performance)
- Troubleshooting database issues

**When to read:**
- Writing database queries
- Understanding data relationships
- Implementing RLS policies
- Debugging permission issues
- Adding new database tables or columns

---

### API.md

**Location:** `/docs/API.md`

**Contents:**
- All API routes: authentication, Google Drive integration
- Endpoint reference: method, authentication, request/response format
- Google Drive routes in detail:
  - `/api/drive/authorize` — OAuth initiation
  - `/api/drive/callback` — OAuth completion
  - `/api/drive/status` — Check connection
  - `/api/drive/copy` — Copy templates to students
  - `/api/drive/lock` — Lock submissions
- Error handling patterns
- Authentication in API routes vs Server Components
- Rate limiting considerations
- Example workflows (teacher drive setup, student submissions)
- Troubleshooting API issues

**When to read:**
- Integrating with API endpoints
- Understanding Google Drive workflow
- Debugging API errors
- Building client-side integrations

---

## Common Tasks

### I want to...

**Add a new feature (e.g., new step type)**
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) — understand the step editor pattern
2. Check [DATABASE.md](DATABASE.md) — if you need to store data
3. Look at existing step editors: `components/dashboard/activity-builder/editors/`
4. Implement your editor component

**Fix a bug in the activity builder**
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) — "Activity Builder Data Model" section
2. Check [DATABASE.md](DATABASE.md) — understand the schema
3. Look at `app/activities/[id]/edit/` for the builder page
4. Debug using React DevTools, Network tab, and Supabase logs

**Add a new API endpoint**
1. Create file in `app/api/[feature]/route.ts`
2. Check [ARCHITECTURE.md](ARCHITECTURE.md) — "Server vs Client Components" for auth patterns
3. Document it in [API.md](API.md) with endpoint, parameters, response format
4. Example: `app/api/drive/copy/route.ts`

**Debug a student can't see their module**
1. Check [DATABASE.md](DATABASE.md) — RLS policies on `modules` table
2. Verify student is enrolled: check `module_enrollments` table
3. Check student's `role` in `profiles` table
4. Test RLS policy in Supabase Studio

**Understand Google Drive integration**
1. Read [API.md](API.md) — "Google Drive Routes" section
2. Check [ARCHITECTURE.md](ARCHITECTURE.md) — "Google Drive Integration (Phase 3)"
3. Look at `lib/google-drive-api.ts` for implementation details
4. Trace flow: authorize → callback → copy → lock

**Deploy to production**
1. Read [../README.md](../README.md) — "CI/CD Pipeline" and "Deployment" sections
2. Push to `main` branch
3. GitHub Actions runs tests, bumps version, creates release, deploys to Vercel

---

## File Locations Reference

### Key Source Files

**Authentication & Database:**
- `utils/supabase/server.ts` — Server-side Supabase client
- `utils/supabase/client.ts` — Browser Supabase client
- `utils/supabase/middleware.ts` — Auth middleware
- `middleware.ts` — Next.js middleware

**Pages & Routes:**
- `app/(auth)/login/` — Login page
- `app/(auth)/register/` — Register page
- `app/dashboard/` — Dashboard (protected)
- `app/api/drive/` — Google Drive API routes
- `app/activities/[id]/` — Activity viewer
- `app/activities/[id]/edit/` — Activity builder
- `app/units/[id]/map/` — Activity map view

**Components:**
- `components/dashboard/activity-builder/` — Activity builder UI
- `components/map-ide/` — React Flow visualization
- `components/ui/` — shadcn/ui primitives

**Types & Utilities:**
- `types/activity.ts` — Activity/phase/step types
- `types/database.ts` — Database enums
- `lib/google-drive-api.ts` — Google Drive helpers

**Database:**
- `supabase/migrations/` — SQL migrations

---

## Architecture Quick Reference

### Request Flow

```
User Action
  ↓
Client Component (React)
  ↓ (calls Server Action or API Route)
Server Action or API Route
  ↓ (checks auth, validates input)
Supabase (RLS enforces access)
  ↓
Database (PostgreSQL)
  ↓ (returns data)
Response to Client
  ↓
UI Update
```

### Authentication Flow

```
Unauthenticated → Login Page
  ↓ (submit email + password)
Server Action validates
  ↓
Supabase Auth creates session
  ↓
Middleware updates cookies
  ↓
Redirect to Dashboard
```

### Activity Creation & Submission

```
Teacher creates activity with phases & steps
  ↓
Steps stored in activity_steps table (type + JSONB content)
  ↓
Student opens activity (reads phases/steps)
  ↓
Student submits deliverable (inserts activity_submissions)
  ↓ (if teacher copy mode)
Teacher copies template into `Aula-it Entregas` in teacher Drive and shares it with student (POST /api/drive/copy)
  ↓
Teacher locks submissions (POST /api/drive/lock)
```

---

## Best Practices

### When Writing Code

1. **Use TypeScript** — all new code must be strongly typed
2. **Follow folder structure** — keep related files together (pages in `app/`, components in `components/`, utils in `utils/`)
3. **Use Server Components** — default to Server Components, only use "use client" when needed (interactivity, hooks)
4. **Use Server Actions** — all database writes go through Server Actions
5. **Validate input** — Zod schemas for forms, always check auth
6. **Check RLS** — ensure RLS policies allow the operation
7. **Test before committing** — run `npm run test` and `npm run lint`

### When Documenting

1. **Update API.md** — when adding new API routes
2. **Update ARCHITECTURE.md** — when changing data flow or patterns
3. **Update DATABASE.md** — when adding/changing tables
4. **Write inline comments** — for complex logic
5. **Keep examples current** — test code examples before committing

### When Debugging

1. **Check Supabase logs** — go to Supabase Studio → Logs → check API errors
2. **Check browser console** — for client-side errors
3. **Check network tab** — verify API requests/responses
4. **Test RLS policies** — use Supabase Studio → SQL Editor
5. **Check user role** — verify `profiles.role` is correct
6. **Check timestamps** — use `console.log()` to trace execution

---

## Common Issues & Solutions

### "Permission denied" errors

→ [DATABASE.md](DATABASE.md) — "Row-Level Security Policies" section

### Hydration mismatches

→ [ARCHITECTURE.md](ARCHITECTURE.md) — "Server vs Client Components" section

### API errors (401, 403)

→ [API.md](API.md) — "Error Handling" and "Authentication" sections

### Students can't see content

→ [DATABASE.md](DATABASE.md) — RLS policies, module enrollments

### Google Drive integration not working

→ [API.md](API.md) — "Google Drive Routes" and "Troubleshooting" sections

---

## Contributing

All code changes should follow Conventional Commits format:

```bash
git commit -m "feat: add new feature"
git commit -m "fix: correct bug"
git commit -m "docs: update documentation"
```

See [../README.md](../README.md) — "Versioning & Releases" for details.

---

## Resources

### External Links

- **Next.js Documentation:** https://nextjs.org/docs
- **Supabase Documentation:** https://supabase.com/docs
- **React Documentation:** https://react.dev
- **TypeScript Documentation:** https://www.typescriptlang.org/docs/
- **Tailwind CSS Documentation:** https://tailwindcss.com/docs

### Skill Files

The project includes detailed skill guides for various technologies:

- `.agents/skills/nextjs-16/SKILL.md` — Next.js patterns
- `.agents/skills/react-19/SKILL.md` — React best practices
- `.agents/skills/typescript/SKILL.md` — TypeScript patterns
- `.agents/skills/supabase-postgres-best-practices/SKILL.md` — Database patterns

---

## Questions?

- Check the relevant documentation (README.md, ARCHITECTURE.md, DATABASE.md, API.md)
- Search existing GitHub issues: https://github.com/FeelNostalgic/aula-it/issues
- Open a new issue if needed

---

**Last Updated:** March 2026
**Documentation Version:** v0.19.0+
