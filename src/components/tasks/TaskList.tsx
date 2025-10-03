import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreVertical, Calendar, MessageSquare, Share2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { useState } from 'react';
import { TaskDetailDialog } from './TaskDetailDialog';

type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityColors = {
  High: 'bg-red-500/10 text-red-500 border-red-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  Low: 'bg-green-500/10 text-green-500 border-green-500/20',
};

const statusColors = {
  Pending: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  'In Progress': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Completed: 'bg-green-500/10 text-green-500 border-green-500/20',
};

export function TaskList({ tasks, loading, onEdit, onDelete }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const completedDate = newStatus === 'Completed' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_date: completedDate,
        })
        .eq('id', task.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Task marked as ${newStatus.toLowerCase()}`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No tasks found. Create your first task to get started!</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card
            key={task.id}
            className="p-6 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedTask(task)}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                checked={task.status === 'Completed'}
                onCheckedChange={() => handleToggleComplete(task)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1"
              />

              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className={`font-semibold ${task.status === 'Completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedTask(task)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
                    {task.priority}
                  </Badge>
                  <Badge variant="outline" className={statusColors[task.status as keyof typeof statusColors]}>
                    {task.status}
                  </Badge>
                  <Badge variant="outline">{task.category}</Badge>
                  {task.is_recurring && (
                    <Badge variant="outline">
                      Recurring: {task.recurrence_pattern}
                    </Badge>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Due {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
        />
      )}
    </>
  );
}
