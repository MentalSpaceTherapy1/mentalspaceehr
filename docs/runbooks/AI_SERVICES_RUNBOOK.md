# AI Services Integration Runbook

## Service Overview
**Integration**: OpenAI API & Lovable AI  
**Purpose**: AI-powered clinical note generation, content suggestions, and transcription services  
**Criticality**: MEDIUM - Enhances productivity but has manual fallback  
**Owner**: Clinical Technology Team  
**Last Updated**: 2025-01-09

---

## Architecture

### AI Service Flow
```
User Action → Edge Function → AI Provider API → Response
                ↓
         Audit Log Entry
         AI Request Log
```

### Edge Functions Using AI
- `generate-clinical-note`: Full note generation from transcript
- `generate-intake-note`: Intake assessment generation
- `generate-treatment-plan`: Treatment plan creation
- `generate-section-content`: Individual section suggestions
- `suggest-clinical-content`: Real-time content suggestions
- `transcribe-session`: Audio-to-text transcription
- `transcribe-and-generate-note`: Combined transcription + generation

### Environment Variables
- `OPENAI_API_KEY`: OpenAI API key (if using OpenAI directly)
- `LOVABLE_API_KEY`: Lovable AI API key (preferred)

### AI Providers
1. **Lovable AI** (Primary - Recommended):
   - No API key required from user
   - Supported models: gemini-2.5-flash, gemini-2.5-pro, gpt-5-mini, gpt-5, etc.
   - HIPAA-compliant when properly configured
   - Built-in rate limiting

2. **OpenAI Direct** (Secondary):
   - Requires user API key
   - More configuration required
   - User manages billing directly

---

## Health Check Criteria

### Green (Healthy)
- ✅ API response time < 30 seconds (generation)
- ✅ API response time < 120 seconds (transcription)
- ✅ Success rate > 95%
- ✅ No authentication errors
- ✅ AI quality metrics acceptable (confidence > 0.7)

### Yellow (Degraded)
- ⚠️ API response time 30-60 seconds
- ⚠️ Success rate 90-95%
- ⚠️ Occasional rate limiting
- ⚠️ AI quality metrics borderline (confidence 0.5-0.7)

### Red (Down)
- ❌ API unreachable or consistent timeouts
- ❌ Success rate < 90%
- ❌ 401 authentication errors (invalid API key)
- ❌ 429 rate limit errors persisting > 5 minutes
- ❌ AI quality metrics unacceptable (confidence < 0.5)

---

## Common Issues & Resolution

### Issue 1: AI Generation Taking Too Long

**Symptoms**:
- Edge function timeouts
- Users waiting > 60 seconds for responses
- Incomplete generations

**Diagnosis**:
```sql
-- Check AI request performance
SELECT 
  request_type,
  AVG(processing_time_ms) as avg_time_ms,
  MAX(processing_time_ms) as max_time_ms,
  COUNT(*) as request_count,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failures
FROM ai_request_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY request_type
ORDER BY avg_time_ms DESC;
```

**Resolution Steps**:
1. **Check Model Selection**:
   - Use faster models for real-time suggestions:
     - `gemini-2.5-flash-lite`: Fastest, use for simple tasks
     - `gemini-2.5-flash`: Balanced speed/quality
     - `gpt-5-nano`: Fast, good for classification
   - Use powerful models for complex generation:
     - `gemini-2.5-pro`: Best for clinical notes
     - `gpt-5`: Strong reasoning, use when needed

2. **Optimize Prompt Length**:
   ```typescript
   // Reduce input size
   const transcript = longTranscript.slice(-4000); // Last 4000 chars
   
   // Or use summarization first
   const summary = await summarizeTranscript(longTranscript);
   const note = await generateNote(summary);
   ```

3. **Implement Streaming** (for long responses):
   ```typescript
   // Stream responses to user
   const stream = await openai.chat.completions.create({
     model: 'gemini-2.5-flash',
     messages: [...],
     stream: true,
   });
   
   for await (const chunk of stream) {
     // Send chunk to client
   }
   ```

4. **Add Timeout Handling**:
   ```typescript
   const timeout = 45000; // 45 seconds
   const controller = new AbortController();
   setTimeout(() => controller.abort(), timeout);
   
   try {
     const response = await fetch(apiUrl, {
       signal: controller.signal,
       ...options
     });
   } catch (error) {
     if (error.name === 'AbortError') {
       // Handle timeout gracefully
     }
   }
   ```

**Prevention**:
- Choose appropriate models for use case
- Monitor response times
- Set reasonable timeouts
- Use background processing for long tasks

---

### Issue 2: Poor AI Output Quality

