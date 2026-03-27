-- Migration: Ampliar CHECK constraint de activity_steps.type para incluir
-- los nuevos tipos self_evaluation y peer_evaluation.

ALTER TABLE public.activity_steps
    DROP CONSTRAINT IF EXISTS activity_steps_type_check;

ALTER TABLE public.activity_steps
    ADD CONSTRAINT activity_steps_type_check
    CHECK (type IN (
        'theory',
        'animation',
        'deliverable',
        'quiz',
        'presentation',
        'resource',
        'file_upload',
        'self_evaluation',
        'peer_evaluation'
    ));
