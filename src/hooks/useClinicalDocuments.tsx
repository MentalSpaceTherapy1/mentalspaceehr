import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClinicalDocument {
  id: string;
  noteType: string;
  noteTypeLabel: string;
  date: string;
  status: string;
  clinician: string;
  clinicianId: string;
  content?: any;
  locked?: boolean;
  requiresSupervision?: boolean;
  createdAt: string;
  tableName: string;
  viewPath: string;
}

interface UseClinicalDocumentsProps {
  clientId: string;
  filters?: {
    noteTypes?: string[];
    statuses?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    clinicianId?: string;
    searchQuery?: string;
  };
  sortBy?: 'date' | 'noteType' | 'status' | 'clinician';
  sortOrder?: 'asc' | 'desc';
}

export function useClinicalDocuments({ 
  clientId, 
  filters = {},
  sortBy = 'date',
  sortOrder = 'desc'
}: UseClinicalDocumentsProps) {
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    pendingCosignatures: 0,
    drafts: 0
  });
  const { toast } = useToast();

  const noteTypeMap: Record<string, string> = {
    progress_note: 'Progress Note',
    intake_assessment: 'Intake Assessment',
    psychiatric_evaluation: 'Psychiatric Evaluation',
    psychotherapy_note: 'Psychotherapy Note',
    crisis_assessment: 'Crisis Assessment',
    discharge_summary: 'Discharge Summary',
    treatment_plan: 'Treatment Plan',
    supervision_note: 'Supervision Note',
    consultation: 'Consultation Note',
    contact: 'Contact Note',
    miscellaneous: 'Miscellaneous Note',
    cancellation: 'Cancellation Note',
    termination: 'Termination Note',
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const allDocs: ClinicalDocument[] = [];

      // Fetch from clinical_notes table (excludes clinical_note type as requested)
      const { data: clinicalNotes, error: clinicalError } = await supabase
        .from('clinical_notes')
        .select(`
          *,
          clinician:profiles!clinical_notes_clinician_id_fkey(first_name, last_name, id)
        `)
        .eq('client_id', clientId)
        .order('date_of_service', { ascending: false });

      if (clinicalError) throw clinicalError;

      if (clinicalNotes) {
        clinicalNotes.forEach((note) => {
          const noteTypeKey = note.note_type;
          const baseUrl = noteTypeKey === 'progress_note' ? '/progress-note' 
            : noteTypeKey === 'intake_assessment' ? '/intake-assessment'
            : noteTypeKey === 'psychiatric_evaluation' ? '/psychiatric-evaluation'
            : noteTypeKey === 'psychotherapy_note' ? '/psychotherapy-note'
            : noteTypeKey === 'crisis_assessment' ? '/crisis-assessment'
            : noteTypeKey === 'treatment_plan' ? '/treatment-plan'
            : `/clinical-note`;

          allDocs.push({
            id: note.id,
            noteType: noteTypeKey,
            noteTypeLabel: noteTypeMap[noteTypeKey] || noteTypeKey,
            date: note.date_of_service,
            status: note.locked ? 'Locked' : 'Draft',
            clinician: `${note.clinician?.first_name || ''} ${note.clinician?.last_name || ''}`.trim(),
            clinicianId: note.clinician?.id || '',
            content: note.content,
            locked: note.locked,
            requiresSupervision: note.requires_supervision,
            createdAt: note.created_at,
            tableName: 'clinical_notes',
            viewPath: `${baseUrl}/${clientId}/${note.id}`
          });
        });
      }

      // Fetch treatment plans
      const { data: treatmentPlans, error: tpError } = await supabase
        .from('treatment_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('plan_date', { ascending: false });

      if (tpError) throw tpError;

      if (treatmentPlans) {
        // Fetch clinician names for treatment plans
        const clinicianIds = [...new Set(treatmentPlans.map(p => p.clinician_id))];
        const { data: clinicians } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', clinicianIds);

        const clinicianMap = new Map(clinicians?.map(c => [c.id, c]) || []);

        treatmentPlans.forEach((plan) => {
          const clinician = clinicianMap.get(plan.clinician_id);
          allDocs.push({
            id: plan.id,
            noteType: 'treatment_plan',
            noteTypeLabel: 'Treatment Plan',
            date: plan.plan_date,
            status: plan.status,
            clinician: clinician ? `${clinician.first_name} ${clinician.last_name}`.trim() : '',
            clinicianId: plan.clinician_id,
            locked: plan.status === 'Active',
            createdAt: plan.created_date,
            tableName: 'treatment_plans',
            viewPath: `/treatment-plan/${clientId}/${plan.id}`
          });
        });
      }

      // Fetch consultation notes
      const { data: consultationNotes, error: cnError } = await supabase
        .from('consultation_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('consultation_date', { ascending: false });

      if (cnError) throw cnError;

      if (consultationNotes) {
        const clinicianIds = [...new Set(consultationNotes.map(n => n.clinician_id))];
        const { data: clinicians } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', clinicianIds);

        const clinicianMap = new Map(clinicians?.map(c => [c.id, c]) || []);

        consultationNotes.forEach((note) => {
          const clinician = clinicianMap.get(note.clinician_id);
          allDocs.push({
            id: note.id,
            noteType: 'consultation',
            noteTypeLabel: 'Consultation Note',
            date: note.consultation_date,
            status: note.status,
            clinician: clinician ? `${clinician.first_name} ${clinician.last_name}`.trim() : '',
            clinicianId: note.clinician_id,
            locked: note.status === 'Locked',
            createdAt: note.created_date,
            tableName: 'consultation_notes',
            viewPath: `/consultation-note/${clientId}/${note.id}`
          });
        });
      }

      // Fetch contact notes
      const { data: contactNotes, error: contError } = await supabase
        .from('contact_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('contact_date', { ascending: false });

      if (contError) throw contError;

      if (contactNotes) {
        const clinicianIds = [...new Set(contactNotes.map(n => n.clinician_id))];
        const { data: clinicians } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', clinicianIds);

        const clinicianMap = new Map(clinicians?.map(c => [c.id, c]) || []);

        contactNotes.forEach((note) => {
          const clinician = clinicianMap.get(note.clinician_id);
          allDocs.push({
            id: note.id,
            noteType: 'contact',
            noteTypeLabel: 'Contact Note',
            date: note.contact_date,
            status: note.status,
            clinician: clinician ? `${clinician.first_name} ${clinician.last_name}`.trim() : '',
            clinicianId: note.clinician_id,
            locked: note.status === 'Locked',
            createdAt: note.created_date,
            tableName: 'contact_notes',
            viewPath: `/contact-note/${clientId}/${note.id}`
          });
        });
      }

      // Fetch miscellaneous notes
      const { data: miscNotes, error: miscError } = await supabase
        .from('miscellaneous_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('note_date', { ascending: false });

      if (miscError) throw miscError;

      if (miscNotes) {
        const clinicianIds = [...new Set(miscNotes.map(n => n.clinician_id))];
        const { data: clinicians } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', clinicianIds);

        const clinicianMap = new Map(clinicians?.map(c => [c.id, c]) || []);

        miscNotes.forEach((note) => {
          const clinician = clinicianMap.get(note.clinician_id);
          allDocs.push({
            id: note.id,
            noteType: 'miscellaneous',
            noteTypeLabel: 'Miscellaneous Note',
            date: note.note_date,
            status: note.status,
            clinician: clinician ? `${clinician.first_name} ${clinician.last_name}`.trim() : '',
            clinicianId: note.clinician_id,
            locked: note.status === 'Locked',
            createdAt: note.created_date,
            tableName: 'miscellaneous_notes',
            viewPath: `/miscellaneous-note/${clientId}/${note.id}`
          });
        });
      }

      // Fetch cancellation notes
      const { data: cancelNotes, error: cancelError } = await supabase
        .from('cancellation_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('cancellation_date', { ascending: false });

      if (cancelError) throw cancelError;

      if (cancelNotes) {
        const clinicianIds = [...new Set(cancelNotes.map(n => n.clinician_id))];
        const { data: clinicians } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', clinicianIds);

        const clinicianMap = new Map(clinicians?.map(c => [c.id, c]) || []);

        cancelNotes.forEach((note) => {
          const clinician = clinicianMap.get(note.clinician_id);
          allDocs.push({
            id: note.id,
            noteType: 'cancellation',
            noteTypeLabel: 'Cancellation Note',
            date: note.cancellation_date,
            status: note.status,
            clinician: clinician ? `${clinician.first_name} ${clinician.last_name}`.trim() : '',
            clinicianId: note.clinician_id,
            locked: note.status === 'Locked',
            createdAt: note.created_date || '',
            tableName: 'cancellation_notes',
            viewPath: `/cancellation-note/${clientId}/${note.id}`
          });
        });
      }

      // Fetch termination notes
      const { data: termNotes, error: termError } = await supabase
        .from('termination_notes')
        .select(`
          *,
          clinician:profiles!termination_notes_clinician_id_fkey(first_name, last_name, id)
        `)
        .eq('client_id', clientId)
        .order('termination_date', { ascending: false });

      if (termError) throw termError;

      if (termNotes) {
        termNotes.forEach((note) => {
          allDocs.push({
            id: note.id,
            noteType: 'termination',
            noteTypeLabel: 'Termination Note',
            date: note.termination_date,
            status: note.status,
            clinician: `${note.clinician?.first_name || ''} ${note.clinician?.last_name || ''}`.trim(),
            clinicianId: note.clinician?.id || '',
            locked: note.status === 'Locked',
            createdAt: note.created_date,
            tableName: 'termination_notes',
            viewPath: `/termination-note/${clientId}/${note.id}`
          });
        });
      }

      // Apply filters
      let filteredDocs = [...allDocs];

      if (filters.noteTypes && filters.noteTypes.length > 0) {
        filteredDocs = filteredDocs.filter(doc => filters.noteTypes!.includes(doc.noteType));
      }

      if (filters.statuses && filters.statuses.length > 0) {
        filteredDocs = filteredDocs.filter(doc => filters.statuses!.includes(doc.status));
      }

      if (filters.dateFrom) {
        filteredDocs = filteredDocs.filter(doc => new Date(doc.date) >= filters.dateFrom!);
      }

      if (filters.dateTo) {
        filteredDocs = filteredDocs.filter(doc => new Date(doc.date) <= filters.dateTo!);
      }

      if (filters.clinicianId) {
        filteredDocs = filteredDocs.filter(doc => doc.clinicianId === filters.clinicianId);
      }

      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filteredDocs = filteredDocs.filter(doc => 
          doc.noteTypeLabel.toLowerCase().includes(query) ||
          doc.clinician.toLowerCase().includes(query) ||
          doc.status.toLowerCase().includes(query)
        );
      }

      // Apply sorting
      filteredDocs.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case 'noteType':
            comparison = a.noteTypeLabel.localeCompare(b.noteTypeLabel);
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
          case 'clinician':
            comparison = a.clinician.localeCompare(b.clinician);
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });

      setDocuments(filteredDocs);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      setStats({
        total: allDocs.length,
        thisMonth: allDocs.filter(doc => new Date(doc.date) >= startOfMonth).length,
        pendingCosignatures: allDocs.filter(doc => doc.requiresSupervision).length,
        drafts: allDocs.filter(doc => doc.status === 'Draft').length
      });

    } catch (error: any) {
      console.error('Error fetching clinical documents:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load clinical documents'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchDocuments();
    }
  }, [clientId, JSON.stringify(filters), sortBy, sortOrder]);

  return { documents, loading, stats, refetch: fetchDocuments };
}
