import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupervisionRelationship {
  id: string;
  supervisor_id: string;
  supervisee_id: string;
  relationship_type: string;
  start_date: string;
  end_date?: string | null;
  status: string;
  required_supervision_hours: number;
  required_direct_hours?: number | null;
  required_indirect_hours?: number | null;
  required_group_hours?: number | null;
  supervision_frequency?: string | null;
  scheduled_day_time?: string | null;
  requires_note_cosign: boolean;
  cosign_timeframe: number;
  notification_settings?: any;
  competencies_to_achieve?: string[] | null;
  competencies_achieved?: any;
  created_date: string;
  
  supervisee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  
  completed_hours?: number;
  direct_hours_completed?: number;
  indirect_hours_completed?: number;
  group_hours_completed?: number;
  remaining_hours?: number;
}

export const useSupervisionRelationships = (supervisorId?: string) => {
  const [relationships, setRelationships] = useState<SupervisionRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!supervisorId) {
      setLoading(false);
      return;
    }

    const fetchRelationships = async () => {
      try {
        setLoading(true);
        
        const { data: relationshipsData, error: relError } = await supabase
          .from('supervision_relationships')
          .select('*')
          .eq('supervisor_id', supervisorId)
          .order('status', { ascending: true })
          .order('start_date', { ascending: false });

        if (relError) throw relError;

        if (!relationshipsData || relationshipsData.length === 0) {
          setRelationships([]);
          setLoading(false);
          return;
        }

        const superviseeIds = relationshipsData.map(r => r.supervisee_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', superviseeIds);

        if (profilesError) throw profilesError;

        // For now, we'll calculate hours directly without the view
        // TODO: Add RPC function to get hours summary
        const hoursData = null;

        const combined = relationshipsData.map(rel => {
          const supervisee = profiles?.find(p => p.id === rel.supervisee_id);
          const hours = hoursData?.find((h: any) => h.relationship_id === rel.id);
          
          return {
            ...rel,
            supervisee,
            completed_hours: hours?.completed_hours || 0,
            direct_hours_completed: hours?.direct_hours_completed || 0,
            indirect_hours_completed: hours?.indirect_hours_completed || 0,
            group_hours_completed: hours?.group_hours_completed || 0,
            remaining_hours: hours?.remaining_hours || rel.required_supervision_hours,
          };
        });

        setRelationships(combined);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch relationships'));
      } finally {
        setLoading(false);
      }
    };

    fetchRelationships();

    const channel = supabase
      .channel(`supervision_relationships_${supervisorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supervision_relationships',
          filter: `supervisor_id=eq.${supervisorId}`
        },
        () => {
          fetchRelationships();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supervisorId]);

  return { relationships, loading, error };
};
