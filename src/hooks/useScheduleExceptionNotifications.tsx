import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useScheduleExceptionNotifications = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPendingCount = async () => {
    setLoading(true);
    try {
      const { count, error } = await supabase
        .from('schedule_exceptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Requested', 'Pending']);

      if (error) throw error;
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending exceptions:', error);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCount();

    // Set up realtime subscription
    const channel = supabase
      .channel('schedule-exceptions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedule_exceptions',
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    pendingCount,
    loading,
    refresh: fetchPendingCount,
  };
};
