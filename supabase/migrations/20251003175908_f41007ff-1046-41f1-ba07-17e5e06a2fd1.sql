-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

DROP POLICY IF EXISTS "Users can view comments on their tasks" ON public.task_comments;
DROP POLICY IF EXISTS "Users can add comments to accessible tasks" ON public.task_comments;

DROP POLICY IF EXISTS "Users can view shares for their tasks" ON public.task_shares;
DROP POLICY IF EXISTS "Task creators can share tasks" ON public.task_shares;
DROP POLICY IF EXISTS "Task creators can delete shares" ON public.task_shares;

-- Create simplified, non-recursive policies for tasks
CREATE POLICY "Users can view own and assigned tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Users can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Task creators and assignees can update"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = user_id);

CREATE POLICY "Task creators can delete"
  ON public.tasks FOR DELETE
  USING (auth.uid() = created_by);

-- Create simplified policies for task_comments
CREATE POLICY "Users can view all task comments"
  ON public.task_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can add comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create simplified policies for task_shares
CREATE POLICY "Users can view task shares"
  ON public.task_shares FOR SELECT
  USING (
    auth.uid() = shared_with_user_id 
    OR auth.uid() = shared_by_user_id
  );

CREATE POLICY "Authenticated users can share tasks"
  ON public.task_shares FOR INSERT
  WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Share creators can delete"
  ON public.task_shares FOR DELETE
  USING (auth.uid() = shared_by_user_id);