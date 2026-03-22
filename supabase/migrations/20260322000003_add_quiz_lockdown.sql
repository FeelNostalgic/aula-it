-- Add is_lockdown flag to activity_steps for fullscreen exam mode
ALTER TABLE public.activity_steps
    ADD COLUMN IF NOT EXISTS is_lockdown BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.activity_steps.is_lockdown IS 'When true, quiz renders in fullscreen lockdown mode — no sidebar, no navigation.';
