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
  cpt_code?: string;
  icd_codes?: string[];
  is_recurring: boolean;
  recurrence_pattern?: any;
  parent_recurrence_id?: string;
  created_date: string;
  created_by: string;
  is_incident_to?: boolean;
  billed_under_provider_id?: string;
}

export const useAppointments = (
  startDate?: Date,
  endDate?: Date,
  clinicianId?: string,
  clientId?: string // Add clientId for portal context
) => {
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

    // Debounce timer for real-time updates
    let debounceTimer: NodeJS.Timeout;

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
        (payload) => {
          console.log('Real-time appointment change detected:', payload.eventType);
          // Debounce to prevent rapid re-fetches
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log('Refreshing appointments after real-time event');
            fetchAppointments();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user, startDate, endDate, clinicianId, clientId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      // Apply filters - explicit clientId takes precedence for portal users
      if (clientId) {
        console.log('[useAppointments] Filtering by client_id:', clientId);
        query = query.eq('client_id', clientId);
      }

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

      if (error) {
        console.error('[useAppointments] Error fetching appointments:', error);
        throw error;
      }

      console.log('[useAppointments] Appointments fetched:', data?.length || 0, 'appointments');
      if (data && data.length > 0) {
        console.log('[useAppointments] Sample appointment:', {
          id: data[0].id,
          client_id: data[0].client_id,
          appointment_date: data[0].appointment_date,
          status: data[0].status
        });
      }
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
      // Check for existing appointment conflicts before database operation
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, appointment_type')
        .eq('clinician_id', appointment.clinician_id)
        .eq('appointment_date', appointment.appointment_date)
        .not('status', 'in', '("Cancelled","No Show","Rescheduled")');

      if (conflicts && conflicts.length > 0) {
        const startTime = appointment.start_time.substring(0, 5);
        const endTime = appointment.end_time.substring(0, 5);
        
        const conflictingAppt = conflicts.find(appt => {
          const existingStart = appt.start_time.substring(0, 5);
          const existingEnd = appt.end_time.substring(0, 5);
          
          return (
            (startTime >= existingStart && startTime < existingEnd) ||
            (endTime > existingStart && endTime <= existingEnd) ||
            (startTime <= existingStart && endTime >= existingEnd)
          );
        });

        if (conflictingAppt) {
          throw new Error(
            `Time conflict: An appointment (${conflictingAppt.appointment_type}) already exists from ${conflictingAppt.start_time.substring(0, 5)} to ${conflictingAppt.end_time.substring(0, 5)}. Please choose a different time.`
          );
        }
      }

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
      if (appointment.service_location === 'Telehealth' && (appointment.telehealth_platform === 'Internal' || appointment.telehealth_platform === 'Twilio')) {
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

        // Create telehealth session for Internal/Twilio platform
        if (appointment.service_location === 'Telehealth' && (appointment.telehealth_platform === 'Internal' || appointment.telehealth_platform === 'Twilio') && parentData) {
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
            if (appointment.service_location === 'Telehealth' && (appointment.telehealth_platform === 'Internal' || appointment.telehealth_platform === 'Twilio')) {
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
          if (appointment.service_location === 'Telehealth' && (appointment.telehealth_platform === 'Internal' || appointment.telehealth_platform === 'Twilio') && childData) {
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

        // Create telehealth session for Internal/Twilio platform
        if (appointment.service_location === 'Telehealth' && (appointment.telehealth_platform === 'Internal' || appointment.telehealth_platform === 'Twilio') && data) {
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

      // Check for conflicts if time/date is being updated
      if (normalized.appointment_date || normalized.start_time || normalized.end_time || normalized.clinician_id) {
        const { data: currentAppt } = await supabase
          .from('appointments')
          .select('clinician_id, appointment_date, start_time, end_time')
          .eq('id', id)
          .single();

        if (currentAppt) {
          const checkClinicianId = normalized.clinician_id || currentAppt.clinician_id;
          const checkDate = normalized.appointment_date || currentAppt.appointment_date;
          const checkStartTime = normalized.start_time || currentAppt.start_time;
          const checkEndTime = normalized.end_time || currentAppt.end_time;

          const { data: conflicts } = await supabase
            .from('appointments')
            .select('id, start_time, end_time, appointment_type')
            .eq('clinician_id', checkClinicianId)
            .eq('appointment_date', checkDate)
            .neq('id', id)
            .not('status', 'in', '("Cancelled","No Show","Rescheduled")');

          if (conflicts && conflicts.length > 0) {
            const startTime = checkStartTime.substring(0, 5);
            const endTime = checkEndTime.substring(0, 5);
            
            const conflictingAppt = conflicts.find(appt => {
              const existingStart = appt.start_time.substring(0, 5);
              const existingEnd = appt.end_time.substring(0, 5);
              
              return (
                (startTime >= existingStart && startTime < existingEnd) ||
                (endTime > existingStart && endTime <= existingEnd) ||
                (startTime <= existingStart && endTime >= existingEnd)
              );
            });

            if (conflictingAppt) {
              throw new Error(
                `Time conflict: An appointment (${conflictingAppt.appointment_type}) already exists from ${conflictingAppt.start_time.substring(0, 5)} to ${conflictingAppt.end_time.substring(0, 5)}. Please choose a different time.`
              );
            }
          }
        }
      }

      // If telehealth with Internal/Twilio platform, create/ensure session
      if (normalized.service_location === 'Telehealth' && (normalized.telehealth_platform === 'Internal' || normalized.telehealth_platform === 'Twilio')) {
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
    try {
      // ✅ FIX: Set status to "No Show" if reason is "Client No Show", otherwise "Cancelled"
      const status = reason === 'Client No Show' ? 'No Show' : 'Cancelled';

      console.log('[cancelAppointment] Cancelling appointment:', { id, reason, status });

      // Direct database update instead of using updateAppointment to avoid the notification call
      const { data, error } = await supabase
        .from('appointments')
        .update({
          status,
          cancellation_reason: reason,
          cancellation_notes: notes,
          cancellation_fee_applied: applyFee || false,
          cancellation_date: new Date().toISOString(),
          cancelled_by: user?.id,
          status_updated_date: new Date().toISOString(),
          status_updated_by: user?.id,
          last_modified: new Date().toISOString(),
          last_modified_by: user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[cancelAppointment] Database error:', error);
        throw error;
      }

      console.log('[cancelAppointment] Appointment cancelled successfully:', data);

      toast({
        title: "Success",
        description: `Appointment ${status === 'No Show' ? 'marked as No Show' : 'cancelled'} successfully`
      });

      // Send notification for cancelled appointment (non-blocking - errors won't fail the cancellation)
      supabase.functions.invoke('send-appointment-notification', {
        body: {
          appointmentId: id,
          notificationType: 'cancelled'
        }
      }).then(() => {
        console.log('[cancelAppointment] Notification sent successfully');
      }).catch((notifError) => {
        console.warn('[cancelAppointment] Failed to send notification (non-critical):', notifError);
      });

      return data;
    } catch (error) {
      console.error('[cancelAppointment] Error cancelling appointment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel appointment';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw error;
    }
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
    refreshAppointments: fetchAppointments,
    refetch: fetchAppointments // Alias for consistency
  };
};
