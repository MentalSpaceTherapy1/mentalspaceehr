import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WaitlistEntry {
  id: string;
  client_id: string;
  clinician_id?: string;
  appointment_type: string;
  preferred_days?: string[];
  preferred_times?: string[];
  priority: string;
  status: string;
  notes?: string;
  added_date: string;
  added_by?: string;
  contacted_date?: string;
  contacted_by?: string;
  removed_date?: string;
  removed_reason?: string;
}

export function useWaitlist(clinicianId?: string) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchWaitlist = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('appointment_waitlist')
        .select('*')
        .eq('status', 'Active')
        .order('priority', { ascending: false })
        .order('added_date', { ascending: true });

      if (clinicianId) {
        query = query.eq('clinician_id', clinicianId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWaitlist(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch waitlist'));
      toast({
        title: 'Error',
        description: 'Failed to fetch waitlist.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();

    const channel = supabase
      .channel('waitlist_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_waitlist'
        },
        () => {
          fetchWaitlist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicianId]);

  const addToWaitlist = async (entry: Omit<WaitlistEntry, 'id' | 'added_date' | 'status'>) => {
    try {
      const { data, error } = await supabase
        .from('appointment_waitlist')
        .insert([{ ...entry, status: 'Active' }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Client added to waitlist.'
      });

      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add to waitlist.',
        variant: 'destructive'
      });
      throw err;
    }
  };

  const updateWaitlistEntry = async (id: string, updates: Partial<WaitlistEntry>) => {
    try {
      const { data, error } = await supabase
        .from('appointment_waitlist')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Waitlist entry updated.'
      });

      return data;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update waitlist entry.',
        variant: 'destructive'
      });
      throw err;
    }
  };

  const removeFromWaitlist = async (id: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('appointment_waitlist')
        .update({
          status: 'Removed',
          removed_date: new Date().toISOString(),
          removed_reason: reason
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Client removed from waitlist.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to remove from waitlist.',
        variant: 'destructive'
      });
      throw err;
    }
  };

  const markContacted = async (id: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('appointment_waitlist')
        .update({
          contacted_date: new Date().toISOString(),
          contacted_by: userId
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Marked as contacted.'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update contact status.',
        variant: 'destructive'
      });
      throw err;
    }
  };

  return {
    waitlist,
    loading,
    error,
    addToWaitlist,
    updateWaitlistEntry,
    removeFromWaitlist,
    markContacted,
    refreshWaitlist: fetchWaitlist
  };
}
