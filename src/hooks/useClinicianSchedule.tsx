import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TimeBlock {
  startTime: string;
  endTime: string;
  location?: string;
  appointmentTypes?: string[];
}

export interface DaySchedule {
  isWorkingDay: boolean;
  shifts: TimeBlock[];
  breakTimes: TimeBlock[];
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface ClinicianSchedule {
  id: string;
  clinicianId: string;
  weeklySchedule: WeeklySchedule;
  acceptNewClients: boolean;
  maxAppointmentsPerDay?: number;
  maxAppointmentsPerWeek?: number;
  bufferTimeBetweenAppointments: number;
  availableLocations: string[];
  effectiveStartDate: string;
  effectiveEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export const useClinicianSchedule = (clinicianId?: string) => {
  const [schedule, setSchedule] = useState<ClinicianSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchSchedule = async (id?: string) => {
    const targetId = id || clinicianId;
    if (!targetId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('clinician_schedules')
        .select('*')
        .eq('clinician_id', targetId)
        .order('effective_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setSchedule({
          id: data.id,
          clinicianId: data.clinician_id,
          weeklySchedule: data.weekly_schedule as unknown as WeeklySchedule,
          acceptNewClients: data.accept_new_clients,
          maxAppointmentsPerDay: data.max_appointments_per_day,
          maxAppointmentsPerWeek: data.max_appointments_per_week,
          bufferTimeBetweenAppointments: data.buffer_time_between_appointments,
          availableLocations: data.available_locations || [],
          effectiveStartDate: data.effective_start_date,
          effectiveEndDate: data.effective_end_date,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        });
      } else {
        setSchedule(null);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error fetching schedule',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async (scheduleData: Partial<ClinicianSchedule>) => {
    if (!clinicianId) {
      toast({
        title: 'Error',
        description: 'No clinician ID provided',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload: any = {
        clinician_id: clinicianId,
        weekly_schedule: scheduleData.weeklySchedule as any,
        accept_new_clients: scheduleData.acceptNewClients ?? true,
        max_appointments_per_day: scheduleData.maxAppointmentsPerDay,
        max_appointments_per_week: scheduleData.maxAppointmentsPerWeek,
        buffer_time_between_appointments: scheduleData.bufferTimeBetweenAppointments ?? 0,
        available_locations: scheduleData.availableLocations || [],
        effective_start_date: scheduleData.effectiveStartDate || new Date().toISOString().split('T')[0],
        effective_end_date: scheduleData.effectiveEndDate,
        updated_by: user?.id,
      };

      if (schedule?.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('clinician_schedules')
          .update(payload)
          .eq('id', schedule.id);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('clinician_schedules')
          .insert({ ...payload, created_by: user?.id });

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: 'Schedule saved successfully',
      });

      await fetchSchedule();
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Error saving schedule',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinicianId) {
      fetchSchedule();
    }
  }, [clinicianId]);

  return {
    schedule,
    loading,
    error,
    fetchSchedule,
    saveSchedule,
    refreshSchedule: fetchSchedule,
  };
};
