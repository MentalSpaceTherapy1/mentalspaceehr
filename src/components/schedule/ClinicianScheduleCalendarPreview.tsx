import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklySchedule } from '@/hooks/useClinicianSchedule';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';

interface ClinicianScheduleCalendarPreviewProps {
  schedule: WeeklySchedule;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function ClinicianScheduleCalendarPreview({ schedule }: ClinicianScheduleCalendarPreviewProps) {
  const startHour = 6; // Start at 6 AM
  const endHour = 22; // End at 10 PM
  const totalMinutes = (endHour - startHour) * 60;

  const getPosition = (time: string) => {
    const minutes = timeToMinutes(time) - startHour * 60;
    return (minutes / totalMinutes) * 100;
  };

  const getHeight = (startTime: string, endTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = endMinutes - startMinutes;
    return (duration / totalMinutes) * 100;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return format(date, 'h:mm a');
  };

  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Weekly Schedule Preview
        </CardTitle>
        <CardDescription>
          Visual representation of working hours, breaks, and time blocks
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/20 border-2 border-primary rounded" />
            <span className="text-sm">Working Hours</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-200 border-2 border-orange-500 rounded" />
            <span className="text-sm">Break Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 border-2 border-gray-400 rounded" />
            <span className="text-sm">Not Working</span>
          </div>
        </div>

        <div className="grid grid-cols-8 gap-2 mt-6">
          {/* Time column */}
          <div className="space-y-2">
            <div className="h-16 flex items-center justify-center font-semibold text-sm">
              Time
            </div>
            {Array.from({ length: endHour - startHour + 1 }, (_, i) => {
              const hour = startHour + i;
              const date = new Date();
              date.setHours(hour, 0);
              return (
                <div key={hour} className="h-16 flex items-start justify-end pr-2 text-xs text-muted-foreground">
                  {format(date, 'h a')}
                </div>
              );
            })}
          </div>

          {/* Days columns */}
          {DAYS.map((day, dayIndex) => {
            const daySchedule = schedule[day];
            const dayDate = addDays(startOfCurrentWeek, dayIndex);

            return (
              <div key={day} className="relative">
                <div className="h-16 flex flex-col items-center justify-center border-b-2 border-primary/20">
                  <div className="font-semibold text-sm capitalize">{day.slice(0, 3)}</div>
                  <div className="text-xs text-muted-foreground">{format(dayDate, 'MMM d')}</div>
                </div>

                <div
                  className="relative border-l border-gray-200"
                  style={{ height: `${(endHour - startHour + 1) * 64}px` }}
                >
                  {/* Grid lines */}
                  {Array.from({ length: endHour - startHour }, (_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-b border-gray-100"
                      style={{ top: `${(i + 1) * 64}px` }}
                    />
                  ))}

                  {!daySchedule.isWorkingDay ? (
                    <div className="absolute inset-0 bg-gray-200/50 flex items-center justify-center">
                      <Badge variant="outline" className="bg-white">Not Working</Badge>
                    </div>
                  ) : (
                    <>
                      {/* Working shifts as light background */}
                      {daySchedule.shifts.map((shift, index) => {
                        const top = getPosition(shift.startTime);
                        const height = getHeight(shift.startTime, shift.endTime);
                        
                        return (
                          <div
                            key={`shift-${index}`}
                            className="absolute w-full bg-primary/10 border-l-4 border-primary"
                            style={{
                              top: `${top}%`,
                              height: `${height}%`,
                            }}
                            title={`Working: ${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`}
                          />
                        );
                      })}

                      {/* Break times */}
                      {daySchedule.breakTimes.map((breakTime, index) => {
                        const top = getPosition(breakTime.startTime);
                        const height = getHeight(breakTime.startTime, breakTime.endTime);
                        
                        return (
                          <div
                            key={`break-${index}`}
                            className="absolute w-full bg-orange-200 border-l-4 border-orange-500 flex items-center justify-center z-10"
                            style={{
                              top: `${top}%`,
                              height: `${height}%`,
                            }}
                            title={`Break: ${formatTime(breakTime.startTime)} - ${formatTime(breakTime.endTime)}`}
                          >
                            <div className="text-xs font-semibold text-orange-800 text-center px-1">
                              Break
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
