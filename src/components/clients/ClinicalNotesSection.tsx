import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Eye, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ClinicalNotesSectionProps {
  clientId: string;
  noteType: 'progress-notes' | 'intake-assessment' | 'treatment-plans' | 'psychiatric-evaluations' | 'testing-assessments' | 'consultation-notes';
}

const noteTypeConfig = {
  'progress-notes': {
    tableName: 'progress_notes',
    title: 'Progress Notes',
    createPath: (clientId: string) => `/progress-note/${clientId}`,
    viewPath: (clientId: string, noteId: string) => `/progress-note/${clientId}/${noteId}`,
  },
  'intake-assessment': {
    tableName: 'intake_assessments',
    title: 'Intake Assessments',
    createPath: (clientId: string) => `/intake-assessment/${clientId}`,
    viewPath: (clientId: string, noteId: string) => `/intake-assessment/${clientId}/${noteId}`,
  },
  'treatment-plans': {
    tableName: 'treatment_plans',
    title: 'Treatment Plans',
    createPath: (clientId: string) => `/treatment-plan/${clientId}`,
    viewPath: (clientId: string, noteId: string) => `/treatment-plan/${clientId}/${noteId}`,
  },
  'psychiatric-evaluations': {
    tableName: 'psychiatric_evaluations',
    title: 'Psychiatric Evaluations',
    createPath: (clientId: string) => `/psychiatric-evaluation/${clientId}`,
    viewPath: (clientId: string, noteId: string) => `/psychiatric-evaluation/${clientId}/${noteId}`,
  },
  'testing-assessments': {
    tableName: 'testing_assessments',
    title: 'Testing/Assessments',
    createPath: (clientId: string) => `/testing-assessment/${clientId}`,
    viewPath: (clientId: string, noteId: string) => `/testing-assessment/${clientId}/${noteId}`,
  },
  'consultation-notes': {
    tableName: 'consultation_notes',
    title: 'Consultation Notes',
    createPath: (clientId: string) => `/consultation-note/${clientId}`,
    viewPath: (clientId: string, noteId: string) => `/consultation-note/${clientId}/${noteId}`,
  },
};

export function ClinicalNotesSection({ clientId, noteType }: ClinicalNotesSectionProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const config = noteTypeConfig[noteType];

  useEffect(() => {
    fetchNotes();
  }, [clientId, noteType]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      let data: any[] = [];
      let error: any = null;

      switch (noteType) {
        case 'progress-notes':
          const progressResult = await supabase
            .from('clinical_notes')
            .select('*')
            .eq('client_id', clientId)
            .eq('note_type', 'progress_note')
            .order('created_date', { ascending: false });
          data = progressResult.data || [];
          error = progressResult.error;
          break;

        case 'intake-assessment':
          const intakeResult = await supabase
            .from('clinical_notes')
            .select('*')
            .eq('client_id', clientId)
            .eq('note_type', 'intake_assessment')
            .order('created_date', { ascending: false });
          data = intakeResult.data || [];
          error = intakeResult.error;
          break;

        case 'treatment-plans':
          const planResult = await supabase
            .from('treatment_plans')
            .select('*')
            .eq('client_id', clientId)
            .order('created_date', { ascending: false });
          data = planResult.data || [];
          error = planResult.error;
          break;

        case 'consultation-notes':
          const consultResult = await supabase
            .from('consultation_notes')
            .select('*')
            .eq('client_id', clientId)
            .order('created_date', { ascending: false });
          data = consultResult.data || [];
          error = consultResult.error;
          break;

        case 'psychiatric-evaluations':
        case 'testing-assessments':
          // These would use clinical_notes with specific note types
          const otherResult = await supabase
            .from('clinical_notes')
            .select('*')
            .eq('client_id', clientId)
            .order('created_date', { ascending: false });
          data = otherResult.data || [];
          error = otherResult.error;
          break;
      }

      if (error) throw error;
      setNotes(data);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      toast({
        title: 'Error loading notes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Signed':
        return 'default';
      case 'Draft':
        return 'secondary';
      case 'In Progress':
        return 'outline';
      case 'Locked':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{config.title}</CardTitle>
          <Button onClick={() => navigate(config.createPath(clientId))}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No {config.title.toLowerCase()} found</p>
            <Button onClick={() => navigate(config.createPath(clientId))}>
              <Plus className="h-4 w-4 mr-2" />
              Create First {config.title.slice(0, -1)}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(config.viewPath(clientId, note.id))}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">
                      {note.session_date || note.evaluation_date || note.plan_date || note.assessment_date || note.consultation_date || format(new Date(note.created_date), 'MMM d, yyyy')}
                    </h4>
                    <Badge variant={getStatusBadgeVariant(note.status)}>
                      {note.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(note.created_date), 'MMM d, yyyy')}
                    </span>
                    {note.clinician_name && (
                      <span>Clinician: {note.clinician_name}</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(config.viewPath(clientId, note.id));
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
