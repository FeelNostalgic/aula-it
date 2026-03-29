# API Reference

Complete documentation of all API routes in Aula IT.

## Table of Contents

1. [Authentication Routes](#authentication-routes)
2. [Google Drive Routes](#google-drive-routes)
3. [Error Handling](#error-handling)
4. [Authentication](#authentication)

## Authentication Routes

### Sign Out

Logs out the current user and clears session.

**Endpoint:** `GET /auth/sign-out`

**Authentication:** Required (Supabase session)

**Response:**

Redirects to `/login`

**Example:**

```bash
curl -X GET http://localhost:3000/auth/sign-out
# Redirects to /login
```

---

### OAuth Callback

Handles Supabase OAuth provider callback (Google, GitHub, etc.).

**Endpoint:** `GET /auth/callback`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | OAuth authorization code from provider |
| `state` | string | No | State parameter for CSRF protection |

**Response:**

Redirects to `/dashboard` on success or `/login` on error

**Example:**

```bash
curl -X GET "http://localhost:3000/auth/callback?code=abc123&state=xyz"
```

---

## Google Drive Routes

All Google Drive endpoints require teacher authentication and Google Drive connection. Teachers must have:

1. Authenticated with Supabase
2. Connected their Google account via `/api/drive/authorize`
3. Granted permission to access Google Drive

### Authorize Google Drive

Initiates OAuth flow to connect teacher's Google Drive account.

**Endpoint:** `GET /api/drive/authorize`

**Authentication:** Required (Supabase session, teacher role only)

**Response:**

Redirects to Google OAuth consent screen

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | "No autenticado" | User not authenticated |
| 403 | "Solo profesores pueden conectar Drive" | User is not a teacher |

**Example:**

```bash
# Teacher clicks "Connect Google Drive" button
curl -X GET http://localhost:3000/api/drive/authorize

# Browser redirects to:
# https://accounts.google.com/o/oauth2/v2/auth?...
```

---

### OAuth Callback from Google

Handles Google OAuth callback after user grants permission.

**Endpoint:** `GET /api/drive/callback`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Google authorization code |
| `state` | string | Yes | Teacher ID (for security) |

**Response:**

JSON success or error

**Success Response (200):**

Redirects to `/dashboard?drive=connected`

**Error Responses:**

| Status | Redirect | Description |
|--------|----------|-------------|
| — | `/dashboard?drive=error` | Missing code or state |
| — | `/dashboard?drive=error` | Invalid tokens from Google |

**Database Updates:**

Stores/updates `teacher_drive_tokens` row:

```json
{
  "teacher_id": "uuid",
  "access_token": "google_access_token",
  "refresh_token": "google_refresh_token",
  "expires_at": "2024-03-10T12:00:00Z"
}
```

**Example:**

```bash
# Handled by browser redirect from Google
curl -X GET "http://localhost:3000/api/drive/callback?code=4/abc123&state=teacher-uuid"

# Redirects to /dashboard?drive=connected
```

---

### Check Drive Connection Status

Check if teacher's Google Drive is connected.

**Endpoint:** `GET /api/drive/status`

**Authentication:** Required (Supabase session, teacher role only)

**Response (200):**

```json
{
  "connected": true,
  "email": "teacher@gmail.com",
  "expires_at": "2024-03-10T12:00:00Z"
}
```

Or:

```json
{
  "connected": false
}
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | "No autenticado" | User not authenticated |
| 403 | "Solo profesores" | User is not a teacher |

**Example:**

```bash
curl -X GET http://localhost:3000/api/drive/status
# Response:
# { "connected": true, "email": "teacher@gmail.com" }
```

---

### Copy Template to Students

Copies a Google Drive template for all enrolled students using the teacher's connected Google Drive account (teacher copy mode).

**Endpoint:** `POST /api/drive/copy`

**Authentication:** Required (Supabase session, teacher role only)

**Request Body:**

```json
{
  "stepId": "uuid",
  "activityId": "uuid"
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stepId` | string (UUID) | Yes | Activity step ID containing the template |
| `activityId` | string (UUID) | Yes | Activity ID (for finding module & students) |

**Response (200):**

```json
{
  "copied": 15,
  "skipped": 2,
  "errors": [
    "student1@gmail.com: Missing google_email",
    "student2@gmail.com: Permission denied"
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `copied` | number | Count of successful copies |
| `skipped` | number | Students without google_email configured |
| `errors` | string[] | List of errors during copy (non-fatal) |

**Preconditions:**

1. Teacher must have connected Google Drive (`teacher_drive_tokens` exists)
2. Activity step must have `content.templateUrl` set
3. Step content must be type `deliverable` with `deliveryMode: 'teacher_copy'`
4. Students must have `google_email` set in their profile

**Database Changes:**

For each successfully copied file:

1. Creates/updates `activity_submissions` row:
   - `student_id`: from enrollment
   - `step_id`: from request
   - `drive_file_url`: Google Drive link
   - `drive_file_id`: Google file ID
   - `status`: 'submitted'
   - `submitted_at`: current timestamp

2. Creates a Google Doc copy with name: `[Student Name] Step Title`
3. Moves that copy into the teacher Drive folder structure:
   `Aula-it Entregas / {module} / {unit} / {activity} / {step}`
4. Shares the file with the student's Google email as `writer`

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | "No autenticado" | User not authenticated |
| 403 | "Solo profesores" | User is not a teacher |
| 400 | "stepId y activityId son requeridos" | Missing request parameters |
| 400 | "Google Drive no conectado..." | Teacher not connected to Drive |
| 400 | "Este paso no tiene plantilla URL..." | Step missing templateUrl |
| 400 | "No se pudo extraer el ID..." | Invalid template URL format |
| 400 | "No se encontró el módulo..." | Activity not found |

**Example:**

```bash
curl -X POST http://localhost:3000/api/drive/copy \
  -H "Content-Type: application/json" \
  -d '{
    "stepId": "550e8400-e29b-41d4-a716-446655440000",
    "activityId": "550e8400-e29b-41d4-a716-446655440001"
  }'

# Response:
# {
#   "copied": 25,
#   "skipped": 3,
#   "errors": ["student1@example.com: Rate limit exceeded"]
# }
```

**Workflow:**

1. Teacher creates deliverable step with template URL
2. Sets `deliveryMode: 'teacher_copy'`
3. Clicks "Sync to Google Drive" button
4. App calls `POST /api/drive/copy`
5. For each enrolled student:
   - Creates a copy in the teacher's connected Drive
   - Moves it under `Aula-it Entregas / {module} / {unit} / {activity} / {step}`
   - Shares with their google_email as writer
   - Creates submission record
6. Students see the shared doc in "Shared with me" and can access it from the stored Drive link
7. Students work in the shared doc (same as traditional Google Classroom)

---

### Lock Submissions

Locks student submissions (prevents further editing) by removing write permissions.

**Endpoint:** `POST /api/drive/lock`

**Authentication:** Required (Supabase session, teacher role only)

**Request Body:**

```json
{
  "stepId": "uuid"
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stepId` | string (UUID) | Yes | Step ID to lock all submissions for |

**Response (200):**

```json
{
  "locked": 15,
  "errors": [
    "student1@gmail.com: File not found",
    "student2@gmail.com: Permission denied"
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|--------|------|-------------|
| `locked` | number | Count of successfully locked submissions |
| `errors` | string[] | List of errors during lock |

**Preconditions:**

1. Teacher must have connected Google Drive
2. Submissions must have `drive_file_id` set (from copy step)
3. Students must have `google_email` set

**Database Changes:**

For each submission:

1. Finds Google Drive permissions for the file
2. Removes "writer" permission for student's email
3. Adds "reader" permission (student can view but not edit)
4. Updates `activity_submissions.status` to 'graded'

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | "No autenticado" | User not authenticated |
| 403 | "Solo profesores" | User is not a teacher |
| 400 | "stepId es requerido" | Missing stepId in request |
| 400 | "Google Drive no conectado" | Teacher not connected |

**Example:**

```bash
curl -X POST http://localhost:3000/api/drive/lock \
  -H "Content-Type: application/json" \
  -d '{
    "stepId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# Response:
# {
#   "locked": 25,
#   "errors": []
# }
```

**Workflow:**

1. Teacher finishes grading submissions
2. Clicks "Lock Submissions" button
3. App calls `POST /api/drive/lock`
4. For each submission with a Google Drive copy:
   - Removes write permission
   - Adds read permission (students can view feedback)
   - Marks submission as 'graded'
5. Students can no longer edit documents (but can see feedback)

---

## Error Handling

All API routes follow a consistent error format:

**Error Response Format:**

```json
{
  "error": "Human-readable error message"
}
```

**Common HTTP Status Codes:**

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad request (missing params, invalid state) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (authenticated but insufficient permissions) |
| 500 | Server error |

**Handling Errors in Frontend:**

```typescript
try {
    const res = await fetch('/api/drive/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, activityId }),
    });

    if (!res.ok) {
        const { error } = await res.json();
        toast.error(error); // Show user-friendly message
        return;
    }

    const { copied, skipped, errors } = await res.json();
    toast.success(`Copied to ${copied} students`);

    if (errors.length > 0) {
        console.warn('Partial errors:', errors);
    }
} catch (err) {
    toast.error('Network error');
}
```

---

## Authentication

### How Auth Works

1. **Middleware** checks Supabase auth session on every request
2. **Server Components** fetch user via `createClient()`
3. **API Routes** check auth via `supabase.auth.getUser()`
4. **Server Actions** inherit auth from component context

### Getting Current User

**In Server Components:**

```typescript
import { createClient } from "@/utils/supabase/server";

export default async function MyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return <div>Welcome, {user.email}</div>;
}
```

**In API Routes:**

```typescript
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use user.id for queries
}
```

### Checking User Role

**Get role from profiles table:**

```typescript
const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

const isTeacher = profile?.role === "teacher";
```

### Protected Routes

The middleware redirects:

- **Unauthenticated users** → `/login`
- **Authenticated users** from `/`, `/login`, `/register` → `/dashboard`

No manual auth checks needed for page routes under `/dashboard/` — they're automatically protected.

---

## Rate Limiting

Currently no built-in rate limiting, but Google Drive API has quotas:

- **Quota**: 1 million requests per day per project
- **Per-user quota**: 100 requests per 100 seconds per user

If hitting Google Drive limits:

1. Add exponential backoff retry logic
2. Batch operations (e.g., copy multiple files in parallel with delays)
3. Request higher quota from Google Cloud Console

---

## Versioning

This API documentation covers v0.19.0 and later. Check `package.json` for current version.

Breaking changes will increment the major version (e.g., v1.0.0).

---

## Troubleshooting

### "Google Drive no conectado"

**Cause:** Teacher hasn't connected Google Drive yet

**Solution:**
1. Go to Dashboard → Settings
2. Click "Connect Google Drive"
3. Grant permission
4. Retry the operation

### "Permission denied" on copy

**Cause:** Student's Google email isn't set

**Solution:**
1. Tell student to set their Google email in Settings
2. Re-run the copy operation

### "Rate limit exceeded"

**Cause:** Too many Google Drive operations too quickly

**Solution:**
1. Wait a few minutes
2. Try again (in production, implement exponential backoff)
3. Request higher quota from Google

### CORS errors

**Cause:** Calling API from browser without proper headers

**Solution:**
Use `fetch()` or Axios from the same origin (Next.js API routes handle CORS automatically)

```typescript
// Good: Same-origin fetch from Client Component
const res = await fetch('/api/drive/copy', { method: 'POST' });

// Bad: Cross-origin fetch from browser
fetch('https://other-domain.com/api/...'); // CORS blocked
```

---

## Examples

### Complete Teacher Drive Workflow

```typescript
// 1. Connect Google Drive (browser redirect)
window.location.href = '/api/drive/authorize';

// 2. Check connection status
const res = await fetch('/api/drive/status');
const { connected } = await res.json();

if (connected) {
    // 3. Copy templates to students
    const copyRes = await fetch('/api/drive/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, activityId }),
    });
    const { copied, skipped, errors } = await copyRes.json();

    // 4. Lock submissions after grading
    const lockRes = await fetch('/api/drive/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId }),
    });
    const { locked } = await lockRes.json();
}
```

### Student Submission Flow

```typescript
// Manual mode: submit link
const res = await submitDeliverable(stepId, googleDocUrl);

// Teacher copy mode:
// 1. Teacher clicks "Sync to Google Drive" → POST /api/drive/copy
// 2. App creates the copy in the teacher's Drive and shares it with the student
// 3. Student works in the document
// 4. Teacher clicks "Lock Submissions" → POST /api/drive/lock
// 5. Students can view but not edit
```

