import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScreenProtectionProps {
  sessionId: string;
  userId: string;
}

export const ScreenProtection = ({ sessionId, userId }: ScreenProtectionProps) => {
  useEffect(() => {
    const logSecurityEvent = async (eventType: string, description: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
      await supabase.from('telehealth_security_events').insert({
        session_id: sessionId,
        user_id: userId,
        event_type: eventType,
        event_description: description,
        severity,
        ip_address: '', // Would need external service to get real IP
        user_agent: navigator.userAgent,
        device_fingerprint: '', // Would implement device fingerprinting
        metadata: {}
      });
    };

    // Prevent screenshot attempts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        logSecurityEvent(
          'screenshot_attempt',
          'User attempted to take screenshot using PrintScreen',
          'high'
        );
      }
      
      // Windows: Win + PrtScr, Win + Shift + S
      if ((e.metaKey || e.ctrlKey) && e.key === 'PrintScreen') {
        e.preventDefault();
        logSecurityEvent(
          'screenshot_attempt',
          'User attempted to take screenshot using keyboard shortcut',
          'high'
        );
      }

      // Mac: Cmd + Shift + 3/4/5
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        logSecurityEvent(
          'screenshot_attempt',
          'User attempted to take screenshot using Mac shortcut',
          'high'
        );
      }
    };

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logSecurityEvent(
        'context_menu_attempt',
        'User attempted to open context menu',
        'low'
      );
    };

    // Prevent text selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    // Detect when tab loses visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent(
          'session_tab_hidden',
          'User switched away from session tab',
          'medium'
        );
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // CSS-based protection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [sessionId, userId]);

  return null; // This is a behavior-only component
};
