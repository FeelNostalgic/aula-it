import type {
  UserRole,
  ActivityStatus,
  UnitStatus,
  ActivityType,
  ActivityDifficulty,
} from "@/types/database";
import type {
  ActivityPhase,
  ActivityStep,
  ActivitySubmission,
  SubmissionStatus,
} from "@/types/activity";

// ─── User / Auth ───────────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  email: string;
  created_at: string;
  [key: string]: unknown;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: "user-00000000-0000-0000-0000-000000000001",
    email: "test@example.com",
    created_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Profile ────────────────────────────────────────────────────────────────

export interface MockProfile {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function createMockProfile(
  overrides: Partial<MockProfile> = {}
): MockProfile {
  return {
    id: "user-00000000-0000-0000-0000-000000000001",
    full_name: "Test User",
    role: "teacher",
    avatar_url: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Module ─────────────────────────────────────────────────────────────────

export interface MockModule {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
}

export function createMockModule(
  overrides: Partial<MockModule> = {}
): MockModule {
  return {
    id: "module-00000000-0000-0000-0000-000000000001",
    name: "Test Module",
    description: "A test module",
    icon: "BookOpen",
    teacher_id: "user-00000000-0000-0000-0000-000000000001",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Unit ────────────────────────────────────────────────────────────────────

export interface MockUnit {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  status: UnitStatus;
  order_index: number;
  view_type: "list" | "map";
  created_at: string;
  updated_at: string;
}

export function createMockUnit(overrides: Partial<MockUnit> = {}): MockUnit {
  return {
    id: "unit-00000000-0000-0000-0000-000000000001",
    module_id: "module-00000000-0000-0000-0000-000000000001",
    title: "Test Unit",
    description: "A test unit",
    status: "published",
    order_index: 0,
    view_type: "list",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Activity ────────────────────────────────────────────────────────────────

export interface MockActivity {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  status: ActivityStatus;
  type: ActivityType;
  difficulty: ActivityDifficulty;
  order_index: number;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export function createMockActivity(
  overrides: Partial<MockActivity> = {}
): MockActivity {
  return {
    id: "activity-00000000-0000-0000-0000-000000000001",
    unit_id: "unit-00000000-0000-0000-0000-000000000001",
    title: "Test Activity",
    description: "A test activity",
    status: "published",
    type: "mission",
    difficulty: "Medio",
    order_index: 0,
    estimated_minutes: 30,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Phase ───────────────────────────────────────────────────────────────────

export function createMockPhase(
  overrides: Partial<ActivityPhase> = {}
): ActivityPhase {
  return {
    id: "phase-00000000-0000-0000-0000-000000000001",
    activity_id: "activity-00000000-0000-0000-0000-000000000001",
    title: "Introduction",
    order_index: 0,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Step ────────────────────────────────────────────────────────────────────

export function createMockStep(
  overrides: Partial<ActivityStep> = {}
): ActivityStep {
  return {
    id: "step-00000000-0000-0000-0000-000000000001",
    phase_id: "phase-00000000-0000-0000-0000-000000000001",
    title: "Read this",
    type: "theory",
    content: { markdown: "# Hello World" },
    order_index: 0,
    is_visible: true,
    is_locked: false,
    due_date: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── Submission ──────────────────────────────────────────────────────────────

export function createMockSubmission(
  overrides: Partial<ActivitySubmission> = {}
): ActivitySubmission {
  return {
    id: "submission-00000000-0000-0000-0000-000000000001",
    student_id: "user-00000000-0000-0000-0000-000000000001",
    step_id: "step-00000000-0000-0000-0000-000000000001",
    drive_file_url: null,
    drive_file_id: null,
    drive_file_name: null,
    drive_mime_type: null,
    status: "pending" as SubmissionStatus,
    submitted_at: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    score: null,
    feedback: null,
    graded_at: null,
    rubric_scores: null,
    grading_mode: null,
    files: null,
    published_at: null,
    ...overrides,
  };
}

// ─── Drive Token ─────────────────────────────────────────────────────────────

export interface MockDriveToken {
  id: string;
  teacher_id: string;
  access_token: string;
  refresh_token: string;
  expiry_date: number | null;
  created_at: string;
  updated_at: string;
}

export function createMockDriveToken(
  overrides: Partial<MockDriveToken> = {}
): MockDriveToken {
  return {
    id: "token-00000000-0000-0000-0000-000000000001",
    teacher_id: "user-00000000-0000-0000-0000-000000000001",
    access_token: "ya29.mock-access-token",
    refresh_token: "1//mock-refresh-token",
    expiry_date: Date.now() + 3600 * 1000,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}