**Symptoms**:
- Generated notes missing important details
- Incorrect medical terminology
- Irrelevant or nonsensical content
- Low confidence scores

**Diagnosis**:
```sql
-- Check AI confidence scores
SELECT 
  request_type,
  AVG(confidence_score) as avg_confidence,
  MIN(confidence_score) as min_confidence,
  COUNT(CASE WHEN confidence_score < 0.5 THEN 1 END) as low_confidence_count
FROM ai_request_logs
WHERE created_at > NOW() - INTERVAL '7 days'
  AND confidence_score IS NOT NULL
GROUP BY request_type;
```

**Resolution Steps**:
1. **Improve Prompts**:
   ```typescript
   // Bad prompt
   const prompt = "Write a clinical note";
   
   // Good prompt
   const prompt = `You are a licensed clinical social worker. Generate a SOAP note based on this session transcript.
   
   Guidelines:
   - Use professional clinical language
   - Include specific client statements (quotes)
   - Identify mental status observations
   - Note risk factors and safety concerns
   - Suggest evidence-based interventions
   
   Transcript: ${transcript}`;
   ```

2. **Add Context and Examples**:
   - Include practice-specific terminology
   - Provide example notes in prompt
   - Reference DSM-5 criteria when relevant

3. **Implement Quality Checks**:
   ```typescript
   // Check if key sections exist
   const requiredSections = ['Subjective', 'Objective', 'Assessment', 'Plan'];
   const missingS sections = requiredSections.filter(s => 
     !generatedNote.toLowerCase().includes(s.toLowerCase())
   );
   
   if (missingSections.length > 0) {
     // Request regeneration or flag for review
   }
   ```

4. **Enable Human Review**:
   - Set `require_clinician_review = true`
   - Flag low-confidence generations
   - Collect feedback for improvement

**Prevention**:
- Maintain prompt library with best practices
- Regular prompt optimization based on feedback
- Monitor quality metrics continuously
- Train staff on effective AI use

---

### Issue 3: API Authentication Failures

**Symptoms**:
- 401 Unauthorized errors
- "Invalid API key" messages
- All AI requests failing

**Diagnosis**:
```bash
# Test API key validity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Resolution Steps**:
1. **Verify API Key in Secrets**:
   - Check Lovable Cloud → Backend → Secrets
   - Ensure key hasn't expired
   - Test key in API directly

2. **Check API Key Permissions**:
   - OpenAI: Verify key has necessary permissions
   - Lovable AI: Confirm account is active

3. **Rotate API Key if Compromised**:
   ```bash
   # Generate new key from provider
   # Update in Lovable Cloud secrets
   # Monitor for unauthorized usage
   ```

4. **Check Usage Limits**:
   - OpenAI: Verify account has credit/quota
   - Check usage dashboard for blocks

**Prevention**:
- Set up API key expiration reminders
- Monitor API key usage regularly
- Implement key rotation schedule
- Use separate keys for dev/prod

---

### Issue 4: Rate Limiting / Quota Exceeded

**Symptoms**:
- 429 Too Many Requests errors
- "Rate limit exceeded" messages
- Requests queuing up

**Diagnosis**:
```sql
-- Check request volume
SELECT 
  DATE_TRUNC('minute', created_at) as minute,
  COUNT(*) as request_count,
  SUM(CASE WHEN error_message LIKE '%rate%limit%' THEN 1 ELSE 0 END) as rate_limit_errors
FROM ai_request_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY minute
ORDER BY minute DESC
LIMIT 60;
```

**Resolution Steps**:
1. **Implement Request Queuing**:
   ```typescript
   // Simple queue with rate limiting
   class AIRequestQueue {
     private queue: Array<() => Promise<any>> = [];
     private processing = false;
     private requestsPerMinute = 50;
     
     async enqueue(request: () => Promise<any>) {
       this.queue.push(request);
       if (!this.processing) {
         this.processQueue();
       }
     }
     
     private async processQueue() {
       this.processing = true;
       while (this.queue.length > 0) {
         const request = this.queue.shift()!;
         await request();
         await this.delay(60000 / this.requestsPerMinute);
       }
       this.processing = false;
     }
   }
   ```

2. **Use Exponential Backoff**:
   ```typescript
   async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error: any) {
         if (error.status === 429 && i < maxRetries - 1) {
           const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
           await new Promise(resolve => setTimeout(resolve, delay));
         } else {
           throw error;
       }
     }
   }
   ```

3. **Optimize Request Patterns**:
   - Batch similar requests
   - Cache common responses
   - Debounce user inputs

4. **Upgrade Plan or Switch Provider**:
   - Increase OpenAI tier
   - Use Lovable AI for better limits
   - Distribute load across multiple keys

**Prevention**:
- Monitor daily request volume
- Set up rate limit alerts
- Implement request throttling
- Plan for peak usage times

---

### Issue 5: Data Privacy / HIPAA Concerns

**Symptoms**:
- Questions about PHI in AI requests
- Concerns about data retention
- Audit findings

**Diagnosis**:
```sql
-- Check anonymization setting
SELECT enabled, anonymize_before_sending, data_sharing_consent
FROM ai_note_settings;

