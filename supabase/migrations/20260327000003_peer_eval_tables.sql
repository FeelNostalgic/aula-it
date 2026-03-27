-- Migration: Tablas y columnas para autoevaluación y coevaluación
-- Añade peer_evaluation_assignments y columnas de self-eval en activity_submissions.

-- ─── 1. Tabla de asignaciones de coevaluación ────────────────────────────────
-- Registra qué evaluador (alumno o grupo) evalúa qué submission de origen.
-- Generada por el profesor con generatePeerAssignments(); estable entre sesiones.
CREATE TABLE IF NOT EXISTS public.peer_evaluation_assignments (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id              UUID NOT NULL REFERENCES public.activity_steps(id) ON DELETE CASCADE,
    -- Evaluador: o alumno individual o grupo (exclusivo)
    evaluator_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    evaluator_group_id   UUID REFERENCES public.module_groups(id) ON DELETE CASCADE,
    -- Submission objetivo (el trabajo que se va a evaluar)
    target_submission_id UUID NOT NULL REFERENCES public.activity_submissions(id) ON DELETE CASCADE,
    -- Submission con la evaluación realizada (apunta a una fila de activity_submissions de tipo peer_evaluation)
    eval_submission_id   UUID REFERENCES public.activity_submissions(id) ON DELETE SET NULL,
    -- Anti-gaming
    calibration_score    NUMERIC(4,1),      -- precisión en la entrega de calibración (si aplica)
    reliability_score    NUMERIC(5,4),      -- 0.0–1.0, calculado tras cerrar evaluaciones
    is_outlier           BOOLEAN NOT NULL DEFAULT false,  -- flagged por detector de desviación estándar
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Exactamente uno de evaluator_id o evaluator_group_id debe estar presente
    CONSTRAINT chk_evaluator_xor CHECK (
        (evaluator_id IS NOT NULL AND evaluator_group_id IS NULL) OR
        (evaluator_id IS NULL AND evaluator_group_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_peer_assign_step
    ON public.peer_evaluation_assignments (step_id);

CREATE INDEX IF NOT EXISTS idx_peer_assign_evaluator
    ON public.peer_evaluation_assignments (evaluator_id)
    WHERE evaluator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_peer_assign_evaluator_group
    ON public.peer_evaluation_assignments (evaluator_group_id)
    WHERE evaluator_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_peer_assign_target
    ON public.peer_evaluation_assignments (target_submission_id);

-- ─── 2. RLS para peer_evaluation_assignments ──────────────────────────────────
ALTER TABLE public.peer_evaluation_assignments ENABLE ROW LEVEL SECURITY;

-- Alumnos ven sólo sus propias asignaciones (no quién más evalúa a quién)
CREATE POLICY "Students see own peer assignments"
    ON public.peer_evaluation_assignments FOR SELECT
    USING (
        evaluator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.module_group_members
            WHERE group_id = peer_evaluation_assignments.evaluator_group_id
              AND student_id = auth.uid()
        )
    );

-- Profesores ven todas las asignaciones de pasos en sus módulos
CREATE POLICY "Teachers see all peer assignments"
    ON public.peer_evaluation_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM public.activity_steps s
            JOIN public.activity_phases p ON p.id = s.phase_id
            JOIN public.activities a ON a.id = p.activity_id
            JOIN public.units u ON u.id = a.unit_id
            WHERE s.id = peer_evaluation_assignments.step_id
              AND public.can_teacher_view_module(u.module_id, auth.uid())
        )
    );

-- ─── 3. Columnas de autoevaluación en activity_submissions ────────────────────
-- Almacenan la autoevaluación del alumno junto a su submission normal.
ALTER TABLE public.activity_submissions
    ADD COLUMN IF NOT EXISTS self_eval_rubric_scores  JSONB,   -- {criteriaId: points}
    ADD COLUMN IF NOT EXISTS self_eval_justifications JSONB,   -- {criteriaId: "texto justificación"}
    ADD COLUMN IF NOT EXISTS peer_eval_override_score NUMERIC(4,1); -- override manual del profesor sobre la nota de pares
