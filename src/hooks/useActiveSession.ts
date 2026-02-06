import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useActiveSession() {
  const { user } = useAuth();
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [tacticalStartTime, setTacticalStartTime] = useState<Date | null>(null);
  const [currentTitle, setCurrentTitle] = useState('Idle');
  const [currentComment, setCurrentComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    if (!user) {
      setStartTime(null);
      setCurrentTitle('Idle');
      setCurrentComment('');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('active_sessions')
      .select('current_start_time, current_title, current_comment, tactical_start_time')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active session:', error);
    } else if (data) {
      setStartTime(new Date(data.current_start_time));
      setTacticalStartTime(data.tactical_start_time ? new Date(data.tactical_start_time) : new Date(data.current_start_time));
      setCurrentTitle(data.current_title || 'Idle');
      setCurrentComment(data.current_comment || '');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const updateTitle = useCallback(async (title: string) => {
    setCurrentTitle(title);
    if (!user) return;

    await supabase
      .from('active_sessions')
      .update({ current_title: title })
      .eq('user_id', user.id);
  }, [user]);

  const updateComment = useCallback(async (comment: string) => {
    setCurrentComment(comment);
    if (!user) return;

    await supabase
      .from('active_sessions')
      .update({ current_comment: comment })
      .eq('user_id', user.id);
  }, [user]);

  const resetSession = useCallback(async () => {
    if (!user) return;

    const newStartTime = new Date();
    
    const { error } = await supabase
      .from('active_sessions')
      .update({ 
        current_start_time: newStartTime.toISOString(),
        current_title: 'Idle',
        current_comment: null,
        tactical_start_time: newStartTime.toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error resetting session:', error);
      throw error;
    }

    setStartTime(newStartTime);
    setTacticalStartTime(newStartTime);
    setCurrentTitle('Idle');
    setCurrentComment('');
    return newStartTime;
  }, [user]);

  const resetTacticalTimer = useCallback(async () => {
    const newTime = new Date();
    setTacticalStartTime(newTime);
    if (!user) return;

    await supabase
      .from('active_sessions')
      .update({ tactical_start_time: newTime.toISOString() })
      .eq('user_id', user.id);
  }, [user]);

  const updateStartTime = useCallback(async (newStartTime: Date) => {
    setStartTime(newStartTime);
    if (!user) return;

    await supabase
      .from('active_sessions')
      .update({ current_start_time: newStartTime.toISOString() })
      .eq('user_id', user.id);
  }, [user]);

  return { 
    startTime, 
    tacticalStartTime,
    currentTitle,
    currentComment,
    loading, 
    resetSession, 
    resetTacticalTimer,
    updateTitle,
    updateComment,
    updateStartTime,
    refetch: fetchSession 
  };
}
