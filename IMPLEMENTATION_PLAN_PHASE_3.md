# Phase 3 Implementation Plan: Extended Integrations & Content Management

**Duration**: Weeks 7-9  
**Focus**: Non-critical integrations, clinical content versioning, extended observability

---

## Week 7-8: Integration Runbooks (Extended)

### Task 7.1: Insurance Clearinghouse Integration (Preparation)

**Goal**: Document integration architecture and prepare for future implementation

**Files to Create**:

1. **Create: `docs/integrations/CLEARINGHOUSE_INTEGRATION_SPEC.md`**
   ```markdown
   # Insurance Clearinghouse Integration Specification
   
   ## Overview
   
   **Status**: Planned (not yet implemented)  
   **Priority**: High (required for electronic claims)  
   **Estimated Timeline**: Q2 2025
   
   ## Provider Options
   
   | Provider | Pros | Cons | Cost |
   |----------|------|------|------|
   | **Availity** | Industry standard, good support | Higher cost | $X/claim |
   | **Change Healthcare** | Largest network | Complex setup | $Y/claim |
   | **Trizetto** | Good for small practices | Limited features | $Z/claim |
   
   ## Data Flow
   
   ```
   MentalSpace → X12 837 Generator → Clearinghouse API → Payer
        ↓                                ↓
   charge_entries              997 ACK (Syntax)
        ↓                                ↓
   Update status              277 CA (Claim Ack)
        ↓                                ↓
   Post payment               835 ERA (Payment)
   ```
   
   ## Required Data Elements
   
   ### From `clients` table:
   - Demographics (name, DOB, gender, address)
   - Insurance info (member ID, group #, policy holder)
   
   ### From `charge_entries` table:
   - Service date, CPT code, units, charges
   - Diagnosis codes (ICD-10)
   - Place of service
   - Rendering provider NPI
   
   ### From `profiles` table:
   - Provider NPI, taxonomy code
   - License number
   
   ## Implementation Checklist
   
   - [ ] Select clearinghouse vendor
   - [ ] Sign BAA (Business Associate Agreement)
   - [ ] Obtain submitter credentials
   - [ ] Implement X12 837 generation
   - [ ] Build validation engine
   - [ ] Create staging environment for testing
   - [ ] Test with sample claims
   - [ ] Implement 997/277/835 parsing
   - [ ] Build reconciliation workflow
   - [ ] Train billing staff
   
   ## Testing Strategy
   
   ### Phase 1: Syntax Validation
   - Generate X12 files from test data
   - Validate against X12 spec (loops, segments, elements)
   - Submit to clearinghouse test environment
   - Verify 997 ACK received
   
   ### Phase 2: Claim Processing
   - Submit real claims to test payers
   - Track claim status via 277
   - Receive test payments via 835
   - Verify payment posting
   
   ### Phase 3: Production Pilot
   - Submit 10 claims to real payers
   - Monitor for denials/rejections
   - Refine claim generation logic
   - Roll out to all billing
   ```

2. **Create: `src/lib/x12/claim837Generator.ts`** (Stub for future)
   ```typescript
   /**
    * X12 837 Professional Claim Generator
    * Status: STUB - Not yet implemented
    * 
    * This module will generate HIPAA-compliant X12 837P files
    * for electronic claim submission to insurance clearinghouses.
    */
   
   interface Claim837Data {
     client: {
       memberId: string;
       groupNumber?: string;
       firstName: string;
       lastName: string;
       dateOfBirth: string;
       gender: string;
       address: Address;
     };
     provider: {
       npi: string;
       taxonomyCode: string;
       licenseNumber: string;
       name: string;
       address: Address;
     };
     charges: Array<{
       serviceDate: string;
       cptCode: string;
       modifiers?: string[];
       units: number;
       chargeAmount: number;
       diagnosisCodes: string[];
       placeOfService: string;
     }>;
   }
   
   export class Claim837Generator {
     // TODO: Implement X12 837 generation
     generate(data: Claim837Data): string {
       throw new Error('Not yet implemented - placeholder for future');
     }
     
     validate(x12Content: string): ValidationResult {
       throw new Error('Not yet implemented');
     }
   }
   ```

### Task 7.2: Payment Processing Integration (Preparation)

**Files to Create**:

