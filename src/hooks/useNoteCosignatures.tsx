import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RevisionHistoryItem {
  revisionDate: string;
  revisionReason: string;
  revisionCompleteDate?: string | null;
}

export interface NotificationLogItem {
  notificationDate: string;
  notificationType: 'Submitted' | 'Reminder' | 'Overdue' | 'Cosigned' | 'Revisions Requested';
  recipient: string;
}

export interface NoteCosignature {
  id: string;
  note_id: string;
  note_type: string;
  clinician_id: string;
  supervisor_id: string;
  relationship_id?: string | null;
  
  // Submission
  clinician_signed: boolean;
  clinician_signed_date?: string | null;
  submitted_for_cosign_date?: string | null;
  
  // Review
  supervisor_cosigned: boolean;
  supervisor_cosigned_date?: string | null;
  reviewed_date?: string | null;
  time_spent_reviewing?: number | null;
  supervisor_comments?: string | null;
  
  // Revisions
  revisions_requested: boolean;
  revision_details?: string | null;
  revision_history: RevisionHistoryItem[];
  
  // Status
  status: 'Pending' | 'Pending Review' | 'Under Review' | 'Reviewed' | 'Revisions Requested' | 'Cosigned' | 'Returned' | 'Overdue';
  due_date?: string | null;
  
  // Notifications
  supervisor_notified: boolean;
  supervisor_notified_date?: string | null;
  notification_log: NotificationLogItem[];
  
  // Escalation
  escalated: boolean;
  escalated_date?: string | null;
  
  // Incident-to Billing
  is_incident_to: boolean;
  supervisor_attestation?: string | null;
  
  // Timestamps
  created_date: string;
  updated_at?: string | null;
  
  // Related data
  clinician?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  client?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export const useNoteCosignatures = (supervisorId?: string, status?: string) => {
  const [cosignatures, setCosignatures] = useState<NoteCosignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!supervisorId) {
      setLoading(false);
      return;
    }

    const fetchCosignatures = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('note_cosignatures')
          .select('*')
          .eq('supervisor_id', supervisorId)
          .order('created_date', { ascending: false });

        if (status) {
          query = query.eq('status', status);
        }

        const { data: cosignaturesData, error: cosigError } = await query;

        if (cosigError) throw cosigError;

        if (!cosignaturesData || cosignaturesData.length === 0) {
          setCosignatures([]);
          setLoading(false);
          return;
        }

        const clinicianIds = [...new Set(cosignaturesData.map((c: any) => c.clinician_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', clinicianIds);

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
            // TODO: Add intake_assessments table query when available
            
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
          clinician: profiles?.find((p: any) => p.id === cosig.clinician_id),
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
      .channel(`note_cosignatures_${supervisorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'note_cosignatures',
          filter: `supervisor_id=eq.${supervisorId}`
        },
        () => {
          fetchCosignatures();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supervisorId, status]);

  return { cosignatures, loading, error };
};
