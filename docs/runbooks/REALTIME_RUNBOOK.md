# Supabase Realtime Integration Runbook

## Service Overview
**Integration**: Supabase Realtime (WebSocket-based subscriptions)  
**Purpose**: Real-time updates for messages, notifications, appointments, and collaborative features  
**Criticality**: MEDIUM - Enhances UX but has polling fallback  
**Owner**: Engineering Team  
**Last Updated**: 2025-01-09

---

## Architecture

### Realtime Flow
```
Database Change → Postgres WAL → Realtime Server → WebSocket → Client
                                                         ↓
                                                    UI Update
```

### Tables with Realtime Enabled
- `client_portal_messages`: Real-time messaging
- `portal_notifications`: Notification updates
- `appointments`: Appointment changes
- `assessment_critical_alerts`: Critical alerts
- `notification_logs`: System notifications
- `audit_logs`: Admin monitoring

### Subscription Pattern
```typescript
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', {
    event: '*',  // or 'INSERT', 'UPDATE', 'DELETE'
    schema: 'public',
    table: 'client_portal_messages'
  }, (payload) => {
    console.log('Change received:', payload);
  })
  .subscribe();

// Cleanup
supabase.removeChannel(channel);
```

---

## Health Check Criteria

### Green (Healthy)
- ✅ WebSocket connection established < 2 seconds
- ✅ Message latency < 500ms
- ✅ Connection uptime > 99%
- ✅ No connection errors
- ✅ RLS filtering working correctly

### Yellow (Degraded)
- ⚠️ Connection latency 2-5 seconds
- ⚠️ Message latency 500ms-2s
- ⚠️ Intermittent connection drops
- ⚠️ Connection retries occurring

### Red (Down)
- ❌ Unable to establish WebSocket connection
- ❌ Message latency > 2s
- ❌ Frequent disconnections (> 5/hour)
- ❌ RLS not filtering data correctly
- ❌ Message delivery failures

---

## Common Issues & Resolution

### Issue 1: Realtime Subscriptions Not Receiving Updates

**Symptoms**:
- Users not seeing real-time updates
- Messages appear only on page refresh
- No errors in console

**Diagnosis**:
```typescript
// Test subscription
const testChannel = supabase
  .channel('test-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'client_portal_messages'
  }, (payload) => {
    console.log('Received:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
  });

// Check connection status
console.log('Channel state:', testChannel.state);
```

**Resolution Steps**:
1. **Verify Table Has Realtime Enabled**:
   ```sql
   -- Check if table is in realtime publication
   SELECT * FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
     AND schemaname = 'public'
     AND tablename = 'client_portal_messages';
   
   -- If not, add it
   ALTER PUBLICATION supabase_realtime ADD TABLE public.client_portal_messages;
   ```

2. **Check REPLICA IDENTITY**:
   ```sql
   -- Verify replica identity is set
   SELECT relname, relreplident
   FROM pg_class
   WHERE relname = 'client_portal_messages';
   
   -- If needed, set to FULL
   ALTER TABLE public.client_portal_messages REPLICA IDENTITY FULL;
   ```

3. **Verify RLS Policies**:
   ```sql
   -- User must have SELECT permission via RLS
   SELECT policyname, permissive, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'client_portal_messages';
   ```

4. **Check Network/Firewall**:
   - Ensure WebSocket connections (port 443) are allowed
   - Check for proxy/firewall blocking
   - Test from different network

5. **Verify Supabase Project Settings**:
   - Go to Supabase Dashboard → Project Settings → API
   - Ensure Realtime is enabled
   - Check project URL and keys are correct

**Prevention**:
- Add realtime to tables during creation
- Document which tables have realtime
- Test subscriptions after schema changes
- Monitor subscription health

---

### Issue 2: Frequent WebSocket Disconnections

**Symptoms**:
- "Connection lost" messages
- Repeated reconnection attempts
- Intermittent updates

**Diagnosis**:
```typescript
// Monitor connection state
supabase.channel('presence-channel')
  .on('system', { event: 'presence_state' }, (state) => {
    console.log('Presence state:', state);
  })
  .on('system', { event: 'presence_diff' }, (diff) => {
    console.log('Presence diff:', diff);
  })
  .subscribe((status) => {
    console.log('Status change:', status);
    if (status === 'CLOSED') {
      console.error('Connection closed');
    }
  });
```

**Resolution Steps**:
1. **Implement Reconnection Logic**:
   ```typescript
   let reconnectAttempts = 0;
   const MAX_RECONNECT_ATTEMPTS = 5;
   
   const setupChannel = () => {
     const channel = supabase
       .channel('messages')
       .on('postgres_changes', {...}, handler)
       .subscribe((status) => {
         if (status === 'CHANNEL_ERROR') {
           if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
             reconnectAttempts++;
             setTimeout(() => {
               supabase.removeChannel(channel);
               setupChannel();
             }, Math.pow(2, reconnectAttempts) * 1000);
           }
         } else if (status === 'SUBSCRIBED') {
           reconnectAttempts = 0;
         }
       });
   };
   ```

