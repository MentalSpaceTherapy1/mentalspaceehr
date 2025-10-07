import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, X, GripVertical } from 'lucide-react';
import { usePortalFormTemplates } from '@/hooks/usePortalFormTemplates';
import type { FormTemplate, FormSection, FormField } from '@/types/forms';

interface FormBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: FormTemplate;
}

export const FormBuilderDialog = ({ open, onOpenChange, template }: FormBuilderDialogProps) => {
  const { createTemplate, updateTemplate } = usePortalFormTemplates();
  
  const [formData, setFormData] = useState<Partial<FormTemplate>>(template || {
    form_type: 'Custom',
    title: '',
    description: '',
    version: 1,
    sections: [],
    is_active: true,
    requires_signature: false,
    allow_partial_save: true,
  });

  const [sections, setSections] = useState<FormSection[]>(
    template?.sections as FormSection[] || []
  );

  const addSection = () => {
    const newSection: FormSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      order: sections.length,
      fields: [],
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (index: number, updates: Partial<FormSection>) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], ...updates };
    setSections(updated);
  };

  const deleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const addField = (sectionIndex: number) => {
    const updated = [...sections];
    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      order: updated[sectionIndex].fields.length,
    };
    updated[sectionIndex].fields.push(newField);
    setSections(updated);
  };

  const updateField = (sectionIndex: number, fieldIndex: number, updates: Partial<FormField>) => {
    const updated = [...sections];
    updated[sectionIndex].fields[fieldIndex] = {
      ...updated[sectionIndex].fields[fieldIndex],
      ...updates,
    };
    setSections(updated);
  };

  const deleteField = (sectionIndex: number, fieldIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].fields = updated[sectionIndex].fields.filter((_, i) => i !== fieldIndex);
    setSections(updated);
  };

  const handleSave = async () => {
    const templateData = {
      ...formData,
      sections: sections as any,
    };

    if (template?.id) {
      await updateTemplate.mutateAsync({ ...templateData, id: template.id });
    } else {
      await createTemplate.mutateAsync(templateData as any);
    }
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit' : 'Create'} Form Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Form Type</Label>
              <Select 
                value={formData.form_type}
                onValueChange={(value) => setFormData({ ...formData, form_type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intake">Intake</SelectItem>
                  <SelectItem value="Consent">Consent</SelectItem>
                  <SelectItem value="Assessment">Assessment</SelectItem>
                  <SelectItem value="Insurance Update">Insurance Update</SelectItem>
                  <SelectItem value="Feedback">Feedback</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estimated Time (minutes)</Label>
              <Input
                type="number"
                value={formData.estimated_minutes || ''}
                onChange={(e) => setFormData({ ...formData, estimated_minutes: parseInt(e.target.value) || undefined })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Options */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.requires_signature}
                onCheckedChange={(checked) => setFormData({ ...formData, requires_signature: checked })}
              />
              <Label>Requires Signature</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.allow_partial_save}
                onCheckedChange={(checked) => setFormData({ ...formData, allow_partial_save: checked })}
              />
              <Label>Allow Partial Save</Label>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg">Sections</Label>
              <Button onClick={addSection} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>

            {sections.map((section, sectionIndex) => (
              <div key={section.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(sectionIndex, { title: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSection(sectionIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {section.description && (
                  <Textarea
                    value={section.description}
                    onChange={(e) => updateSection(sectionIndex, { description: e.target.value })}
                    placeholder="Section description"
                  />
                )}

                {/* Fields */}
                <div className="ml-8 space-y-2">
                  {section.fields.map((field, fieldIndex) => (
                    <div key={field.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(sectionIndex, fieldIndex, { label: e.target.value })}
                        className="flex-1"
                        placeholder="Field label"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(value) => updateField(sectionIndex, fieldIndex, { type: value as any })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                          <SelectItem value="select">Select</SelectItem>
                          <SelectItem value="multiselect">Multi-select</SelectItem>
                          <SelectItem value="checkbox">Checkbox</SelectItem>
                          <SelectItem value="radio">Radio</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="signature">Signature</SelectItem>
                          <SelectItem value="file">File</SelectItem>
                        </SelectContent>
                      </Select>
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) => updateField(sectionIndex, fieldIndex, { required: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteField(sectionIndex, fieldIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addField(sectionIndex)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.title || sections.length === 0}>
              {template ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
