import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_TIME = 2 * 60 * 1000; // Show warning 2 minutes before timeout

export const useSessionTimeout = () => {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  };

  const resetTimer = () => {
    clearTimers();
    setShowWarning(false);

    if (!user) return;

    // Set warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      toast.warning('Your session will expire in 2 minutes due to inactivity.');
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      toast.error('Session expired due to inactivity. Please sign in again.');
      signOut();
    }, INACTIVITY_TIMEOUT);
  };

  const handleActivity = () => {
    if (user) {
      resetTimer();
    }
  };

  const extendSession = () => {
    setShowWarning(false);
    resetTimer();
    toast.success('Session extended');
  };

  useEffect(() => {
    if (!user) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    // Start timer when user logs in
    resetTimer();

    // Activity event listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [user]);

  return {
    showWarning,
    extendSession,
  };
};
