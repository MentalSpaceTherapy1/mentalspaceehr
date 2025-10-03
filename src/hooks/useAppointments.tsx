import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { generateRecurringSeries } from '@/lib/recurringAppointments';

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
  parent_recurrence_id?: string;
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
      // Check if this is a recurring appointment
      if (appointment.is_recurring && appointment.recurrence_pattern) {
        // Generate the series
        const baseAppointment = {
          client_id: appointment.client_id,
          clinician_id: appointment.clinician_id,
          appointment_date: appointment.appointment_date,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          duration: appointment.duration,
          appointment_type: appointment.appointment_type,
          service_location: appointment.service_location,
          office_location_id: appointment.office_location_id,
          room: appointment.room,
          appointment_notes: appointment.appointment_notes,
          client_notes: appointment.client_notes,
          telehealth_platform: appointment.telehealth_platform,
          telehealth_link: appointment.telehealth_link,
          cpt_code: appointment.cpt_code,
          icd_codes: appointment.icd_codes,
          timezone: appointment.timezone,
        };

        const series = generateRecurringSeries(baseAppointment, appointment.recurrence_pattern);

        // Insert the first appointment as the parent
        const { data: parentData, error: parentError } = await supabase
          .from('appointments')
          .insert([{
            ...series[0],
            is_recurring: true,
            recurrence_pattern: appointment.recurrence_pattern,
            is_group_session: appointment.is_group_session || false,
            max_participants: appointment.max_participants,
            current_participants: appointment.current_participants || 1,
            created_by: user?.id,
            last_modified_by: user?.id,
          }])
          .select()
          .single();

        if (parentError) throw parentError;

        // Insert remaining appointments with parent reference
        if (series.length > 1) {
          const childAppointments = series.slice(1).map(apt => ({
            ...apt,
            is_recurring: true,
            recurrence_pattern: appointment.recurrence_pattern,
            parent_recurrence_id: parentData.id,
            is_group_session: appointment.is_group_session || false,
            max_participants: appointment.max_participants,
            current_participants: appointment.current_participants || 1,
            created_by: user?.id,
            last_modified_by: user?.id,
          }));

          const { error: childError } = await supabase
            .from('appointments')
            .insert(childAppointments);

          if (childError) throw childError;
        }

        toast({
          title: "Success",
          description: `Created ${series.length} recurring appointments`,
        });

        return parentData;
      } else {
        // Single appointment
        const { data, error } = await supabase
          .from('appointments')
          .insert([{
            ...appointment,
            is_group_session: appointment.is_group_session || false,
            max_participants: appointment.max_participants,
            current_participants: appointment.current_participants || 1,
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
      }
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

  const deleteRecurringSeries = async (parentId: string) => {
    try {
      // Delete all appointments in the series
      const { error } = await supabase
        .from('appointments')
        .delete()
        .or(`id.eq.${parentId},parent_recurrence_id.eq.${parentId}`);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Recurring series deleted successfully"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete recurring series",
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateRecurringSeries = async (parentId: string, updates: any) => {
    try {
      // Update all appointments in the series
      const { error } = await supabase
        .from('appointments')
        .update({
          ...updates,
          last_modified: new Date().toISOString(),
          last_modified_by: user?.id
        })
        .or(`id.eq.${parentId},parent_recurrence_id.eq.${parentId}`);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Recurring series updated successfully"
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update recurring series",
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
    deleteRecurringSeries,
    updateRecurringSeries,
    cancelAppointment,
    refreshAppointments: fetchAppointments
  };
};