-- Review recent AI requests for PHI
SELECT 
  anonymized_input_hash,
  request_type,
  created_at
FROM ai_request_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;
```

**Resolution Steps**:
1. **Enable Anonymization**:
   ```sql
   UPDATE ai_note_settings
   SET anonymize_before_sending = true;
   ```

2. **Verify BAA with Provider**:
   ```sql
   -- Check BAA status
   SELECT 
     provider_name,
     baa_signed,
     baa_expiration_date,
     is_active
   FROM ai_provider_baa
   WHERE provider_name IN ('OpenAI', 'Lovable AI')
     AND is_active = true;
   ```

3. **Implement PHI Scrubbing**:
   ```typescript
   function scrubPHI(text: string): string {
     return text
       .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // SSN
       .replace(/\b\d{10}\b/g, '[PHONE]')           // Phone
       .replace(/\b\d{5}(-\d{4})?\b/g, '[ZIP]');    // ZIP
   }
   ```

4. **Review Data Retention**:
   ```sql
   -- Enable automatic log cleanup
   UPDATE ai_note_settings
   SET retain_ai_logs = false,
       retention_days = 90;
   ```

**Prevention**:
- Sign BAAs with all AI providers
- Enable anonymization by default
- Regular privacy audits
- Staff training on PHI handling
- Clear data retention policies

---

## Monitoring & Alerts

### Key Metrics to Monitor
| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| Success rate | > 95% | < 90% |
| Avg response time | < 30s | > 60s |
| Confidence score | > 0.7 | < 0.5 |
| Daily request volume | Varies | 2x baseline |
| Rate limit errors | < 1% | > 5% |

### Recommended Alerts
```sql
-- Alert on high AI failure rate
INSERT INTO audit_alert_rules (
  rule_name,
  action_type,
  resource_type,
  threshold,
  time_window_minutes,
  severity
) VALUES (
  'High AI Failure Rate',
  'ai_generation_failed',
  'ai_request',
  5,  -- 5 failures
  15, -- in 15 minutes
  'high'
);
```

---

## Testing Procedures

### Manual Testing
```typescript
// Test note generation
const { data, error } = await supabase.functions.invoke('generate-clinical-note', {
  body: {
    transcript: "Test session transcript...",
    clientId: "test-client-id",
    noteType: "progress_note"
  }
});

console.log('Generated note:', data);
```

### Quality Testing
```typescript
// Test with known scenarios
const testCases = [
  { transcript: "Client reports feeling anxious...", expectedSections: ['Subjective', 'Assessment'] },
  { transcript: "Client denies SI/HI...", expectedSections: ['Safety Assessment'] }
];

for (const test of testCases) {
  const result = await generateNote(test.transcript);
  // Verify expected sections present
}
```

---

## Rollback Procedures

### If AI Services Fail
1. **Disable AI Features Temporarily**:
   ```sql
   UPDATE ai_note_settings
   SET enabled = false;
   ```

2. **Fall Back to Manual Entry**:
   - Notify clinicians of AI outage
   - Provide manual note templates
   - Queue failed requests for later processing

3. **Switch to Backup Provider** (if configured):
   - Update API keys to backup provider
   - Test connectivity before full rollback

---

## Escalation Path

### Level 1 (< 30 minutes)
- **Action**: Check API status, verify credentials
- **Owner**: On-call engineer

### Level 2 (30-90 minutes)
- **Action**: Investigate quality issues, optimize prompts
- **Owner**: Clinical technology lead

### Level 3 (> 90 minutes)
- **Action**: Contact AI provider support, implement workarounds
- **Owner**: Engineering lead + Clinical director

---

## External Dependencies

### OpenAI Status
- **Status Page**: https://status.openai.com
- **API Documentation**: https://platform.openai.com/docs

### Lovable AI Status
- **Status**: Monitored via integration health dashboard
- **Support**: Through Lovable platform

---

## Documentation Links
- [AI Note Settings](../src/pages/admin/AINoteSettings.tsx)
- [Edge Function: generate-clinical-note](../supabase/functions/generate-clinical-note/index.ts)
- [AI Request Logs Table](../docs/data-contracts/)
- [AI Provider BAA Management](../src/pages/admin/BAAManagement.tsx)

---

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2025-01-09 | System | Initial runbook creation |
