import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FormWithResponse, FormTemplate } from '@/types/forms';

interface FormResponseReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formResponse: FormWithResponse | null;
  onStatusUpdate: () => void;
}

export const FormResponseReviewDialog = ({
  open,
  onOpenChange,
  formResponse,
  onStatusUpdate,
}: FormResponseReviewDialogProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!formResponse || !formResponse.response || !formResponse.template) {
    return null;
  }

  const template = formResponse.template as FormTemplate;
  const responses = formResponse.response.responses as Record<string, any>;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Update approval status
      const { error: updateError } = await supabase
        .from('portal_form_responses')
        .update({
          approval_status: 'approved',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', formResponse.response.id);

      if (updateError) throw updateError;

      // If this is the Client Information Form, import to client record
      if (template.title === 'Client Information Form') {
        await importClientInformation(formResponse.client_id, responses, userData.user?.id);
      }

      // If this is the Client Insurance Form, import to insurance record
      if (template.title === 'Client Insurance Form') {
        await importInsuranceInformation(formResponse.client_id, responses, userData.user?.id);
      }

      toast.success('Form approved and data imported to client chart');
      onStatusUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to approve form: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('portal_form_responses')
        .update({
          approval_status: 'rejected',
          approved_by: userData.user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', formResponse.response.id);

      if (error) throw error;

      toast.success('Form rejected');
      onStatusUpdate();
      onOpenChange(false);
      setRejectionReason('');
    } catch (error: any) {
      toast.error('Failed to reject form: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide revision instructions');
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('portal_form_responses')
        .update({
          approval_status: 'needs_revision',
          rejection_reason: rejectionReason,
        })
        .eq('id', formResponse.response.id);

      if (error) throw error;

      toast.success('Revision requested');
      onStatusUpdate();
      onOpenChange(false);
      setRejectionReason('');
    } catch (error: any) {
      toast.error('Failed to request revision: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const importClientInformation = async (clientId: string, data: Record<string, any>, userId: string | undefined) => {
    // Map form fields to client table columns
    const clientUpdate: any = {
      updated_at: new Date().toISOString(),
      last_modified_by: userId,
    };

    // Personal Information
    if (data.preferred_name) clientUpdate.preferred_name = data.preferred_name;
    if (data.pronouns) clientUpdate.pronouns = data.pronouns;
    if (data.date_of_birth) clientUpdate.date_of_birth = data.date_of_birth;
    if (data.sex_assigned_at_birth) clientUpdate.sex_assigned_at_birth = data.sex_assigned_at_birth;
    if (data.gender_identity) clientUpdate.gender_identity = data.gender_identity;
    if (data.ssn) clientUpdate.ssn = data.ssn;

    // Contact Information
    if (data.home_address || data.city || data.state || data.zip) {
      clientUpdate.address = {
        street: data.home_address,
        city: data.city,
        state: data.state,
        zip: data.zip,
      };
    }
    if (data.mailing_address) clientUpdate.mailing_address = data.mailing_address;
    if (data.primary_phone) clientUpdate.phone = data.primary_phone;
    if (data.phone_type) clientUpdate.phone_type = data.phone_type;
    if (data.voicemail_ok) clientUpdate.voicemail_ok = data.voicemail_ok === 'Yes';
    if (data.secondary_phone) clientUpdate.secondary_phone = data.secondary_phone;
    if (data.email) clientUpdate.email = data.email;
    if (data.preferred_contact) clientUpdate.preferred_contact_method = data.preferred_contact;
    if (data.reminder_consent) clientUpdate.consent_to_text = data.reminder_consent === 'Yes';

    // Demographics
    if (data.marital_status) clientUpdate.marital_status = data.marital_status;
    if (data.race_ethnicity) clientUpdate.race_ethnicity = data.race_ethnicity;
    if (data.primary_language) clientUpdate.primary_language = data.primary_language;
    if (data.needs_interpreter) clientUpdate.needs_interpreter = data.needs_interpreter === 'Yes';
    if (data.interpreter_language) clientUpdate.interpreter_language = data.interpreter_language;

    // Employment & Education
    if (data.employment_status) clientUpdate.employment_status = data.employment_status;
    if (data.employer_school) clientUpdate.employer = data.employer_school;
    if (data.occupation) clientUpdate.occupation = data.occupation;
    if (data.education_level) clientUpdate.education_level = data.education_level;

    const { error: clientError } = await supabase
      .from('clients')
      .update(clientUpdate)
      .eq('id', clientId);

    if (clientError) throw clientError;

    // Mark as imported
    await supabase
      .from('portal_form_responses')
      .update({
        data_imported_to_chart: true,
        imported_at: new Date().toISOString(),
        imported_by: userId,
      })
      .eq('id', formResponse.response.id);
  };

  const importInsuranceInformation = async (clientId: string, data: Record<string, any>, userId: string | undefined) => {
    // Check if primary insurance already exists
    const { data: existingInsurance } = await supabase
      .from('client_insurance')
      .select('*')
      .eq('client_id', clientId)
      .eq('rank', 'Primary')
      .single();

    const insuranceData: any = {
      client_id: clientId,
      rank: 'Primary',
      insurance_company: data.insurance_company,
      plan_name: data.insurance_company,
      plan_type: 'Unknown',
      member_id: data.policy_number,
      group_number: data.group_number,
      subscriber_first_name: data.policy_holder_name?.split(' ')[0] || '',
      subscriber_last_name: data.policy_holder_name?.split(' ').slice(1).join(' ') || '',
      subscriber_dob: data.policy_holder_dob,
      relationship_to_subscriber: data.relationship_to_client,
      subscriber_is_client: data.relationship_to_client === 'Self',
      customer_service_phone: data.insurance_phone,
      effective_date: data.effective_date || new Date().toISOString().split('T')[0],
      copay: data.copay ? parseFloat(data.copay.replace(/[^0-9.]/g, '')) : null,
      deductible: data.deductible ? parseFloat(data.deductible.replace(/[^0-9.]/g, '')) : null,
      deductible_met: data.deductible_met ? parseFloat(data.deductible_met.replace(/[^0-9.]/g, '')) : null,
      out_of_pocket_max: data.oop_max ? parseFloat(data.oop_max.replace(/[^0-9.]/g, '')) : null,
      mental_health_coverage: true,
      updated_by: userId,
      created_by: userId,
    };

    if (existingInsurance) {
      const { error } = await supabase
        .from('client_insurance')
        .update(insuranceData)
        .eq('id', existingInsurance.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('client_insurance')
        .insert([insuranceData]);
      if (error) throw error;
    }

    // Mark as imported
    await supabase
      .from('portal_form_responses')
      .update({
        data_imported_to_chart: true,
        imported_at: new Date().toISOString(),
        imported_by: userId,
      })
      .eq('id', formResponse.response.id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending Review', icon: AlertCircle },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
      needs_revision: { variant: 'outline' as const, label: 'Needs Revision', icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Review Form Response</DialogTitle>
            {getStatusBadge(formResponse.response.approval_status || 'pending')}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Form</Label>
                <p className="font-medium">{template.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Submitted</Label>
                <p className="font-medium">
                  {formResponse.response.completed_at
                    ? new Date(formResponse.response.completed_at).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            <Separator />

            {template.sections.map((section, sectionIdx) => (
              <div key={section.id} className="space-y-4">
                <h3 className="font-semibold text-lg">{section.title}</h3>
                {section.description && (
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                )}

                <div className="space-y-3">
                  {section.fields.map((field) => {
                    const value = responses[field.id];
                    if (!value && !field.required) return null;

                    return (
                      <div key={field.id} className="grid grid-cols-3 gap-4 text-sm">
                        <Label className="text-muted-foreground">{field.label}</Label>
                        <div className="col-span-2">
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-1">
                              {value.map((v, i) => (
                                <Badge key={i} variant="outline">
                                  {v}
                                </Badge>
                              ))}
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <Badge variant={value ? 'default' : 'outline'}>
                              {value ? 'Yes' : 'No'}
                            </Badge>
                          ) : (
                            <p className="font-medium break-words">{value || 'Not provided'}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {sectionIdx < template.sections.length - 1 && <Separator />}
              </div>
            ))}

            {formResponse.response.client_signature && (
              <div className="space-y-2">
                <Separator />
                <Label>Client Signature</Label>
                <img
                  src={formResponse.response.client_signature}
                  alt="Client signature"
                  className="border rounded-lg p-2 bg-white max-w-md"
                />
                <p className="text-sm text-muted-foreground">
                  Signed on {new Date(formResponse.response.signature_date!).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {formResponse.response.approval_status === 'pending' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection/Revision Notes (optional)</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide reason for rejection or revision instructions..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleRequestRevision}
                disabled={isProcessing}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Request Revision
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve & Import
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
