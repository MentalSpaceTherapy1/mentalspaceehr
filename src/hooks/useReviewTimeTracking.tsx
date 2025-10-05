import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ReviewTimeTrackingHook {
  startTracking: () => void;
  stopTracking: () => Promise<number>;
  isTracking: boolean;
  elapsedMinutes: number;
}

export const useReviewTimeTracking = (cosignatureId: string): ReviewTimeTrackingHook => {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const startTimeRef = useRef<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startTracking = () => {
    if (isTracking) return;

    startTimeRef.current = new Date();
    setIsTracking(true);

    // Update elapsed time every minute
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const now = new Date();
        const diffMs = now.getTime() - startTimeRef.current.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        setElapsedMinutes(diffMinutes);
      }
    }, 60000); // Update every minute
  };

  const stopTracking = async (): Promise<number> => {
    if (!isTracking || !startTimeRef.current) return 0;

    const endTime = new Date();
    const diffMs = endTime.getTime() - startTimeRef.current.getTime();
    const totalMinutes = Math.floor(diffMs / (1000 * 60));

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Update the database with the time spent reviewing
    try {
      const { error } = await supabase
        .from('note_cosignatures')
        .update({
          time_spent_reviewing: totalMinutes,
          reviewed_date: new Date().toISOString(),
        })
        .eq('id', cosignatureId);

      if (error) {
        console.error('Error updating review time:', error);
      }
    } catch (err) {
      console.error('Failed to save review time:', err);
    }

    // Reset tracking state
    setIsTracking(false);
    setElapsedMinutes(0);
    startTimeRef.current = null;

    return totalMinutes;
  };

  return {
    startTracking,
    stopTracking,
    isTracking,
    elapsedMinutes,
  };
};
