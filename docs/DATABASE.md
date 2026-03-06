# Database Schema Documentation

Complete reference for the Aula IT database schema, relationships, RLS policies, and migrations.

## Table of Contents

1. [Overview](#overview)
2. [Core Tables](#core-tables)
3. [Activity Builder Tables](#activity-builder-tables)
4. [Submission & Grading Tables](#submission--grading-tables)
5. [Google Drive Integration Tables](#google-drive-integration-tables)
6. [Row-Level Security Policies](#row-level-security-policies)
7. [Indexes](#indexes)
8. [Migrations](#migrations)

## Overview

The database is PostgreSQL hosted on Supabase. Key features:

- **RLS Policies**: Row-level security enforces access control
- **UUIDs**: All primary keys are UUID for distributed systems
- **Timestamps**: All tables have `created_at` and `updated_at` (auto-updated via triggers)
- **JSONB**: Step content stored as JSONB for flexibility
- **Cascading Deletes**: Orphaned records are auto-deleted when parent deleted

### Database Diagram

```
profiles
  ├─ modules (teacher_id)
  │  ├─ units (module_id)
  │  │  ├─ activities (unit_id)
  │  │  │  ├─ activity_phases (activity_id)
  │  │  │  │  └─ activity_steps (phase_id)
  │  │  │  │     └─ activity_submissions (step_id)
  │  │  │  └─ activity_connections (activity_id)
  │  │  └─ unit_map_configs (unit_id)
  │  └─ module_enrollments (module_id)
  │
  └─ teacher_drive_tokens (teacher_id)
```

## Core Tables

### `profiles`

Extends Supabase auth.users with app-specific metadata.

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | — | PK, references auth.users(id) |
| `role` | TEXT | No | 'student' | 'teacher' \| 'student' |
| `full_name` | TEXT | Yes | NULL | User's display name |
| `google_email` | TEXT | Yes | NULL | Google account email (Phase 3) |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-updated |

**RLS Policies:**
- Anyone can read profiles (needed for user metadata)
- Users can update only their own profile

**Indexes:**
- PK on `id`
- `role` for filtering teachers/students

---

### `modules`

Teacher's class/course containers.

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `teacher_id` | UUID | No | — | FK → profiles(id) ON DELETE CASCADE |
| `name` | TEXT | No | — | E.g., "DAW 1º", "ASIR 2º" |
| `description` | TEXT | Yes | NULL | Module description |
| `status` | TEXT | No | 'draft' | 'draft' \| 'published' \| 'archived' |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-updated |

**RLS Policies:**
- Teachers see their own modules
- Students see modules they're enrolled in
- Students can't modify modules

**Indexes:**
- PK on `id`
- `idx_modules_teacher_id` for teacher queries

---

### `module_enrollments`

Maps students to modules (enrollment).

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `module_id` | UUID | No | — | FK → modules(id) ON DELETE CASCADE |
| `student_id` | UUID | No | — | FK → profiles(id) ON DELETE CASCADE |
| `enrolled_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |

**Constraints:**
- `UNIQUE(module_id, student_id)` — prevent duplicate enrollments

**RLS Policies:**
- Teachers see enrollments for their modules
- Students see their own enrollments
- Only teachers can create/delete enrollments

**Indexes:**
- PK on `id`
- `idx_module_enrollments_module_id`
- `idx_module_enrollments_student_id`

---

### `units`

Topics within modules.

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `module_id` | UUID | No | — | FK → modules(id) ON DELETE CASCADE |
| `name` | TEXT | No | — | E.g., "HTML Basics", "CSS Flexbox" |
| `description` | TEXT | Yes | NULL | Unit description |
| `order_index` | INTEGER | No | 0 | Sort order within module |
| `view_type` | TEXT | No | 'list' | 'list' \| 'map' — display mode |
| `status` | TEXT | No | 'draft' | 'draft' \| 'published' \| 'archived' |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-updated |

**RLS Policies:**
- Inherit module access (teachers see their modules' units, students see enrolled units)

**Indexes:**
- PK on `id`
- `idx_units_module_id`
- `idx_units_order_index` for sorting

---

## Activity Builder Tables

### `activities`

Individual lessons/activities.

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `unit_id` | UUID | No | — | FK → units(id) ON DELETE CASCADE |
| `title` | TEXT | No | — | E.g., "HTML Form Fundamentals" |
| `description` | TEXT | Yes | NULL | Activity description |
| `type` | TEXT | No | 'mission' | 'mission' \| 'challenge' \| 'quiz' \| 'project' |
| `difficulty` | TEXT | No | 'Medio' | 'Bajo' \| 'Medio' \| 'Alto' |
| `status` | TEXT | No | 'draft' | 'draft' \| 'published' \| 'blocked' |
| `order_index` | INTEGER | No | 0 | Sort order within unit |
| `position_x` | INTEGER | Yes | NULL | Map view X position |
| `position_y` | INTEGER | Yes | NULL | Map view Y position |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-updated |

**RLS Policies:**
- Teachers see activities in their modules
- Students see activities in their enrolled modules

**Indexes:**
- PK on `id`
- `idx_activities_unit_id`
- `idx_activities_order_index`

---

### `activity_phases`

Containers for related steps (folders).

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `activity_id` | UUID | No | — | FK → activities(id) ON DELETE CASCADE |
| `title` | TEXT | No | — | E.g., "Theory", "Practice", "Challenge" |
| `order_index` | INTEGER | No | 0 | Sort order within activity |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-updated |

**RLS Policies:**
- Readable by everyone (inherited from activity)
- Insertable/updatable by authenticated users (activity builder)

**Indexes:**
- PK on `id`
- `idx_activity_phases_activity_id`

---

### `activity_steps`

Atomic lesson units (individual content pieces).

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `phase_id` | UUID | No | — | FK → activity_phases(id) ON DELETE CASCADE |
| `title` | TEXT | No | — | E.g., "What is HTML?", "Quiz Time" |
| `type` | TEXT | No | — | 'theory' \| 'deliverable' \| 'animation' \| 'quiz' \| 'presentation' \| 'resource' |
| `content` | JSONB | No | '{}' | Content varies by type (see below) |
| `is_visible` | BOOLEAN | No | true | Can student see it? |
| `is_locked` | BOOLEAN | No | false | Can student interact? |
| `order_index` | INTEGER | No | 0 | Sort order within phase |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-updated |

**RLS Policies:**
- Readable by everyone (students/teachers)
- Insertable/updatable by authenticated users (teachers via builder)

**Indexes:**
- PK on `id`
- `idx_activity_steps_phase_id`

---

#### Step Content Schema (JSONB)

Content structure varies by `type`:

**Theory**
```json
{
  "markdown": "# Lesson Title\n\nContent in markdown..."
}
```

**Deliverable**
```json
{
  "templateUrl": "https://docs.google.com/document/d/.../edit",
  "instructionsMarkdown": "Instructions for students...",
  "deliveryMode": "manual" | "teacher_copy"
}
```

**Animation/Interactive**
```json
{
  "componentUrl": "https://codepen.io/..." | "import-identifier"
}
```

**Quiz**
```json
{
  "questions": [
    {
      "id": "uuid",
      "text": "Question text?",
      "options": [
        { "id": "uuid", "text": "Option A", "isCorrect": true },
        { "id": "uuid", "text": "Option B", "isCorrect": false }
      ]
    }
  ],
  "passingScore": 70,
  "googleFormUrl": "https://forms.google.com/..." (optional)
}
```

**Presentation**
```json
{
  "slidesUrl": "https://docs.google.com/presentation/d/.../edit",
  "notes": "Speaker notes..."
}
```

**Resource**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Resource Title",
      "description": "Optional description",
      "url": "https://example.com",
      "type": "file" | "link" | "folder",
      "mimeType": "application/pdf" (optional),
      "parentId": "uuid" (optional, for nested folders)
    }
  ],
  "markdownHeader": "## Resources\n"
}
```

---

## Submission & Grading Tables

### `activity_submissions`

Student work submissions for deliverable steps.

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `student_id` | UUID | No | — | FK → profiles(id) ON DELETE CASCADE |
| `step_id` | UUID | No | — | FK → activity_steps(id) ON DELETE CASCADE |
| `drive_file_url` | TEXT | Yes | NULL | Google Drive link or student's submission URL |
| `drive_file_id` | TEXT | Yes | NULL | Google Drive file ID (Phase 3) |
| `status` | TEXT | No | 'pending' | 'pending' \| 'submitted' \| 'graded' |
| `submitted_at` | TIMESTAMP WITH TIME ZONE | Yes | NULL | When student submitted |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-updated |

**Constraints:**
- `UNIQUE(student_id, step_id)` — one submission per student per step

**RLS Policies:**
- Students can view/update only their own submissions
- Teachers can view submissions for steps in their activities

**Indexes:**
- PK on `id`
- `UNIQUE(student_id, step_id)` enforces constraint
- `idx_activity_submissions_student_id`
- `idx_activity_submissions_step_id`

---

## Google Drive Integration Tables

### `teacher_drive_tokens`

Stores teacher's Google Drive OAuth tokens (Phase 3).

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `teacher_id` | UUID | No | — | FK → profiles(id) ON DELETE CASCADE |
| `access_token` | TEXT | No | — | Google OAuth access token (short-lived) |
| `refresh_token` | TEXT | No | — | Google OAuth refresh token (long-lived) |
| `expires_at` | TIMESTAMP WITH TIME ZONE | No | — | When access_token expires |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-updated |

**Constraints:**
- `UNIQUE(teacher_id)` — one token set per teacher

**RLS Policies:**
- Teachers can manage only their own tokens

**Indexes:**
- PK on `id`
- `UNIQUE(teacher_id)`

---

### `activity_connections`

(Conceptual) Links between activities for map view flow.

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `from_activity_id` | UUID | No | — | FK → activities(id) ON DELETE CASCADE |
| `to_activity_id` | UUID | No | — | FK → activities(id) ON DELETE CASCADE |
| `connection_type` | TEXT | No | 'prerequisite' | 'prerequisite' \| 'optional' |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |

**Note:** Not yet implemented but referenced in types.

---

### `unit_map_configs`

(Conceptual) Configuration for unit map visualization.

**Columns:**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | PK |
| `unit_id` | UUID | No | — | FK → units(id) ON DELETE CASCADE |
| `show_connections` | BOOLEAN | No | true | Show prerequisite lines? |
| `grid_size` | INTEGER | No | 20 | Grid snap size in pixels |
| `background_color` | TEXT | Yes | NULL | Custom background color |
| `created_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-set |
| `updated_at` | TIMESTAMP WITH TIME ZONE | No | now() | Auto-updated |

**Note:** Not yet implemented but used for future map customization.

---

## Row-Level Security Policies

RLS is enabled on all tables. Key policies:

### `profiles`

```sql
-- Anyone can read (needed for user metadata)
CREATE POLICY "Profiles are readable by everyone"
    ON profiles FOR SELECT USING (true);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
```

### `modules`

```sql
-- Teachers see their own modules
CREATE POLICY "Teachers see own modules"
    ON modules FOR SELECT
    USING (auth.uid() = teacher_id);

-- Students see modules they're enrolled in
CREATE POLICY "Students see enrolled modules"
    ON modules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM module_enrollments
            WHERE module_id = modules.id
            AND student_id = auth.uid()
        )
    );

-- Only teachers can insert/update their modules
CREATE POLICY "Teachers manage own modules"
    ON modules FOR INSERT
    WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers update own modules"
    ON modules FOR UPDATE
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);
```

### `activity_submissions`

```sql
-- Students can manage their own submissions
CREATE POLICY "Students manage own submissions"
    ON activity_submissions FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

-- Teachers can read submissions for their activities
CREATE POLICY "Teachers read activity submissions"
    ON activity_submissions FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM activity_steps s
            JOIN activity_phases p ON p.id = s.phase_id
            JOIN activities a ON a.id = p.activity_id
            JOIN units u ON u.id = a.unit_id
            JOIN modules m ON m.id = u.module_id
            WHERE s.id = activity_submissions.step_id
            AND m.teacher_id = auth.uid()
        )
    );
```

### `teacher_drive_tokens`

```sql
-- Teachers manage only their own Drive tokens
CREATE POLICY "Teachers manage own Drive tokens"
    ON teacher_drive_tokens FOR ALL
    USING (auth.uid() = teacher_id)
    WITH CHECK (auth.uid() = teacher_id);
```

---

## Indexes

All key columns are indexed for performance:

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `modules` | idx_modules_teacher_id | (teacher_id) | Filter modules by teacher |
| `module_enrollments` | idx_module_enrollments_module_id | (module_id) | List enrollments per module |
| `module_enrollments` | idx_module_enrollments_student_id | (student_id) | Find student's modules |
| `units` | idx_units_module_id | (module_id) | List units per module |
| `units` | idx_units_order_index | (order_index) | Sort units |
| `activities` | idx_activities_unit_id | (unit_id) | List activities per unit |
| `activities` | idx_activities_order_index | (order_index) | Sort activities |
| `activity_phases` | idx_activity_phases_activity_id | (activity_id) | List phases per activity |
| `activity_steps` | idx_activity_steps_phase_id | (phase_id) | List steps per phase |
| `activity_submissions` | UNIQUE(student_id, step_id) | (student_id, step_id) | Enforce uniqueness + query by either |
| `teacher_drive_tokens` | UNIQUE(teacher_id) | (teacher_id) | Enforce one token per teacher |

---

## Migrations

All schema changes are tracked in `supabase/migrations/`:

### 20260301_activity_builder.sql

Initial activity builder schema:
- `activity_phases` table
- `activity_steps` table
- RLS policies for both
- Triggers for auto-updating `updated_at`

### 20260301181141_add_presentation_type.sql

Adds support for presentation steps.

**Changes:**
- Updates check constraint on `activity_steps.type` to include 'presentation'

### 20260301181536_add_step_controls.sql

Adds visibility and lock controls.

**Changes:**
- `activity_steps.is_visible` (BOOLEAN DEFAULT true)
- `activity_steps.is_locked` (BOOLEAN DEFAULT false)

### 20260306_activity_submissions.sql

Student submission tracking for deliverables.

**Creates:**
- `activity_submissions` table
- RLS policies (students manage own, teachers read for their activities)
- Trigger for `updated_at`

### 20260306_fix_submissions_rls.sql

Fixes RLS policy for teacher access (ensures correct join path).

**Changes:**
- Updates teacher RLS policy on `activity_submissions`

### 20260307_phase3_drive.sql

Google Drive integration (teacher copy mode).

**Creates:**
- `teacher_drive_tokens` table with RLS
- Adds `profiles.google_email` column
- Adds `activity_submissions.drive_file_id` column

**Changes:**
- Updates RLS on teacher_drive_tokens
- Creates trigger for updated_at

---

## Applying Migrations

Migrations are applied automatically when you start the Supabase local environment or deploy to production. To manually apply:

```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase Studio:
# 1. Go to SQL Editor
# 2. Open each migration file
# 3. Execute the SQL
```

---

## Data Integrity

### Cascading Deletes

When a parent record is deleted, children are auto-deleted:

- Delete `activities` → deletes `activity_phases`, `activity_steps`, `activity_submissions`
- Delete `modules` → deletes `units`, `activities`, etc.

### Constraints

- `UNIQUE(module_id, student_id)` prevents duplicate enrollments
- `UNIQUE(student_id, step_id)` prevents multiple submissions per student per step
- `UNIQUE(teacher_id)` on Drive tokens (one per teacher)

### Triggers

Auto-update timestamps:

```sql
CREATE TRIGGER set_activity_phases_updated_at
    BEFORE UPDATE ON activity_phases
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
```

---

## Querying Best Practices

### N+1 Query Prevention

Always use joins, not multiple queries:

```typescript
// Good: Single query with joins
const { data } = await supabase
    .from("activities")
    .select(`
        *,
        activity_phases (
            *,
            activity_steps (*)
        )
    `)
    .eq("unit_id", unitId);

// Bad: N+1 (queries increase with steps)
const activities = await supabase.from("activities").select("*");
for (const activity of activities) {
    const phases = await supabase.from("activity_phases")
        .select("*").eq("activity_id", activity.id);
    // etc...
}
```

### RLS Policy Performance

RLS policies are checked on every row. Ensure policies use indexed columns:

```sql
-- Good: Uses indexed teacher_id
WHERE EXISTS (
    SELECT 1 FROM modules
    WHERE id = activities.unit_id
    AND teacher_id = auth.uid()
)

-- Slow: Would scan all modules
WHERE EXISTS (
    SELECT 1 FROM modules
    WHERE name = 'Some Class'
)
```

### Pagination

For large result sets, use `range()`:

```typescript
const { data } = await supabase
    .from("activities")
    .select("*")
    .eq("unit_id", unitId)
    .range(0, 19); // Get first 20
```

---

## Troubleshooting

### "new row violates row-level security policy"

The user doesn't have permission. Check:
1. Auth UID matches table user_id columns
2. RLS policy logic is correct
3. Student is enrolled in the module

### "Permission denied" on INSERT

- Check `WITH CHECK` clause in RLS policy allows the action
- Verify auth.uid() is set (not NULL)

### Cascading delete not working

- Ensure `ON DELETE CASCADE` is in foreign key definition
- Check RLS policies aren't preventing the delete

### UNIQUE constraint violation

- Calling upsert when you meant insert?
- Use `.upsert()` if updating existing record, `.insert()` for new

