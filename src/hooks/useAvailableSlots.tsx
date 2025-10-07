import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addMinutes, parse, isBefore, isAfter } from 'date-fns';
import { getDayName, isClinicianAvailable } from '@/lib/scheduleUtils';
import { WeeklySchedule } from '@/hooks/useClinicianSchedule';
import { ScheduleException } from '@/hooks/useScheduleExceptions';

interface AvailableSlot {
  time: string;
  available: boolean;
  reason?: string;
}

export const useAvailableSlots = (
  clinicianId?: string,
  date?: Date,
  duration: number = 50
) => {
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clinicianId && date) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [clinicianId, date, duration]);

  const fetchAvailableSlots = async () => {
    if (!clinicianId || !date) return;

    setLoading(true);
    try {
      const dateString = format(date, 'yyyy-MM-dd');

      // Fetch clinician schedule
      const { data: scheduleData } = await supabase
        .from('clinician_schedules')
        .select('weekly_schedule, buffer_time_between_appointments')
        .eq('clinician_id', clinicianId)
        .lte('effective_start_date', dateString)
        .or(`effective_end_date.is.null,effective_end_date.gte.${dateString}`)
        .order('effective_start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch schedule exceptions
      const { data: exceptionsData } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .eq('clinician_id', clinicianId)
        .eq('status', 'Approved')
        .lte('start_date', dateString)
        .gte('end_date', dateString);

      // Fetch existing appointments
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('start_time, end_time, duration')
        .eq('clinician_id', clinicianId)
        .eq('appointment_date', dateString)
        .not('status', 'in', '("Cancelled","No Show")');

      if (!scheduleData) {
        // No schedule configured - show all slots
        setAvailableSlots(generateAllTimeSlots());
        setLoading(false);
        return;
      }

      const weeklySchedule = scheduleData.weekly_schedule as unknown as WeeklySchedule;
      const bufferTime = scheduleData.buffer_time_between_appointments || 0;
      const exceptions = (exceptionsData || []).map((ex) => ({
        id: ex.id,
        clinicianId: ex.clinician_id,
        exceptionType: ex.exception_type,
        startDate: ex.start_date,
        endDate: ex.end_date,
        startTime: ex.start_time,
        endTime: ex.end_time,
        allDay: ex.all_day,
        reason: ex.reason,
        notes: ex.notes,
        status: ex.status as 'Approved',
        createdAt: ex.created_at,
        updatedAt: ex.updated_at,
      })) as ScheduleException[];

      const dayName = getDayName(date);
      const daySchedule = weeklySchedule[dayName];

      if (!daySchedule.isWorkingDay) {
        setAvailableSlots([]);
        setLoading(false);
        return;
      }

      // Generate time slots based on shifts
      const slots: AvailableSlot[] = [];

      daySchedule.shifts.forEach((shift) => {
        const shiftStart = parse(shift.startTime, 'HH:mm', date);
        const shiftEnd = parse(shift.endTime, 'HH:mm', date);

        let currentTime = shiftStart;
        while (isBefore(currentTime, shiftEnd)) {
          const timeString = format(currentTime, 'HH:mm');
          const endTime = addMinutes(currentTime, duration);

          // Check if slot is available
          const availability = isClinicianAvailable(date, timeString, weeklySchedule, exceptions);

          // Check if it's during a break
          const duringBreak = daySchedule.breakTimes.some((breakTime) => {
            const breakStart = parse(breakTime.startTime, 'HH:mm', date);
            const breakEnd = parse(breakTime.endTime, 'HH:mm', date);
            return !isBefore(currentTime, breakStart) && isBefore(currentTime, breakEnd);
          });

          // Check if conflicts with existing appointment (including buffer)
          const conflictsWithAppointment = (appointmentsData || []).some((apt) => {
            const aptStart = parse(apt.start_time, 'HH:mm', date);
            const aptEnd = addMinutes(parse(apt.end_time, 'HH:mm', date), bufferTime);
            return (
              (!isBefore(currentTime, aptStart) && isBefore(currentTime, aptEnd)) ||
              (isAfter(endTime, aptStart) && !isAfter(endTime, aptEnd))
            );
          });

          // Check if appointment would extend past shift end
          const extendsOutsideShift = isAfter(endTime, shiftEnd);

          let available = availability.available && !duringBreak && !conflictsWithAppointment && !extendsOutsideShift;
          let reason: string | undefined;

          if (!availability.available) {
            reason = availability.reason;
          } else if (duringBreak) {
            reason = 'Break time';
          } else if (conflictsWithAppointment) {
            reason = 'Already booked';
          } else if (extendsOutsideShift) {
            reason = 'Extends past working hours';
          }

          slots.push({
            time: timeString,
            available,
            reason,
          });

          currentTime = addMinutes(currentTime, 15); // 15-minute increments
        }
      });

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots(generateAllTimeSlots());
    } finally {
      setLoading(false);
    }
  };

  const generateAllTimeSlots = (): AvailableSlot[] => {
    const slots: AvailableSlot[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({ time: timeString, available: true });
      }
    }
    return slots;
  };

  return {
    availableSlots,
    loading,
    refreshSlots: fetchAvailableSlots,
  };
};
