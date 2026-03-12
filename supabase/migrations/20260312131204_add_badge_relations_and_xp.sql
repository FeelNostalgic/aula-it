-- Migration: Add Badge Relations and XP
-- Implementation of Phase 2

ALTER TABLE public.class_badges
ADD COLUMN activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
ADD COLUMN xp_reward INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_class_badges_activity_id ON public.class_badges(activity_id);
