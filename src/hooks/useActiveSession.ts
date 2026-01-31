import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useActiveSession() {
  const { user } = useAuth();
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    if (!user) {
      setStartTime(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('active_sessions')
      .select('current_start_time')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active session:', error);
    } else if (data) {
      setStartTime(new Date(data.current_start_time));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const resetSession = useCallback(async () => {
    if (!user) return;

    const newStartTime = new Date();
    
    const { error } = await supabase
      .from('active_sessions')
      .update({ current_start_time: newStartTime.toISOString() })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error resetting session:', error);
      throw error;
    }

    setStartTime(newStartTime);
    return newStartTime;
  }, [user]);

  return { startTime, loading, resetSession, refetch: fetchSession };
}
