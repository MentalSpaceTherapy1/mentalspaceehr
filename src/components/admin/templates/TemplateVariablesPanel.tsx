import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DocumentTemplateVariable } from '@/hooks/useDocumentTemplates';
import { Plus, Trash2, Code } from 'lucide-react';

interface TemplateVariablesPanelProps {
  variables: DocumentTemplateVariable[];
  onChange: (variables: DocumentTemplateVariable[]) => void;
  onInsert?: (variableName: string) => void;
}

export const TemplateVariablesPanel = ({
  variables,
  onChange,
  onInsert,
}: TemplateVariablesPanelProps) => {
  const [newVariable, setNewVariable] = useState<DocumentTemplateVariable>({
    name: '',
    type: 'Custom Field',
    defaultValue: '',
    required: false,
  });

  const addVariable = () => {
    if (!newVariable.name) return;
    onChange([...variables, newVariable]);
    setNewVariable({
      name: '',
      type: 'Custom Field',
      defaultValue: '',
      required: false,
    });
  };

  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Template Variables</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define variables that will be replaced with actual data when generating documents
        </p>
      </div>

      {variables.length > 0 && (
        <div className="space-y-2">
          {variables.map((variable, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-4 gap-3 items-center">
                  <div>
                    <span className="text-sm font-medium">{variable.name}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">{variable.type}</span>
                  </div>
                  <div>
                    {variable.defaultValue && (
                      <span className="text-sm text-muted-foreground">
                        Default: {variable.defaultValue}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    {variable.required && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                    {onInsert && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onInsert(variable.name)}
                      >
                        <Code className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVariable(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Add New Variable</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="var_name">Variable Name</Label>
            <Input
              id="var_name"
              value={newVariable.name}
              onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
              placeholder="e.g., clientName"
            />
          </div>
          <div>
            <Label htmlFor="var_type">Type</Label>
            <Select
              value={newVariable.type}
              onValueChange={(value: any) => setNewVariable({ ...newVariable, type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Client Name">Client Name</SelectItem>
                <SelectItem value="Date">Date</SelectItem>
                <SelectItem value="Clinician Name">Clinician Name</SelectItem>
                <SelectItem value="Custom Field">Custom Field</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="var_default">Default Value</Label>
            <Input
              id="var_default"
              value={newVariable.defaultValue || ''}
              onChange={(e) => setNewVariable({ ...newVariable, defaultValue: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="flex items-end">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="var_required"
                checked={newVariable.required}
                onCheckedChange={(checked) =>
                  setNewVariable({ ...newVariable, required: checked as boolean })
                }
              />
              <Label htmlFor="var_required" className="text-sm">
                Required
              </Label>
            </div>
          </div>
        </div>
        <Button onClick={addVariable} className="mt-3" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Variable
        </Button>
      </Card>
    </div>
  );
};
