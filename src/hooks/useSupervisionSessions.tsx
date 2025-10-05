import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupervisionSession {
  id: string;
  relationship_id: string;
  session_date: string;
  session_duration_minutes: number;
  session_type: string;
  topics_covered?: string[] | null;
  notes?: string | null;
  supervisor_signature?: string | null;
  supervisee_signature?: string | null;
  created_date: string;
}

export interface SupervisionHours {
  total: number;
  direct: number;
  indirect: number;
  group: number;
}

export const useSupervisionSessions = (relationshipId?: string) => {
  const [sessions, setSessions] = useState<SupervisionSession[]>([]);
  const [hours, setHours] = useState<SupervisionHours>({
    total: 0,
    direct: 0,
    indirect: 0,
    group: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!relationshipId) {
      setLoading(false);
      return;
    }

    const fetchSessions = async () => {
      try {
        setLoading(true);
        
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('supervision_sessions')
          .select('*')
          .eq('relationship_id', relationshipId)
          .order('session_date', { ascending: false });

        if (sessionsError) throw sessionsError;

        setSessions(sessionsData || []);

        // Calculate hours by type
        const calculatedHours = (sessionsData || []).reduce(
          (acc, session) => {
            const hours = session.session_duration_minutes / 60; // Convert minutes to hours
            acc.total += hours;
            
            if (session.session_type === 'Direct') {
              acc.direct += hours;
            } else if (session.session_type === 'Indirect') {
              acc.indirect += hours;
            } else if (session.session_type === 'Group') {
              acc.group += hours;
            }
            
            return acc;
          },
          { total: 0, direct: 0, indirect: 0, group: 0 }
        );

        setHours(calculatedHours);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch supervision sessions'));
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();

    const channel = supabase
      .channel(`supervision_sessions_${relationshipId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supervision_sessions',
          filter: `relationship_id=eq.${relationshipId}`
        },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [relationshipId]);

  return { sessions, hours, loading, error };
};
