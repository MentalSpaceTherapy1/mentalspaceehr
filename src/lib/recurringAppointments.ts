import { addDays, addWeeks, addMonths, format, getDay, isBefore, isAfter } from 'date-fns';

export interface RecurrencePattern {
  frequency: 'Daily' | 'Weekly' | 'TwiceWeekly' | 'Biweekly' | 'Monthly';
  interval: number;
  daysOfWeek?: string[];
  endDate?: Date;
  numberOfOccurrences?: number;
}

export interface AppointmentBase {
  client_id: string;
  clinician_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  appointment_type: string;
  service_location: string;
  office_location_id?: string;
  room?: string;
  appointment_notes?: string;
  client_notes?: string;
  telehealth_platform?: string;
  telehealth_link?: string;
  cpt_code?: string;
  icd_codes?: string[];
  timezone: string;
}

const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

/**
 * Generate all occurrences of a recurring appointment
 */
export function generateRecurringSeries(
  baseAppointment: AppointmentBase,
  recurrencePattern: RecurrencePattern
): AppointmentBase[] {
  const series: AppointmentBase[] = [];
  const startDate = new Date(baseAppointment.appointment_date);
  let currentDate = new Date(startDate);
  let occurrenceCount = 0;

  const maxOccurrences = recurrencePattern.numberOfOccurrences || 52; // Default to 1 year
  const endDate = recurrencePattern.endDate || addMonths(startDate, 12);

  while (occurrenceCount < maxOccurrences && isBefore(currentDate, endDate)) {
    // For weekly/twice weekly/biweekly with specific days
    if (
      (recurrencePattern.frequency === 'Weekly' || 
       recurrencePattern.frequency === 'TwiceWeekly' || 
       recurrencePattern.frequency === 'Biweekly') &&
      recurrencePattern.daysOfWeek &&
      recurrencePattern.daysOfWeek.length > 0
    ) {
      const currentWeekStart = currentDate;
      const weeksToAdd = 
        recurrencePattern.frequency === 'Biweekly' ? 2 : 
        recurrencePattern.frequency === 'TwiceWeekly' ? 1 : 1;

      // Generate appointments for selected days in this week/period
      recurrencePattern.daysOfWeek.forEach((day) => {
        const targetDay = DAY_MAP[day];
        const currentDay = getDay(currentWeekStart);
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        const appointmentDate = addDays(currentWeekStart, daysUntilTarget);

        if (
          !isBefore(appointmentDate, startDate) &&
          isBefore(appointmentDate, endDate) &&
          occurrenceCount < maxOccurrences
        ) {
          series.push({
            ...baseAppointment,
            appointment_date: format(appointmentDate, 'yyyy-MM-dd'),
          });
          occurrenceCount++;
        }
      });

      currentDate = addWeeks(currentWeekStart, weeksToAdd * recurrencePattern.interval);
    } else {
      // Daily or Monthly (or Weekly/Biweekly without specific days)
      if (occurrenceCount > 0 || isBefore(currentDate, endDate)) {
        series.push({
          ...baseAppointment,
          appointment_date: format(currentDate, 'yyyy-MM-dd'),
        });
        occurrenceCount++;
      }

      // Move to next occurrence
      switch (recurrencePattern.frequency) {
        case 'Daily':
          currentDate = addDays(currentDate, recurrencePattern.interval);
          break;
        case 'Weekly':
        case 'TwiceWeekly':
          currentDate = addWeeks(currentDate, recurrencePattern.interval);
          break;
        case 'Biweekly':
          currentDate = addWeeks(currentDate, 2 * recurrencePattern.interval);
          break;
        case 'Monthly':
          currentDate = addMonths(currentDate, recurrencePattern.interval);
          break;
      }
    }

    // Safety check to prevent infinite loops
    if (occurrenceCount > 1000) {
      break;
    }
  }

  return series;
}

/**
 * Check if an appointment is part of a recurring series
 */
export function isRecurringAppointment(appointment: any): boolean {
  return appointment.is_recurring === true || !!appointment.parent_recurrence_id;
}

/**
 * Get the display label for recurrence pattern
 */
export function getRecurrenceLabel(pattern: RecurrencePattern): string {
  const { frequency, interval, daysOfWeek, endDate, numberOfOccurrences } = pattern;

  let label = `Every ${interval > 1 ? interval : ''}`;

  switch (frequency) {
    case 'Daily':
      label += ` day${interval > 1 ? 's' : ''}`;
      break;
    case 'Weekly':
      label += ` week${interval > 1 ? 's' : ''}`;
      if (daysOfWeek && daysOfWeek.length > 0) {
        label += ` on ${daysOfWeek.join(', ')}`;
      }
      break;
    case 'TwiceWeekly':
      label = 'Twice a week';
      if (daysOfWeek && daysOfWeek.length > 0) {
        label += ` on ${daysOfWeek.join(' and ')}`;
      }
      break;
    case 'Biweekly':
      label += ` 2 weeks`;
      if (daysOfWeek && daysOfWeek.length > 0) {
        label += ` on ${daysOfWeek.join(', ')}`;
      }
      break;
    case 'Monthly':
      label += ` month${interval > 1 ? 's' : ''}`;
      break;
  }

  if (endDate) {
    label += ` until ${format(new Date(endDate), 'MMM d, yyyy')}`;
  } else if (numberOfOccurrences) {
    label += `, ${numberOfOccurrences} occurrences`;
  }

  return label;
}
