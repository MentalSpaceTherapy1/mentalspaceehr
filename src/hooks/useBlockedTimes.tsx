import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateRecurringSeries, RecurrencePattern, AppointmentBase } from '@/lib/recurringAppointments';

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
      console.log('[createBlockedTime] Creating blocked time:', blockedTime);

      // Check if this is a recurring blocked time
      if (blockedTime.is_recurring && blockedTime.recurrence_pattern) {
        return await createRecurringBlockedTimes(blockedTime);
      }

      const { data, error } = await supabase
        .from('blocked_times')
        .insert([blockedTime])
        .select()
        .single();

      if (error) {
        console.error('[createBlockedTime] Database error:', error);
        throw error;
      }

      console.log('[createBlockedTime] Blocked time created successfully:', data);

      toast({
        title: 'Success',
        description: 'Blocked time created successfully.'
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create blocked time';
      console.error('[createBlockedTime] Error:', err);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw err;
    }
  };

  const createRecurringBlockedTimes = async (blockedTime: Omit<BlockedTime, 'id' | 'created_date'>) => {
    try {
      if (!blockedTime.recurrence_pattern) {
        throw new Error('Recurrence pattern is required for recurring blocked times');
      }

      // Create base object for series generation
      const baseBlock = {
        client_id: '', // Not needed for blocked times
        clinician_id: blockedTime.clinician_id,
        appointment_date: blockedTime.start_date,
        start_time: blockedTime.start_time,
        end_time: blockedTime.end_time,
        duration: 0, // Not needed
        appointment_type: '', // Not needed
        service_location: '', // Not needed
        timezone: 'America/New_York'
      };

      // Generate series using the same logic as recurring appointments
      const series = generateRecurringSeries(baseBlock, blockedTime.recurrence_pattern);

      // Convert series to blocked time entries
      const blockedTimesArray = series.map((item, index) => ({
        clinician_id: blockedTime.clinician_id,
        title: blockedTime.title,
        block_type: blockedTime.block_type,
        start_date: item.appointment_date,
        end_date: item.appointment_date, // Same day for each occurrence
        start_time: blockedTime.start_time,
        end_time: blockedTime.end_time,
        notes: blockedTime.notes,
        is_recurring: true,
        recurrence_pattern: blockedTime.recurrence_pattern,
        created_by: blockedTime.created_by
      }));

      const { data, error } = await supabase
        .from('blocked_times')
        .insert(blockedTimesArray)
        .select();

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Created ${data.length} recurring blocked time${data.length > 1 ? 's' : ''}.`
      });

      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create recurring blocked times.',
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
    createRecurringBlockedTimes,
    updateBlockedTime,
    deleteBlockedTime,
    refreshBlockedTimes: fetchBlockedTimes
  };
}
