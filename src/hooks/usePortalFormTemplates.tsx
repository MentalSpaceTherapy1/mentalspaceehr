import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FormTemplate, FormAssignment } from '@/types/forms';

export const usePortalFormTemplates = () => {
  const queryClient = useQueryClient();

  // Fetch all form templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['portal-form-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_form_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        sections: (item.sections as any) || [],
      })) as FormTemplate[];
    },
  });

  // Fetch active templates only
  const { data: activeTemplates } = useQuery({
    queryKey: ['portal-form-templates', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_form_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false});

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        sections: (item.sections as any) || [],
      })) as FormTemplate[];
    },
  });

  // Create form template
  const createTemplate = useMutation({
    mutationFn: async (template: Omit<FormTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('portal_form_templates')
        .insert([{ 
          ...template, 
          sections: template.sections as any,
          created_by: userData.user?.id 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-form-templates'] });
      toast.success('Form template created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create template: ' + error.message);
    },
  });

  // Update form template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FormTemplate> & { id: string }) => {
      const updateData: any = updates.sections 
        ? { ...updates, sections: updates.sections as any }
        : updates;
        
      const { data, error } = await supabase
        .from('portal_form_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-form-templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update template: ' + error.message);
    },
  });

  // Delete form template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('portal_form_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-form-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });

  // Assign form to client
  const assignForm = useMutation({
    mutationFn: async (assignment: Omit<FormAssignment, 'id' | 'created_at' | 'updated_at' | 'status_updated_at' | 'assigned_date' | 'assigned_by'> & { sendNotification?: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { sendNotification, ...assignmentData } = assignment;
      
      const { data, error } = await supabase
        .from('portal_form_assignments')
        .insert([{ ...assignmentData, assigned_by: userData.user?.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Send notification if requested
      if (sendNotification && data) {
        try {
          await supabase.functions.invoke('send-portal-form-notification', {
            body: { assignmentId: data.id },
          });
        } catch (notificationError: any) {
          console.error('Failed to send notification:', notificationError);
          toast.error('Form assigned but notification failed to send');
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-form-assignments'] });
      toast.success('Form assigned to client');
    },
    onError: (error) => {
      toast.error('Failed to assign form: ' + error.message);
    },
  });

  return {
    templates,
    activeTemplates,
    templatesLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    assignForm,
  };
};
