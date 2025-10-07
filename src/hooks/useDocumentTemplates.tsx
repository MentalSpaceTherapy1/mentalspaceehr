import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentTemplateVariable {
  name: string;
  type: 'Client Name' | 'Date' | 'Clinician Name' | 'Custom Field';
  defaultValue?: string;
  required?: boolean;
}

export interface DocumentTemplateSignatureField {
  fieldId: string;
  label: string;
  requiredSigner: 'Client' | 'Clinician' | 'Guarantor' | 'Witness';
  position?: { x: number; y: number };
}

export interface DocumentTemplate {
  id: string;
  template_name: string;
  template_type: 'Consent Form' | 'Handout' | 'Assessment' | 'Letter' | 'Other';
  template_category?: string;
  template_content?: string;
  variables: DocumentTemplateVariable[];
  signature_fields: DocumentTemplateSignatureField[];
  default_file_name?: string;
  auto_generate_pdf: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useDocumentTemplates = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data as any || []);
    } catch (error: any) {
      toast({
        title: 'Error loading templates',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTemplate = async (template: Partial<DocumentTemplate>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('document_templates')
        .insert({
          template_name: template.template_name,
          template_type: template.template_type,
          template_category: template.template_category,
          template_content: template.template_content,
          variables: template.variables as any || [],
          signature_fields: template.signature_fields as any || [],
          default_file_name: template.default_file_name,
          auto_generate_pdf: template.auto_generate_pdf ?? true,
          created_by: user.user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      await fetchTemplates();
      toast({
        title: 'Template created successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error creating template',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<DocumentTemplate>) => {
    try {
      const { error } = await supabase
        .from('document_templates')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      await fetchTemplates();
      toast({
        title: 'Template updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating template',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('document_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      await fetchTemplates();
      toast({
        title: 'Template deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error deleting template',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const generateDocument = async (templateId: string, clientId: string, customData?: Record<string, any>) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-document-from-template', {
        body: {
          templateId,
          clientId,
          customData,
        },
      });

      if (error) throw error;

      toast({
        title: 'Document generated successfully',
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Error generating document',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const previewTemplate = (template: DocumentTemplate, sampleData?: Record<string, any>) => {
    let content = template.template_content || '';
    const data = sampleData || {};

    template.variables.forEach((variable) => {
      const placeholder = `{{${variable.name}}}`;
      const value = data[variable.name] || variable.defaultValue || `[${variable.name}]`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });

    return content;
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generateDocument,
    previewTemplate,
    refresh: fetchTemplates,
  };
};
