-- Migration: Sistema de grupos de alumnos por módulo
-- Grupos se definen a nivel de módulo y son reutilizables en todas las actividades del módulo.

-- ─── 1. Modo de inscripción de grupos por módulo ────────────────────────────
ALTER TABLE public.modules
    ADD COLUMN IF NOT EXISTS groups_enrollment_mode TEXT
    DEFAULT 'teacher_assigned'
    CHECK (groups_enrollment_mode IN ('teacher_assigned', 'self_enrollment'));

-- ─── 2. Tabla de grupos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'archived')),
    color       TEXT,           -- hex opcional para identificación visual
    max_members INT,            -- NULL = sin límite (self-enrollment)
    created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Tabla de miembros de grupo ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_group_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES public.module_groups(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, student_id)
);

-- ─── 4. Trigger: exclusividad de grupo por módulo ────────────────────────────
-- Un alumno sólo puede pertenecer a UN grupo por módulo.
CREATE OR REPLACE FUNCTION public.check_single_group_per_student()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.module_group_members mgm
        JOIN public.module_groups mg ON mg.id = mgm.group_id
        WHERE mgm.student_id = NEW.student_id
          AND mg.module_id = (
              SELECT module_id FROM public.module_groups WHERE id = NEW.group_id
          )
          AND mgm.group_id <> NEW.group_id
    ) THEN
        RAISE EXCEPTION 'El alumno ya pertenece a un grupo en este módulo';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_group_per_student ON public.module_group_members;
CREATE TRIGGER trg_single_group_per_student
    BEFORE INSERT ON public.module_group_members
    FOR EACH ROW EXECUTE FUNCTION public.check_single_group_per_student();

-- ─── 5. Trigger: updated_at ──────────────────────────────────────────────────
CREATE TRIGGER set_module_groups_updated_at
    BEFORE UPDATE ON public.module_groups
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── 6. Índices ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_module_groups_module_id
    ON public.module_groups (module_id);

CREATE INDEX IF NOT EXISTS idx_module_group_members_group_id
    ON public.module_group_members (group_id);

CREATE INDEX IF NOT EXISTS idx_module_group_members_student_id
    ON public.module_group_members (student_id);

-- ─── 7. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.module_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_group_members ENABLE ROW LEVEL SECURITY;

-- Profesores con acceso al módulo gestionan grupos
CREATE POLICY "Teachers manage module groups"
    ON public.module_groups FOR ALL
    USING (public.can_teacher_view_module(module_id, auth.uid()))
    WITH CHECK (public.can_teacher_edit_module_content(module_id, auth.uid()));

-- Alumnos leen grupos activos de sus módulos
CREATE POLICY "Students read active module groups"
    ON public.module_groups FOR SELECT
    USING (
        status = 'active' AND
        EXISTS (
            SELECT 1 FROM public.module_enrollments
            WHERE module_id = module_groups.module_id
              AND student_id = auth.uid()
        )
    );

-- Profesores gestionan miembros de grupos de sus módulos
CREATE POLICY "Teachers manage group members"
    ON public.module_group_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.module_groups g
            WHERE g.id = module_group_members.group_id
              AND public.can_teacher_view_module(g.module_id, auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.module_groups g
            WHERE g.id = module_group_members.group_id
              AND public.can_teacher_edit_module_content(g.module_id, auth.uid())
        )
    );

-- Alumnos leen a todos los miembros de su propio grupo (para ver compañeros)
CREATE POLICY "Students read own group members"
    ON public.module_group_members FOR SELECT
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.module_group_members my_mem
            WHERE my_mem.group_id = module_group_members.group_id
              AND my_mem.student_id = auth.uid()
        )
    );

-- Alumnos se auto-inscriben en grupos (requiere modo self_enrollment en el módulo)
CREATE POLICY "Students self-enroll in group"
    ON public.module_group_members FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.module_groups g
            JOIN public.modules m ON m.id = g.module_id
            WHERE g.id = module_group_members.group_id
              AND m.groups_enrollment_mode = 'self_enrollment'
              AND g.status = 'active'
        )
    );
