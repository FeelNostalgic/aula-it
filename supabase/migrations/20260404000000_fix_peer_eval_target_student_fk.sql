-- Fix target_student_id FK for peer evaluation intra-group assignments.
-- The app resolves target_student_id against public.profiles(id), not auth.users(id).

DO $$
DECLARE
    existing_constraint_name text;
BEGIN
    SELECT con.conname
    INTO existing_constraint_name
    FROM pg_constraint con
    JOIN pg_class rel
      ON rel.oid = con.conrelid
    JOIN pg_namespace nsp
      ON nsp.oid = rel.relnamespace
    JOIN pg_attribute att
      ON att.attrelid = rel.oid
     AND att.attnum = ANY (con.conkey)
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'peer_evaluation_assignments'
      AND con.contype = 'f'
      AND att.attname = 'target_student_id'
    LIMIT 1;

    IF existing_constraint_name IS NOT NULL THEN
        EXECUTE format(
            'ALTER TABLE public.peer_evaluation_assignments DROP CONSTRAINT %I',
            existing_constraint_name
        );
    END IF;
END $$;

ALTER TABLE public.peer_evaluation_assignments
    ADD CONSTRAINT peer_evaluation_assignments_target_student_id_fkey
    FOREIGN KEY (target_student_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;
