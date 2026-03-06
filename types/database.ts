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
