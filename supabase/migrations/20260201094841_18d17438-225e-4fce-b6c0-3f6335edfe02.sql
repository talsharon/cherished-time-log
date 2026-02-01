-- Create categories table for AI-discovered activity categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create weekly_insights table for AI analysis results
CREATE TABLE public.weekly_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary TEXT NOT NULL,
  insights TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  graphs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories
CREATE POLICY "Users can view their own categories"
ON public.categories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
ON public.categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
ON public.categories
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for weekly_insights
CREATE POLICY "Users can view their own insights"
ON public.weekly_insights
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own insights"
ON public.weekly_insights
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
ON public.weekly_insights
FOR UPDATE
USING (auth.uid() = user_id);