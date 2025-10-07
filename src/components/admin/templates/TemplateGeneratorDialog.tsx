import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentTemplate } from '@/hooks/useDocumentTemplates';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download } from 'lucide-react';

interface TemplateGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate;
  onGenerate: (templateId: string, clientId: string, customData: Record<string, any>) => Promise<void>;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

export const TemplateGeneratorDialog = ({
  open,
  onOpenChange,
  template,
  onGenerate,
}: TemplateGeneratorDialogProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      fetchClients();
      initializeCustomData();
    }
  }, [open, template]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('status', 'Active')
      .order('last_name');
    if (data) setClients(data);
  };

  const initializeCustomData = () => {
    const data: Record<string, any> = {};
    template.variables.forEach((variable) => {
      data[variable.name] = variable.defaultValue || '';
    });
    setCustomData(data);
  };

  const handleGenerate = async () => {
    if (!selectedClientId) return;
    setIsGenerating(true);
    try {
      await onGenerate(template.id, selectedClientId, customData);
      onOpenChange(false);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Document from Template
          </DialogTitle>
          <DialogDescription>
            Fill in the details to generate: {template.template_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="client">Select Client *</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.last_name}, {client.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {template.variables.length > 0 && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Template Variables</h3>
              </div>

              {template.variables.map((variable) => (
                <div key={variable.name}>
                  <Label htmlFor={variable.name}>
                    {variable.name} {variable.required && '*'}
                  </Label>
                  <Input
                    id={variable.name}
                    value={customData[variable.name] || ''}
                    onChange={(e) =>
                      setCustomData({ ...customData, [variable.name]: e.target.value })
                    }
                    placeholder={variable.type}
                    required={variable.required}
                  />
                  {variable.type !== 'Custom Field' && (
                    <p className="text-xs text-muted-foreground mt-1">Type: {variable.type}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !selectedClientId}>
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
