/**
 * DB-aligned TypeScript enums and types.
 * These mirror the exact values stored in Postgres columns.
 */

export type UserRole = 'teacher' | 'student';

export type ActivityStatus = 'published' | 'blocked' | 'draft';

export type UnitStatus = 'published' | 'draft' | 'archived';

export type UnitViewType = 'list' | 'map';

export type ActivityDifficulty = 'Bajo' | 'Medio' | 'Alto';

export type ActivityType = 'mission' | 'challenge' | 'quiz' | 'project';

export type MilestoneStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface ClassMilestone {
    id: string;
    unit_id: string | null;
    title: string;
    description: string | null;
    target_points: number;
    current_points: number;
    reward: string;
    status: MilestoneStatus;
    order_index: number;
    created_at: string;
    updated_at: string;
}

export interface ClassBadge {
    id: string;
    unit_id: string;
    activity_id: string | null;
    step_id: string | null;
    title: string;
    description: string | null;
    icon_url: string | null;
    is_hidden: boolean;
    condition_payload: any;
    xp_reward: number;
    created_at: string;
    updated_at: string;
}

export interface StudentBadge {
    id: string;
    student_id: string;
    badge_id: string;
    earned_at: string;
}
