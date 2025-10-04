import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SupervisorCosignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCosign: (comments: string) => void;
  supervisorName: string;
}

export function SupervisorCosignDialog({ open, onOpenChange, onCosign, supervisorName }: SupervisorCosignDialogProps) {
  const [agreed, setAgreed] = useState(false);
  const [comments, setComments] = useState('');

  const handleCosign = () => {
    if (agreed) {
      onCosign(comments);
      onOpenChange(false);
      setAgreed(false);
      setComments('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Supervisor Co-Sign</DialogTitle>
          <DialogDescription>
            Review and co-sign this intake assessment as a supervisor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Supervisor:</span>
                <span>{supervisorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Co-Sign Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Co-Sign Time:</span>
                <span>{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="comments">Supervisor Comments (Optional)</Label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any supervisory notes or feedback..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="supervisor-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <Label htmlFor="supervisor-agree" className="text-sm leading-tight cursor-pointer">
              I have reviewed this intake assessment and approve of the clinical content, treatment plan, and diagnostic formulation. I understand that my co-signature indicates supervisory approval.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCosign} disabled={!agreed}>
            Co-Sign Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}