import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { usePortalMessages } from '@/hooks/usePortalMessages';
import { MessageAttachmentUpload } from './MessageAttachmentUpload';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyTo?: {
    recipientId: string;
    recipientName: string;
    subject: string;
    originalMessage: string;
    threadId?: string;
  };
}

export const ComposeMessageDialog = ({ open, onOpenChange, replyTo }: ComposeMessageDialogProps) => {
  const { portalContext } = usePortalAccount();
  const { sendMessage } = usePortalMessages();
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    subject: replyTo ? `Re: ${replyTo.subject}` : '',
    message: replyTo ? `\n\n---\nOriginal message:\n${replyTo.originalMessage}` : '',
    priority: 'Normal' as 'Normal' | 'Urgent',
    requiresResponse: false
  });
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!portalContext?.client.id || !portalContext.client.primaryTherapist?.id) {
      toast.error('Unable to send message');
      return;
    }

    if (!formData.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    if (!formData.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (formData.message.length > 5000) {
      toast.error('Message is too long (max 5000 characters)');
      return;
    }

    try {
      setSending(true);

      await sendMessage({
        clientId: portalContext.client.id,
        clinicianId: portalContext.client.primaryTherapist.id,
        subject: formData.subject,
        message: formData.message,
        priority: formData.priority,
        requiresResponse: formData.requiresResponse,
        threadId: replyTo?.threadId
      });

      toast.success('Message sent successfully');
      onOpenChange(false);
      
      // Reset form
      setFormData({
        subject: '',
        message: '',
        priority: 'Normal',
        requiresResponse: false
      });
      setAttachments([]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const characterCount = formData.message.length;
  const characterLimit = 5000;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{replyTo ? 'Reply to Message' : 'Compose New Message'}</DialogTitle>
          <DialogDescription>
            Send a secure message to your clinician
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">To</Label>
            <Input
              id="recipient"
              value={portalContext?.client.primaryTherapist 
                ? `${portalContext.client.primaryTherapist.firstName} ${portalContext.client.primaryTherapist.lastName}`
                : 'Your clinician'}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="What is this message about?"
              maxLength={100}
              disabled={sending}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.subject.length}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Type your message here..."
              className="min-h-[200px]"
              maxLength={characterLimit}
              disabled={sending}
              required
            />
            <p className={`text-xs ${characterCount > characterLimit * 0.9 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {characterCount}/{characterLimit} characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              disabled={sending}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="requires-response"
              checked={formData.requiresResponse}
              onCheckedChange={(checked) => setFormData({ ...formData, requiresResponse: checked })}
              disabled={sending}
            />
            <Label htmlFor="requires-response">This message requires a response</Label>
          </div>

          <MessageAttachmentUpload
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            disabled={sending}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
