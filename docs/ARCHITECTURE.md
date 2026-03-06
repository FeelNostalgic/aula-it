# Architecture Guide

Comprehensive overview of Aula IT's system design, data flow, and architectural patterns.

## Table of Contents

1. [System Overview](#system-overview)
2. [Folder Structure](#folder-structure)
3. [Core Patterns](#core-patterns)
4. [Authentication Flow](#authentication-flow)
5. [Activity Builder Data Model](#activity-builder-data-model)
6. [Student Activity View & Submissions](#student-activity-view--submissions)
7. [Google Drive Integration (Phase 3)](#google-drive-integration-phase-3)
8. [Real-time Activity Map](#real-time-activity-map)
9. [Server vs Client Components](#server-vs-client-components)
10. [State Management](#state-management)

## System Overview

Aula IT is a **teacher-led LMS** where:

1. **Teachers** create activities with multiple step types (theory, deliverables, quizzes, etc.)
2. **Activities** are organized into **Phases** (folders) → **Steps** (individual lessons)
3. **Units** group activities; **Modules** group units
4. **Students** view activities, submit work via Google Drive, and see activity flows
5. **RLS Policies** enforce row-level security (students see their own modules, teachers see their modules)

### Key Concepts

- **Module**: Teacher's class (e.g., "DAW 1º")
- **Unit**: Topic within a module (e.g., "HTML Basics")
- **Activity**: Lesson within a unit with phases/steps (e.g., "HTML Forms")
- **Phase**: Container for related steps (e.g., "Theory", "Practice")
- **Step**: Atomic lesson piece (theory text, quiz, deliverable, etc.)
- **Submission**: Student's work submission for a deliverable step

## Folder Structure

```
aula-it/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # Route group for auth pages (layout scope)
│   │   ├── login/
│   │   │   ├── page.tsx           # Login page
│   │   │   └── actions.ts         # Login form submission (Server Action)
│   │   └── register/
│   │       ├── page.tsx           # Register page
│   │       └── actions.ts         # Register form submission
│   │
│   ├── auth/                      # Auth API routes (no route group)
│   │   ├── callback/              # OAuth callback
│   │   │   └── route.ts
│   │   └── sign-out/
│   │       └── route.ts
│   │
│   ├── api/                       # API routes
│   │   └── drive/                 # Google Drive integration
│   │       ├── authorize/         # Start OAuth flow (GET)
│   │       ├── callback/          # OAuth callback (GET)
│   │       ├── status/            # Check auth status (GET)
│   │       ├── copy/              # Copy template to student Drive (POST)
│   │       └── lock/              # Lock/unlock student doc (POST)
│   │
│   ├── dashboard/                 # Protected dashboard (auth required)
│   │   ├── layout.tsx             # Dashboard shell + nav + breadcrumbs
│   │   ├── page.tsx               # Dashboard home (teacher/student views)
│   │   │
│   │   ├── modules/
│   │   │   ├── [id]/              # Module detail
│   │   │   │   ├── page.tsx       # Module page (tabs)
│   │   │   │   └── actions.ts     # Module mutations
│   │   │   └── actions.ts
│   │   │
│   │   ├── units/
│   │   │   ├── [id]/              # Unit detail
│   │   │   │   ├── page.tsx       # Unit page (tabs: settings, activities, etc)
│   │   │   │   └── actions.ts     # Unit mutations
│   │   │   └── actions.ts
│   │   │
│   │   └── actions.ts             # Dashboard mutations (create module, etc)
│   │
│   ├── activities/                # Activity student view & builder
│   │   └── [id]/
│   │       ├── page.tsx           # Activity page (Server Component)
│   │       ├── client.tsx         # Activity client wrapper (Client Component)
│   │       ├── actions.ts         # Activity mutations (submit, update)
│   │       │
│   │       └── edit/              # Activity builder
│   │           ├── page.tsx       # Builder page (Server Component)
│   │           ├── client.tsx     # Builder client wrapper
│   │           └── actions.ts     # Builder mutations
│   │
│   ├── units/                     # Unit map view
│   │   └── [id]/
│   │       └── map/
│   │           ├── page.tsx       # Map page (Server Component)
│   │           └── client.tsx     # Map client (React Flow)
│   │
│   ├── settings/                  # User settings
│   │   ├── page.tsx
│   │   └── actions.ts
│   │
│   ├── layout.tsx                 # Root layout (fonts, theme, toaster)
│   └── globals.css                # Tailwind base styles
│
├── components/                    # React components (all presentational)
│   ├── ui/                        # shadcn/ui primitives (button, input, etc)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── tabs.tsx
│   │   ├── form.tsx               # Hook Form integration
│   │   └── [others]
│   │
│   ├── dashboard/                 # Dashboard page components
│   │   ├── dashboard-shell.tsx    # Main layout with sidebar
│   │   ├── teacher-dashboard.tsx  # Teacher view
│   │   ├── student-dashboard.tsx  # Student view
│   │   ├── module-detail-view.tsx # Module tabs
│   │   ├── unit-detail-view.tsx   # Unit tabs
│   │   │
│   │   ├── activity-builder/      # Activity builder components
│   │   │   ├── mission-builder-sidebar.tsx    # Sidebar (phases/steps)
│   │   │   ├── activity-settings-panel.tsx    # Activity metadata
│   │   │   ├── step-editor-panel.tsx          # Active step editor
│   │   │   ├── student-preview.tsx            # Student preview
│   │   │   ├── editor-tabs-bar.tsx            # Tab navigation
│   │   │   │
│   │   │   ├── editors/           # Step type editors
│   │   │   │   ├── theory-editor.tsx
│   │   │   │   ├── deliverable-editor.tsx
│   │   │   │   ├── animation-editor.tsx
│   │   │   │   ├── quiz-editor.tsx
│   │   │   │   ├── presentation-editor.tsx
│   │   │   │   └── resource-editor.tsx
│   │   │   │
│   │   │   └── viewers/           # Step type viewers
│   │   │       ├── step-viewer.tsx
│   │   │       └── deliverable-viewer.tsx
│   │   │
│   │   ├── unit-activities-tab.tsx
│   │   ├── unit-evaluation-tab.tsx
│   │   ├── unit-resources-tab.tsx
│   │   ├── unit-map-config-tab.tsx
│   │   ├── unit-map-view.tsx
│   │   │
│   │   ├── [dialogs]/
│   │   │   ├── create-module-dialog.tsx
│   │   │   ├── create-unit-dialog.tsx
│   │   │   ├── create-activity-dialog.tsx
│   │   │   ├── enroll-student-dialog.tsx
│   │   │   └── google-email-prompt.tsx
│   │   │
│   │   ├── breadcrumb-context.tsx
│   │   ├── dashboard-breadcrumb.tsx
│   │   ├── user-nav.tsx
│   │   └── [other components]
│   │
│   ├── map-ide/                   # React Flow activity map
│   │   ├── map-workspace.tsx      # Main map container
│   │   ├── map-background.tsx     # Background + grid
│   │   ├── mission-node.tsx       # Activity node
│   │   ├── teacher-sidebar.tsx    # Teacher controls
│   │   ├── student-sidebar.tsx    # Student info
│   │   └── actions.ts
│   │
│   ├── auth/                      # Auth components
│   │   └── session-timeout-guard.tsx
│   │
│   ├── theme-provider.tsx         # Next-themes setup
│   ├── theme-toggle.tsx           # Dark/light toggle
│   └── [component-specific-styles]
│
├── utils/                         # Utility functions
│   └── supabase/                  # Supabase client setup
│       ├── client.ts              # Browser client (Client Component)
│       ├── server.ts              # Server client (Server Component/Action)
│       ├── admin.ts               # Admin client (service role)
│       └── middleware.ts          # Auth middleware
│
├── lib/                           # Library & helper functions
│   ├── google-drive-api.ts        # Google Drive OAuth & API helpers
│   ├── version.ts                 # Version constants
│   └── [other utilities]
│
├── types/                         # TypeScript type definitions
│   ├── activity.ts                # Activity, Phase, Step, Submission types
│   ├── database.ts                # Database enums (UserRole, Status, etc)
│   ├── activity-connection.ts     # React Flow connection types
│   └── google.d.ts                # Google API type stubs
│
├── supabase/
│   └── migrations/                # Database migrations (SQL)
│       ├── 20260301_activity_builder.sql
│       ├── 20260301181536_add_step_controls.sql
│       ├── 20260301181141_add_presentation_type.sql
│       ├── 20260306_activity_submissions.sql
│       ├── 20260306_fix_submissions_rls.sql
│       └── 20260307_phase3_drive.sql
│
├── middleware.ts                  # Request middleware (auth, redirects)
├── next.config.ts                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Dependencies & scripts
├── .env.local                     # Environment variables (git-ignored)
├── .env.example                   # Environment variables template
└── README.md                      # Project overview
```

## Core Patterns

### 1. Server Component + Client Component Split

The app uses Next.js 16's Server Components extensively for data fetching, then hydrates with Client Components for interactivity.

**Pattern:**
```
app/activities/[id]/page.tsx (Server)
  ↓ (fetches data)
  └── client.tsx (Client)
       └── renders UI, handles events
```

**Example:**
- `app/activities/[id]/page.tsx`: Fetches activity, phases, steps, submissions
- `app/activities/[id]/client.tsx`: Renders StudentActivityClient with data
- `components/dashboard/activity-builder/student-preview.tsx`: Client Component for preview

### 2. Server Actions for Mutations

All database writes use Server Actions (defined in `actions.ts` files):

```typescript
// app/activities/[id]/actions.ts
"use server";

export async function submitDeliverable(stepId: string, googleDocUrl: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Validation & DB insert
    const { data, error } = await supabase
        .from("activity_submissions")
        .insert({ student_id: user.id, step_id: stepId, drive_file_url: googleDocUrl });

    return { data, error };
}
```

### 3. Form Handling with React Hook Form + Zod

All forms use React Hook Form + Zod for validation + shadcn/ui for UI:

```typescript
// In a component
const form = useForm({
    resolver: zodResolver(deliverableSchema),
    defaultValues: { googleDocUrl: "" },
});

const onSubmit = async (values) => {
    const result = await submitDeliverable(stepId, values.googleDocUrl);
    if (result.error) toast.error(result.error.message);
};

return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
```

### 4. RLS Policies for Row-Level Security

Supabase RLS policies enforce access control at the database layer:

- Students can only view their enrolled modules
- Teachers can only view/edit their modules
- Students can only submit to their enrolled activities

Example RLS policy:
```sql
CREATE POLICY "Students see enrolled modules"
    ON modules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM module_enrollments
            WHERE module_id = modules.id
            AND student_id = auth.uid()
        )
    );
```

### 5. Breadcrumb Context for Navigation

`components/dashboard/breadcrumb-context.tsx` provides current page context:

```typescript
const { moduleName, unitName, activityName } = useBreadcrumb();
// Used by DashboardBreadcrumb to display: Module / Unit / Activity
```

## Authentication Flow

```
User visits app
  ↓
Middleware (middleware.ts)
  - Checks Supabase auth session
  - Redirects unauthenticated users to /login
  - Redirects authenticated users away from /login → /dashboard
  ↓
Login/Register (app/(auth)/)
  - User submits email + password
  - Server Action (app/(auth)/login/actions.ts)
    - Validates with Supabase Auth
    - Creates/updates profile in profiles table
  ↓
Supabase Auth Callback (app/auth/callback/route.ts)
  - Handles OAuth redirect from Supabase
  - Sets auth cookies
  ↓
Dashboard (app/dashboard/)
  - Server fetches user role from profiles table
  - Renders teacher or student dashboard
```

### Auth Setup Details

**Middleware Flow:**
1. `middleware.ts` → calls `updateSession()` in `utils/supabase/middleware.ts`
2. Creates Supabase client with SSR support
3. Calls `supabase.auth.getUser()` to check session
4. Updates cookies if session refreshed
5. Redirects based on auth status

**Auth Context:**
- No custom context provider needed
- Each page/component creates a Supabase client on demand
- Server: `await createClient()` from `utils/supabase/server.ts`
- Browser: `createClient()` from `utils/supabase/client.ts`

## Activity Builder Data Model

### Database Schema (Simplified)

```
activities
  ├── id (UUID)
  ├── unit_id (UUID) → units
  ├── title (TEXT)
  ├── type (TEXT) → 'mission' | 'challenge' | 'quiz' | 'project'
  ├── difficulty (TEXT) → 'Bajo' | 'Medio' | 'Alto'
  ├── status (TEXT) → 'draft' | 'published' | 'blocked'
  └── timestamps

activity_phases (folders)
  ├── id (UUID)
  ├── activity_id (UUID) → activities
  ├── title (TEXT)
  ├── order_index (INT)
  └── timestamps

activity_steps (lessons)
  ├── id (UUID)
  ├── phase_id (UUID) → activity_phases
  ├── title (TEXT)
  ├── type (TEXT) → 'theory'|'deliverable'|'animation'|'quiz'|'presentation'|'resource'
  ├── content (JSONB) → varies by type
  ├── is_visible (BOOL)
  ├── is_locked (BOOL)
  ├── order_index (INT)
  └── timestamps

activity_submissions
  ├── id (UUID)
  ├── student_id (UUID) → profiles
  ├── step_id (UUID) → activity_steps
  ├── drive_file_url (TEXT)
  ├── drive_file_id (TEXT)
  ├── status (TEXT) → 'pending' | 'submitted' | 'graded'
  └── timestamps
```

### Step Content Types (JSONB)

Each step has a `content` column that varies by `type`:

```typescript
// TheoryContent
{ markdown: "# Lesson title\n\nContent..." }

// DeliverableContent
{
  templateUrl: "https://docs.google.com/document/d/.../edit",
  instructionsMarkdown: "Instructions...",
  deliveryMode: "teacher_copy" | "manual"
}

// AnimationContent
{ componentUrl: "https://codepen.io/..." }

// QuizContent
{
  questions: [
    { id, text, options: [{ id, text, isCorrect }] }
  ],
  passingScore: 70
}

// PresentationContent
{ slidesUrl: "https://docs.google.com/presentation/d/.../edit" }

// ResourceContent
{
  items: [
    { id, title, description, url, type: 'file'|'link'|'folder' }
  ]
}
```

### TypeScript Types

See `types/activity.ts`:
- `ActivityPhase`: Phase metadata
- `ActivityStep`: Step metadata + content
- `ActivityStepContent`: Union of all content types
- `ActivitySubmission`: Student submission

### Activity Builder UI Flow

```
Activity Edit Page (app/activities/[id]/edit/page.tsx)
  ↓ (Server fetches activity + phases + steps)
  └── ActivityBuilder Client (app/activities/[id]/edit/client.tsx)
       ├── ActivitySettingsPanel
       │   └── Activity title, type, difficulty
       ├── MissionBuilderSidebar
       │   ├── Phase list (drag to reorder)
       │   └── Step list per phase
       ├── StepEditorPanel
       │   └── TheoryEditor | DeliverableEditor | QuizEditor | etc
       └── StudentPreview
           └── Shows how student sees the activity
```

## Student Activity View & Submissions

### Student View Flow

```
Student Views Activity (app/activities/[id]/page.tsx)
  ↓
Server fetches:
  - Activity + phases + steps
  - Student's submissions for each deliverable step
  ↓
StudentActivityClient (app/activities/[id]/client.tsx)
  ├── StepViewer
  │   ├── Renders step content based on type
  │   └── For deliverables: shows DeliverableViewer
  │       ├── Shows teacher's template
  │       ├── Shows instructions
  │       └── If not submitted: shows submission form
  │
  └── Phase/Step Navigation
      └── Tabs or accordion to switch steps
```

### Submission Flow (Manual Mode)

```
1. Student sees deliverable step
2. Clicks "Submit Work"
3. Enters Google Drive link (URL)
4. Server Action validates URL
5. INSERT into activity_submissions
   - status: 'pending'
   - drive_file_url: <user input>
   - drive_file_id: null (for manual)
6. Student sees "Submitted" badge
7. Teacher can grade from unit evaluation tab
```

### Submission Flow (Teacher Copy Mode)

```
1. Teacher copies template to each student's Drive
   - POST /api/drive/copy
   - Creates copy of template in student's Drive
   - Stores drive_file_id in activity_submissions
2. Student sees deliverable step
3. Clicks "Open in Drive"
4. Works in the teacher's copy (same doc)
5. Submission marked 'submitted' automatically
6. Teacher can lock/unlock doc: POST /api/drive/lock
```

## Google Drive Integration (Phase 3)

### Overview

Teachers can distribute Google Drive templates to students. Two modes:

1. **Manual Mode** (default): Student submits URL to their copy
2. **Teacher Copy Mode**: Teacher creates copy in student's Drive

### Setup

1. Teacher goes to activity settings
2. For deliverable steps, chooses mode: "Manual" or "Teacher Copy"
3. If "Teacher Copy", provides Google Doc template URL
4. Clicks "Sync to Google Drive"

### OAuth Flow

```
Teacher clicks "Connect Google Drive"
  ↓
GET /api/drive/authorize
  - Checks user is teacher
  - Calls getAuthorizeUrl() to generate Google OAuth URL
  - Redirects to Google login
  ↓
Teacher grants permission
  ↓
Google redirects to GET /api/drive/callback?code=...
  - Exchanges code for access_token + refresh_token
  - Stores in teacher_drive_tokens table
  - Redirects to dashboard
  ↓
Teacher can now copy templates to student Drives
```

### Copy Template Flow

```
POST /api/drive/copy
  Body: { activityId, studentEmail }
  ↓
1. Get teacher's Drive tokens
2. Refresh if needed
3. Get template doc file ID
4. Copy doc via Google Drive API: files.copy()
5. Set permissions to shared with student
6. Store drive_file_id in activity_submissions
7. Return copy URL
```

### Lock/Unlock Flow

```
POST /api/drive/lock
  Body: { stepId, studentId, locked: true }
  ↓
1. Get teacher's Drive tokens
2. Find activity_submission.drive_file_id
3. Update doc permissions:
   - locked: true → remove writer permission
   - locked: false → grant writer permission
4. Update status
```

### Database Tables

```
teacher_drive_tokens
  ├── id (UUID)
  ├── teacher_id (UUID) → profiles
  ├── access_token (TEXT)
  ├── refresh_token (TEXT)
  ├── expires_at (TIMESTAMP)
  └── timestamps

activity_submissions.drive_file_id (TEXT)
  └── Stores the Google Drive file ID of the copy
```

## Real-time Activity Map

### React Flow Integration

The unit map view uses React Flow for visualizing activity flow:

```
Unit Map Page (app/units/[id]/map/page.tsx)
  ↓ (Server fetches unit + activities)
  └── MapWorkspace Client (components/map-ide/map-workspace.tsx)
       ├── Uses ReactFlow
       ├── MapBackground
       │   └── Renders grid, background
       ├── MissionNode
       │   └── Activity node (draggable, clickable)
       ├── Connection Lines
       │   └── Shows prerequisites/flow
       └── Sidebar (teacher or student)
           └── Controls or info
```

### Data Model

React Flow nodes and edges are derived from activity order:

```typescript
const nodes = activities.map(activity => ({
    id: activity.id,
    data: { label: activity.title, difficulty: activity.difficulty },
    position: { x: activity.position_x, y: activity.position_y },
}));

const edges = activityConnections.map(conn => ({
    id: `${conn.from_id}-${conn.to_id}`,
    source: conn.from_id,
    target: conn.to_id,
}));
```

Position data is stored in database (not in this version, but can be added).

## Server vs Client Components

### Server Components (default)

Used for:
- Data fetching (queries, joins)
- Auth checks
- Metadata setting
- Markdown rendering (can be large)

Examples:
- `app/dashboard/page.tsx` → fetches user, modules, units
- `app/activities/[id]/page.tsx` → fetches activity + phases + steps
- `app/activities/[id]/edit/page.tsx` → fetches activity for editing

**Benefits:**
- Secure (no API keys exposed)
- Direct DB access
- Smaller JS bundle
- Can use async/await

### Client Components

Used for:
- Interactive UI (forms, modals, dropdowns)
- Client state (useEffect, useState)
- Event handlers
- Real-time updates

Examples:
- `StudentActivityClient` → renders steps, handles submission
- `ActivityBuilder` → step editor, drag/drop
- `MapWorkspace` → React Flow visualization

**Pattern:**
```typescript
// Server Component
export default async function ActivityPage({ params }) {
    const activity = await fetchActivity();
    return <StudentActivityClient activity={activity} />;
}

// Client Component
"use client";
export function StudentActivityClient({ activity }) {
    const [expanded, setExpanded] = useState(false);
    return <div onClick={() => setExpanded(!expanded)}>...</div>;
}
```

### Hydration & Performance

- Server renders static content
- Hydration boundaries at "use client" boundaries
- Lazy-load heavy Client Components with `dynamic()`

## State Management

### Client State: Zustand

For client-side state that persists or is shared:

```typescript
// Example (conceptual)
import { create } from 'zustand';

export const useActivityBuilder = create((set) => ({
    phases: [],
    selectedPhaseId: null,
    setPhases: (phases) => set({ phases }),
    selectPhase: (id) => set({ selectedPhaseId: id }),
}));

// In component
const { phases, selectedPhaseId, selectPhase } = useActivityBuilder();
```

**Use for:**
- Activity builder state (selected phase/step)
- Filter/sort preferences
- Sidebar open/close

### Server State: React Server Components

Queries are "state" in Server Components:

```typescript
const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("teacher_id", userId);
// data IS the state (read-only)
```

### Form State: React Hook Form

All forms use RHF for local form state + validation:

```typescript
const form = useForm({ resolver: zodResolver(schema) });
const { values, errors } = form.formState;
```

### No Redux/Global Context

The app avoids Redux/Context for simplicity:
- Server Components reduce need for global state
- Forms use local state
- Page-level state is fine with useState
- Zustand for cross-component state

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ User Authentication (Supabase Auth)                         │
│ - Middleware checks session                                 │
│ - Redirects to /login if not auth'd                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Layout (app/dashboard/layout.tsx)                 │
│ - Server: fetches user role from profiles                   │
│ - Renders teacher or student dashboard                      │
│ - Provides breadcrumb context                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
┌──────────────────────┐        ┌──────────────────────┐
│ TEACHER DASHBOARD    │        │ STUDENT DASHBOARD    │
│ - Modules (own)      │        │ - Enrolled Modules   │
│ - Units (own)        │        │ - Units (read-only)  │
│ - Activities (own)    │        │ - Activities         │
│ - Create, Edit, Mgmt │        │ - Submit Work        │
└──────────────────────┘        └──────────────────────┘
        ↓                                   ↓
┌──────────────────────┐        ┌──────────────────────┐
│ ACTIVITY BUILDER     │        │ ACTIVITY VIEW        │
│ - Edit phases/steps  │        │ - View phases/steps  │
│ - Upload templates   │        │ - Submit deliverables│
│ - Set delivery mode  │        │ - See submissions    │
│ - Distribute to Drives         │ - View map           │
└──────────────────────┘        └──────────────────────┘
        ↓                                   ↓
┌──────────────────────────────────────────────────────────┐
│ Supabase (PostgreSQL)                                    │
│ - RLS policies enforce access control                   │
│ - Triggers auto-update timestamps                       │
│ - Indexes on foreign keys for performance               │
└──────────────────────────────────────────────────────────┘
```

## Performance Considerations

1. **Database Queries**: Always select specific columns, avoid N+1
2. **RLS Policies**: Indexed on foreign keys for fast filtering
3. **Server Components**: Reduce client JS, fetch data server-side
4. **Caching**: Supabase caches auth session in cookies
5. **Code Splitting**: Heavy components lazy-loaded with dynamic()
6. **Images**: Optimized with next/image (auto-resizing, lazy loading)

## Security

1. **RLS Policies**: All tables have RLS enabled (students can't see other students' data)
2. **Auth Middleware**: Redirects unauthenticated users
3. **Server Actions**: Validation happens server-side
4. **Env Vars**: API keys in .env.local, not in code
5. **Google Drive**: OAuth tokens stored securely in DB, never in browser

## Troubleshooting

**Hydration mismatch errors:**
- Usually from components rendering different content on server vs client
- Solution: Wrap dynamic content in `useEffect` or `lazy`-load with `dynamic()`

**RLS policy denying access:**
- Check auth.uid() matches table user_id
- Ensure RLS policy has `auth.role() = 'authenticated'`
- Use Supabase Studio to test policies

**Form not submitting:**
- Check Server Action is defined in `"use server"` file
- Verify Zod schema matches form values
- Check for async race conditions

**Google Drive copy failing:**
- Verify teacher is connected: check teacher_drive_tokens
- Ensure student email is correct
- Check Google Drive API quota
