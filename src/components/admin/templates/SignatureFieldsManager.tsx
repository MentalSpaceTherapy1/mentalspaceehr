import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { DocumentTemplateSignatureField } from '@/hooks/useDocumentTemplates';
import { Plus, Trash2, PenTool } from 'lucide-react';

interface SignatureFieldsManagerProps {
  signatureFields: DocumentTemplateSignatureField[];
  onChange: (fields: DocumentTemplateSignatureField[]) => void;
}

export const SignatureFieldsManager = ({
  signatureFields,
  onChange,
}: SignatureFieldsManagerProps) => {
  const [newField, setNewField] = useState<Partial<DocumentTemplateSignatureField>>({
    label: '',
    requiredSigner: 'Client',
  });

  const addSignatureField = () => {
    if (!newField.label) return;
    const field: DocumentTemplateSignatureField = {
      fieldId: `sig_${Date.now()}`,
      label: newField.label,
      requiredSigner: newField.requiredSigner as any,
    };
    onChange([...signatureFields, field]);
    setNewField({ label: '', requiredSigner: 'Client' });
  };

  const removeField = (fieldId: string) => {
    onChange(signatureFields.filter((f) => f.fieldId !== fieldId));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Signature Requirements</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define who needs to sign this document when generated
        </p>
      </div>

      {signatureFields.length > 0 && (
        <div className="space-y-2">
          {signatureFields.map((field) => (
            <Card key={field.fieldId} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PenTool className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">Signer: {field.requiredSigner}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeField(field.fieldId)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Add Signature Field</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="sig_label">Field Label</Label>
            <Input
              id="sig_label"
              value={newField.label || ''}
              onChange={(e) => setNewField({ ...newField, label: e.target.value })}
              placeholder="e.g., Client Signature"
            />
          </div>
          <div>
            <Label htmlFor="sig_signer">Required Signer</Label>
            <Select
              value={newField.requiredSigner}
              onValueChange={(value: any) => setNewField({ ...newField, requiredSigner: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Client">Client</SelectItem>
                <SelectItem value="Clinician">Clinician</SelectItem>
                <SelectItem value="Guarantor">Guarantor</SelectItem>
                <SelectItem value="Witness">Witness</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={addSignatureField} className="mt-3" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Signature Field
        </Button>
      </Card>
    </div>
  );
};
