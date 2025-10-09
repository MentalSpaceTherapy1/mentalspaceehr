# Supabase Storage Integration Runbook

## Service Overview
**Integration**: Supabase Storage  
**Purpose**: Secure file storage for client documents, insurance cards, signatures, and attachments  
**Criticality**: HIGH - Required for document management and compliance  
**Owner**: Operations Team  
**Last Updated**: 2025-01-09

---

## Architecture

### Storage Buckets
```
client-documents/          - Clinical documents, signed forms
client-insurance-cards/    - Insurance card images
message-attachments/       - Portal message attachments
telehealth-consents/       - Signed consent forms
supervision-documents/     - Supervision-related files
document-library/          - Practice-wide templates and resources
```

### File Upload Flow
```
User → Frontend → Supabase Client → Storage API → Bucket
                      ↓
                Audit Log Entry
                Document Record
```

### RLS Policies Per Bucket
- **client-documents**: Clinicians + assigned staff + client (portal)
- **client-insurance-cards**: Billing staff + assigned clinicians
- **message-attachments**: Sender + recipient only
- **telehealth-consents**: Clinician + client + administrators
- **supervision-documents**: Supervisor + supervisee + administrators
- **document-library**: All authenticated users (read)

---

## Health Check Criteria

### Green (Healthy)
- ✅ Upload success rate > 99%
- ✅ Download response time < 2 seconds
- ✅ Storage quota usage < 80%
- ✅ No authentication errors
- ✅ RLS policies enforcing correctly

### Yellow (Degraded)
- ⚠️ Upload success rate 95-99%
- ⚠️ Download response time 2-5 seconds
- ⚠️ Storage quota usage 80-95%
- ⚠️ Occasional timeout errors

### Red (Down)
- ❌ Upload success rate < 95%
- ❌ Downloads failing or timing out
- ❌ Storage quota exceeded (> 95%)
- ❌ Bucket access errors
- ❌ RLS policy violations

---

## Common Issues & Resolution

### Issue 1: File Upload Failures

**Symptoms**:
- Users unable to upload documents
- "Upload failed" errors
- Files not appearing in storage

**Diagnosis**:
```sql
-- Check recent upload attempts
SELECT 
  cd.id,
  cd.title,
  cd.file_name,
  cd.file_size_bytes,
  cd.uploaded_by,
  cd.status,
  cd.created_at
FROM client_documents cd
WHERE cd.created_at > NOW() - INTERVAL '1 hour'
  AND cd.file_path IS NULL
ORDER BY cd.created_at DESC;
```

**Resolution Steps**:
1. **Check File Size Limits**:
   - Default Supabase limit: 50MB per file
   - Check project quota in Supabase dashboard
   - Large files may need chunked uploads

   ```typescript
   // Validate file size before upload
   const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
   
   if (file.size > MAX_FILE_SIZE) {
     toast.error('File too large. Maximum size is 50MB');
     return;
   }
   ```

2. **Verify File Type Restrictions**:
   ```typescript
   // Allowed file types
   const ALLOWED_TYPES = [
     'application/pdf',
     'image/jpeg',
     'image/png',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
   ];
   
   if (!ALLOWED_TYPES.includes(file.type)) {
     toast.error('Invalid file type');
     return;
   }
   ```

3. **Check Storage RLS Policies**:
   ```sql
   -- Verify user has insert permission
   SELECT policy_name, policy_definition
   FROM pg_policies
   WHERE schemaname = 'storage'
     AND tablename = 'objects'
     AND policy_name LIKE '%insert%';
   ```

4. **Test Manual Upload**:
   ```typescript
   // Test upload via Supabase client
   const { data, error } = await supabase.storage
     .from('client-documents')
     .upload('test/test-file.pdf', file);
   
   console.log('Upload result:', { data, error });
   ```

5. **Check Network/Connectivity**:
   - Test from different network
   - Check browser console for CORS errors
   - Verify Supabase project URL is correct

**Prevention**:
- Implement client-side file validation
- Show progress indicators for large uploads
- Implement retry logic for failed uploads
- Monitor upload success rates

---

### Issue 2: Storage Quota Exceeded

**Symptoms**:
- "Storage quota exceeded" errors
- Upload operations failing
- Database showing 95%+ storage usage

**Diagnosis**:
```bash
# Check storage usage via Supabase dashboard
# Or query via API
curl "https://your-project.supabase.co/rest/v1/storage/buckets" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"
```

