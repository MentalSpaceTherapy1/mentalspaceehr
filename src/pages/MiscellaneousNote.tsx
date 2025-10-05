import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, ArrowLeft, FileSignature, Plus, X, Brain, Sparkles, Check } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { useAuth } from '@/hooks/useAuth';

export default function MiscellaneousNote() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [clinicianName, setClinicianName] = useState('');
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [newTag, setNewTag] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    noteDate: new Date().toISOString().split('T')[0],
    noteType: '',
    subject: '',
    noteContent: '',
    tags: [] as string[],
    clinicallyRelevant: false,
    billable: false,
    billingCode: '',
    status: 'Draft'
  });

  useEffect(() => {
    loadClients();
    loadClinicianName();
  }, []);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, medical_record_number')
        .eq('status', 'Active')
        .order('last_name');

      if (error) throw error;
      setAvailableClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadClinicianName = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setClinicianName(`${data.first_name} ${data.last_name}`);
      }
    } catch (error) {
      console.error('Error fetching clinician name:', error);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const saveNote = async () => {
    if (!formData.clientId) {
      toast({
        title: 'Required Field Missing',
        description: 'Please select a client',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const noteData: any = {
        client_id: formData.clientId,
        clinician_id: user?.id,
        note_date: formData.noteDate,
        note_type: formData.noteType,
        subject: formData.subject,
        note_content: formData.noteContent,
        tags: formData.tags,
        clinically_relevant: formData.clinicallyRelevant,
        billable: formData.billable,
        billing_code: formData.billingCode,
        status: formData.status,
        created_by: user?.id,
      };

      const { error } = await supabase
        .from('miscellaneous_notes')
        .insert(noteData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Miscellaneous note saved successfully',
      });

      navigate('/notes');
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save miscellaneous note',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    await saveNote();
    setSignatureDialogOpen(false);
  };

  const generateWithAI = async () => {
    if (!aiInput.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please provide note details for AI to process',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.clientId) {
      toast({
        title: 'Client Required',
        description: 'Please select a client first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGeneratingAI(true);

      const { data, error } = await supabase.functions.invoke('generate-section-content', {
        body: {
          sectionType: 'miscellaneous_note',
          context: aiInput,
          clientId: formData.clientId,
          existingData: formData
        }
      });

      if (error) throw error;

      if (data?.content) {
        setAiSuggestion(data.content);
        toast({
          title: 'Note Generated',
          description: 'AI has generated note content. Please review and accept or reject.',
        });
        setAiInput('');
      }
    } catch (error: any) {
      console.error('Error generating note:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate note with AI',
        variant: 'destructive'
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const acceptAiSuggestion = () => {
    if (!aiSuggestion) return;

    setFormData(prev => ({
      ...prev,
      subject: aiSuggestion.subject || prev.subject,
      noteContent: aiSuggestion.noteContent || prev.noteContent,
      noteType: aiSuggestion.noteType || prev.noteType,
    }));

    setAiSuggestion(null);

    toast({
      title: 'Suggestion Accepted',
      description: 'AI-generated content has been added to the note',
    });
  };

  const rejectAiSuggestion = () => {
    setAiSuggestion(null);
    toast({
      title: 'Suggestion Rejected',
      description: 'AI-generated content was discarded',
    });
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
              <h1 className="text-3xl font-bold">Miscellaneous Note</h1>
              <p className="text-muted-foreground">Document general client information</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setSignatureDialogOpen(true)} disabled={saving} variant="outline">
              <FileSignature className="h-4 w-4 mr-2" />
              Sign Note
            </Button>
            <Button onClick={saveNote} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select
                  value={formData.clientId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.last_name}, {client.first_name} ({client.medical_record_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Note Date *</Label>
                <Input
                  type="date"
                  value={formData.noteDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, noteDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Note Type *</Label>
                <Input
                  value={formData.noteType}
                  onChange={(e) => setFormData(prev => ({ ...prev, noteType: e.target.value }))}
                  placeholder="e.g., Phone Log, Email, Administrative"
                />
              </div>

              <div>
                <Label>Subject *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description of the note"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Assisted Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Note Information</Label>
              <Textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Describe what needs to be documented: phone conversation details, email summary, administrative notes, follow-up reminders, etc. The AI will generate a structured note from this information."
                rows={6}
                disabled={generatingAI || !formData.clientId}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Provide as much detail as possible. You can write in free-form text or bullet points.
              </p>
            </div>

            <Button
              onClick={generateWithAI}
              disabled={generatingAI || !aiInput.trim() || !formData.clientId}
              className="w-full"
            >
              {generatingAI ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  Generating Note...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Note with AI
                </>
              )}
            </Button>

            {!formData.clientId && (
              <p className="text-sm text-warning">Please select a client first</p>
            )}
          </CardContent>
        </Card>

        {aiSuggestion && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Generated Note
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={acceptAiSuggestion}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={rejectAiSuggestion}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiSuggestion.noteType && (
                <div>
                  <span className="font-medium">Note Type: </span>
                  <span className="text-muted-foreground">{aiSuggestion.noteType}</span>
                </div>
              )}
              {aiSuggestion.subject && (
                <div>
                  <span className="font-medium">Subject: </span>
                  <span className="text-muted-foreground">{aiSuggestion.subject}</span>
                </div>
              )}
              {aiSuggestion.noteContent && (
                <div>
                  <span className="font-medium">Note Content: </span>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{aiSuggestion.noteContent}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <Label>Note Content *</Label>
              <Textarea
                value={formData.noteContent}
                onChange={(e) => setFormData(prev => ({ ...prev, noteContent: e.target.value }))}
                placeholder="Enter note content..."
                rows={10}
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="pr-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-2 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="clinically-relevant"
                  checked={formData.clinicallyRelevant}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, clinicallyRelevant: checked as boolean }))}
                />
                <Label htmlFor="clinically-relevant">Clinically Relevant</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="billable"
                  checked={formData.billable}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, billable: checked as boolean }))}
                />
                <Label htmlFor="billable">Billable Service</Label>
              </div>

              {formData.billable && (
                <div>
                  <Label>Billing Code</Label>
                  <Input
                    value={formData.billingCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, billingCode: e.target.value }))}
                    placeholder="CPT code"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          onSign={handleSign}
          clinicianName={clinicianName}
          noteType="Miscellaneous Note"
        />
      </div>
    </DashboardLayout>
  );
}
