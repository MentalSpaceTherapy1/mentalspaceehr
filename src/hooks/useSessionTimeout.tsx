import { useEffect, useState } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const PROMPT_BEFORE_IDLE = 2 * 60 * 1000; // 2 minute warning

export const useSessionTimeout = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);

  const onIdle = () => {
    console.log('[SessionTimeout] User idle - logging out');
    setShowWarning(false);
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity.',
      variant: 'destructive',
    });
    signOut();
  };

  const onPrompt = () => {
    console.log('[SessionTimeout] Showing inactivity warning');
    setShowWarning(true);
  };

  const onActive = () => {
    console.log('[SessionTimeout] User active - hiding warning');
    setShowWarning(false);
  };

  const { activate } = useIdleTimer({
    timeout: IDLE_TIMEOUT,
    promptTimeout: PROMPT_BEFORE_IDLE,
    onIdle,
    onPrompt,
    onActive,
    throttle: 500,
    disabled: !user, // Only track when logged in
  });

  const extendSession = () => {
    console.log('[SessionTimeout] Session extended by user');
    setShowWarning(false);
    activate();
  };

  return {
    showWarning,
    extendSession
  };
};
