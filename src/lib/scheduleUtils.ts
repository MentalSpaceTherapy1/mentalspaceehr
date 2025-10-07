import { WeeklySchedule, DaySchedule, TimeBlock } from '@/hooks/useClinicianSchedule';
import { ScheduleException } from '@/hooks/useScheduleExceptions';

export const getDefaultWeeklySchedule = (): WeeklySchedule => ({
  monday: getDefaultDaySchedule(),
  tuesday: getDefaultDaySchedule(),
  wednesday: getDefaultDaySchedule(),
  thursday: getDefaultDaySchedule(),
  friday: getDefaultDaySchedule(),
  saturday: { isWorkingDay: false, shifts: [], breakTimes: [] },
  sunday: { isWorkingDay: false, shifts: [], breakTimes: [] },
});

export const getDefaultDaySchedule = (): DaySchedule => ({
  isWorkingDay: true,
  shifts: [
    {
      startTime: '09:00',
      endTime: '17:00',
    },
  ],
  breakTimes: [
    {
      startTime: '12:00',
      endTime: '13:00',
    },
  ],
});

export const calculateAvailableMinutes = (schedule: WeeklySchedule): number => {
  let totalMinutes = 0;

  Object.values(schedule).forEach((daySchedule) => {
    if (!daySchedule.isWorkingDay) return;

    daySchedule.shifts.forEach((shift) => {
      const start = parseTime(shift.startTime);
      const end = parseTime(shift.endTime);
      totalMinutes += end - start;
    });

    daySchedule.breakTimes.forEach((breakTime) => {
      const start = parseTime(breakTime.startTime);
      const end = parseTime(breakTime.endTime);
      totalMinutes -= end - start;
    });
  });

  return totalMinutes;
};

export const parseTime = (timeString: string): number => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const isTimeInShift = (time: string, shift: TimeBlock): boolean => {
  const timeMinutes = parseTime(time);
  const shiftStart = parseTime(shift.startTime);
  const shiftEnd = parseTime(shift.endTime);
  return timeMinutes >= shiftStart && timeMinutes <= shiftEnd;
};

export const isTimeInBreak = (time: string, breakTimes: TimeBlock[]): boolean => {
  const timeMinutes = parseTime(time);
  return breakTimes.some((breakTime) => {
    const breakStart = parseTime(breakTime.startTime);
    const breakEnd = parseTime(breakTime.endTime);
    return timeMinutes >= breakStart && timeMinutes < breakEnd;
  });
};

export const getDayName = (date: Date): keyof WeeklySchedule => {
  const days: (keyof WeeklySchedule)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[date.getDay()];
};

export const isClinicianAvailable = (
  date: Date,
  time: string,
  schedule: WeeklySchedule,
  exceptions: ScheduleException[]
): { available: boolean; reason?: string } => {
  // Check for approved exceptions
  const dateString = date.toISOString().split('T')[0];
  const exception = exceptions.find(
    (ex) =>
      ex.status === 'Approved' &&
      dateString >= ex.startDate &&
      dateString <= ex.endDate &&
      (ex.allDay || (time >= (ex.startTime || '00:00') && time <= (ex.endTime || '23:59')))
  );

  if (exception) {
    return { available: false, reason: `Time off: ${exception.reason}` };
  }

  // Check weekly schedule
  const dayName = getDayName(date);
  const daySchedule = schedule[dayName];

  if (!daySchedule.isWorkingDay) {
    return { available: false, reason: 'Not a working day' };
  }

  // Check if time is in any shift
  const inShift = daySchedule.shifts.some((shift) => isTimeInShift(time, shift));
  if (!inShift) {
    return { available: false, reason: 'Outside working hours' };
  }

  // Check if time is in break
  const inBreak = isTimeInBreak(time, daySchedule.breakTimes);
  if (inBreak) {
    return { available: false, reason: 'Break time' };
  }

  return { available: true };
};

export const getWorkingDaysInWeek = (schedule: WeeklySchedule): string[] => {
  return Object.entries(schedule)
    .filter(([_, daySchedule]) => daySchedule.isWorkingDay)
    .map(([day]) => day);
};

export const validateTimeBlock = (block: TimeBlock): string | null => {
  if (!block.startTime || !block.endTime) {
    return 'Start and end times are required';
  }

  const start = parseTime(block.startTime);
  const end = parseTime(block.endTime);

  if (start >= end) {
    return 'End time must be after start time';
  }

  return null;
};

export const validateDaySchedule = (daySchedule: DaySchedule): string[] => {
  const errors: string[] = [];

  if (!daySchedule.isWorkingDay) return errors;

  if (daySchedule.shifts.length === 0) {
    errors.push('At least one shift is required for working days');
    return errors;
  }

  // Validate each shift
  daySchedule.shifts.forEach((shift, index) => {
    const error = validateTimeBlock(shift);
    if (error) {
      errors.push(`Shift ${index + 1}: ${error}`);
    }
  });

  // Validate each break
  daySchedule.breakTimes.forEach((breakTime, index) => {
    const error = validateTimeBlock(breakTime);
    if (error) {
      errors.push(`Break ${index + 1}: ${error}`);
    }
  });

  // Check for overlapping shifts
  for (let i = 0; i < daySchedule.shifts.length; i++) {
    for (let j = i + 1; j < daySchedule.shifts.length; j++) {
      const shift1Start = parseTime(daySchedule.shifts[i].startTime);
      const shift1End = parseTime(daySchedule.shifts[i].endTime);
      const shift2Start = parseTime(daySchedule.shifts[j].startTime);
      const shift2End = parseTime(daySchedule.shifts[j].endTime);

      if (
        (shift1Start < shift2End && shift1End > shift2Start) ||
        (shift2Start < shift1End && shift2End > shift1Start)
      ) {
        errors.push(`Shifts ${i + 1} and ${j + 1} overlap`);
      }
    }
  }

  return errors;
};
