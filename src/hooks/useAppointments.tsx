import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Appointment {
  id: string;
  client_id: string;
  clinician_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  timezone: string;
  appointment_type: string;
  service_location: string;
  office_location_id?: string;
  room?: string;
  status: string;
  appointment_notes?: string;
  client_notes?: string;
  telehealth_link?: string;
  telehealth_platform?: string;
  is_recurring: boolean;
  recurrence_pattern?: any;
  created_date: string;
  created_by: string;
}

export const useAppointments = (startDate?: Date, endDate?: Date, clinicianId?: string) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchAppointments();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, startDate, endDate, clinicianId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (startDate) {
        query = query.gte('appointment_date', startDate.toISOString().split('T')[0]);
      }
      if (endDate) {
        query = query.lte('appointment_date', endDate.toISOString().split('T')[0]);
      }
      if (clinicianId) {
        query = query.eq('clinician_id', clinicianId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (appointment: any) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          ...appointment,
          created_by: user?.id,
          last_modified_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Appointment created successfully"
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create appointment';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateAppointment = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          ...updates,
          last_modified: new Date().toISOString(),
          last_modified_by: user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Appointment updated successfully"
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update appointment';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Appointment deleted successfully"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete appointment",
        variant: "destructive"
      });
      throw err;
    }
  };

  const cancelAppointment = async (id: string, reason: string, notes?: string) => {
    return updateAppointment(id, {
      status: 'Cancelled',
      status_updated_date: new Date().toISOString(),
      status_updated_by: user?.id,
      cancelled_by: user?.id
    });
  };

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    cancelAppointment,
    refreshAppointments: fetchAppointments
  };
};
