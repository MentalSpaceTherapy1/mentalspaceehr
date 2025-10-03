import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar, MessageSquare, Share2, User } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'];
type TaskComment = Database['public']['Tables']['task_comments']['Row'] & {
  profiles?: { first_name: string; last_name: string };
};

interface TaskDetailDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailDialog({ task, open, onOpenChange }: TaskDetailDialogProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && task) {
      fetchComments();
    }
  }, [open, task]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data as any || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('task_comments')
        .insert([{
          task_id: task.id,
          user_id: user.id,
          comment: newComment.trim(),
        }]);

      if (error) throw error;

      setNewComment('');
      fetchComments();
      toast({ title: 'Success', description: 'Comment added' });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{task.priority}</Badge>
              <Badge variant="outline">{task.status}</Badge>
              <Badge variant="outline">{task.category}</Badge>
              {task.is_recurring && (
                <Badge variant="outline">Recurring: {task.recurrence_pattern}</Badge>
              )}
            </div>

            {task.description && (
              <div className="space-y-2">
                <h4 className="font-medium">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {task.due_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {task.reminder_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Reminder: {format(new Date(task.reminder_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              {task.completed_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Completed: {format(new Date(task.completed_date), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <h4 className="font-medium">Comments</h4>
              </div>

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="space-y-2 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {comment.profiles?.first_name} {comment.profiles?.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  size="sm"
                >
                  Add Comment
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
