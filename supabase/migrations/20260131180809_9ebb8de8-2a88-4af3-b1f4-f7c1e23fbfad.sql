ALTER TABLE public.active_sessions
ADD COLUMN current_title TEXT NOT NULL DEFAULT 'Idle';

ALTER TABLE public.active_sessions
ADD COLUMN current_comment TEXT;