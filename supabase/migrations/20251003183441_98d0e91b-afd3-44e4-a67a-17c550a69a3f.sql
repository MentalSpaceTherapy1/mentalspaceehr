-- Create table for recently viewed clients
CREATE TABLE public.recently_viewed_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

-- Create index for faster queries
CREATE INDEX idx_recently_viewed_user_viewed ON public.recently_viewed_clients(user_id, viewed_at DESC);

-- Enable RLS
ALTER TABLE public.recently_viewed_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recently viewed clients"
  ON public.recently_viewed_clients
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recently viewed clients"
  ON public.recently_viewed_clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recently viewed clients"
  ON public.recently_viewed_clients
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create table for favorite/pinned clients
CREATE TABLE public.favorite_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

-- Create index
CREATE INDEX idx_favorite_clients_user ON public.favorite_clients(user_id);

-- Enable RLS
ALTER TABLE public.favorite_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own favorite clients"
  ON public.favorite_clients
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite clients"
  ON public.favorite_clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite clients"
  ON public.favorite_clients
  FOR DELETE
  USING (auth.uid() = user_id);