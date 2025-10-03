-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Clinical', 'Administrative', 'Billing', 'Other')),
  priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_date TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT CHECK (recurrence_pattern IN ('Daily', 'Weekly', 'Monthly')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  completed_date TIMESTAMP WITH TIME ZONE,
  related_client_id UUID,
  related_note_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create task_shares table for sharing tasks with other users
CREATE TABLE public.task_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(task_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tasks
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.task_shares 
      WHERE task_shares.task_id = tasks.id 
      AND task_shares.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments on their tasks"
  ON public.task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_comments.task_id 
      AND (tasks.user_id = auth.uid() OR tasks.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.task_shares 
      WHERE task_shares.task_id = task_comments.task_id 
      AND task_shares.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add comments to accessible tasks"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_comments.task_id 
      AND (tasks.user_id = auth.uid() OR tasks.created_by = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.task_shares 
      WHERE task_shares.task_id = task_comments.task_id 
      AND task_shares.shared_with_user_id = auth.uid()
    )
  );

-- RLS Policies for task_shares
CREATE POLICY "Users can view shares for their tasks"
  ON public.task_shares FOR SELECT
  USING (
    auth.uid() = shared_with_user_id 
    OR auth.uid() = shared_by_user_id
    OR EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_shares.task_id 
      AND tasks.created_by = auth.uid()
    )
  );

CREATE POLICY "Task creators can share tasks"
  ON public.task_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_shares.task_id 
      AND tasks.created_by = auth.uid()
    )
  );

CREATE POLICY "Task creators can delete shares"
  ON public.task_shares FOR DELETE
  USING (
    auth.uid() = shared_by_user_id
    OR EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE tasks.id = task_shares.task_id 
      AND tasks.created_by = auth.uid()
    )
  );

-- Create trigger for updating updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_shares_task_id ON public.task_shares(task_id);
CREATE INDEX idx_task_shares_shared_with_user_id ON public.task_shares(shared_with_user_id);