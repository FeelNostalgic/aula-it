-- Progression engine: explicit step completion, one-time XP ledger, and strict navigation settings.

ALTER TABLE public.activity_steps
    ADD COLUMN IF NOT EXISTS xp_award_trigger TEXT
    CHECK (xp_award_trigger IN ('submit', 'grade'));

ALTER TABLE public.activities
    ADD COLUMN IF NOT EXISTS navigation_mode TEXT NOT NULL DEFAULT 'free'
    CHECK (navigation_mode IN ('free', 'strict'));

ALTER TABLE public.units
    ADD COLUMN IF NOT EXISTS activity_navigation_mode TEXT NOT NULL DEFAULT 'free'
    CHECK (activity_navigation_mode IN ('free', 'restricted'));

ALTER TABLE public.units
    ADD COLUMN IF NOT EXISTS activity_unlock_rule TEXT NOT NULL DEFAULT 'required_steps'
    CHECK (activity_unlock_rule IN ('required_steps', 'percentage'));

ALTER TABLE public.units
    ADD COLUMN IF NOT EXISTS activity_unlock_threshold INTEGER NOT NULL DEFAULT 100
    CHECK (activity_unlock_threshold BETWEEN 1 AND 100);

CREATE TABLE IF NOT EXISTS public.step_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES public.activity_steps(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, step_id)
);

ALTER TABLE public.step_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage own step completions" ON public.step_completions;
CREATE POLICY "Students can manage own step completions"
    ON public.step_completions
    FOR ALL
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read step completions for their activities" ON public.step_completions;
CREATE POLICY "Teachers can read step completions for their activities"
    ON public.step_completions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.activity_steps s
            JOIN public.activity_phases p ON p.id = s.phase_id
            JOIN public.activities a ON a.id = p.activity_id
            JOIN public.units u ON u.id = a.unit_id
            JOIN public.modules m ON m.id = u.module_id
            WHERE s.id = step_completions.step_id
              AND m.teacher_id = auth.uid()
        )
    );

CREATE TABLE IF NOT EXISTS public.step_xp_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES public.activity_steps(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.module_groups(id) ON DELETE SET NULL,
    submission_id UUID REFERENCES public.activity_submissions(id) ON DELETE SET NULL,
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    awarded_xp INTEGER NOT NULL CHECK (awarded_xp >= 0),
    award_reason TEXT NOT NULL CHECK (award_reason IN ('view', 'complete', 'submit', 'grade')),
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (step_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_step_xp_awards_student_id
    ON public.step_xp_awards (student_id);

CREATE INDEX IF NOT EXISTS idx_step_xp_awards_group_id
    ON public.step_xp_awards (group_id)
    WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_step_xp_awards_submission_id
    ON public.step_xp_awards (submission_id)
    WHERE submission_id IS NOT NULL;

ALTER TABLE public.step_xp_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read own step xp awards" ON public.step_xp_awards;
CREATE POLICY "Students can read own step xp awards"
    ON public.step_xp_awards
    FOR SELECT
    USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Teachers can read step xp awards for their activities" ON public.step_xp_awards;
CREATE POLICY "Teachers can read step xp awards for their activities"
    ON public.step_xp_awards
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.modules m
            WHERE m.id = step_xp_awards.module_id
              AND m.teacher_id = auth.uid()
        )
    );

