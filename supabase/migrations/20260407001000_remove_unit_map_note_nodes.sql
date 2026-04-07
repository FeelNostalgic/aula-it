UPDATE public.unit_map_nodes
SET type = 'branch',
    label = CASE WHEN label = 'Nota' THEN 'Bifurcación' ELSE label END
WHERE type = 'note';

ALTER TABLE public.unit_map_nodes
    DROP CONSTRAINT IF EXISTS unit_map_nodes_type_check,
    ADD CONSTRAINT unit_map_nodes_type_check
        CHECK (type IN ('start', 'branch', 'merge', 'end'));
