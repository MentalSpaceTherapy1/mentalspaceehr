import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CaseDiscussion {
  client_id: string;
  discussion_summary: string;
  clinical_issues: string[];
  interventions_recommended: string[];
}

export interface ActionItem {
  item: string;
  due_date?: string;
  completed: boolean;
}

export interface GroupSupervisee {
  supervisee_id: string;
  hours_earned: number;
}

export interface SupervisionSession {
  id: string;
  relationship_id: string;
  
  // Time details
  session_date: string;
  session_start_time?: string | null;
  session_end_time?: string | null;
  session_duration_minutes: number;
  
  // Session details
  session_type: string; // 'Individual' | 'Direct' | 'Indirect' | 'Group'
  session_format?: string | null; // 'In-Person' | 'Telehealth' | 'Phone'
  
  // Group supervision
  group_supervisees?: GroupSupervisee[] | null;
  
  // Content
  topics_covered?: string[] | null;
  notes?: string | null;
  
  cases_discussed?: CaseDiscussion[] | null;
  
  // Skills & development
  skills_developed?: string[] | null;
  feedback_provided?: string | null;
  areas_of_strength?: string[] | null;
  areas_for_improvement?: string[] | null;
  
  // Action items
  action_items?: ActionItem[] | null;
  
  // Follow-up
  next_session_scheduled?: boolean | null;
  next_session_date?: string | null;
  
  // Supervisee perspective
  supervisee_reflection?: string | null;
  
  // Signatures (enhanced with boolean flags)
  supervisor_signature?: string | null; // Legacy field
  supervisee_signature?: string | null; // Legacy field
  supervisor_signature_name?: string | null;
  supervisee_signature_name?: string | null;
  supervisor_signed?: boolean | null;
  supervisee_signed?: boolean | null;
  supervisor_signed_date?: string | null;
  supervisee_signed_date?: string | null;
  
  // Verification (Phase 1)
  verified_by_supervisor?: boolean | null;
  verification_date?: string | null;
  status?: string | null; // 'Pending' | 'Verified' | 'Disputed'
  dispute_reason?: string | null;
  
  // Licensure Tracking (Phase 2)
  applies_to?: string | null; // which license requirement
  
  // Metadata
  created_date: string;
  created_by?: string | null;
  updated_at?: string | null;
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

        // Cast the data to our interface type
        setSessions((sessionsData as any[]) || []);

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
