CREATE TABLE IF NOT EXISTS public.module_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('co_owner', 'editor', 'viewer')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (module_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_module_collaborators_module_id
    ON public.module_collaborators(module_id);

CREATE INDEX IF NOT EXISTS idx_module_collaborators_teacher_id
    ON public.module_collaborators(teacher_id);

ALTER TABLE public.module_collaborators ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_module_collaborators_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_module_collaborators_updated ON public.module_collaborators;
CREATE TRIGGER on_module_collaborators_updated
    BEFORE UPDATE ON public.module_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION public.set_module_collaborators_updated_at();

CREATE OR REPLACE FUNCTION public.get_module_teacher_role(target_module_id UUID, target_teacher_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN m.teacher_id = target_teacher_id THEN 'creator'
        ELSE mc.role
    END
    FROM public.modules m
    LEFT JOIN public.module_collaborators mc
        ON mc.module_id = m.id
       AND mc.teacher_id = target_teacher_id
    WHERE m.id = target_module_id
    LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_teacher_view_module(target_module_id UUID, target_teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT public.get_module_teacher_role(target_module_id, target_teacher_id) IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.can_teacher_edit_module_content(target_module_id UUID, target_teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT public.get_module_teacher_role(target_module_id, target_teacher_id) IN ('creator', 'co_owner', 'editor')
$$;

CREATE OR REPLACE FUNCTION public.can_teacher_manage_module_students(target_module_id UUID, target_teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT public.get_module_teacher_role(target_module_id, target_teacher_id) IN ('creator', 'co_owner', 'editor')
$$;

CREATE OR REPLACE FUNCTION public.can_teacher_manage_module_settings(target_module_id UUID, target_teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT public.get_module_teacher_role(target_module_id, target_teacher_id) IN ('creator', 'co_owner')
$$;

CREATE POLICY "Creators and collaborators can read module collaborators"
    ON public.module_collaborators FOR SELECT
    USING (
        public.can_teacher_view_module(module_id, auth.uid())
    );

CREATE POLICY "Only creators can insert module collaborators"
    ON public.module_collaborators FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.modules m
            WHERE m.id = module_collaborators.module_id
              AND m.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Only creators can update module collaborators"
    ON public.module_collaborators FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.modules m
            WHERE m.id = module_collaborators.module_id
              AND m.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Only creators can delete module collaborators"
    ON public.module_collaborators FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.modules m
            WHERE m.id = module_collaborators.module_id
              AND m.teacher_id = auth.uid()
        )
    );

COMMENT ON TABLE public.module_collaborators IS 'Profesores colaboradores por módulo con permisos editor/codueño/visitante.';
