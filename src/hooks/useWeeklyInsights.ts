import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface GraphDataPoint {
  name: string;
  value: number;
  date?: string;
}

interface Graph {
  title: string;
  type: 'pie' | 'bar' | 'line';
  data: GraphDataPoint[];
}

export interface WeeklyInsight {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  summary: string;
  insights: string;
  recommendations: string;
  graphs: Graph[];
  created_at: string;
}

export function useWeeklyInsights() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['weekly-insights', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('weekly_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false });

      if (error) throw error;
      
      // Cast the graphs field from Json to our Graph[] type
      return (data || []).map(insight => ({
        ...insight,
        graphs: insight.graphs as unknown as Graph[],
      })) as WeeklyInsight[];
    },
    enabled: !!user,
  });
}

export function useGenerateInsights() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate insights');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-insights'] });
      toast({
        title: 'Insights Generated',
        description: 'Your weekly analysis is ready!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
