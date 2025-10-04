import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSign: () => void;
  clinicianName: string;
}

export function SignatureDialog({ open, onOpenChange, onSign, clinicianName }: SignatureDialogProps) {
  const [agreed, setAgreed] = useState(false);

  const handleSign = () => {
    if (agreed) {
      onSign();
      onOpenChange(false);
      setAgreed(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign Intake Assessment</DialogTitle>
          <DialogDescription>
            By signing this document, you certify that the information provided is accurate and complete.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Once signed, this note will be locked and cannot be edited. You will still be able to create amendments if needed.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Clinician:</span>
                <span>{clinicianName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Time:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <Label htmlFor="agree" className="text-sm leading-tight cursor-pointer">
              I certify that I have completed this intake assessment to the best of my ability, and that the information contained within is accurate and complete. I understand that this note will be locked after signing and cannot be edited.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={!agreed}>
            Sign Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}