1. **Create: `docs/integrations/PAYMENT_INTEGRATION_SPEC.md`**
   ```markdown
   # Payment Processing Integration Specification
   
   ## Overview
   
   **Status**: Planned  
   **Priority**: Medium (nice-to-have, currently using manual payments)  
   **Estimated Timeline**: Q3 2025
   
   ## Provider Comparison
   
   | Provider | Transaction Fee | Monthly Fee | PCI Compliance | Notes |
   |----------|----------------|-------------|----------------|-------|
   | **Stripe** | 2.9% + $0.30 | $0 | Handled by Stripe | Best for online |
   | **Square** | 2.6% + $0.10 | $0 | Handled by Square | Good for in-person |
   | **Authorize.net** | 2.9% + $0.30 | $25 | Self-managed | Traditional |
   
   ## Integration Approach
   
   ### Option 1: Stripe (Recommended)
   - Use Stripe Elements for card input (PCI compliant)
   - Tokenize on client-side
   - Process via edge function (server-side)
   - Store payment intent ID (not card details)
   
   ### Implementation Steps
   
   1. **Setup** (Week 1)
      - Create Stripe account
      - Obtain API keys (test & live)
      - Store in Supabase secrets
   
   2. **Frontend** (Week 2)
      - Install Stripe React SDK
      - Create payment form with Stripe Elements
      - Handle tokenization
   
   3. **Backend** (Week 3)
      - Create edge function for payment processing
      - Implement webhook handler for events
      - Record payments in `payment_records` table
   
   4. **Testing** (Week 4)
      - Test with Stripe test cards
      - Verify payment flow end-to-end
      - Test failure scenarios
   
   5. **Go Live** (Week 5)
      - Switch to live API keys
      - Process first real payment
      - Monitor for issues
   ```

2. **Create Edge Function Stub: `supabase/functions/process-payment/index.ts`**
   ```typescript
   /**
    * Payment Processing Edge Function
    * Status: STUB - Not yet implemented
    * 
    * This function will process credit card payments via Stripe API
    */
   
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
   
   Deno.serve(async (req) => {
     // TODO: Implement Stripe payment processing
     // 1. Verify authentication
     // 2. Create Stripe payment intent
     // 3. Confirm payment with token
     // 4. Record in payment_records table
     // 5. Generate receipt
     // 6. Send receipt email
     
     return new Response(
       JSON.stringify({ 
         error: 'Payment processing not yet implemented',
         status: 'planned'
       }),
       { status: 501, headers: { 'Content-Type': 'application/json' } }
     );
   });
   ```

### Task 7.3: eRx/Labs Integration (Future)

**Files to Create**:

1. **Create: `docs/integrations/ERX_LABS_SPEC.md`**
   ```markdown
   # Electronic Prescribing & Lab Integration
   
   ## Status: Future Enhancement (2026+)
   
   ## eRx (Surescripts)
   
   **What**: Electronic prescription transmission to pharmacies  
   **Why**: Reduce errors, improve medication adherence  
   **Complexity**: High (requires EPCS certification)  
   **Cost**: ~$200/month + setup fees
   
   ### Requirements
   - DEA number for prescribers
   - EPCS identity proofing
   - Two-factor authentication
   - Medication history access
   
   ## Lab Ordering (LabCorp/Quest)
   
   **What**: Electronic lab order submission and result retrieval  
   **Why**: Streamline lab workflow, auto-import results  
   **Complexity**: Medium  
   **Cost**: Varies by lab partner
   
   ### Requirements
   - Provider CLIA waiver (if applicable)
   - HL7 interface for results
   - Lab account setup
   - Result parsing logic
   ```

---

## Week 9: Content Pack Versioning

### Task 9.1: Design Content Pack System

**Goal**: Version control for clinical templates and code sets

**Files to Create**:

1. **Create Database Schema**:
   ```sql
   -- Content pack versions table
   CREATE TABLE content_pack_versions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     pack_name TEXT NOT NULL, -- e.g., 'document_templates', 'cpt_code_sets'
     version TEXT NOT NULL, -- Semantic versioning: 1.2.3
     release_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     release_notes TEXT NOT NULL,
     is_active BOOLEAN NOT NULL DEFAULT false,
     is_published BOOLEAN NOT NULL DEFAULT false,
     created_by UUID REFERENCES auth.users(id),
     approved_by UUID REFERENCES auth.users(id),
     approved_at TIMESTAMPTZ,
     content JSONB NOT NULL, -- The actual templates/codes
     migration_script TEXT, -- SQL to apply changes
     rollback_script TEXT, -- SQL to undo changes
     UNIQUE (pack_name, version)
   );
   
   CREATE INDEX idx_content_pack_active ON content_pack_versions(pack_name, is_active);
   
   -- Content pack change log
   CREATE TABLE content_pack_changelog (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     pack_version_id UUID REFERENCES content_pack_versions(id),
     change_type TEXT NOT NULL, -- 'added', 'modified', 'deprecated', 'removed'
     item_name TEXT NOT NULL, -- e.g., 'Intake Assessment Template'
     description TEXT NOT NULL,
     breaking_change BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   
   -- Enable RLS
   ALTER TABLE content_pack_versions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE content_pack_changelog ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "All users can view published packs"
   ON content_pack_versions FOR SELECT
   USING (is_published = true);
   
   CREATE POLICY "Admins can manage content packs"
   ON content_pack_versions FOR ALL
   USING (has_role(auth.uid(), 'administrator'));
   ```