**Resolution Steps**:
1. **Identify Large Files**:
   ```sql
   -- Find largest files
   SELECT 
     bucket_id,
     name,
     metadata->>'size' as size_bytes,
     (metadata->>'size')::bigint / 1024 / 1024 as size_mb,
     created_at
   FROM storage.objects
   ORDER BY (metadata->>'size')::bigint DESC
   LIMIT 50;
   ```

2. **Clean Up Old/Unused Files**:
   ```sql
   -- Find old documents not linked to active records
   DELETE FROM storage.objects
   WHERE bucket_id = 'client-documents'
     AND created_at < NOW() - INTERVAL '7 years'
     AND NOT EXISTS (
       SELECT 1 FROM client_documents
       WHERE file_path = storage.objects.name
     );
   ```

3. **Implement File Compression**:
   ```typescript
   // Compress images before upload
   import imageCompression from 'browser-image-compression';
   
   const options = {
     maxSizeMB: 1,
     maxWidthOrHeight: 1920,
     useWebWorker: true
   };
   
   const compressedFile = await imageCompression(file, options);
   ```

4. **Archive to Cold Storage**:
   - Export old files to external backup
   - Delete from Supabase storage
   - Maintain reference in database

5. **Upgrade Storage Plan**:
   - Contact Supabase to increase quota
   - Consider enterprise plan for unlimited storage

**Prevention**:
- Monitor storage usage weekly
- Set up quota alerts (80%, 90%)
- Implement automated archival process
- Compress files before upload

---

### Issue 3: Access Denied / RLS Policy Violations

**Symptoms**:
- Users can't download their own files
- "Access denied" errors
- Files visible in database but not accessible

**Diagnosis**:
```sql
-- Check RLS policies for bucket
SELECT 
  policyname,
  definition
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects';

-- Test user access
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "user-id-here"}';

SELECT * FROM storage.objects
WHERE bucket_id = 'client-documents'
  AND name = 'path/to/file.pdf';
```

**Resolution Steps**:
1. **Verify RLS Policies**:
   ```sql
   -- Example: Allow users to read files in their folder
   CREATE POLICY "Users can read own documents"
   ON storage.objects FOR SELECT
   USING (
     bucket_id = 'client-documents'
     AND (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

2. **Check File Path Structure**:
   - Ensure paths follow expected pattern: `{user_id}/{file_name}`
   - Verify path stored correctly in database

3. **Test with Service Role**:
   ```typescript
   // Bypass RLS for testing
   const { data, error } = await supabase.storage
     .from('client-documents')
     .download('path/to/file.pdf', {
       headers: {
         Authorization: `Bearer ${SERVICE_ROLE_KEY}`
       }
     });
   ```

4. **Review User Roles**:
   ```sql
   -- Verify user has correct roles
   SELECT role
   FROM user_roles
   WHERE user_id = 'user-id-here';
   ```

**Prevention**:
- Document RLS policy patterns
- Test policies with different user roles
- Implement comprehensive access logs
- Regular security audits

---

### Issue 4: Slow Download Performance

**Symptoms**:
- Documents taking > 5 seconds to load
- Timeout errors on large files
- Poor user experience

**Diagnosis**:
```sql
-- Check file sizes being downloaded
SELECT 
  AVG((metadata->>'size')::bigint) as avg_size_bytes,
  MAX((metadata->>'size')::bigint) as max_size_bytes,
  COUNT(*) as file_count
FROM storage.objects
WHERE bucket_id = 'client-documents'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Resolution Steps**:
1. **Implement Progressive Loading**:
   ```typescript
   // Show placeholder while loading
   const [loading, setLoading] = useState(true);
   const [imageUrl, setImageUrl] = useState('');
   
   useEffect(() => {
     const loadImage = async () => {
       const { data } = await supabase.storage
         .from('client-insurance-cards')
         .download(filePath);
       
       const url = URL.createObjectURL(data);
       setImageUrl(url);
       setLoading(false);
     };
     
     loadImage();
   }, [filePath]);
   ```

2. **Use CDN / Signed URLs**:
   ```typescript
   // Generate signed URL with expiry
   const { data } = await supabase.storage
     .from('client-documents')
     .createSignedUrl(filePath, 3600); // 1 hour
   
   // Use URL in <img> or <iframe>
   ```