2. **Check Browser Tab Visibility**:
   ```typescript
   // Resubscribe when tab becomes visible
   document.addEventListener('visibilitychange', () => {
     if (document.visibilityState === 'visible') {
       // Refresh subscriptions
       supabase.removeAllChannels();
       setupSubscriptions();
     }
   });
   ```

3. **Verify Connection Limits**:
   - Supabase has connection limits per plan
   - Check dashboard for concurrent connections
   - Reduce unnecessary subscriptions

4. **Check Network Stability**:
   - Test on different networks
   - Check for corporate proxies/VPNs
   - Monitor for network interruptions

**Prevention**:
- Implement robust reconnection logic
- Clean up subscriptions on unmount
- Monitor connection metrics
- Use connection pooling efficiently

---

### Issue 3: High Latency / Delayed Updates

**Symptoms**:
- Updates appear 2-5+ seconds after database change
- Messages arrive out of order
- User experience feels sluggish

**Diagnosis**:
```typescript
// Measure message latency
const sentTime = Date.now();
await supabase.from('test_table').insert({ data: 'test' });

// In subscription handler
const receiveTime = Date.now();
const latency = receiveTime - sentTime;
console.log('Latency:', latency, 'ms');
```

**Resolution Steps**:
1. **Check Supabase Infrastructure Status**:
   - Visit https://status.supabase.com
   - Check for degraded performance
   - Review incident history

2. **Reduce Subscription Complexity**:
   ```typescript
   // Bad: Multiple subscriptions per component
   useEffect(() => {
     const sub1 = supabase.channel('messages1')...
     const sub2 = supabase.channel('messages2')...
     const sub3 = supabase.channel('notifications')...
     // Too many subscriptions!
   }, []);
   
   // Good: Combine where possible
   useEffect(() => {
     const sub = supabase.channel('combined')
       .on('postgres_changes', { table: 'messages' }, handler1)
       .on('postgres_changes', { table: 'notifications' }, handler2)
       .subscribe();
   }, []);
   ```

3. **Optimize Database Queries**:
   ```sql
   -- Ensure queries used in subscriptions are fast
   EXPLAIN ANALYZE
   SELECT * FROM client_portal_messages
   WHERE client_id = 'uuid-here'
   ORDER BY sent_date DESC;
   
   -- Add indexes if needed
   CREATE INDEX idx_messages_client_date 
   ON client_portal_messages(client_id, sent_date DESC);
   ```

4. **Use Filters Effectively**:
   ```typescript
   // Filter on server side, not client side
   supabase
     .channel('my-messages')
     .on('postgres_changes', {
       event: 'INSERT',
       schema: 'public',
       table: 'client_portal_messages',
       filter: `client_id=eq.${clientId}`  // Server-side filter
     }, (payload) => {
       // Only receive relevant messages
     })
     .subscribe();
   ```

**Prevention**:
- Monitor latency metrics
- Optimize database queries
- Use appropriate filters
- Limit subscription scope

---

### Issue 4: RLS Not Filtering Realtime Updates

**Symptoms**:
- Users seeing updates they shouldn't
- Privacy violations in realtime data
- Unauthorized data exposure

**Diagnosis**:
```sql
-- Test RLS with different users
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "user-id-here"}';

-- Should only return authorized records
SELECT * FROM client_portal_messages;
```

**Resolution Steps**:
1. **Verify RLS is Enabled**:
   ```sql
   -- Check RLS status
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename = 'client_portal_messages';
   
   -- Enable if not enabled
   ALTER TABLE public.client_portal_messages ENABLE ROW LEVEL SECURITY;
   ```

2. **Test RLS Policies**:
   ```sql
   -- Policies must work for realtime
   CREATE POLICY "Users can see their own messages"
   ON client_portal_messages FOR SELECT
   USING (
     sender_id = auth.uid()
     OR EXISTS (
       SELECT 1 FROM clients
       WHERE portal_user_id = auth.uid()
         AND id = client_portal_messages.client_id
     )
   );
   ```

3. **Use Secure Subscription Patterns**:
   ```typescript
   // Don't rely solely on client-side filtering
   // Bad
   .on('postgres_changes', { table: 'messages' }, (payload) => {
     if (payload.new.client_id === myClientId) {
       // Process
     }
   })
   
   // Good
   .on('postgres_changes', {
     table: 'messages',
     filter: `client_id=eq.${myClientId}`  // Server enforces
   }, (payload) => {
     // Process - already filtered by RLS
   })
   ```

