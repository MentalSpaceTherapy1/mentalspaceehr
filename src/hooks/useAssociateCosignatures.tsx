import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NoteCosignature } from './useNoteCosignatures';

export const useAssociateCosignatures = (clinicianId?: string) => {
  const [cosignatures, setCosignatures] = useState<NoteCosignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!clinicianId) {
      setLoading(false);
      return;
    }

    const fetchCosignatures = async () => {
      try {
        setLoading(true);
        
        const { data: cosignaturesData, error: cosigError } = await supabase
          .from('note_cosignatures')
          .select('*')
          .eq('clinician_id', clinicianId)
          .in('status', ['Pending Supervisor Review', 'Overdue'])
          .order('created_date', { ascending: false });

        if (cosigError) throw cosigError;

        if (!cosignaturesData || cosignaturesData.length === 0) {
          setCosignatures([]);
          setLoading(false);
          return;
        }

        const supervisorIds = [...new Set(cosignaturesData.map((c: any) => c.supervisor_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', supervisorIds);

        if (profilesError) throw profilesError;

        const clientsMap = new Map();
        for (const cosig of cosignaturesData) {
          try {
            let clientData = null;
            
            if (cosig.note_type === 'clinical_note' || cosig.note_type === 'progress_note') {
              const { data } = await supabase
                .from('clinical_notes')
                .select('client_id')
                .eq('id', cosig.note_id)
                .maybeSingle();
              if (data) clientData = data;
            }
            
            if (clientData?.client_id) {
              const { data: client } = await supabase
                .from('clients')
                .select('id, first_name, last_name')
                .eq('id', clientData.client_id)
                .maybeSingle();
              if (client) {
                clientsMap.set(cosig.note_id, client);
              }
            }
          } catch (err) {
            console.error('Error fetching client for cosignature:', err);
          }
        }

        const combined = cosignaturesData.map((cosig: any) => ({
          ...cosig,
          clinician: profiles?.find((p: any) => p.id === cosig.supervisor_id),
          client: clientsMap.get(cosig.note_id),
        }));

        setCosignatures(combined as NoteCosignature[]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch cosignatures'));
      } finally {
        setLoading(false);
      }
    };

    fetchCosignatures();

    const channel = supabase
      .channel(`associate_cosignatures_${clinicianId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_cosignatures',
          filter: `clinician_id=eq.${clinicianId}`
        },
        () => {
          fetchCosignatures();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicianId]);

  return { cosignatures, loading, error };
};
