-- Migration: roles de grupo, representante y diario de trabajo

-- ─── 1. Ampliar configuración de módulos ────────────────────────────────────
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname
    INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.modules'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%groups_enrollment_mode%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.modules DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE public.modules
    ADD COLUMN IF NOT EXISTS group_role_mode TEXT NOT NULL DEFAULT 'free_text';

ALTER TABLE public.modules
    ALTER COLUMN groups_enrollment_mode SET DEFAULT 'teacher_assigned';

ALTER TABLE public.modules
    ADD CONSTRAINT modules_groups_enrollment_mode_check
    CHECK (groups_enrollment_mode IN ('teacher_assigned', 'self_enrollment', 'locked'));

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.modules'::regclass
          AND conname = 'modules_group_role_mode_check'
    ) THEN
        ALTER TABLE public.modules
            ADD CONSTRAINT modules_group_role_mode_check
            CHECK (group_role_mode IN ('free_text', 'predefined'));
    END IF;
END $$;

-- ─── 2. Roles predefinidos por módulo ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_group_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_module_group_roles_updated_at
    BEFORE UPDATE ON public.module_group_roles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS idx_module_group_roles_unique_name
    ON public.module_group_roles (module_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_module_group_roles_module_id
    ON public.module_group_roles (module_id, position, created_at);

-- ─── 3. Extender grupos y membresías ────────────────────────────────────────
ALTER TABLE public.module_groups
    ADD COLUMN IF NOT EXISTS representative_student_id UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.module_group_members
    ADD COLUMN IF NOT EXISTS role_text TEXT,
    ADD COLUMN IF NOT EXISTS predefined_role_id UUID
    REFERENCES public.module_group_roles(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.module_group_members'::regclass
          AND conname = 'module_group_members_single_role_source_check'
    ) THEN
        ALTER TABLE public.module_group_members
            ADD CONSTRAINT module_group_members_single_role_source_check
            CHECK (num_nonnulls(role_text, predefined_role_id) <= 1);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_module_groups_unique_active_name
    ON public.module_groups (module_id, lower(name))
    WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_module_groups_unique_active_color
    ON public.module_groups (module_id, lower(color))
    WHERE status = 'active' AND color IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_module_group_members_unique_role_text
    ON public.module_group_members (group_id, lower(role_text))
    WHERE role_text IS NOT NULL AND btrim(role_text) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_module_group_members_unique_predefined_role
    ON public.module_group_members (group_id, predefined_role_id)
    WHERE predefined_role_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_module_groups_representative_student_id
    ON public.module_groups (representative_student_id)
    WHERE representative_student_id IS NOT NULL;

-- ─── 4. Diario de trabajo ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.module_group_work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.module_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (group_id, student_id, entry_date)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.module_group_work_logs'::regclass
          AND conname = 'module_group_work_logs_content_check'
    ) THEN
        ALTER TABLE public.module_group_work_logs
            ADD CONSTRAINT module_group_work_logs_content_check
            CHECK (char_length(btrim(content)) > 0);
    END IF;
END $$;

CREATE TRIGGER set_module_group_work_logs_updated_at
    BEFORE UPDATE ON public.module_group_work_logs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_module_group_work_logs_group_date
    ON public.module_group_work_logs (group_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_module_group_work_logs_student_date
    ON public.module_group_work_logs (student_id, entry_date DESC);

-- ─── 5. Triggers de integridad ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_group_representative_membership()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.representative_student_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.module_group_members
        WHERE group_id = NEW.id
          AND student_id = NEW.representative_student_id
    ) THEN
        RAISE EXCEPTION 'El representante debe pertenecer al grupo';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_group_representative_membership ON public.module_groups;
CREATE TRIGGER trg_validate_group_representative_membership
    BEFORE INSERT OR UPDATE OF representative_student_id ON public.module_groups
    FOR EACH ROW EXECUTE FUNCTION public.validate_group_representative_membership();

CREATE OR REPLACE FUNCTION public.clear_group_representative_on_member_removal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.module_groups
    SET representative_student_id = NULL
    WHERE id = OLD.group_id
      AND representative_student_id = OLD.student_id;

    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_group_representative_on_member_removal ON public.module_group_members;
CREATE TRIGGER trg_clear_group_representative_on_member_removal
    AFTER DELETE ON public.module_group_members
    FOR EACH ROW EXECUTE FUNCTION public.clear_group_representative_on_member_removal();

CREATE OR REPLACE FUNCTION public.validate_group_role_belongs_to_module()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    group_module_id UUID;
    role_module_id UUID;
BEGIN
    IF NEW.predefined_role_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT module_id INTO group_module_id
    FROM public.module_groups
    WHERE id = NEW.group_id;

    SELECT module_id INTO role_module_id
    FROM public.module_group_roles
    WHERE id = NEW.predefined_role_id;

    IF group_module_id IS NULL OR role_module_id IS NULL OR group_module_id <> role_module_id THEN
        RAISE EXCEPTION 'El rol predefinido no pertenece al mismo módulo que el grupo';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_group_role_belongs_to_module ON public.module_group_members;
CREATE TRIGGER trg_validate_group_role_belongs_to_module
    BEFORE INSERT OR UPDATE OF predefined_role_id, group_id ON public.module_group_members
    FOR EACH ROW EXECUTE FUNCTION public.validate_group_role_belongs_to_module();

-- ─── 6. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.module_group_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_group_work_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage module group roles"
    ON public.module_group_roles FOR ALL
    USING (public.can_teacher_view_module(module_id, auth.uid()))
    WITH CHECK (public.can_teacher_edit_module_content(module_id, auth.uid()));

CREATE POLICY "Students read module group roles"
    ON public.module_group_roles FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.module_enrollments
            WHERE module_id = module_group_roles.module_id
              AND student_id = auth.uid()
        )
    );

CREATE POLICY "Teachers read module group work logs"
    ON public.module_group_work_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.module_groups g
            WHERE g.id = module_group_work_logs.group_id
              AND public.can_teacher_view_module(g.module_id, auth.uid())
        )
    );

CREATE POLICY "Teachers manage module group work logs"
    ON public.module_group_work_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM public.module_groups g
            WHERE g.id = module_group_work_logs.group_id
              AND public.can_teacher_view_module(g.module_id, auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.module_groups g
            WHERE g.id = module_group_work_logs.group_id
              AND public.can_teacher_edit_module_content(g.module_id, auth.uid())
        )
    );

CREATE POLICY "Students manage own group work logs"
    ON public.module_group_work_logs FOR ALL
    USING (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.module_group_members
            WHERE group_id = module_group_work_logs.group_id
              AND student_id = auth.uid()
        )
    )
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.module_group_members
            WHERE group_id = module_group_work_logs.group_id
              AND student_id = auth.uid()
        )
    );
