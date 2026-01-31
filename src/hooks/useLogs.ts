import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Log {
  id: string;
  start_time: string;
  duration: number;
  title: string;
  comment: string | null;
  created_at: string;
}

export function useLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching logs:', error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const createLog = useCallback(async (startTime: Date, duration: number, title: string = 'Idle') => {
    if (!user) return;

    const { error } = await supabase
      .from('logs')
      .insert({
        user_id: user.id,
        start_time: startTime.toISOString(),
        duration,
        title,
      });

    if (error) {
      console.error('Error creating log:', error);
      throw error;
    }

    await fetchLogs();
  }, [user, fetchLogs]);

  const updateLog = useCallback(async (id: string, updates: { title?: string; comment?: string }) => {
    if (!user) return;

    const { error } = await supabase
      .from('logs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating log:', error);
      throw error;
    }

    await fetchLogs();
  }, [user, fetchLogs]);

  return { logs, loading, createLog, updateLog, refetch: fetchLogs };
}
