-- Add tactical_start_time column to active_sessions
ALTER TABLE public.active_sessions
ADD COLUMN tactical_start_time timestamp with time zone DEFAULT now();

-- Update handle_new_user function to initialize tactical_start_time
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.titles (user_id, name, color)
  VALUES (NEW.id, 'Idle', '#6B7280');
  
  INSERT INTO public.active_sessions (user_id, current_start_time, tactical_start_time)
  VALUES (NEW.id, now(), now());
  
  RETURN NEW;
END;
$function$;