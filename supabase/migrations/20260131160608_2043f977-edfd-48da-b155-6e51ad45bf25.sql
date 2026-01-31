-- Create titles table (reusable activity titles with colors)
CREATE TABLE public.titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create logs table (activity log entries)
CREATE TABLE public.logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'Idle',
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create active_sessions table (persistent stopwatch state)
CREATE TABLE public.active_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for titles
CREATE POLICY "Users can view their own titles" ON public.titles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own titles" ON public.titles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own titles" ON public.titles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for logs
CREATE POLICY "Users can view their own logs" ON public.logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own logs" ON public.logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs" ON public.logs
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for active_sessions
CREATE POLICY "Users can view their own active session" ON public.active_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own active session" ON public.active_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own active session" ON public.active_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to initialize user data on first signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default "Idle" title with gray color
  INSERT INTO public.titles (user_id, name, color)
  VALUES (NEW.id, 'Idle', '#6B7280');
  
  -- Create active session to start the stopwatch
  INSERT INTO public.active_sessions (user_id, current_start_time)
  VALUES (NEW.id, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to run on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();