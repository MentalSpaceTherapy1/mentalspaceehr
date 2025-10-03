import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BlockedTime {
  id: string;
  clinician_id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  block_type: string;
  notes?: string;
  is_recurring: boolean;
  recurrence_pattern?: any;
  created_date: string;
  created_by?: string;
}

export function useBlockedTimes(clinicianId?: string) {
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchBlockedTimes = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('blocked_times')
        .select('*')
        .order('start_date', { ascending: true });

      if (clinicianId) {
        query = query.eq('clinician_id', clinicianId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setBlockedTimes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch blocked times'));
      toast({
        title: 'Error',
        description: 'Failed to fetch blocked times.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedTimes();

    const channel = supabase
      .channel('blocked_times_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_times'
        },
        () => {
          fetchBlockedTimes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicianId]);

  const createBlockedTime = async (blockedTime: Omit<BlockedTime, 'id' | 'created_date'>) => {
    try {
      const { data, error } = await supabase
        .from('blocked_times')
        .insert([blockedTime])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Blocked time created successfully.'
      });

      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create blocked time.',
        variant: 'destructive'
      });
      throw err;
    }
  };

  const updateBlockedTime = async (id: string, updates: Partial<BlockedTime>) => {
    try {
      const { data, error } = await supabase
        .from('blocked_times')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Blocked time updated successfully.'
      });

      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update blocked time.',
        variant: 'destructive'
      });
      throw err;
    }
  };

  const deleteBlockedTime = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_times')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Blocked time deleted successfully.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete blocked time.',
        variant: 'destructive'
      });
      throw err;
    }
  };

  return {
    blockedTimes,
    loading,
    error,
    createBlockedTime,
    updateBlockedTime,
    deleteBlockedTime,
    refreshBlockedTimes: fetchBlockedTimes
  };
}
