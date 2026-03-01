-- Migration: Create Activity Phases and Steps Tables

-- Table: activity_phases
CREATE TABLE IF NOT EXISTS public.activity_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for querying phases by activity
CREATE INDEX IF NOT EXISTS idx_activity_phases_activity_id ON public.activity_phases(activity_id);

-- Enforce Row Level Security
ALTER TABLE public.activity_phases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_phases
CREATE POLICY "Actives phases are viewable by everyone."
ON public.activity_phases FOR SELECT
USING (true);

CREATE POLICY "Activity phases are insertable by authenticated users"
ON public.activity_phases FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Activity phases are updatable by authenticated users"
ON public.activity_phases FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Activity phases are deletable by authenticated users"
ON public.activity_phases FOR DELETE
USING (auth.role() = 'authenticated');


-- Table: activity_steps
-- Types of steps: 'theory', 'animation', 'deliverable', 'quiz'
CREATE TABLE IF NOT EXISTS public.activity_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES public.activity_phases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('theory', 'animation', 'deliverable', 'quiz')),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for querying steps by phase
CREATE INDEX IF NOT EXISTS idx_activity_steps_phase_id ON public.activity_steps(phase_id);

-- Enforce Row Level Security
ALTER TABLE public.activity_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_steps
CREATE POLICY "Activity steps are viewable by everyone."
ON public.activity_steps FOR SELECT
USING (true);

CREATE POLICY "Activity steps are insertable by authenticated users"
ON public.activity_steps FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Activity steps are updatable by authenticated users"
ON public.activity_steps FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Activity steps are deletable by authenticated users"
ON public.activity_steps FOR DELETE
USING (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_activity_phases_updated_at ON public.activity_phases;
CREATE TRIGGER set_activity_phases_updated_at
    BEFORE UPDATE ON public.activity_phases
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_activity_steps_updated_at ON public.activity_steps;
CREATE TRIGGER set_activity_steps_updated_at
    BEFORE UPDATE ON public.activity_steps
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
