import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, Calendar, Clock, ChevronDown, 
  FileText, Lightbulb, CheckSquare, CalendarPlus, 
  MessageSquare, PenTool, Video, Phone, Building, Users
} from "lucide-react";
import { format } from "date-fns";
import { CaseDiscussion, ActionItem, GroupSupervisee } from "@/hooks/useSupervisionSessions";
import { CaseDiscussionInput } from "./CaseDiscussionInput";
import { ActionItemsList } from "./ActionItemsList";
import { GroupSuperviseesInput } from "./GroupSuperviseesInput";

interface SupervisionSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationshipId: string;
  supervisorId: string;
  superviseeId: string;
  onSuccess?: () => void;
}

export function SupervisionSessionDialog({
  open,
  onOpenChange,
  relationshipId,
  supervisorId,
  superviseeId,
  onSuccess
}: SupervisionSessionDialogProps) {
  const [loading, setLoading] = useState(false);
  
  // Collapsible sections state
  const [sectionsOpen, setSectionsOpen] = useState({
    basic: true,
    group: false,
    cases: false,
    skills: false,
    actions: false,
    followup: false,
    reflection: false,
    signatures: true
  });

  const [formData, setFormData] = useState({
    // Basic session info
    session_date: format(new Date(), 'yyyy-MM-dd'),
    session_start_time: '',
    session_end_time: '',
    session_duration_minutes: 60,
    session_type: 'Direct',
    session_format: 'In-Person' as 'In-Person' | 'Telehealth' | 'Phone',
    
    // Content
    topics_covered: [] as string[],
    notes: '',
    
    // Group supervision
    group_supervisees: [] as GroupSupervisee[],
    
    // Cases discussed
    cases_discussed: [] as CaseDiscussion[],
    
    // Skills & development
    skills_developed: [] as string[],
    feedback_provided: '',
    areas_of_strength: [] as string[],
    areas_for_improvement: [] as string[],
    
    // Action items
    action_items: [] as ActionItem[],
    
    // Follow-up
    next_session_scheduled: false,
    next_session_date: '',
    
    // Supervisee reflection
    supervisee_reflection: '',
    
    // Signatures
    supervisor_signature_name: '',
    supervisee_signature_name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.session_date || !formData.session_duration_minutes) {
        toast.error("Please fill in session date and duration");
        return;
      }

      if (!formData.supervisor_signature_name || !formData.supervisee_signature_name) {
        toast.error("Both supervisor and supervisee signatures are required");
        return;
      }

      const now = new Date().toISOString();

      const { error } = await supabase.from('supervision_sessions').insert({
        relationship_id: relationshipId,
        session_date: formData.session_date,
        session_start_time: formData.session_start_time || null,
        session_end_time: formData.session_end_time || null,
        session_duration_minutes: formData.session_duration_minutes,
        session_type: formData.session_type,
        session_format: formData.session_format,
        topics_covered: formData.topics_covered.length > 0 ? formData.topics_covered : null,
        notes: formData.notes || null,
        group_supervisees: formData.group_supervisees.length > 0 ? formData.group_supervisees : null,
        cases_discussed: formData.cases_discussed.length > 0 ? formData.cases_discussed : null,
        skills_developed: formData.skills_developed.length > 0 ? formData.skills_developed : null,
        feedback_provided: formData.feedback_provided || null,
        areas_of_strength: formData.areas_of_strength.length > 0 ? formData.areas_of_strength : null,
        areas_for_improvement: formData.areas_for_improvement.length > 0 ? formData.areas_for_improvement : null,
        action_items: formData.action_items.length > 0 ? formData.action_items : null,
        next_session_scheduled: formData.next_session_scheduled,
        next_session_date: formData.next_session_scheduled ? formData.next_session_date : null,
        supervisee_reflection: formData.supervisee_reflection || null,
        supervisor_signature_name: formData.supervisor_signature_name,
        supervisor_signed: true,
        supervisor_signed_date: now,
        supervisee_signature_name: formData.supervisee_signature_name,
        supervisee_signed: true,
        supervisee_signed_date: now
      } as any);

      if (error) throw error;

      toast.success("Supervision session logged successfully");
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setFormData({
        session_date: format(new Date(), 'yyyy-MM-dd'),
        session_start_time: '',
        session_end_time: '',
        session_duration_minutes: 60,
        session_type: 'Direct',
        session_format: 'In-Person',
        topics_covered: [],
        notes: '',
        group_supervisees: [],
        cases_discussed: [],
        skills_developed: [],
        feedback_provided: '',
        areas_of_strength: [],
        areas_for_improvement: [],
        action_items: [],
        next_session_scheduled: false,
        next_session_date: '',
        supervisee_reflection: '',
        supervisor_signature_name: '',
        supervisee_signature_name: ''
      });
    } catch (error: any) {
      console.error('Error logging session:', error);
      toast.error(error.message || "Failed to log supervision session");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Log Supervision Session
          </DialogTitle>
          <DialogDescription>
            Record a comprehensive supervision session with all relevant details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Session Information */}
          <Collapsible 
            open={sectionsOpen.basic}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, basic: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <Calendar className="h-4 w-4" />
                Basic Session Information
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.basic ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session_date">Session Date *</Label>
                  <Input
                    id="session_date"
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session_format">Session Format</Label>
                  <Select
                    value={formData.session_format}
                    onValueChange={(value: any) => setFormData({ ...formData, session_format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="In-Person">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          In-Person
                        </div>
                      </SelectItem>
                      <SelectItem value="Telehealth">
                        <div className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Telehealth
                        </div>
                      </SelectItem>
                      <SelectItem value="Phone">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.session_start_time}
                    onChange={(e) => setFormData({ ...formData, session_start_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.session_end_time}
                    onChange={(e) => setFormData({ ...formData, session_end_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    step="15"
                    value={formData.session_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, session_duration_minutes: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session_type">Session Type *</Label>
                <Select
                  value={formData.session_type}
                  onValueChange={(value) => setFormData({ ...formData, session_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Direct">Direct Clinical Supervision</SelectItem>
                    <SelectItem value="Indirect">Indirect/Administrative</SelectItem>
                    <SelectItem value="Group">Group Supervision</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="topics">Topics Covered (one per line)</Label>
                <Textarea
                  id="topics"
                  placeholder="Enter topics discussed, one per line"
                  rows={3}
                  value={formData.topics_covered.join('\n')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    topics_covered: e.target.value.split('\n').filter(t => t.trim()) 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">General Session Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Overall notes about this supervision session"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Group Supervision */}
          {formData.session_type === 'Group' && (
            <Collapsible 
              open={sectionsOpen.group}
              onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, group: open })}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
                <div className="flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4" />
                  Group Supervisees ({formData.group_supervisees.length})
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.group ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <GroupSuperviseesInput 
                  supervisees={formData.group_supervisees}
                  onChange={(supervisees) => setFormData({ ...formData, group_supervisees: supervisees })}
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Cases Discussed */}
          <Collapsible 
            open={sectionsOpen.cases}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, cases: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" />
                Cases Discussed ({formData.cases_discussed.length})
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.cases ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <CaseDiscussionInput 
                cases={formData.cases_discussed}
                onChange={(cases) => setFormData({ ...formData, cases_discussed: cases })}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Skills & Development */}
          <Collapsible 
            open={sectionsOpen.skills}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, skills: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <Lightbulb className="h-4 w-4" />
                Skills & Development
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.skills ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Skills Developed (one per line)</Label>
                <Textarea
                  placeholder="Enter skills developed or practiced in this session"
                  rows={2}
                  value={formData.skills_developed.join('\n')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    skills_developed: e.target.value.split('\n').filter(t => t.trim()) 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Feedback Provided</Label>
                <Textarea
                  placeholder="Detailed feedback given to supervisee"
                  rows={3}
                  value={formData.feedback_provided}
                  onChange={(e) => setFormData({ ...formData, feedback_provided: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Areas of Strength (one per line)</Label>
                <Textarea
                  placeholder="Enter areas where supervisee excelled"
                  rows={2}
                  value={formData.areas_of_strength.join('\n')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    areas_of_strength: e.target.value.split('\n').filter(t => t.trim()) 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Areas for Improvement (one per line)</Label>
                <Textarea
                  placeholder="Enter areas for continued growth and development"
                  rows={2}
                  value={formData.areas_for_improvement.join('\n')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    areas_for_improvement: e.target.value.split('\n').filter(t => t.trim()) 
                  })}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Action Items */}
          <Collapsible 
            open={sectionsOpen.actions}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, actions: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <CheckSquare className="h-4 w-4" />
                Action Items ({formData.action_items.length})
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.actions ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <ActionItemsList 
                items={formData.action_items}
                onChange={(items) => setFormData({ ...formData, action_items: items })}
                showCompleted={false}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Follow-up Planning */}
          <Collapsible 
            open={sectionsOpen.followup}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, followup: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarPlus className="h-4 w-4" />
                Follow-up Planning
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.followup ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="next_session"
                  checked={formData.next_session_scheduled}
                  onCheckedChange={(checked) => setFormData({ 
                    ...formData, 
                    next_session_scheduled: checked as boolean 
                  })}
                />
                <Label htmlFor="next_session" className="cursor-pointer">
                  Next supervision session scheduled
                </Label>
              </div>

              {formData.next_session_scheduled && (
                <div className="space-y-2">
                  <Label>Next Session Date</Label>
                  <Input
                    type="date"
                    value={formData.next_session_date}
                    onChange={(e) => setFormData({ ...formData, next_session_date: e.target.value })}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Supervisee Reflection */}
          <Collapsible 
            open={sectionsOpen.reflection}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, reflection: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <MessageSquare className="h-4 w-4" />
                Supervisee Reflection
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.reflection ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Supervisee's Reflection on Session</Label>
                <Textarea
                  placeholder="Supervisee's own notes and reflections about the session"
                  rows={4}
                  value={formData.supervisee_reflection}
                  onChange={(e) => setFormData({ ...formData, supervisee_reflection: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  This section is for the supervisee to document their own perspective and learning
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Signatures */}
          <Collapsible 
            open={sectionsOpen.signatures}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, signatures: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <PenTool className="h-4 w-4" />
                Signatures (Required)
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.signatures ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="supervisor_sig">Supervisor Signature *</Label>
                <Input
                  id="supervisor_sig"
                  placeholder="Type full name to sign"
                  value={formData.supervisor_signature_name}
                  onChange={(e) => setFormData({ ...formData, supervisor_signature_name: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  By signing, the supervisor confirms this session occurred as documented
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supervisee_sig">Supervisee Signature *</Label>
                <Input
                  id="supervisee_sig"
                  placeholder="Type full name to sign"
                  value={formData.supervisee_signature_name}
                  onChange={(e) => setFormData({ ...formData, supervisee_signature_name: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  By signing, the supervisee confirms this session occurred as documented
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Supervision Session
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}