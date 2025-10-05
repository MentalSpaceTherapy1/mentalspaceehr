import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupervisionRelationship } from './useSupervisionRelationships';

export const useAssociateSupervision = (superviseeId?: string) => {
  const [relationship, setRelationship] = useState<SupervisionRelationship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!superviseeId) {
      setLoading(false);
      return;
    }

    const fetchRelationship = async () => {
      try {
        setLoading(true);
        
        const { data: relationshipData, error: relError } = await supabase
          .from('supervision_relationships')
          .select('*')
          .eq('supervisee_id', superviseeId)
          .eq('status', 'Active')
          .maybeSingle();

        if (relError) throw relError;

        if (!relationshipData) {
          setRelationship(null);
          setLoading(false);
          return;
        }

        const { data: supervisor, error: supervisorError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .eq('id', relationshipData.supervisor_id)
          .maybeSingle();

        if (supervisorError) throw supervisorError;

        const combined = {
          ...relationshipData,
          supervisee: supervisor,
          completed_hours: 0,
          direct_hours_completed: 0,
          indirect_hours_completed: 0,
          group_hours_completed: 0,
          remaining_hours: relationshipData.required_supervision_hours,
        };

        setRelationship(combined);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch supervision relationship'));
      } finally {
        setLoading(false);
      }
    };

    fetchRelationship();

    const channel = supabase
      .channel(`supervision_relationship_${superviseeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supervision_relationships',
          filter: `supervisee_id=eq.${superviseeId}`
        },
        () => {
          fetchRelationship();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [superviseeId]);

  return { relationship, loading, error };
};
