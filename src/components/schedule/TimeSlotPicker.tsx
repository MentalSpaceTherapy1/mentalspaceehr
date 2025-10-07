import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimeSlot {
  time: string;
  available: boolean;
  reason?: string;
}

interface TimeSlotPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  availableSlots?: TimeSlot[];
  showUnavailable?: boolean;
}

export function TimeSlotPicker({ 
  value, 
  onChange, 
  className,
  availableSlots,
  showUnavailable = true 
}: TimeSlotPickerProps) {
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
        
        // Check availability
        const availabilityInfo = availableSlots?.find(s => s.time === timeString);
        const isAvailable = availabilityInfo?.available ?? true;
        const unavailableReason = availabilityInfo?.reason;
        
        slots.push({ 
          value: timeString, 
          label: displayTime,
          timeOfDay,
          hour,
          available: isAvailable,
          reason: unavailableReason
        });
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();
  
  // Filter out unavailable slots if showUnavailable is false
  const filteredSlots = showUnavailable ? timeSlots : timeSlots.filter(s => s.available);
  
  // Group slots by time of day
  const groupedSlots = {
    Morning: filteredSlots.filter(s => s.timeOfDay === 'Morning'),
    Afternoon: filteredSlots.filter(s => s.timeOfDay === 'Afternoon'),
    Evening: filteredSlots.filter(s => s.timeOfDay === 'Evening')
  };

  const selectedSlot = timeSlots.find(s => s.value === value);

  return (
    <TooltipProvider>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn("h-11 font-medium", className)}>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span>{selectedSlot ? selectedSlot.label : "Select time"}</span>
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {Object.entries(groupedSlots).map(([period, slots]) => (
            slots.length > 0 && (
              <div key={period}>
                <div className="px-2 py-2 text-xs font-semibold text-muted-foreground border-b">
                  {period}
                </div>
                <div className="grid grid-cols-2 gap-1 p-2">
                  {slots.map((slot) => (
                    <Tooltip key={slot.value}>
                      <TooltipTrigger asChild>
                        <SelectItem 
                          value={slot.value}
                          disabled={!slot.available}
                          className={cn(
                            "cursor-pointer rounded-md",
                            slot.available 
                              ? "hover:bg-accent" 
                              : "opacity-50 cursor-not-allowed bg-muted"
                          )}
                        >
                          <div className="flex items-center gap-2 py-1">
                            {slot.available ? (
                              <Clock className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-destructive" />
                            )}
                            <span className={cn(
                              "font-medium",
                              !slot.available && "line-through text-muted-foreground"
                            )}>
                              {slot.label}
                            </span>
                          </div>
                        </SelectItem>
                      </TooltipTrigger>
                      {!slot.available && slot.reason && (
                        <TooltipContent>
                          <p className="text-xs">{slot.reason}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>
              </div>
            )
          ))}
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
}
