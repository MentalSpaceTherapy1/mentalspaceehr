import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicianSchedule, WeeklySchedule, DaySchedule, TimeBlock } from '@/hooks/useClinicianSchedule';
import { getDefaultWeeklySchedule, validateDaySchedule } from '@/lib/scheduleUtils';
import { Plus, Trash2, Clock, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClinicianScheduleEditorProps {
  clinicianId: string;
  schedule: ClinicianSchedule | null;
  loading: boolean;
  onSave: (schedule: Partial<ClinicianSchedule>) => Promise<void>;
  onRefresh: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export function ClinicianScheduleEditor({
  clinicianId,
  schedule,
  loading,
  onSave,
}: ClinicianScheduleEditorProps) {
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    schedule?.weeklySchedule || getDefaultWeeklySchedule()
  );
  const [settings, setSettings] = useState({
    acceptNewClients: schedule?.acceptNewClients ?? true,
    maxAppointmentsPerDay: schedule?.maxAppointmentsPerDay,
    maxAppointmentsPerWeek: schedule?.maxAppointmentsPerWeek,
    bufferTimeBetweenAppointments: schedule?.bufferTimeBetweenAppointments ?? 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (schedule) {
      setWeeklySchedule(schedule.weeklySchedule);
      setSettings({
        acceptNewClients: schedule.acceptNewClients,
        maxAppointmentsPerDay: schedule.maxAppointmentsPerDay,
        maxAppointmentsPerWeek: schedule.maxAppointmentsPerWeek,
        bufferTimeBetweenAppointments: schedule.bufferTimeBetweenAppointments,
      });
    }
  }, [schedule]);

  const updateDaySchedule = (day: keyof WeeklySchedule, daySchedule: DaySchedule) => {
    setWeeklySchedule((prev) => ({
      ...prev,
      [day]: daySchedule,
    }));
  };

  const addShift = (day: keyof WeeklySchedule) => {
    const daySchedule = weeklySchedule[day];
    updateDaySchedule(day, {
      ...daySchedule,
      shifts: [
        ...daySchedule.shifts,
        { startTime: '09:00', endTime: '17:00' },
      ],
    });
  };

  const removeShift = (day: keyof WeeklySchedule, index: number) => {
    const daySchedule = weeklySchedule[day];
    updateDaySchedule(day, {
      ...daySchedule,
      shifts: daySchedule.shifts.filter((_, i) => i !== index),
    });
  };

  const updateShift = (day: keyof WeeklySchedule, index: number, shift: TimeBlock) => {
    const daySchedule = weeklySchedule[day];
    const newShifts = [...daySchedule.shifts];
    newShifts[index] = shift;
    updateDaySchedule(day, {
      ...daySchedule,
      shifts: newShifts,
    });
  };

  const addBreak = (day: keyof WeeklySchedule) => {
    const daySchedule = weeklySchedule[day];
    updateDaySchedule(day, {
      ...daySchedule,
      breakTimes: [
        ...daySchedule.breakTimes,
        { startTime: '12:00', endTime: '13:00' },
      ],
    });
  };

  const removeBreak = (day: keyof WeeklySchedule, index: number) => {
    const daySchedule = weeklySchedule[day];
    updateDaySchedule(day, {
      ...daySchedule,
      breakTimes: daySchedule.breakTimes.filter((_, i) => i !== index),
    });
  };

  const updateBreak = (day: keyof WeeklySchedule, index: number, breakTime: TimeBlock) => {
    const daySchedule = weeklySchedule[day];
    const newBreaks = [...daySchedule.breakTimes];
    newBreaks[index] = breakTime;
    updateDaySchedule(day, {
      ...daySchedule,
      breakTimes: newBreaks,
    });
  };

  const handleSave = async () => {
    // Validate all days
    const errors: string[] = [];
    DAYS.forEach((day) => {
      const dayErrors = validateDaySchedule(weeklySchedule[day]);
      if (dayErrors.length > 0) {
        errors.push(`${day}: ${dayErrors.join(', ')}`);
      }
    });

    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    await onSave({
      clinicianId,
      weeklySchedule,
      ...settings,
    });
  };

  const renderDaySchedule = (day: keyof WeeklySchedule) => {
    const daySchedule = weeklySchedule[day];

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="capitalize">{day}</CardTitle>
            <Switch
              checked={daySchedule.isWorkingDay}
              onCheckedChange={(checked) =>
                updateDaySchedule(day, { ...daySchedule, isWorkingDay: checked })
              }
            />
          </div>
        </CardHeader>
        {daySchedule.isWorkingDay && (
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Work Shifts</Label>
                <Button size="sm" variant="outline" onClick={() => addShift(day)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Shift
                </Button>
              </div>
              <div className="space-y-2">
                {daySchedule.shifts.map((shift, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={shift.startTime}
                      onChange={(e) =>
                        updateShift(day, index, { ...shift, startTime: e.target.value })
                      }
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={shift.endTime}
                      onChange={(e) =>
                        updateShift(day, index, { ...shift, endTime: e.target.value })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeShift(day, index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Break Times</Label>
                <Button size="sm" variant="outline" onClick={() => addBreak(day)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Break
                </Button>
              </div>
              <div className="space-y-2">
                {daySchedule.breakTimes.map((breakTime, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={breakTime.startTime}
                      onChange={(e) =>
                        updateBreak(day, index, { ...breakTime, startTime: e.target.value })
                      }
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={breakTime.endTime}
                      onChange={(e) =>
                        updateBreak(day, index, { ...breakTime, endTime: e.target.value })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeBreak(day, index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule Settings</CardTitle>
          <CardDescription>Configure availability and appointment limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="accept-new">Accept New Clients</Label>
            <Switch
              id="accept-new"
              checked={settings.acceptNewClients}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, acceptNewClients: checked }))
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-day">Max Appointments/Day</Label>
              <Input
                id="max-day"
                type="number"
                min="0"
                value={settings.maxAppointmentsPerDay || ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxAppointmentsPerDay: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="No limit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-week">Max Appointments/Week</Label>
              <Input
                id="max-week"
                type="number"
                min="0"
                value={settings.maxAppointmentsPerWeek || ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxAppointmentsPerWeek: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
                placeholder="No limit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buffer">Buffer Time (minutes)</Label>
              <Input
                id="buffer"
                type="number"
                min="0"
                step="5"
                value={settings.bufferTimeBetweenAppointments}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    bufferTimeBetweenAppointments: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Clock className="h-5 w-5 inline mr-2" />
            Weekly Schedule
          </CardTitle>
          <CardDescription>Set work hours and break times for each day</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monday" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              {DAYS.map((day) => (
                <TabsTrigger key={day} value={day} className="capitalize">
                  {day.slice(0, 3)}
                </TabsTrigger>
              ))}
            </TabsList>
            {DAYS.map((day) => (
              <TabsContent key={day} value={day}>
                {renderDaySchedule(day)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg">
          <Save className="h-4 w-4 mr-2" />
          Save Schedule
        </Button>
      </div>
    </div>
  );
}
