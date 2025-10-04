import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Save, Sparkles, AlertTriangle, FileText, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

export default function NoteEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const sessionId = searchParams.get('sessionId');
  const appointmentIdParam = searchParams.get('appointmentId');
  const clientIdParam = searchParams.get('clientId');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [note, setNote] = useState<any>(null);
  const [freeTextInput, setFreeTextInput] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [selectedNoteType, setSelectedNoteType] = useState('progress_note');
  const [selectedFormat, setSelectedFormat] = useState('SOAP');
  const [dateOfService, setDateOfService] = useState(new Date().toISOString().split('T')[0]);
  const [sessionMetadata, setSessionMetadata] = useState<any>(null);
  const [hasTranscript, setHasTranscript] = useState(false);
  
  const [content, setContent] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  const [clients, setClients] = useState<any[]>([]);
  const [aiSettings, setAiSettings] = useState<any>(null);

  useEffect(() => {
    loadClients();
    loadAISettings();
    
    if (id) {
      loadNote();
    } else if (sessionId) {
      loadSessionData();
    }
    
    if (clientIdParam) {
      setSelectedClient(clientIdParam);
    }
    if (appointmentIdParam) {
      setAppointmentId(appointmentIdParam);
    }
  }, [id, sessionId, clientIdParam, appointmentIdParam]);

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('status', 'Active')
      .order('last_name');
    if (data) setClients(data);
  };

  const loadAISettings = async () => {
    const { data } = await supabase
      .from('ai_note_settings')
      .select('*')
      .maybeSingle();
    setAiSettings(data);
  };

  const loadNote = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinical_notes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setNote(data);
        setContent(data.content as any);
        setSelectedClient(data.client_id);
        setSelectedNoteType(data.note_type);
        setSelectedFormat(data.note_format);
        setDateOfService(data.date_of_service);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load note',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSessionData = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);

      // Load session metadata
      const { data: sessionData, error: sessionError } = await supabase
        .from('telehealth_sessions')
        .select('*, appointments(client_id, appointment_type, duration)')
        .eq('session_id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      setSessionMetadata(sessionData);
      
      // Check if transcript exists
      const { data: transcriptData } = await supabase
        .from('session_transcripts')
        .select('id')
        .eq('session_id', sessionData.id)
        .single();

      if (transcriptData) {
        setHasTranscript(true);
        // Auto-generate note from transcript
        await generateFromSession(sessionData.id);
      }

    } catch (error) {
      console.error('Error loading session data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFromSession = async (sessionDbId: string) => {
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-clinical-note', {
        body: {
          sessionId: sessionDbId,
          noteType: selectedNoteType,
          noteFormat: selectedFormat,
          clientId: selectedClient,
        },
      });

      if (error) throw error;

      if (data.noteContent) {
        setContent(data.noteContent);
        
        toast({
          title: 'Note Generated',
          description: 'Clinical note generated from session transcript',
        });

        if (data.riskFlags && data.riskFlags.length > 0) {
          toast({
            title: 'Risk Indicators Detected',
            description: `${data.riskFlags.join(', ')}`,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error generating from session:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate note from session',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const generateWithAI = async () => {
    if (!freeTextInput.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide text for AI to generate the note',
        variant: 'destructive'
      });
      return;
    }

    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-clinical-note', {
        body: {
          freeTextInput: freeTextInput,
          noteType: selectedNoteType,
          noteFormat: selectedFormat,
          clientId: selectedClient,
        }
      });

      if (error) throw error;

      if (data.success) {
        setContent(data.content);
        
        if (data.riskFlags && data.riskFlags.length > 0) {
          toast({
            title: 'Risk Flags Detected',
            description: `AI flagged potential risks: ${data.riskFlags.join(', ')}`,
            variant: 'destructive'
          });
        }

        toast({
          title: 'Note Generated',
          description: `AI generated note with ${Math.round(data.metadata.ai_confidence_score * 100)}% confidence`,
        });
      }
    } catch (error) {
      console.error('Error generating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate note with AI',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const saveNote = async () => {
    if (!selectedClient) {
      toast({
        title: 'Client Required',
        description: 'Please select a client',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      const noteData: any = {
        client_id: selectedClient,
        clinician_id: user?.id,
        note_type: selectedNoteType,
        note_format: selectedFormat,
        date_of_service: dateOfService,
        content: content,
        ai_generated: generating || note?.ai_generated || false,
        version: note ? note.version + 1 : 1,
        updated_by: user?.id,
      };

      if (id) {
        const { error } = await supabase
          .from('clinical_notes')
          .update(noteData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clinical_notes')
          .insert({
            ...noteData,
            created_by: user?.id,
          });
        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Note saved successfully'
      });
      
      navigate('/notes');
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save note',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/notes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{id ? 'Edit Note' : 'New Clinical Note'}</h1>
              <p className="text-muted-foreground">
                {aiSettings?.enabled ? 'Use AI assistance or manual entry' : 'Manual entry'}
              </p>
            </div>
          </div>
          <Button onClick={saveNote} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Note'}
          </Button>
        </div>

        {note?.locked && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This note is locked and cannot be edited.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Client *</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient} disabled={note?.locked}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.first_name} {client.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Note Type *</Label>
            <Select value={selectedNoteType} onValueChange={setSelectedNoteType} disabled={note?.locked}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="progress_note">Progress Note</SelectItem>
                <SelectItem value="intake_assessment">Intake Assessment</SelectItem>
                <SelectItem value="psychotherapy_note">Psychotherapy Note</SelectItem>
                <SelectItem value="psychiatric_evaluation">Psychiatric Evaluation</SelectItem>
                <SelectItem value="crisis_assessment">Crisis Assessment</SelectItem>
                <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                <SelectItem value="treatment_plan">Treatment Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Format *</Label>
            <Select value={selectedFormat} onValueChange={setSelectedFormat} disabled={note?.locked}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SOAP">SOAP</SelectItem>
                <SelectItem value="DAP">DAP</SelectItem>
                <SelectItem value="BIRP">BIRP</SelectItem>
                <SelectItem value="GIRP">GIRP</SelectItem>
                <SelectItem value="narrative">Narrative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="max-w-xs">
          <Label>Date of Service *</Label>
          <Input
            type="date"
            value={dateOfService}
            onChange={(e) => setDateOfService(e.target.value)}
            disabled={note?.locked}
          />
        </div>

        {aiSettings?.enabled && !note?.locked && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Assisted Generation
              </CardTitle>
              <CardDescription>
                Describe the session in your own words, and AI will structure it into a clinical note
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="free-text">Session Summary or Clinical Information</Label>
                <Textarea
                  id="free-text"
                  value={freeTextInput}
                  onChange={(e) => setFreeTextInput(e.target.value)}
                  rows={6}
                  placeholder="Example: Client presented with improved mood this week. Reports better sleep and reduced anxiety. Discussed coping strategies for work stress. Completed thought record homework. Plans to practice progressive muscle relaxation..."
                  className="mt-2"
                />
              </div>
              <Button onClick={generateWithAI} disabled={generating || !freeTextInput.trim()}>
                <Sparkles className="h-4 w-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Note with AI'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Clinical Note Content</CardTitle>
            <CardDescription>
              {selectedFormat} format - Edit each section below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="subjective" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="subjective">Subjective</TabsTrigger>
                <TabsTrigger value="objective">Objective</TabsTrigger>
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                <TabsTrigger value="plan">Plan</TabsTrigger>
              </TabsList>

              <TabsContent value="subjective">
                <div>
                  <Label htmlFor="subjective">Subjective</Label>
                  <Textarea
                    id="subjective"
                    value={content.subjective}
                    onChange={(e) => setContent({ ...content, subjective: e.target.value })}
                    rows={10}
                    placeholder="Patient's reported concerns, symptoms, and subjective experiences..."
                    className="mt-2"
                    disabled={note?.locked}
                  />
                </div>
              </TabsContent>

              <TabsContent value="objective">
                <div>
                  <Label htmlFor="objective">Objective</Label>
                  <Textarea
                    id="objective"
                    value={content.objective}
                    onChange={(e) => setContent({ ...content, objective: e.target.value })}
                    rows={10}
                    placeholder="Observable presentation: appearance, affect, behavior, speech patterns..."
                    className="mt-2"
                    disabled={note?.locked}
                  />
                </div>
              </TabsContent>

              <TabsContent value="assessment">
                <div>
                  <Label htmlFor="assessment">Assessment</Label>
                  <Textarea
                    id="assessment"
                    value={content.assessment}
                    onChange={(e) => setContent({ ...content, assessment: e.target.value })}
                    rows={10}
                    placeholder="Clinical impression, progress toward goals, symptom severity..."
                    className="mt-2"
                    disabled={note?.locked}
                  />
                </div>
              </TabsContent>

              <TabsContent value="plan">
                <div>
                  <Label htmlFor="plan">Plan</Label>
                  <Textarea
                    id="plan"
                    value={content.plan}
                    onChange={(e) => setContent({ ...content, plan: e.target.value })}
                    rows={10}
                    placeholder="Treatment interventions, homework assignments, follow-up plans..."
                    className="mt-2"
                    disabled={note?.locked}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
