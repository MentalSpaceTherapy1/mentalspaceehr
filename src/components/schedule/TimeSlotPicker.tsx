import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';

interface TimeSlotPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimeSlotPicker({ value, onChange, className }: TimeSlotPickerProps) {
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour < 21; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        slots.push({ value: timeString, label: displayTime });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <Clock className="mr-2 h-4 w-4 text-primary" />
        <SelectValue placeholder="Select time" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {timeSlots.map((slot) => (
          <SelectItem key={slot.value} value={slot.value}>
            {slot.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
