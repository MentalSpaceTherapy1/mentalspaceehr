import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FormAssignment, FormResponse, FormWithResponse } from '@/types/forms';
import { toast } from '@/hooks/use-toast';

export const usePortalForms = (clientId?: string) => {
  const queryClient = useQueryClient();

  // Fetch form assignments with templates
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['portal-form-assignments', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('portal_form_assignments')
        .select(`
          *,
          template:portal_form_templates(*)
        `)
        .eq('client_id', clientId)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      // Transform database response to match our types
      return (data || []).map(item => ({
        ...item,
        template: item.template ? {
          ...item.template,
          sections: (item.template.sections as any) || [],
        } : undefined,
      })) as FormWithResponse[];
    },
    enabled: !!clientId,
  });

  // Fetch responses for assignments
  const { data: responses } = useQuery({
    queryKey: ['portal-form-responses', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('portal_form_responses')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;
      return data as FormResponse[];
    },
    enabled: !!clientId,
  });

  // Merge assignments with responses
  const formsWithResponses: FormWithResponse[] = assignments?.map(assignment => ({
    ...assignment,
    response: responses?.find(r => r.assignment_id === assignment.id),
  })) || [];

  // Start form mutation
  const startFormMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { data, error } = await supabase
        .from('portal_form_responses')
        .insert({
          assignment_id: assignmentId,
          client_id: clientId!,
          started_at: new Date().toISOString(),
          responses: {},
        })
        .select()
        .single();

      if (error) throw error;

      // Update assignment status
      await supabase
        .from('portal_form_assignments')
        .update({ 
          status: 'started',
          status_updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-form-assignments', clientId] });
      queryClient.invalidateQueries({ queryKey: ['portal-form-responses', clientId] });
    },
  });

  // Save form progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: async ({
      responseId,
      responses,
      progressPercentage,
    }: {
      responseId: string;
      responses: Record<string, any>;
      progressPercentage: number;
    }) => {
      const { data, error } = await supabase
        .from('portal_form_responses')
        .update({
          responses,
          progress_percentage: progressPercentage,
          last_saved_at: new Date().toISOString(),
        })
        .eq('id', responseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Progress saved',
        description: 'Your form progress has been saved.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error saving progress',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Submit form mutation
  const submitFormMutation = useMutation({
    mutationFn: async ({
      responseId,
      assignmentId,
      responses,
      signature,
      timeSpentSeconds,
    }: {
      responseId: string;
      assignmentId: string;
      responses: Record<string, any>;
      signature?: string;
      timeSpentSeconds: number;
    }) => {
      // Get user's IP address (simplified - in production use a proper service)
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      // Update response
      const { data: responseData, error: responseError } = await supabase
        .from('portal_form_responses')
        .update({
          responses,
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
          client_signature: signature,
          signature_date: signature ? new Date().toISOString() : null,
          signature_ip: ip,
        })
        .eq('id', responseId)
        .select()
        .single();

      if (responseError) throw responseError;

      // Update assignment status
      const { error: assignmentError } = await supabase
        .from('portal_form_assignments')
        .update({
          status: 'completed',
          status_updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          time_spent_seconds: timeSpentSeconds,
        })
        .eq('id', assignmentId);

      if (assignmentError) throw assignmentError;

      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-form-assignments', clientId] });
      queryClient.invalidateQueries({ queryKey: ['portal-form-responses', clientId] });
      toast({
        title: 'Form submitted',
        description: 'Thank you for completing the form.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error submitting form',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel assignment mutation
  const cancelAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('portal_form_assignments')
        .update({
          status: 'cancelled',
          status_updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-form-assignments', clientId] });
      toast({
        title: 'Assignment cancelled',
        description: 'The form assignment has been cancelled.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error cancelling assignment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Resend notification mutation
  const resendNotificationMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      // Call edge function to resend notification
      const { error } = await supabase.functions.invoke('send-portal-form-notification', {
        body: { assignmentId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Notification sent',
        description: 'A reminder has been sent to the client.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error sending notification',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    forms: formsWithResponses,
    isLoading,
    startForm: startFormMutation.mutate,
    saveProgress: saveProgressMutation.mutate,
    submitForm: submitFormMutation.mutate,
    cancelAssignment: cancelAssignmentMutation.mutate,
    resendNotification: resendNotificationMutation.mutate,
    isStarting: startFormMutation.isPending,
    isSaving: saveProgressMutation.isPending,
    isSubmitting: submitFormMutation.isPending,
    isCancelling: cancelAssignmentMutation.isPending,
    isResending: resendNotificationMutation.isPending,
  };
};
