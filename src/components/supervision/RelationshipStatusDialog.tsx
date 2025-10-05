import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, Pause, Play } from "lucide-react";
import { format } from "date-fns";

interface RelationshipStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationship: {
    id: string;
    status: string;
    start_date: string;
    end_date?: string | null;
    supervisee?: {
      first_name: string;
      last_name: string;
    };
  };
  onSuccess?: () => void;
}

export function RelationshipStatusDialog({
  open,
  onOpenChange,
  relationship,
  onSuccess
}: RelationshipStatusDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(relationship.status);
  const [endDate, setEndDate] = useState(
    relationship.end_date ? format(new Date(relationship.end_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  );
  const [completionNotes, setCompletionNotes] = useState('');

  const handleStatusChange = async () => {
    setLoading(true);
    try {
      const updates: any = {
        status: newStatus
      };

      // If marking as completed, require end date
      if (newStatus === 'Completed') {
        if (!endDate) {
          toast.error("Please provide an end date");
          return;
        }
        updates.end_date = endDate;
      }

      // If reactivating, clear end date
      if (newStatus === 'Active') {
        updates.end_date = null;
      }

      const { error } = await supabase
        .from('supervision_relationships')
        .update(updates)
        .eq('id', relationship.id);

      if (error) throw error;

      toast.success(`Relationship status updated to ${newStatus}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || "Failed to update relationship status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Relationship Status</DialogTitle>
          <DialogDescription>
            Change the status of supervision relationship with{' '}
            {relationship.supervisee?.first_name} {relationship.supervisee?.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Current Status</p>
            <p className="font-medium">{relationship.status}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Started: {format(new Date(relationship.start_date), 'MMM dd, yyyy')}
            </p>
            {relationship.end_date && (
              <p className="text-xs text-muted-foreground">
                Ended: {format(new Date(relationship.end_date), 'MMM dd, yyyy')}
              </p>
            )}
          </div>

          {/* New Status */}
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-green-600" />
                    <span>Active</span>
                  </div>
                </SelectItem>
                <SelectItem value="Inactive">
                  <div className="flex items-center gap-2">
                    <Pause className="h-4 w-4 text-yellow-600" />
                    <span>Inactive (Temporary)</span>
                  </div>
                </SelectItem>
                <SelectItem value="Completed">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span>Completed</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* End Date (required for Completed) */}
          {newStatus === 'Completed' && (
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                The date when this supervision relationship was completed
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this status change..."
              rows={3}
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
          </div>

          {/* Status Change Descriptions */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm">
            {newStatus === 'Active' && (
              <p className="text-blue-700 dark:text-blue-300">
                This relationship will be active. All supervision features will be available.
              </p>
            )}
            {newStatus === 'Inactive' && (
              <p className="text-yellow-700 dark:text-yellow-300">
                This relationship will be temporarily paused. You can reactivate it later.
              </p>
            )}
            {newStatus === 'Completed' && (
              <p className="text-green-700 dark:text-green-300">
                This relationship will be marked as completed. Hours will be finalized and the relationship will be archived.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStatusChange}
              disabled={loading || newStatus === relationship.status}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Status
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}