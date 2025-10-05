import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LockDetails {
  id: string;
  note_id: string;
  note_type: string;
  is_locked: boolean;
  locked_date: string | null;
  lock_reason: string | null;
  status: string;
  days_overdue: number | null;
  due_date: string;
  unlock_requested: boolean;
  unlock_approved: boolean | null;
  unlock_expires_at: string | null;
}

export const useNoteLockStatus = (noteId: string | null, noteType: string) => {
  const [isLocked, setIsLocked] = useState(false);
  const [lockDetails, setLockDetails] = useState<LockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkLockStatus = async () => {
      if (!noteId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('note_compliance_status')
          .select('*')
          .eq('note_id', noteId)
          .eq('note_type', noteType)
          .maybeSingle();
        
        if (error) throw error;
        
        setIsLocked(data?.is_locked || false);
        setLockDetails(data);
      } catch (error) {
        console.error('Error checking lock status:', error);
        setIsLocked(false);
        setLockDetails(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkLockStatus();
  }, [noteId, noteType]);
  
  return { isLocked, lockDetails, loading };
};
