import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ACTIVE_SESSION_POLL_MS = 15_000;
const LOCAL_EDIT_GRACE_MS = 5_000;

export function useActiveSession() {
  const { user } = useAuth();
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [tacticalStartTime, setTacticalStartTime] = useState<Date | null>(null);
  const [currentTitle, setCurrentTitle] = useState('Idle');
  const [currentComment, setCurrentComment] = useState('');
  const [loading, setLoading] = useState(true);
  const lastLocalWriteAt = useRef(0);

  const markLocalWrite = useCallback(() => {
    lastLocalWriteAt.current = Date.now();
  }, []);

  const fetchSession = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;

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

    // Discard background results that could clobber a just-made local edit
    if (silent && Date.now() - lastLocalWriteAt.current < LOCAL_EDIT_GRACE_MS) {
      return;
    }

    if (error) {
      console.error('Error fetching active session:', error);
    } else if (data) {
      const nextStart = new Date(data.current_start_time);
      const nextTactical = data.tactical_start_time
        ? new Date(data.tactical_start_time)
        : new Date(data.current_start_time);
      const nextTitle = data.current_title || 'Idle';
      const nextComment = data.current_comment || '';

      setStartTime((prev) => (prev?.getTime() === nextStart.getTime() ? prev : nextStart));
      setTacticalStartTime((prev) => (prev?.getTime() === nextTactical.getTime() ? prev : nextTactical));
      setCurrentTitle((prev) => (prev === nextTitle ? prev : nextTitle));
      setCurrentComment((prev) => (prev === nextComment ? prev : nextComment));
    }

    if (!silent) setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Poll every 15s while the tab is visible, plus refresh on visibility/focus,
  // so changes made on another device show up here.
  useEffect(() => {
    if (!user) return;

    const silentFetch = () => { void fetchSession({ silent: true }); };

    const interval = setInterval(() => {
      if (!document.hidden) silentFetch();
    }, ACTIVE_SESSION_POLL_MS);

    const onVisibility = () => {
      if (!document.hidden) silentFetch();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', silentFetch);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', silentFetch);
    };
  }, [user, fetchSession]);

  const updateTitle = useCallback(async (title: string) => {
    setCurrentTitle(title);
    markLocalWrite();
    if (!user) return;

    await supabase
      .from('active_sessions')
      .update({ current_title: title })
      .eq('user_id', user.id);
    markLocalWrite();
  }, [user, markLocalWrite]);

  const updateComment = useCallback(async (comment: string) => {
    setCurrentComment(comment);
    markLocalWrite();
    if (!user) return;

    await supabase
      .from('active_sessions')
      .update({ current_comment: comment })
      .eq('user_id', user.id);
    markLocalWrite();
  }, [user, markLocalWrite]);

  const resetSession = useCallback(async () => {
    if (!user) return;

    const newStartTime = new Date();
    markLocalWrite();

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

    markLocalWrite();
    setStartTime(newStartTime);
    setTacticalStartTime(newStartTime);
    setCurrentTitle('Idle');
    setCurrentComment('');
    return newStartTime;
  }, [user, markLocalWrite]);

  const resetTacticalTimer = useCallback(async () => {
    const newTime = new Date();
    setTacticalStartTime(newTime);
    markLocalWrite();
    if (!user) return;

    await supabase
      .from('active_sessions')
      .update({ tactical_start_time: newTime.toISOString() })
      .eq('user_id', user.id);
    markLocalWrite();
  }, [user, markLocalWrite]);

  const updateStartTime = useCallback(async (newStartTime: Date) => {
    setStartTime(newStartTime);
    markLocalWrite();
    if (!user) return;

    await supabase
      .from('active_sessions')
      .update({ current_start_time: newStartTime.toISOString() })
      .eq('user_id', user.id);
    markLocalWrite();
  }, [user, markLocalWrite]);

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
