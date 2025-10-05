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
  MessageSquare, PenTool, Video, Phone, Building, Users, CheckCircle
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
    verification: false,
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
    
    // Verification & License (NEW)
    verified_by_supervisor: false,
    status: 'Pending' as 'Pending' | 'Verified' | 'Disputed',
    dispute_reason: '',
    applies_to: '',
    
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
        // Verification & License fields (NEW)
        verified_by_supervisor: formData.verified_by_supervisor,
        verification_date: formData.verified_by_supervisor ? now : null,
        status: formData.status,
        dispute_reason: formData.status === 'Disputed' ? formData.dispute_reason : null,
        applies_to: formData.applies_to || null,
        // Signatures
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
        verified_by_supervisor: false,
        status: 'Pending',
        dispute_reason: '',
        applies_to: '',
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

          {/* Group Supervision Details */}
          <Collapsible 
            open={sectionsOpen.group}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, group: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4" />
                Group Supervision Details
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.group ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <GroupSuperviseesInput
                supervisees={formData.group_supervisees}
                onChange={(newSupervisees) => setFormData({ ...formData, group_supervisees: newSupervisees })}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Cases Discussed */}
          <Collapsible 
            open={sectionsOpen.cases}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, cases: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" />
                Cases Discussed
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
                <Label htmlFor="skills_developed">Skills Developed (one per line)</Label>
                <Textarea
                  id="skills_developed"
                  placeholder="List skills developed during this session, one per line"
                  rows={3}
                  value={formData.skills_developed.join('\n')}
                  onChange={(e) => setFormData({
                    ...formData,
                    skills_developed: e.target.value.split('\n').filter(s => s.trim())
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback_provided">Feedback Provided</Label>
                <Textarea
                  id="feedback_provided"
                  placeholder="Specific feedback provided to the supervisee"
                  rows={3}
                  value={formData.feedback_provided}
                  onChange={(e) => setFormData({ ...formData, feedback_provided: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="areas_of_strength">Areas of Strength (one per line)</Label>
                <Textarea
                  id="areas_of_strength"
                  placeholder="Supervisee's areas of strength, one per line"
                  rows={3}
                  value={formData.areas_of_strength.join('\n')}
                  onChange={(e) => setFormData({
                    ...formData,
                    areas_of_strength: e.target.value.split('\n').filter(a => a.trim())
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="areas_for_improvement">Areas for Improvement (one per line)</Label>
                <Textarea
                  id="areas_for_improvement"
                  placeholder="Areas where the supervisee can improve, one per line"
                  rows={3}
                  value={formData.areas_for_improvement.join('\n')}
                  onChange={(e) => setFormData({
                    ...formData,
                    areas_for_improvement: e.target.value.split('\n').filter(a => a.trim())
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
                Action Items
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.actions ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <ActionItemsList
                items={formData.action_items}
                onChange={(newItems) => setFormData({ ...formData, action_items: newItems })}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Follow-up */}
          <Collapsible 
            open={sectionsOpen.followup}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, followup: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarPlus className="h-4 w-4" />
                Follow-up
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.followup ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="next_session_scheduled"
                  checked={formData.next_session_scheduled}
                  onCheckedChange={(checked) => setFormData({ ...formData, next_session_scheduled: !!checked })}
                />
                <Label htmlFor="next_session_scheduled" className="text-sm font-normal">
                  Next Session Scheduled?
                </Label>
              </div>

              {formData.next_session_scheduled && (
                <div className="space-y-2">
                  <Label htmlFor="next_session_date">Next Session Date</Label>
                  <Input
                    id="next_session_date"
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
                <Label htmlFor="supervisee_reflection">Supervisee's Reflection</Label>
                <Textarea
                  id="supervisee_reflection"
                  placeholder="Supervisee's thoughts and reflections on the session"
                  rows={3}
                  value={formData.supervisee_reflection}
                  onChange={(e) => setFormData({ ...formData, supervisee_reflection: e.target.value })}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Verification & Licensure Section (NEW) */}
          <Collapsible 
            open={sectionsOpen.verification}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, verification: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle className="h-4 w-4" />
                Verification & License Tracking
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.verification ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="applies_to">Applies To (License Type)</Label>
                <Select
                  value={formData.applies_to}
                  onValueChange={(value) => setFormData({ ...formData, applies_to: value })}
                >
                  <SelectTrigger id="applies_to">
                    <SelectValue placeholder="Select license type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="LMSW">LMSW (Licensed Master Social Worker)</SelectItem>
                    <SelectItem value="LCSW">LCSW (Licensed Clinical Social Worker)</SelectItem>
                    <SelectItem value="LMHC">LMHC (Licensed Mental Health Counselor)</SelectItem>
                    <SelectItem value="LMFT">LMFT (Licensed Marriage and Family Therapist)</SelectItem>
                    <SelectItem value="LCAT">LCAT (Licensed Creative Arts Therapist)</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Specify which licensure requirement these hours apply to
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="verified_by_supervisor"
                  checked={formData.verified_by_supervisor}
                  onCheckedChange={(checked) => setFormData({ ...formData, verified_by_supervisor: !!checked })}
                />
                <Label htmlFor="verified_by_supervisor" className="text-sm font-normal">
                  Verified by Supervisor
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Session Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Verified">Verified</SelectItem>
                    <SelectItem value="Disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === 'Disputed' && (
                <div className="space-y-2">
                  <Label htmlFor="dispute_reason">Dispute Reason</Label>
                  <Textarea
                    id="dispute_reason"
                    rows={3}
                    placeholder="Explain the reason for dispute..."
                    value={formData.dispute_reason}
                    onChange={(e) => setFormData({ ...formData, dispute_reason: e.target.value })}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Signatures Section */}
          <Collapsible 
            open={sectionsOpen.signatures}
            onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, signatures: open })}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80">
              <div className="flex items-center gap-2 font-semibold">
                <PenTool className="h-4 w-4" />
                Signatures
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${sectionsOpen.signatures ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supervisor_signature">Supervisor Signature *</Label>
                  <Input
                    id="supervisor_signature"
                    placeholder="Type your full name"
                    value={formData.supervisor_signature_name}
                    onChange={(e) => setFormData({ ...formData, supervisor_signature_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supervisee_signature">Supervisee Signature *</Label>
                  <Input
                    id="supervisee_signature"
                    placeholder="Type your full name"
                    value={formData.supervisee_signature_name}
                    onChange={(e) => setFormData({ ...formData, supervisee_signature_name: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
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
