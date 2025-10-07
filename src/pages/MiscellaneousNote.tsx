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
import { Save, ArrowLeft, FileSignature, Plus, X, Brain, Sparkles, Check, Lock } from 'lucide-react';
import { SignatureDialog } from '@/components/intake/SignatureDialog';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNoteLockStatus } from '@/hooks/useNoteLockStatus';
import { UnlockRequestDialog } from '@/components/compliance/UnlockRequestDialog';
import { format } from 'date-fns';

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
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [noteId] = useState<string | null>(null); // Will be set after creation
  
  const { isLocked, lockDetails, loading: lockLoading } = useNoteLockStatus(noteId, 'miscellaneous_note');

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
    status: 'Draft',
    duration: '',
    participants: [] as { name: string; role: string }[],
    location: '',
    contactMethod: '',
    purpose: '',
    outcome: '',
    followUpRequired: false,
    followUpDate: '',
    followUpPlan: '',
    relatedDocumentation: ''
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
      // Silently handle - non-critical
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
      // Silently handle - non-critical
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

  const addParticipant = () => {
    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, { name: '', role: '' }]
    }));
  };

  const updateParticipant = (index: number, field: 'name' | 'role', value: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const removeParticipant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter((_, i) => i !== index)
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
        duration: formData.duration ? parseInt(formData.duration) : null,
        participants: formData.participants.filter(p => p.name && p.role),
        location: formData.location || null,
        contact_method: formData.contactMethod || null,
        purpose: formData.purpose || null,
        outcome: formData.outcome || null,
        follow_up_required: formData.followUpRequired,
        follow_up_date: formData.followUpDate || null,
        follow_up_plan: formData.followUpPlan || null,
        related_documentation: formData.relatedDocumentation || null,
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Note Type *</Label>
                <Select
                  value={formData.noteType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, noteType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Administrative">Administrative</SelectItem>
                    <SelectItem value="Coordination">Coordination of Care</SelectItem>
                    <SelectItem value="Follow-up">Follow-up Activity</SelectItem>
                    <SelectItem value="Documentation">Documentation Review</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 15"
                  min="1"
                />
              </div>

              <div>
                <Label>Subject *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Brief description"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Location</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Office">Office</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Virtual">Virtual/Video</SelectItem>
                    <SelectItem value="Home Visit">Home Visit</SelectItem>
                    <SelectItem value="Community">Community Setting</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Contact Method</Label>
                <Select
                  value={formData.contactMethod}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contactMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Person">In Person</SelectItem>
                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Text/SMS">Text/SMS</SelectItem>
                    <SelectItem value="Video Call">Video Call</SelectItem>
                    <SelectItem value="Written">Written Correspondence</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Purpose</Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, purpose: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Follow-up Call">Follow-up Call</SelectItem>
                    <SelectItem value="Coordination of Care">Coordination of Care</SelectItem>
                    <SelectItem value="Administrative">Administrative</SelectItem>
                    <SelectItem value="Documentation Review">Documentation Review</SelectItem>
                    <SelectItem value="Information Gathering">Information Gathering</SelectItem>
                    <SelectItem value="Crisis Intervention">Crisis Intervention</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Participants</Label>
              <div className="space-y-2 mt-2">
                {formData.participants.map((participant, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Name"
                      value={participant.name}
                      onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Role/Relationship"
                      value={participant.role}
                      onChange={(e) => updateParticipant(index, 'role', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeParticipant(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addParticipant}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Participant
                </Button>
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
          <CardHeader>
            <CardTitle>Note Content & Outcomes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Note Content *</Label>
              <Textarea
                value={formData.noteContent}
                onChange={(e) => setFormData(prev => ({ ...prev, noteContent: e.target.value }))}
                placeholder="Enter detailed note content..."
                rows={8}
              />
            </div>

            <div>
              <Label>Outcome/Results</Label>
              <Textarea
                value={formData.outcome}
                onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                placeholder="Document the outcome or results of this activity..."
                rows={4}
              />
            </div>

            <div>
              <Label>Related Documentation</Label>
              <Input
                value={formData.relatedDocumentation}
                onChange={(e) => setFormData(prev => ({ ...prev, relatedDocumentation: e.target.value }))}
                placeholder="Reference other notes, forms, or documentation"
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

        <Card>
          <CardHeader>
            <CardTitle>Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="follow-up-required"
                checked={formData.followUpRequired}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, followUpRequired: checked as boolean }))}
              />
              <Label htmlFor="follow-up-required">Follow-up Required</Label>
            </div>

            {formData.followUpRequired && (
              <>
                <div>
                  <Label>Follow-up Date</Label>
                  <Input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpDate: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Follow-up Plan</Label>
                  <Textarea
                    value={formData.followUpPlan}
                    onChange={(e) => setFormData(prev => ({ ...prev, followUpPlan: e.target.value }))}
                    placeholder="Describe the follow-up plan..."
                    rows={4}
                  />
                </div>
              </>
            )}
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
