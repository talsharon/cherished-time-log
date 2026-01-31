import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Title {
  id: string;
  name: string;
  color: string;
}

// Generate a random vibrant color
function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

export function useTitles() {
  const { user } = useAuth();
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTitles = useCallback(async () => {
    if (!user) {
      setTitles([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('titles')
      .select('id, name, color')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching titles:', error);
    } else {
      setTitles(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTitles();
  }, [fetchTitles]);

  const createTitle = useCallback(async (name: string, color?: string) => {
    if (!user) return null;

    const titleColor = color || generateRandomColor();

    const { data, error } = await supabase
      .from('titles')
      .insert({
        user_id: user.id,
        name,
        color: titleColor,
      })
      .select()
      .single();

    if (error) {
      // If title already exists, just return
      if (error.code === '23505') {
        return titles.find(t => t.name === name) || null;
      }
      console.error('Error creating title:', error);
      throw error;
    }

    await fetchTitles();
    return data;
  }, [user, fetchTitles, titles]);

  const updateTitleColor = useCallback(async (id: string, color: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('titles')
      .update({ color })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating title color:', error);
      throw error;
    }

    await fetchTitles();
  }, [user, fetchTitles]);

  const getColorForTitle = useCallback((titleName: string): string => {
    const title = titles.find(t => t.name === titleName);
    return title?.color || '#6B7280';
  }, [titles]);

  return { titles, loading, createTitle, updateTitleColor, getColorForTitle, refetch: fetchTitles };
}
