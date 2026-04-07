CREATE TABLE IF NOT EXISTS public.unit_map_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'branch' CHECK (type IN ('start', 'branch', 'merge', 'end')),
    label TEXT NOT NULL DEFAULT 'Bifurcación',
    description TEXT,
    position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unit_map_nodes_unit_id
    ON public.unit_map_nodes(unit_id);

ALTER TABLE public.unit_map_nodes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS handle_unit_map_nodes_updated_at ON public.unit_map_nodes;
CREATE TRIGGER handle_unit_map_nodes_updated_at
BEFORE UPDATE ON public.unit_map_nodes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "Teachers and enrolled students can read unit map nodes"
ON public.unit_map_nodes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.units u
        JOIN public.modules m ON m.id = u.module_id
        WHERE u.id = unit_map_nodes.unit_id
          AND (
              public.can_teacher_view_module(u.module_id, auth.uid())
              OR EXISTS (
                  SELECT 1
                  FROM public.module_enrollments me
                  WHERE me.module_id = u.module_id
                    AND me.student_id = auth.uid()
              )
          )
    )
);

CREATE POLICY "Teachers can manage unit map nodes"
ON public.unit_map_nodes
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.units u
        WHERE u.id = unit_map_nodes.unit_id
          AND public.can_teacher_edit_module_content(u.module_id, auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.units u
        WHERE u.id = unit_map_nodes.unit_id
          AND public.can_teacher_edit_module_content(u.module_id, auth.uid())
    )
);

ALTER TABLE public.activity_connections
    ADD COLUMN IF NOT EXISTS source_map_node_id UUID REFERENCES public.unit_map_nodes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS target_map_node_id UUID REFERENCES public.unit_map_nodes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS route_label TEXT,
    ADD COLUMN IF NOT EXISTS route_type TEXT NOT NULL DEFAULT 'required';

ALTER TABLE public.activity_connections
    ALTER COLUMN source_activity_id DROP NOT NULL,
    ALTER COLUMN target_activity_id DROP NOT NULL;

ALTER TABLE public.activity_connections
    DROP CONSTRAINT IF EXISTS activity_connections_source_endpoint_check,
    ADD CONSTRAINT activity_connections_source_endpoint_check
        CHECK (num_nonnulls(source_activity_id, source_map_node_id) = 1);

ALTER TABLE public.activity_connections
    DROP CONSTRAINT IF EXISTS activity_connections_target_endpoint_check,
    ADD CONSTRAINT activity_connections_target_endpoint_check
        CHECK (num_nonnulls(target_activity_id, target_map_node_id) = 1);

ALTER TABLE public.activity_connections
    DROP CONSTRAINT IF EXISTS activity_connections_route_type_check,
    ADD CONSTRAINT activity_connections_route_type_check
        CHECK (route_type IN ('required', 'optional', 'reinforcement', 'extension'));

CREATE INDEX IF NOT EXISTS idx_activity_connections_source_map_node
    ON public.activity_connections(source_map_node_id)
    WHERE source_map_node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_connections_target_map_node
    ON public.activity_connections(target_map_node_id)
    WHERE target_map_node_id IS NOT NULL;