2. **Create: `src/lib/contentPacks.ts`**
   ```typescript
   import { supabase } from '@/integrations/supabase/client';
   
   export interface ContentPackVersion {
     id: string;
     packName: string;
     version: string;
     releaseDate: string;
     releaseNotes: string;
     isActive: boolean;
     isPublished: boolean;
     content: any;
     migrationScript?: string;
     rollbackScript?: string;
   }
   
   export interface ChangelogEntry {
     changeType: 'added' | 'modified' | 'deprecated' | 'removed';
     itemName: string;
     description: string;
     breakingChange: boolean;
   }
   
   export class ContentPackManager {
     async getActiveVersion(packName: string): Promise<ContentPackVersion | null> {
       const { data, error } = await supabase
         .from('content_pack_versions')
         .select('*')
         .eq('pack_name', packName)
         .eq('is_active', true)
         .single();
       
       if (error) return null;
       return data;
     }
     
     async getAllVersions(packName: string): Promise<ContentPackVersion[]> {
       const { data } = await supabase
         .from('content_pack_versions')
         .select('*')
         .eq('pack_name', packName)
         .order('release_date', { ascending: false });
       
       return data || [];
     }
     
     async createVersion(
       packName: string,
       version: string,
       content: any,
       releaseNotes: string,
       changelog: ChangelogEntry[],
       migrationScript?: string,
       rollbackScript?: string
     ): Promise<ContentPackVersion> {
       const { data, error } = await supabase
         .from('content_pack_versions')
         .insert({
           pack_name: packName,
           version,
           content,
           release_notes: releaseNotes,
           migration_script: migrationScript,
           rollback_script: rollbackScript,
           is_published: false,
           is_active: false
         })
         .select()
         .single();
       
       if (error) throw error;
       
       // Add changelog entries
       for (const entry of changelog) {
         await supabase.from('content_pack_changelog').insert({
           pack_version_id: data.id,
           ...entry
         });
       }
       
       return data;
     }
     
     async publishVersion(versionId: string): Promise<void> {
       // Deactivate current active version
       const { data: currentActive } = await supabase
         .from('content_pack_versions')
         .select('pack_name')
         .eq('id', versionId)
         .single();
       
       if (currentActive) {
         await supabase
           .from('content_pack_versions')
           .update({ is_active: false })
           .eq('pack_name', currentActive.pack_name)
           .eq('is_active', true);
       }
       
       // Activate and publish new version
       const { error } = await supabase
         .from('content_pack_versions')
         .update({
           is_published: true,
           is_active: true,
           approved_at: new Date().toISOString(),
           approved_by: (await supabase.auth.getUser()).data.user?.id
         })
         .eq('id', versionId);
       
       if (error) throw error;
     }
     
     async rollbackToVersion(versionId: string): Promise<void> {
       const { data: targetVersion } = await supabase
         .from('content_pack_versions')
         .select('*')
         .eq('id', versionId)
         .single();
       
       if (!targetVersion) throw new Error('Version not found');
       
       // Execute rollback script if provided
       if (targetVersion.rollback_script) {
         // Call edge function to execute SQL
         await supabase.functions.invoke('execute-content-migration', {
           body: { sql: targetVersion.rollback_script }
         });
       }
       
       // Activate target version
       await this.publishVersion(versionId);
     }
   }
   ```

