# Apply Phase 1 Migration

## Quick Start

The Phase 1 features require a database migration to add the `session_messages` table for persistent chat.

### Migration File
`supabase/migrations/20251010020000_professional_telehealth_features.sql`

---

## Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL:**
   - Open `supabase/migrations/20251010020000_professional_telehealth_features.sql`
   - Copy the entire contents

4. **Paste and Run:**
   - Paste the SQL into the query editor
   - Click "Run" or press Ctrl+Enter

5. **Verify:**
   - Go to "Table Editor"
   - Confirm you see `session_messages` and `waiting_room_queue` tables

---

## Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed and linked:
npx supabase db push

# Or apply specific migration:
npx supabase db push --include 20251010020000_professional_telehealth_features
```

---

## Option 3: Manual SQL Execution

If you prefer to execute the SQL directly:

```sql
-- Professional Telehealth Features
-- Persistent chat, waiting room queue, and enhanced session management

-- Session Messages Table (Persistent Chat)
CREATE TABLE IF NOT EXISTS public.session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'file')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_by UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_session_messages_session ON public.session_messages(session_id, created_at DESC);
CREATE INDEX idx_session_messages_user ON public.session_messages(user_id);

-- RLS Policies for session_messages
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their sessions"
ON public.session_messages
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = (
      SELECT id FROM telehealth_sessions ts
      WHERE ts.session_id = session_messages.session_id
    )
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages in their sessions"
ON public.session_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = (
      SELECT id FROM telehealth_sessions ts
      WHERE ts.session_id = session_messages.session_id
    )
    AND sp.user_id = auth.uid()
  )
);

-- Waiting Room Queue Table
CREATE TABLE IF NOT EXISTS public.waiting_room_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'admitted', 'denied', 'left')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  admitted_at TIMESTAMP WITH TIME ZONE,
  admitted_by UUID REFERENCES auth.users(id),
  denied_at TIMESTAMP WITH TIME ZONE,
  denied_by UUID REFERENCES auth.users(id),
  left_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_waiting_room_session ON public.waiting_room_queue(session_id, status);
CREATE INDEX idx_waiting_room_user ON public.waiting_room_queue(user_id);

-- RLS Policies for waiting_room_queue
ALTER TABLE public.waiting_room_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own waiting room entries"
ON public.waiting_room_queue
FOR SELECT
USING (
  user_id = auth.uid()
  OR admitted_by = auth.uid()
  OR denied_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM telehealth_sessions ts
    WHERE ts.session_id = waiting_room_queue.session_id
    AND ts.host_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own waiting room entries"
ON public.waiting_room_queue
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Hosts can update waiting room entries"
ON public.waiting_room_queue
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM telehealth_sessions ts
    WHERE ts.session_id = waiting_room_queue.session_id
    AND ts.host_id = auth.uid()
  )
);

-- Function to clean up old waiting room entries
CREATE OR REPLACE FUNCTION cleanup_old_waiting_room_entries()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM waiting_room_queue
  WHERE joined_at < now() - INTERVAL '24 hours';
END;
$$;

-- Function to clean up old chat messages (optional, for privacy)
CREATE OR REPLACE FUNCTION cleanup_old_session_messages()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete messages older than 90 days
  DELETE FROM session_messages
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

COMMENT ON TABLE public.session_messages IS 'Persistent chat messages for telehealth sessions';
COMMENT ON TABLE public.waiting_room_queue IS 'Queue for participants waiting to join telehealth sessions';
```

---

## Verification Steps

After applying the migration, verify it was successful:

### 1. Check Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('session_messages', 'waiting_room_queue');
```

Expected result: 2 rows showing both tables

### 2. Check RLS Policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('session_messages', 'waiting_room_queue');
```

Expected result: 5 policies total

### 3. Test Insert Permission (as authenticated user)
```sql
-- This should work when executed by an authenticated user
INSERT INTO session_messages (session_id, user_id, user_name, message)
VALUES ('test_session', auth.uid(), 'Test User', 'Test message');
```

### 4. Verify in Application
1. Start a telehealth session
2. Open the chat panel
3. Send a message
4. Refresh the page
5. Verify the message persists ✅

---

## Rollback (if needed)

If you need to rollback the migration:

```sql
DROP TABLE IF EXISTS public.session_messages CASCADE;
DROP TABLE IF EXISTS public.waiting_room_queue CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_waiting_room_entries();
DROP FUNCTION IF EXISTS cleanup_old_session_messages();
```

---

## Troubleshooting

### Error: "relation does not exist"
- The table wasn't created. Re-run the migration SQL.

### Error: "permission denied"
- RLS policies may not be set correctly. Check the policies section.

### Error: "violates row-level security policy"
- The user doesn't have permission. Check that session_participants table has the user.

### Messages not appearing
1. Check browser console for errors
2. Verify Supabase real-time is enabled (Project Settings > API)
3. Check that the session_id matches between the session and chat

---

## Post-Migration Checklist

- [ ] Migration applied successfully
- [ ] Tables visible in Supabase dashboard
- [ ] RLS policies active
- [ ] Chat messages persist across refresh
- [ ] No console errors in browser
- [ ] Real-time updates working
- [ ] Waiting room functioning

---

**Migration File Location:** `supabase/migrations/20251010020000_professional_telehealth_features.sql`
**Created:** October 9, 2025
**Required For:** Phase 1 - Persistent Chat Feature