4. **Audit Realtime Access**:
   ```sql
   -- Log realtime subscriptions
   INSERT INTO audit_logs (
     user_id,
     action_type,
     resource_type,
     action_description
   ) VALUES (
     auth.uid(),
     'realtime_subscribe',
     'client_portal_messages',
     'User subscribed to message updates'
   );
   ```

**Prevention**:
- Always enable RLS on realtime tables
- Test RLS with multiple user roles
- Use server-side filters
- Regular security audits
- Document RLS requirements

---

### Issue 5: Memory Leaks from Subscriptions

**Symptoms**:
- Browser memory usage increasing over time
- App becoming sluggish
- Multiple subscriptions not cleaned up

**Diagnosis**:
```typescript
// Check active channels
const channels = supabase.getChannels();
console.log('Active channels:', channels.length);
channels.forEach(ch => console.log(ch.topic, ch.state));
```

**Resolution Steps**:
1. **Proper Cleanup in React**:
   ```typescript
   useEffect(() => {
     const channel = supabase
       .channel('messages')
       .on('postgres_changes', {...}, handler)
       .subscribe();
     
     // Cleanup function
     return () => {
       supabase.removeChannel(channel);
     };
   }, [dependencies]); // Include all dependencies
   ```

2. **Avoid Creating Subscriptions in Loops**:
   ```typescript
   // Bad
   clients.forEach(client => {
     supabase.channel(`client-${client.id}`)...
   });
   
   // Good
   const channel = supabase.channel('all-clients')
     .on('postgres_changes', {...}, (payload) => {
       // Filter in handler
       const relevantClient = clients.find(c => c.id === payload.new.client_id);
       if (relevantClient) {
         // Process
       }
     })
     .subscribe();
   ```

3. **Use Single Channel per Component**:
   ```typescript
   // Combine multiple subscriptions into one channel
   const channel = supabase
     .channel('dashboard')
     .on('postgres_changes', { table: 'messages' }, handleMessage)
     .on('postgres_changes', { table: 'notifications' }, handleNotification)
     .on('postgres_changes', { table: 'appointments' }, handleAppointment)
     .subscribe();
   ```

4. **Remove All Channels on Logout**:
   ```typescript
   const handleLogout = async () => {
     supabase.removeAllChannels();
     await supabase.auth.signOut();
   };
   ```

**Prevention**:
- Always cleanup subscriptions
- Use React hooks properly
- Monitor memory usage in dev
- Code review for subscription patterns

---

## Monitoring & Alerts

### Key Metrics to Monitor
| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| Connection uptime | > 99% | < 95% |
| Message latency | < 500ms | > 2s |
| Reconnection rate | < 1/hour | > 5/hour |
| Active connections | Varies | 2x baseline |
| Failed subscriptions | < 1% | > 5% |

---

## Testing Procedures

### Manual Testing
```typescript
// Test real-time updates
const testMessage = {
  client_id: testClientId,
  clinician_id: testClinicianId,
  subject: 'Test',
  message: 'Real-time test',
  sender_id: userId
};

// Set up subscription first
const channel = supabase
  .channel('test')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'client_portal_messages'
  }, (payload) => {
    console.log('Received in real-time:', payload);
  })
  .subscribe();

// Insert test message
await supabase.from('client_portal_messages').insert(testMessage);

// Should see console log within ~500ms
```

---

## Rollback Procedures

### If Realtime Fails
1. **Fall Back to Polling**:
   ```typescript
   // Implement polling fallback
   const pollingInterval = setInterval(async () => {
     const { data } = await supabase
       .from('client_portal_messages')
       .select('*')
       .gt('created_at', lastCheck)
       .order('created_at');
     
     if (data?.length > 0) {
       handleNewMessages(data);
       lastCheck = new Date().toISOString();
     }
   }, 5000); // Poll every 5 seconds
   ```

2. **Disable Realtime Features**:
   - Show "Refresh to see updates" button
   - Auto-refresh on interval
   - Notify users of degraded experience

---

## Escalation Path

### Level 1 (< 15 minutes)
- **Action**: Check connection status, verify subscriptions
- **Owner**: On-call engineer

### Level 2 (15-60 minutes)
- **Action**: Review RLS, check Supabase status
- **Owner**: Engineering lead

### Level 3 (> 60 minutes)
- **Action**: Contact Supabase support, implement polling fallback
- **Owner**: CTO + Engineering team

---

## External Dependencies

### Supabase Realtime Status
- **Status Page**: https://status.supabase.com
- **Realtime Documentation**: https://supabase.com/docs/guides/realtime

---

## Documentation Links
- [Portal Messages Component](../src/components/portal/ComposeMessageDialog.tsx)
- [Notification Bell](../src/components/portal/NotificationBell.tsx)
- [Critical Alerts Hook](../src/hooks/useCriticalAlerts.tsx)

---

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2025-01-09 | System | Initial runbook creation |
