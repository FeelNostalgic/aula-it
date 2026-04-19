ALTER TABLE public.activity_steps
    ADD COLUMN IF NOT EXISTS audience_mode TEXT NOT NULL DEFAULT 'all'
    CHECK (audience_mode IN ('all', 'restricted'));

ALTER TABLE public.activity_steps
    ADD COLUMN IF NOT EXISTS visible_student_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.activity_steps
    ADD COLUMN IF NOT EXISTS visible_group_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.activity_steps
    ADD COLUMN IF NOT EXISTS inherit_audience_from_parent BOOLEAN NOT NULL DEFAULT false;

UPDATE public.activity_steps
SET inherit_audience_from_parent = true
WHERE parent_step_id IS NOT NULL
  AND inherit_audience_from_parent = false;

COMMENT ON COLUMN public.activity_steps.audience_mode IS
    'Visibilidad por audiencia del paso: all (todos) o restricted (alumnos/grupos seleccionados).';

COMMENT ON COLUMN public.activity_steps.visible_student_ids IS
    'Lista explícita de alumnos que pueden ver el paso cuando audience_mode=restricted.';

COMMENT ON COLUMN public.activity_steps.visible_group_ids IS
    'Lista de grupos que pueden ver el paso cuando audience_mode=restricted.';

COMMENT ON COLUMN public.activity_steps.inherit_audience_from_parent IS
    'Si true y existe parent_step_id, el paso hijo hereda la audiencia efectiva del paso padre.';