3. **Implement Image Optimization**:
   - Store thumbnails for preview
   - Lazy load images
   - Use appropriate image formats (WebP)

4. **Enable Browser Caching**:
   ```typescript
   // Set cache headers
   const { data } = await supabase.storage
     .from('client-documents')
     .download(filePath, {
       cacheControl: '3600' // Cache for 1 hour
     });
   ```

**Prevention**:
- Compress files before upload
- Generate and store thumbnails
- Implement lazy loading
- Use CDN for static assets

---

### Issue 5: File Corruption / Data Integrity

**Symptoms**:
- Downloaded files won't open
- Corrupted images or PDFs
- Checksum mismatches

**Diagnosis**:
```sql
-- Check file metadata
SELECT 
  name,
  metadata,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'client-documents'
  AND name = 'path/to/corrupted-file.pdf';
```

**Resolution Steps**:
1. **Verify File Integrity**:
   ```typescript
   // Calculate and compare checksums
   async function verifyFile(file: File, expectedHash: string) {
     const buffer = await file.arrayBuffer();
     const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
     const hashArray = Array.from(new Uint8Array(hashBuffer));
     const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
     
     return hashHex === expectedHash;
   }
   ```

2. **Re-upload Corrupted Files**:
   - Request original from user
   - Replace corrupted version
   - Update database record

3. **Check Upload Process**:
   - Verify no transformations corrupting data
   - Test with different file types
   - Check network stability during upload

4. **Implement Backup Verification**:
   ```typescript
   // Verify immediately after upload
   const { data: uploadData } = await supabase.storage
     .from('bucket')
     .upload(path, file);
   
   // Download and compare
   const { data: downloadData } = await supabase.storage
     .from('bucket')
     .download(path);
   
   if (file.size !== downloadData.size) {
     console.error('File size mismatch after upload');
   }
   ```

**Prevention**:
- Implement checksum verification
- Test upload process regularly
- Monitor for corruption patterns
- Maintain backup copies of critical files

---

## Monitoring & Alerts

### Key Metrics to Monitor
| Metric | Normal Range | Alert Threshold |
|--------|--------------|-----------------|
| Upload success rate | > 99% | < 95% |
| Download response time | < 2s | > 5s |
| Storage quota usage | < 80% | > 90% |
| Daily upload volume | Varies | 2x baseline |
| RLS policy violations | 0 | > 5 |

### Recommended Alerts
```sql
-- Alert on high storage usage
INSERT INTO notification_rules (
  rule_name,
  rule_type,
  trigger_conditions
) VALUES (
  'High Storage Usage',
  'alert',
  '{
    "metric": "storage_usage_percentage",
    "threshold": 85
  }'
);
```

---

## Testing Procedures

### Manual Testing
```typescript
// Test upload
const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
const { data, error } = await supabase.storage
  .from('client-documents')
  .upload(`test/${Date.now()}.txt`, testFile);

console.log('Upload:', { data, error });

// Test download
const { data: downloadData, error: downloadError } = await supabase.storage
  .from('client-documents')
  .download(data.path);

console.log('Download:', { downloadData, downloadError });
```

---

## Rollback Procedures

### If Storage Service Fails
1. **Disable File Uploads Temporarily**:
   - Show maintenance message
   - Queue uploads for later processing

2. **Use Backup Storage** (if configured):
   - Switch to alternative storage provider
   - Update configuration

3. **Manual File Management**:
   - Accept files via secure email
   - Upload batch after resolution

---

## Escalation Path

### Level 1 (< 30 minutes)
- **Action**: Check storage dashboard, verify access
- **Owner**: On-call engineer

### Level 2 (30-120 minutes)
- **Action**: Review RLS policies, investigate corruption
- **Owner**: Operations lead

### Level 3 (> 120 minutes)
- **Action**: Contact Supabase support, implement workarounds
- **Owner**: Engineering lead + CTO

---

## External Dependencies

### Supabase Platform Status
- **Status Page**: https://status.supabase.com
- **Storage Documentation**: https://supabase.com/docs/guides/storage

---

## Documentation Links
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Document Upload Component](../src/components/documents/DocumentUploadDialog.tsx)
- [Client Documents Table](../docs/data-contracts/CLIENT_DOCUMENTS_CONTRACT.md)

---

## Change Log
| Date | Author | Change |
|------|--------|--------|
| 2025-01-09 | System | Initial runbook creation |
