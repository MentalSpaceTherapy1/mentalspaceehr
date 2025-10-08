import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { generateRecurringSeries } from '@/lib/recurringAppointments';
import { format, addMinutes, parse } from 'date-fns';

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
  is_incident_to?: boolean;
  billed_under_provider_id?: string;
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

  const validateAgainstSchedule = async (
    clinicianId: string,
    appointmentDate: string,
    startTime: string,
    endTime: string
  ): Promise<{ valid: boolean; reason?: string }> => {
    try {
      // Call the database function to validate
      const { data, error } = await supabase.rpc('validate_appointment_schedule', {
        p_clinician_id: clinicianId,
        p_appointment_date: appointmentDate,
        p_start_time: startTime,
        p_end_time: endTime,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return {
          valid: data[0].is_valid,
          reason: data[0].reason,
        };
      }

      return { valid: true };
    } catch (err) {
      console.error('Schedule validation error:', err);
      // Don't block appointment creation on validation errors (backward compatibility)
      return { valid: true };
    }
  };

  const checkCapacity = async (
    clinicianId: string,
    appointmentDate: string
  ): Promise<{ withinLimit: boolean; current: number; max?: number }> => {
    try {
      // Get clinician schedule to check max appointments
      const { data: schedule } = await supabase
        .from('clinician_schedules')
        .select('max_appointments_per_day')
        .eq('clinician_id', clinicianId)
        .lte('effective_start_date', appointmentDate)
        .or(`effective_end_date.is.null,effective_end_date.gte.${appointmentDate}`)
        .order('effective_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!schedule?.max_appointments_per_day) {
        return { withinLimit: true, current: 0 };
      }

      // Count existing appointments for that day
      const { data: existingAppts, error } = await supabase
        .from('appointments')
        .select('id')
        .eq('clinician_id', clinicianId)
        .eq('appointment_date', appointmentDate)
        .not('status', 'in', '("Cancelled","No Show")');

      if (error) throw error;

      const current = existingAppts?.length || 0;
      const withinLimit = current < schedule.max_appointments_per_day;

      return {
        withinLimit,
        current,
        max: schedule.max_appointments_per_day,
      };
    } catch (err) {
      console.error('Capacity check error:', err);
      return { withinLimit: true, current: 0 };
    }
  };

  const createAppointment = async (appointment: any) => {
    try {
      // Validate against clinician schedule
      const scheduleValidation = await validateAgainstSchedule(
        appointment.clinician_id,
        appointment.appointment_date,
        appointment.start_time,
        appointment.end_time
      );

      if (!scheduleValidation.valid) {
        throw new Error(`Schedule conflict: ${scheduleValidation.reason}`);
      }

      // Check capacity limits
      const capacityCheck = await checkCapacity(
        appointment.clinician_id,
        appointment.appointment_date
      );

      if (!capacityCheck.withinLimit) {
        throw new Error(
          `Daily appointment limit reached (${capacityCheck.current}/${capacityCheck.max}). Please choose a different date.`
        );
      }

      // Handle telehealth session creation for Internal platform
      let telehealthLink = appointment.telehealth_link;
      if (appointment.service_location === 'Telehealth' && appointment.telehealth_platform === 'Internal') {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        telehealthLink = `/telehealth/session/${sessionId}`;
      }

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
          telehealth_link: telehealthLink,
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

        // Create telehealth session for Internal platform
        if (appointment.service_location === 'Telehealth' && appointment.telehealth_platform === 'Internal' && parentData) {
          await supabase
            .from('telehealth_sessions')
            .insert({
              appointment_id: parentData.id,
              host_id: parentData.clinician_id,
              session_id: telehealthLink.split('/').pop(),
              status: 'waiting'
            });
        }

        // Insert remaining appointments with parent reference
        if (series.length > 1) {
          const childAppointments = series.slice(1).map(apt => {
            // Generate unique telehealth link for each occurrence
            let aptTelehealthLink = null;
            if (appointment.service_location === 'Telehealth' && appointment.telehealth_platform === 'Internal') {
              const uniqueSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              aptTelehealthLink = `/telehealth/session/${uniqueSessionId}`;
            }
            
            return {
              ...apt,
              telehealth_link: aptTelehealthLink,
              is_recurring: true,
              recurrence_pattern: appointment.recurrence_pattern,
              parent_recurrence_id: parentData.id,
              is_group_session: appointment.is_group_session || false,
              max_participants: appointment.max_participants,
              current_participants: appointment.current_participants || 1,
              created_by: user?.id,
              last_modified_by: user?.id,
            };
          });

          const { data: childData, error: childError } = await supabase
            .from('appointments')
            .insert(childAppointments)
            .select();

          if (childError) throw childError;

          // Create telehealth sessions for all child appointments
          if (appointment.service_location === 'Telehealth' && appointment.telehealth_platform === 'Internal' && childData) {
            const sessions = childData.map(apt => ({
              appointment_id: apt.id,
              host_id: apt.clinician_id,
              session_id: apt.telehealth_link!.split('/').pop()!,
              status: 'waiting'
            }));
            
            await supabase.from('telehealth_sessions').insert(sessions);
          }
        }

        toast({
          title: "Success",
          description: `Created ${series.length} recurring appointments`,
        });

        // Send notification for created appointment
        try {
          await supabase.functions.invoke('send-appointment-notification', {
            body: {
              appointmentId: parentData.id,
              notificationType: 'created'
            }
          });
        } catch (notifError) {
          console.error('Failed to send appointment notification:', notifError);
        }

        return parentData;
      } else {
        // Single appointment
        const { data, error } = await supabase
          .from('appointments')
          .insert([{
            ...appointment,
            telehealth_link: telehealthLink,
            is_group_session: appointment.is_group_session || false,
            max_participants: appointment.max_participants,
            current_participants: appointment.current_participants || 1,
            created_by: user?.id,
            last_modified_by: user?.id
          }])
          .select()
          .single();

        if (error) throw error;

        // Create telehealth session for Internal platform
        if (appointment.service_location === 'Telehealth' && appointment.telehealth_platform === 'Internal' && data) {
          await supabase
            .from('telehealth_sessions')
            .insert({
              appointment_id: data.id,
              host_id: data.clinician_id,
              session_id: telehealthLink.split('/').pop(),
              status: 'waiting'
            });
        }
        
        toast({
          title: "Success",
          description: "Appointment created successfully"
        });

        // Send notification for created appointment
        try {
          await supabase.functions.invoke('send-appointment-notification', {
            body: {
              appointmentId: data.id,
              notificationType: 'created'
            }
          });
        } catch (notifError) {
          console.error('Failed to send appointment notification:', notifError);
        }
        
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
      // Normalize time fields to HH:mm:ss if provided
      const normalized: any = { ...updates };
      if (typeof normalized.start_time === 'string' && normalized.start_time.length === 5) {
        normalized.start_time = `${normalized.start_time}:00`;
      }
      if (typeof normalized.end_time === 'string' && normalized.end_time.length === 5) {
        normalized.end_time = `${normalized.end_time}:00`;
      }

      // If telehealth with Internal platform, create/ensure session
      if (normalized.service_location === 'Telehealth' && normalized.telehealth_platform === 'Internal') {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if session exists
        const { data: existingSession } = await supabase
          .from('telehealth_sessions')
          .select('id, session_id')
          .eq('appointment_id', id)
          .maybeSingle();

        if (!existingSession) {
          // Create new session
          await supabase
            .from('telehealth_sessions')
            .insert({
              appointment_id: id,
              host_id: normalized.clinician_id,
              session_id: sessionId,
              status: 'waiting'
            });
          
          normalized.telehealth_link = `/telehealth/session/${sessionId}`;
        }
      }

      const { data, error } = await supabase
        .from('appointments')
        .update({
          ...normalized,
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

      // Send notification for updated appointment
      try {
        await supabase.functions.invoke('send-appointment-notification', {
          body: {
            appointmentId: id,
            notificationType: 'updated'
          }
        });
      } catch (notifError) {
        console.error('Failed to send appointment notification:', notifError);
      }
      
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

  // Deletions are prevented at database level - use cancellation instead

  const updateRecurringSeries = async (parentId: string, updates: any) => {
    try {
      // Get all appointments in the series
      const { data: seriesAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select('id')
        .or(`id.eq.${parentId},parent_recurrence_id.eq.${parentId}`);

      if (fetchError) throw fetchError;

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

      // Send notifications for each appointment in the series
      if (seriesAppointments && seriesAppointments.length > 0) {
        for (const appointment of seriesAppointments) {
          try {
            await supabase.functions.invoke('send-appointment-notification', {
              body: {
                appointmentId: appointment.id,
                notificationType: 'updated'
              }
            });
          } catch (notifError) {
            console.error('Failed to send notification for appointment:', appointment.id, notifError);
          }
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update recurring series",
        variant: "destructive"
      });
      throw err;
    }
  };

  const cancelAppointment = async (id: string, reason: string, notes?: string, applyFee?: boolean) => {
    const result = await updateAppointment(id, {
      status: 'Cancelled',
      cancellation_reason: reason,
      cancellation_notes: notes,
      cancellation_fee_applied: applyFee || false,
      cancellation_date: new Date().toISOString(),
      cancelled_by: user?.id,
      status_updated_date: new Date().toISOString(),
      status_updated_by: user?.id
    });

    // Send notification for cancelled appointment
    try {
      await supabase.functions.invoke('send-appointment-notification', {
        body: {
          appointmentId: id,
          notificationType: 'cancelled'
        }
      });
    } catch (notifError) {
      console.error('Failed to send appointment notification:', notifError);
    }

    return result;
  };

  const cancelRecurringSeries = async (parentId: string, reason: string, notes?: string, applyFee?: boolean) => {
    try {
      const now = new Date().toISOString();
      const today = new Date().toISOString().split('T')[0];
      
      // Get all future appointments in the series before canceling
      const { data: futureAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select('id')
        .or(`id.eq.${parentId},parent_recurrence_id.eq.${parentId}`)
        .gte('appointment_date', today)
        .neq('status', 'Cancelled');

      if (fetchError) throw fetchError;
      
      // Cancel all future appointments in the series
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'Cancelled',
          cancellation_reason: reason,
          cancellation_notes: notes,
          cancellation_fee_applied: applyFee || false,
          cancellation_date: now,
          cancelled_by: user?.id,
          status_updated_date: now,
          status_updated_by: user?.id,
          last_modified: now,
          last_modified_by: user?.id
        })
        .or(`id.eq.${parentId},parent_recurrence_id.eq.${parentId}`)
        .gte('appointment_date', today)
        .neq('status', 'Cancelled');

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Cancelled ${futureAppointments?.length || 0} future appointments`
      });

      // Send notifications for each cancelled appointment
      if (futureAppointments && futureAppointments.length > 0) {
        for (const appointment of futureAppointments) {
          try {
            await supabase.functions.invoke('send-appointment-notification', {
              body: {
                appointmentId: appointment.id,
                notificationType: 'cancelled'
              }
            });
          } catch (notifError) {
            console.error('Failed to send notification for appointment:', appointment.id, notifError);
          }
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel recurring series",
        variant: "destructive"
      });
      throw err;
    }
  };

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateAppointment,
    updateRecurringSeries,
    cancelAppointment,
    cancelRecurringSeries,
    refreshAppointments: fetchAppointments
  };
};