3. **Create: `src/components/admin/ContentPackManager.tsx`**
   ```typescript
   import { useState, useEffect } from 'react';
   import { ContentPackManager } from '@/lib/contentPacks';
   import { Card } from '@/components/ui/card';
   import { Button } from '@/components/ui/button';
   import { Badge } from '@/components/ui/badge';
   
   export const ContentPackManagement = () => {
     const [packs, setPacks] = useState<any[]>([]);
     const [selectedPack, setSelectedPack] = useState<string | null>(null);
     const manager = new ContentPackManager();
     
     useEffect(() => {
       loadPacks();
     }, []);
     
     const loadPacks = async () => {
       const packNames = [
         'document_templates',
         'cpt_code_sets',
         'problem_lists',
         'assessment_instruments'
       ];
       
       const allPacks = await Promise.all(
         packNames.map(async (name) => ({
           name,
           versions: await manager.getAllVersions(name),
           active: await manager.getActiveVersion(name)
         }))
       );
       
       setPacks(allPacks);
     };
     
     return (
       <div className="space-y-6">
         <h1>Content Pack Management</h1>
         
         {packs.map(pack => (
           <Card key={pack.name} className="p-6">
             <div className="flex justify-between items-center mb-4">
               <h2>{pack.name.replace(/_/g, ' ').toUpperCase()}</h2>
               <Badge variant={pack.active ? 'default' : 'secondary'}>
                 Active: {pack.active?.version || 'None'}
               </Badge>
             </div>
             
             <div className="space-y-2">
               {pack.versions.map((version: any) => (
                 <div key={version.id} className="flex justify-between items-center p-3 border rounded">
                   <div>
                     <span className="font-semibold">v{version.version}</span>
                     <span className="text-sm text-muted-foreground ml-2">
                       {new Date(version.releaseDate).toLocaleDateString()}
                     </span>
                   </div>
                   
                   <div className="flex gap-2">
                     {version.isActive && (
                       <Badge variant="success">Active</Badge>
                     )}
                     {!version.isPublished && (
                       <Button
                         size="sm"
                         onClick={() => manager.publishVersion(version.id)}
                       >
                         Publish
                       </Button>
                     )}
                     <Button
                       size="sm"
                       variant="outline"
                       onClick={() => setSelectedPack(version.id)}
                     >
                       View
                     </Button>
                   </div>
                 </div>
               ))}
             </div>
             
             <Button className="mt-4" variant="secondary">
               Create New Version
             </Button>
           </Card>
         ))}
       </div>
     );
   };
   ```

### Task 9.2: Implement Versioned Content Types

**Content Packs to Version**:

1. **Document Templates Pack**
   - Intake assessments
   - Treatment plans
   - Progress note templates
   - Consent forms

2. **CPT Code Sets Pack**
   - Psychotherapy codes
   - Evaluation codes
   - Testing codes
   - Add-on codes

3. **Problem Lists Pack**
   - Common diagnoses
   - DSM-5 favorites
   - ICD-10 quick picks

4. **Assessment Instruments Pack**
   - PHQ-9, GAD-7, etc.
   - Scoring algorithms
   - Interpretation guidelines

**Example Version Migration**:

```sql
-- CPT Code Set v2.0.0 (2025 updates)
-- Migration script
BEGIN;

-- Add new codes for 2025
INSERT INTO service_codes (code, description, category, rate, effective_date)
VALUES 
  ('90791', '2025 Updated: Psychiatric Diagnostic Evaluation', 'Evaluation', 200.00, '2025-01-01'),
  ('90837', '2025 Updated: Psychotherapy 60 minutes', 'Psychotherapy', 150.00, '2025-01-01');

-- Deprecate old codes
UPDATE service_codes
SET is_active = false, deprecated_date = '2025-01-01'
WHERE code IN ('90801') -- Old evaluation code
AND effective_date < '2025-01-01';

-- Log migration
INSERT INTO content_pack_changelog (pack_version_id, change_type, item_name, description, breaking_change)
VALUES
  ((SELECT id FROM content_pack_versions WHERE pack_name = 'cpt_code_sets' AND version = '2.0.0'),
   'added', '90791', 'New psychiatric evaluation code for 2025', false),
  ((SELECT id FROM content_pack_versions WHERE pack_name = 'cpt_code_sets' AND version = '2.0.0'),
   'deprecated', '90801', 'Replaced by 90791 effective 2025-01-01', true);

COMMIT;
```

**Rollback Script**:

```sql
BEGIN;

-- Reactivate old codes
UPDATE service_codes
SET is_active = true, deprecated_date = NULL
WHERE code IN ('90801');

-- Remove 2025 codes
DELETE FROM service_codes
WHERE code IN ('90791', '90837')
AND effective_date = '2025-01-01';

COMMIT;
```

**Verification**:

- [ ] Content pack versioning system implemented
- [ ] 4 content pack types defined
- [ ] Version history tracked
- [ ] Migration/rollback scripts work
- [ ] Breaking changes flagged
- [ ] Admin UI for content management

---

## Phase 3 Completion Checklist

### Week 7-8 Deliverables
- [ ] Clearinghouse integration spec documented
- [ ] Payment integration spec documented
- [ ] eRx/Labs future roadmap documented
- [ ] Integration stubs created for future implementation

### Week 9 Deliverables
- [ ] Content pack versioning system
- [ ] 4 content pack types defined
- [ ] Migration testing framework
- [ ] Admin UI for content management
- [ ] Rollback capability tested

### Success Metrics
- Integration documentation: 100% complete
- Content pack version control: Operational
- Breaking change detection: Automated
- Rollback success rate: 100%

---

**Next Phase**: Week 10-12 (Observability, Performance, Continuous Improvement)

**Document Version**: 1.0  
**Last Updated**: 2025-10-08  
**Owner**: Integration Engineer + Clinical Operations
