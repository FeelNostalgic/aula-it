-- Migration: Soporte de entregas grupales en activity_submissions
-- Añade group_id y reemplaza el UNIQUE(student_id, step_id) con dos partial unique indexes
-- para soportar tanto entregas individuales como grupales.

-- ─── 1. Añadir columna group_id ───────────────────────────────────────────────
ALTER TABLE public.activity_submissions
    ADD COLUMN IF NOT EXISTS group_id UUID
    REFERENCES public.module_groups(id) ON DELETE CASCADE;

-- ─── 2. Reemplazar constraint único ──────────────────────────────────────────
-- El constraint original (student_id, step_id) no admite filas grupales donde student_id = NULL.
ALTER TABLE public.activity_submissions
    DROP CONSTRAINT IF EXISTS activity_submissions_student_id_step_id_key;

-- Entrega individual: una por alumno por paso (cuando no hay grupo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_individual
    ON public.activity_submissions (student_id, step_id)
    WHERE group_id IS NULL;

-- Entrega grupal: una por grupo por paso
CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_group
    ON public.activity_submissions (group_id, step_id)
    WHERE group_id IS NOT NULL;

-- Índice de búsqueda por group_id
CREATE INDEX IF NOT EXISTS idx_activity_submissions_group_id
    ON public.activity_submissions (group_id)
    WHERE group_id IS NOT NULL;

-- ─── 3. RLS: extender política de alumnos para entregas grupales ──────────────
-- Necesitamos que los miembros del grupo también puedan leer/escribir la submission grupal.
-- Nota: dependiendo del nombre exacto de la política existente, puede ser necesario
-- ajustar manualmente. Añadimos una política adicional sin eliminar la existente.
CREATE POLICY "Students manage group submissions"
    ON public.activity_submissions
    FOR ALL
    USING (
        group_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.module_group_members
            WHERE group_id = activity_submissions.group_id
              AND student_id = auth.uid()
        )
    )
    WITH CHECK (
        group_id IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.module_group_members
            WHERE group_id = activity_submissions.group_id
              AND student_id = auth.uid()
        )
    );
