import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, ExternalLink } from 'lucide-react';

interface OpenAIKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyAdded: () => void;
}

export function OpenAIKeyDialog({ open, onOpenChange, onKeyAdded }: OpenAIKeyDialogProps) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(true);

  const handleAddKey = () => {
    // Close dialog and notify parent
    setNeedsSetup(false);
    onKeyAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Add OpenAI API Key
          </DialogTitle>
          <DialogDescription>
            Securely store your OpenAI API key for AI-powered clinical documentation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              Your API key will be encrypted and stored securely in AWS Secrets Manager. After clicking "Setup API Key", you'll be prompted to enter your OpenAI API key in a secure modal.
            </AlertDescription>
          </Alert>

          {showInstructions && (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">How to get your OpenAI API Key:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  OpenAI Platform <ExternalLink className="h-3 w-3" />
                </a></li>
                <li>Sign in or create an account</li>
                <li>Click "Create new secret key"</li>
                <li>Copy the key (it starts with "sk-")</li>
                <li>Click the button below to add it securely</li>
              </ol>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowInstructions(false)}
              >
                I have my key ready
              </Button>
            </div>
          )}

          <Alert variant="default" className="border-yellow-500">
            <AlertDescription>
              <strong>Important:</strong> Using OpenAI requires a valid API key and you will be billed separately by OpenAI based on usage. Make sure you have:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>An active OpenAI account</li>
                <li>A valid payment method on file</li>
                <li>Sufficient credits or billing enabled</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">HIPAA Compliance Note:</h4>
            <p className="text-sm text-muted-foreground">
              If you're using OpenAI in a healthcare setting, you must have a signed Business Associate Agreement (BAA) with OpenAI. You can manage BAA records in the <strong>BAA Management</strong> section of admin settings.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddKey}>
              <Key className="h-4 w-4 mr-2" />
              Setup API Key
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
