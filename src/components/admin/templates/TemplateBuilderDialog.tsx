import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentTemplate } from '@/hooks/useDocumentTemplates';
import { TemplateVariablesPanel } from './TemplateVariablesPanel';
import { SignatureFieldsManager } from './SignatureFieldsManager';
import { FileText, Save } from 'lucide-react';

interface TemplateBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: Partial<DocumentTemplate>) => Promise<void>;
  initialTemplate?: DocumentTemplate;
}

export const TemplateBuilderDialog = ({
  open,
  onOpenChange,
  onSave,
  initialTemplate,
}: TemplateBuilderDialogProps) => {
  const [template, setTemplate] = useState<Partial<DocumentTemplate>>(
    initialTemplate || {
      template_name: '',
      template_type: 'Consent Form',
      template_category: '',
      template_content: '',
      variables: [],
      signature_fields: [],
      default_file_name: '',
      auto_generate_pdf: true,
      is_active: true,
    }
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(template);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const insertVariable = (variableName: string) => {
    const placeholder = `{{${variableName}}}`;
    setTemplate({
      ...template,
      template_content: (template.template_content || '') + placeholder,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {initialTemplate ? 'Edit Template' : 'Create Document Template'}
          </DialogTitle>
          <DialogDescription>
            Build a reusable document template with dynamic variables and signature fields
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
            <TabsTrigger value="signatures">Signatures</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                value={template.template_name}
                onChange={(e) => setTemplate({ ...template, template_name: e.target.value })}
                placeholder="e.g., Therapy Consent Form"
              />
            </div>

            <div>
              <Label htmlFor="template_type">Template Type *</Label>
              <Select
                value={template.template_type}
                onValueChange={(value: any) => setTemplate({ ...template, template_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Consent Form">Consent Form</SelectItem>
                  <SelectItem value="Handout">Handout</SelectItem>
                  <SelectItem value="Assessment">Assessment</SelectItem>
                  <SelectItem value="Letter">Letter</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="template_category">Category</Label>
              <Input
                id="template_category"
                value={template.template_category || ''}
                onChange={(e) => setTemplate({ ...template, template_category: e.target.value })}
                placeholder="e.g., Intake, Treatment, Discharge"
              />
            </div>

            <div>
              <Label htmlFor="default_file_name">Default File Name</Label>
              <Input
                id="default_file_name"
                value={template.default_file_name || ''}
                onChange={(e) => setTemplate({ ...template, default_file_name: e.target.value })}
                placeholder="e.g., {{clientName}}_Consent_{{date}}"
              />
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <div>
              <Label htmlFor="template_content">Template Content *</Label>
              <Textarea
                id="template_content"
                value={template.template_content || ''}
                onChange={(e) => setTemplate({ ...template, template_content: e.target.value })}
                placeholder="Enter your template content here. Use {{variableName}} for dynamic content."
                rows={15}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Tip: Use variables from the Variables tab by typing {'{{'} variableName {'}}'}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="variables">
            <TemplateVariablesPanel
              variables={template.variables || []}
              onChange={(variables) => setTemplate({ ...template, variables })}
              onInsert={insertVariable}
            />
          </TabsContent>

          <TabsContent value="signatures">
            <SignatureFieldsManager
              signatureFields={template.signature_fields || []}
              onChange={(signature_fields) => setTemplate({ ...template, signature_fields })}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !template.template_name}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
