import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlotPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeSlotPicker({ value, onChange, className }: TimeSlotPickerProps) {
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        // Determine time of day for grouping
        const timeOfDay = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
        
        slots.push({ 
          value: timeString, 
          label: displayTime,
          timeOfDay,
          hour
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  
  // Group slots by time of day
  const groupedSlots = {
    Morning: timeSlots.filter(s => s.timeOfDay === 'Morning'),
    Afternoon: timeSlots.filter(s => s.timeOfDay === 'Afternoon'),
    Evening: timeSlots.filter(s => s.timeOfDay === 'Evening')
  };

  const selectedSlot = timeSlots.find(s => s.value === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-11 font-medium", className)}>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>{selectedSlot ? selectedSlot.label : "Select time"}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-[400px]">
        {Object.entries(groupedSlots).map(([period, slots]) => (
          <div key={period}>
            <div className="px-2 py-2 text-xs font-semibold text-muted-foreground border-b">
              {period}
            </div>
            <div className="grid grid-cols-2 gap-1 p-2">
              {slots.map((slot) => (
                <SelectItem 
                  key={slot.value} 
                  value={slot.value}
                  className="cursor-pointer hover:bg-accent rounded-md"
                >
                  <div className="flex items-center gap-2 py-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{slot.label}</span>
                  </div>
                </SelectItem>
              ))}
            </div>
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