CREATE OR REPLACE FUNCTION public.is_submission_step_type(step_type TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT COALESCE(step_type, '') IN (
        'deliverable',
        'file_upload',
        'quiz',
        'self_evaluation',
        'peer_evaluation'
    );
$$;

CREATE OR REPLACE FUNCTION public.apply_unit_milestone_xp(
    p_unit_id UUID,
    p_xp INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_remaining_xp INTEGER := GREATEST(COALESCE(p_xp, 0), 0);
    v_milestone RECORD;
    v_fill_amount INTEGER;
BEGIN
    IF p_unit_id IS NULL OR v_remaining_xp <= 0 THEN
        RETURN;
    END IF;

    FOR v_milestone IN
        SELECT id, target_points, current_points, status
        FROM public.class_milestones
        WHERE unit_id = p_unit_id
          AND status IN ('active', 'completed')
        ORDER BY order_index ASC, created_at ASC
    LOOP
        EXIT WHEN v_remaining_xp <= 0;

        v_fill_amount := LEAST(
            v_remaining_xp,
            GREATEST(v_milestone.target_points - v_milestone.current_points, 0)
        );

        IF v_fill_amount > 0 THEN
            UPDATE public.class_milestones
            SET current_points = current_points + v_fill_amount,
                status = CASE
                    WHEN current_points + v_fill_amount >= target_points THEN 'completed'
                    ELSE status
                END,
                updated_at = now()
            WHERE id = v_milestone.id;

            v_remaining_xp := v_remaining_xp - v_fill_amount;
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_step_xp_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.awarded_xp <= 0 THEN
        RETURN NEW;
    END IF;

    UPDATE public.profiles
    SET global_xp = COALESCE(global_xp, 0) + NEW.awarded_xp
    WHERE id = NEW.student_id;

    UPDATE public.module_enrollments
    SET module_xp = COALESCE(module_xp, 0) + NEW.awarded_xp
    WHERE student_id = NEW.student_id
      AND module_id = NEW.module_id;

    PERFORM public.apply_unit_milestone_xp(NEW.unit_id, NEW.awarded_xp);

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_step_xp_once(
    p_step_id UUID,
    p_student_id UUID,
    p_group_id UUID,
    p_award_reason TEXT,
    p_submission_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_step RECORD;
BEGIN
    SELECT
        s.id,
        s.type,
        s.xp,
        s.completion_mode,
        COALESCE(s.xp_award_trigger, 'grade') AS xp_award_trigger,
        a.id AS activity_id,
        u.id AS unit_id,
        u.module_id
    INTO v_step
    FROM public.activity_steps s
    JOIN public.activity_phases p ON p.id = s.phase_id
    JOIN public.activities a ON a.id = p.activity_id
    JOIN public.units u ON u.id = a.unit_id
    WHERE s.id = p_step_id;

    IF NOT FOUND OR COALESCE(v_step.xp, 0) <= 0 THEN
        RETURN;
    END IF;

    IF p_award_reason = 'view' THEN
        IF v_step.completion_mode IS DISTINCT FROM 'viewable' THEN
            RETURN;
        END IF;
    ELSIF p_award_reason = 'complete' THEN
        IF v_step.completion_mode IS DISTINCT FROM 'required'
           OR public.is_submission_step_type(v_step.type) THEN
            RETURN;
        END IF;
    ELSIF p_award_reason IN ('submit', 'grade') THEN
        IF NOT public.is_submission_step_type(v_step.type) THEN
            RETURN;
        END IF;
    ELSE
        RETURN;
    END IF;

    IF p_group_id IS NOT NULL THEN
        INSERT INTO public.step_xp_awards (
            step_id,
            student_id,
            group_id,
            submission_id,
            activity_id,
            unit_id,
            module_id,
            awarded_xp,
            award_reason
        )
        SELECT
            p_step_id,
            member.student_id,
            p_group_id,
            p_submission_id,
            v_step.activity_id,
            v_step.unit_id,
            v_step.module_id,
            v_step.xp,
            p_award_reason
        FROM public.module_group_members member
        JOIN public.module_groups grp ON grp.id = member.group_id
        WHERE member.group_id = p_group_id
          AND grp.status = 'active'
        ON CONFLICT (step_id, student_id) DO NOTHING;

        RETURN;
    END IF;

    IF p_student_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.step_xp_awards (
        step_id,
        student_id,
        group_id,
        submission_id,
        activity_id,
        unit_id,
        module_id,
        awarded_xp,
        award_reason
    )
    VALUES (
        p_step_id,
        p_student_id,
        NULL,
        p_submission_id,
        v_step.activity_id,
        v_step.unit_id,
        v_step.module_id,
        v_step.xp,
        p_award_reason
    )
    ON CONFLICT (step_id, student_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_step_view_xp_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.award_step_xp_once(
        NEW.step_id,
        NEW.student_id,
        NULL,
        'view',
        NULL
    );

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_step_completion_xp_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.award_step_xp_once(
        NEW.step_id,
        NEW.student_id,
        NULL,
        'complete',
        NULL
    );

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_submission_xp_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_award_trigger TEXT;
    v_old_status TEXT;
BEGIN
    SELECT COALESCE(xp_award_trigger, 'grade')
    INTO v_award_trigger
    FROM public.activity_steps
    WHERE id = NEW.step_id;

    v_old_status := CASE
        WHEN TG_OP = 'UPDATE' THEN OLD.status
        ELSE NULL
    END;

    IF v_award_trigger = 'submit' THEN
        IF NEW.status IN ('submitted', 'graded', 'published')
           AND COALESCE(v_old_status, 'pending') NOT IN ('submitted', 'graded', 'published') THEN
            PERFORM public.award_step_xp_once(
                NEW.step_id,
                NEW.student_id,
                NEW.group_id,
                'submit',
                NEW.id
            );
        END IF;
    ELSE
        IF NEW.status IN ('graded', 'published')
           AND COALESCE(v_old_status, 'pending') NOT IN ('graded', 'published') THEN
            PERFORM public.award_step_xp_once(
                NEW.step_id,
                NEW.student_id,
                NEW.group_id,
                'grade',
                NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_step_xp_award ON public.step_xp_awards;
CREATE TRIGGER trg_apply_step_xp_award
    AFTER INSERT ON public.step_xp_awards
    FOR EACH ROW
    EXECUTE FUNCTION public.apply_step_xp_award();

DROP TRIGGER IF EXISTS trg_step_view_xp_award ON public.step_views;
CREATE TRIGGER trg_step_view_xp_award
    AFTER INSERT ON public.step_views
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_step_view_xp_award();

DROP TRIGGER IF EXISTS trg_step_completion_xp_award ON public.step_completions;
CREATE TRIGGER trg_step_completion_xp_award
    AFTER INSERT ON public.step_completions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_step_completion_xp_award();

DROP TRIGGER IF EXISTS on_activity_submission_graded ON public.activity_submissions;
DROP TRIGGER IF EXISTS trg_submission_xp_award ON public.activity_submissions;
CREATE TRIGGER trg_submission_xp_award
    AFTER INSERT OR UPDATE OF status ON public.activity_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_submission_xp_award();
