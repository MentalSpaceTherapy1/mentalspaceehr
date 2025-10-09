# Content Pack Migration Example

This document provides examples of how to create, migrate, and rollback content packs using the Content Pack Manager.

## Example 1: CPT Code Set Update (v1.1.0)

### Scenario
Update the CPT code set to add new codes for 2024 and deprecate obsolete codes.

### Step 1: Create Version

```typescript
import { contentPackManager } from '@/lib/contentPacks';

const version = await contentPackManager.createVersion({
  version_number: '1.1.0',
  version_name: 'CPT Codes 2024 Update',
  content_type: 'cpt_codes',
  description: 'Updated CPT codes for 2024 with new codes and deprecated obsolete entries',
  content_data: {
    codes: [
      {
        code: '90791',
        description: 'Psychiatric diagnostic evaluation',
        category: 'Diagnostic',
        duration: 60,
        modifiers: ['95'], // Telehealth
        valid_from: '2024-01-01',
        status: 'active'
      },
      {
        code: '90832',
        description: 'Psychotherapy, 30 minutes',
        category: 'Individual Therapy',
        duration: 30,
        modifiers: ['95'],
        valid_from: '2024-01-01',
        status: 'active'
      },
      {
        code: '90834',
        description: 'Psychotherapy, 45 minutes',
        category: 'Individual Therapy',
        duration: 45,
        modifiers: ['95'],
        valid_from: '2024-01-01',
        status: 'active'
      },
      // New codes for 2024
      {
        code: '90839',
        description: 'Psychotherapy for crisis, first 60 minutes',
        category: 'Crisis',
        duration: 60,
        modifiers: ['95'],
        valid_from: '2024-01-01',
        status: 'active',
        new_in_version: '1.1.0'
      },
      {
        code: '90840',
        description: 'Psychotherapy for crisis, each additional 30 minutes',
        category: 'Crisis',
        duration: 30,
        modifiers: ['95'],
        valid_from: '2024-01-01',
        status: 'active',
        new_in_version: '1.1.0'
      },
      // Deprecated code
      {
        code: '90801',
        description: 'Psychiatric diagnostic interview (DEPRECATED)',
        category: 'Diagnostic',
        duration: 60,
        valid_from: '2010-01-01',
        valid_until: '2023-12-31',
        status: 'deprecated',
        replaced_by: '90791',
        deprecation_reason: 'Replaced by 90791 in 2013'
      }
    ]
  },
  requires_version: '1.0.0', // Previous version
  deprecates_versions: ['1.0.0']
});

console.log('Created version:', version.id);
```

### Step 2: Add Changelog

```typescript
await contentPackManager.addChangelogEntries(version.id, [
  {
    change_type: 'added',
    entity_type: 'cpt_code',
    entity_id: '90839',
    entity_name: 'CPT 90839 - Crisis Psychotherapy (60 min)',
    change_summary: 'Added new crisis psychotherapy code for extended sessions',
    change_details: {
      code: '90839',
      category: 'Crisis',
      duration: 60
    },
    breaking_change: false,
    migration_required: false
  },
  {
    change_type: 'added',
    entity_type: 'cpt_code',
    entity_id: '90840',
    entity_name: 'CPT 90840 - Crisis Psychotherapy Add-on',
    change_summary: 'Added add-on code for extended crisis psychotherapy',
    change_details: {
      code: '90840',
      category: 'Crisis',
      duration: 30,
      addon_code: true
    },
    breaking_change: false,
    migration_required: false
  },
  {
    change_type: 'deprecated',
    entity_type: 'cpt_code',
    entity_id: '90801',
    entity_name: 'CPT 90801 - Psychiatric Diagnostic Interview',
    change_summary: 'Officially deprecated code, replaced by 90791',
    change_details: {
      code: '90801',
      replaced_by: '90791',
      deprecated_since: '2013-01-01'
    },
    breaking_change: false,
    migration_required: false
  }
]);
```

### Step 3: Validate

```typescript
const validation = await contentPackManager.validateVersion(version.id);

if (validation.isValid) {
  console.log('✅ Validation passed');
} else {
  console.log('❌ Validation failed:');
  validation.errors.forEach(error => {
    console.log(`  - ${error.field}: ${error.message}`);
  });
}
```

### Step 4: Publish

```typescript
if (validation.isValid) {
  const published = await contentPackManager.publishVersion(version.id);
  console.log('Published version:', published.version_number);
}
```

### Step 5: Install

```typescript
// Dry run first
const dryRunResult = await contentPackManager.installVersion(version.id, {
  dryRun: true
});
console.log('Dry run result:', dryRunResult.installation_status);

// Actual installation
const installation = await contentPackManager.installVersion(version.id);
console.log('Installation status:', installation.installation_status);
```

## Example 2: Assessment Instrument Update (v2.0.0) - Breaking Change

### Scenario
Update the PHQ-9 assessment to include new scoring algorithm and additional metadata. This is a breaking change because it modifies the scoring calculation.

### Step 1: Create Version

```typescript
const version = await contentPackManager.createVersion({
  version_number: '2.0.0',
  version_name: 'PHQ-9 Enhanced Scoring Update',
  content_type: 'assessments',
  description: 'Updated PHQ-9 with enhanced scoring algorithm and severity thresholds',
  content_data: {
    assessments: [
      {
        id: 'phq9',
        name: 'Patient Health Questionnaire-9 (PHQ-9)',
        version: '2.0',
        items: [
          {
            id: 'phq9_q1',
            text: 'Little interest or pleasure in doing things',
            options: [
              { value: 0, label: 'Not at all' },
              { value: 1, label: 'Several days' },
              { value: 2, label: 'More than half the days' },
              { value: 3, label: 'Nearly every day' }
            ]
          }
          // ... other items
        ],
        scoring: {
          algorithm: 'sum',
          interpretation: [
            { range: [0, 4], severity: 'minimal', description: 'Minimal depression' },
            { range: [5, 9], severity: 'mild', description: 'Mild depression' },
            { range: [10, 14], severity: 'moderate', description: 'Moderate depression' },
            { range: [15, 19], severity: 'moderately_severe', description: 'Moderately severe depression' },
            { range: [20, 27], severity: 'severe', description: 'Severe depression' }
          ],
          // NEW: Enhanced scoring
          risk_flags: {
            suicide_risk: {
              item_id: 'phq9_q9',
              threshold: 1,
              alert_level: 'critical'
            }
          },
          clinical_recommendations: {
            minimal: 'Monitor symptoms',
            mild: 'Consider watchful waiting or brief therapy',
            moderate: 'Active treatment recommended (therapy and/or medication)',
            moderately_severe: 'Active treatment strongly recommended',
            severe: 'Immediate active treatment required'
          }
        },
        metadata: {
          copyright: 'Developed by Drs. Robert L. Spitzer, Janet B.W. Williams, Kurt Kroenke and colleagues',
          reference: 'Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606-613.',
          last_updated: '2024-01-01'
        }
      }
    ]
  },
  requires_version: '1.0.0'
});
```

### Step 2: Add Changelog with Breaking Changes

```typescript
await contentPackManager.addChangelogEntries(version.id, [
  {
    change_type: 'modified',
    entity_type: 'assessment',
    entity_id: 'phq9',
    entity_name: 'PHQ-9 Depression Assessment',
    change_summary: 'Updated scoring algorithm with enhanced risk assessment',
    change_details: {
      changes: [
        'Added suicide risk flagging for item 9',
        'Added clinical recommendations by severity level',
        'Enhanced interpretation thresholds',
        'Added metadata for clinical reference'
      ],
      migration_notes: 'Existing administrations will be re-scored with new algorithm'
    },
    breaking_change: true, // BREAKING: Scoring algorithm changed
    migration_required: true,
    migration_script: `
      -- Re-score existing PHQ-9 administrations with new algorithm
      UPDATE assessment_administrations
      SET interpreted_severity = CASE
        WHEN raw_score BETWEEN 0 AND 4 THEN 'minimal'
        WHEN raw_score BETWEEN 5 AND 9 THEN 'mild'
        WHEN raw_score BETWEEN 10 AND 14 THEN 'moderate'
        WHEN raw_score BETWEEN 15 AND 19 THEN 'moderately_severe'
        WHEN raw_score BETWEEN 20 AND 27 THEN 'severe'
      END,
      interpretation_notes = 'Re-scored with v2.0 algorithm',
      updated_at = NOW()
      WHERE assessment_id = (
        SELECT id FROM assessments WHERE name = 'PHQ-9'
      )
      AND interpreted_severity IS NOT NULL;
    `
  },
  {
    change_type: 'added',
    entity_type: 'field',
    entity_id: 'phq9_risk_flags',
    entity_name: 'Risk Assessment Flags',
    change_summary: 'Added automatic risk flagging based on responses',
    change_details: {
      field: 'risk_flags',
      type: 'object',
      purpose: 'Automatic detection of high-risk responses'
    },
    breaking_change: false,
    migration_required: false
  }
]);
```

### Step 3: Installation with Migration

```typescript
// This will execute the migration script
const installation = await contentPackManager.installVersion(version.id, {
  force: true // Required for breaking changes
});

if (installation.installation_status === 'success') {
  console.log('✅ Migration completed successfully');
  console.log('Migration log:', installation.migration_log);
} else {
  console.error('❌ Migration failed');
  console.error('Errors:', installation.error_log);
}
```

### Step 4: Rollback (if needed)

```typescript
// If issues are discovered after installation
const rollback = await contentPackManager.rollbackVersion(installation.id);
console.log('Rollback status:', rollback.installation_status);

// Note: Rolling back will not undo data migrations automatically
// You may need to run a manual rollback script:
const rollbackScript = `
  -- Revert PHQ-9 scores to previous algorithm (if needed)
  UPDATE assessment_administrations
  SET interpreted_severity = CASE
    WHEN raw_score BETWEEN 0 AND 4 THEN 'none'
    WHEN raw_score BETWEEN 5 AND 9 THEN 'mild'
    WHEN raw_score BETWEEN 10 AND 14 THEN 'moderate'
    WHEN raw_score BETWEEN 15 AND 19 THEN 'moderate_severe'
    WHEN raw_score >= 20 THEN 'severe'
  END,
  interpretation_notes = 'Rolled back to v1.0 algorithm',
  updated_at = NOW()
  WHERE assessment_id = (
    SELECT id FROM assessments WHERE name = 'PHQ-9'
  )
  AND interpretation_notes = 'Re-scored with v2.0 algorithm';
`;
```

## Example 3: Document Template Library (v1.2.0)

### Scenario
Add new HIPAA-compliant consent forms and update existing templates with improved structure.

### Create and Publish

```typescript
const version = await contentPackManager.createVersion({
  version_number: '1.2.0',
  version_name: 'HIPAA Consent Forms 2024',
  content_type: 'document_templates',
  description: 'Added updated HIPAA consent forms and telehealth agreement',
  content_data: {
    templates: [
      {
        id: 'hipaa_consent_2024',
        name: 'HIPAA Authorization for Release of Information (2024)',
        category: 'Consent Forms',
        sections: [
          {
            id: 'authorization',
            title: 'Authorization to Release',
            fields: [
              { id: 'client_name', type: 'text', label: 'Client Name', required: true },
              { id: 'dob', type: 'date', label: 'Date of Birth', required: true },
              { id: 'release_to', type: 'text', label: 'Release Information To', required: true },
              { id: 'information_types', type: 'checkbox_group', label: 'Information to Release', 
                options: [
                  'Psychiatric Evaluation',
                  'Treatment Plan',
                  'Progress Notes',
                  'Medication Records',
                  'Psychological Testing'
                ]
              }
            ]
          },
          {
            id: 'signatures',
            title: 'Signatures',
            fields: [
              { id: 'client_signature', type: 'signature', label: 'Client Signature', required: true },
              { id: 'date', type: 'date', label: 'Date', required: true }
            ]
          }
        ],
        compliance: {
          hipaa: true,
          retention_years: 7,
          version: '2024.1'
        }
      },
      {
        id: 'telehealth_consent_2024',
        name: 'Telehealth Services Consent (2024)',
        category: 'Consent Forms',
        sections: [
          {
            id: 'telehealth_agreement',
            title: 'Telehealth Services Agreement',
            fields: [
              { id: 'client_name', type: 'text', label: 'Client Name', required: true },
              { id: 'understands_risks', type: 'checkbox', label: 'I understand the risks and benefits of telehealth', required: true },
              { id: 'technical_requirements', type: 'checkbox', label: 'I have access to required technology', required: true },
              { id: 'emergency_plan', type: 'checkbox', label: 'I understand the emergency procedures', required: true }
            ]
          }
        ],
        compliance: {
          telehealth: true,
          state_specific: true
        }
      }
    ]
  }
});

// Add changelog
await contentPackManager.addChangelogEntries(version.id, [
  {
    change_type: 'added',
    entity_type: 'template',
    entity_id: 'hipaa_consent_2024',
    entity_name: 'HIPAA Authorization 2024',
    change_summary: 'Added updated HIPAA authorization form compliant with 2024 regulations',
    breaking_change: false,
    migration_required: false
  },
  {
    change_type: 'added',
    entity_type: 'template',
    entity_id: 'telehealth_consent_2024',
    entity_name: 'Telehealth Consent 2024',
    change_summary: 'Added comprehensive telehealth consent form',
    breaking_change: false,
    migration_required: false
  }
]);

// Validate and publish
const validation = await contentPackManager.validateVersion(version.id);
if (validation.isValid) {
  await contentPackManager.publishVersion(version.id);
  await contentPackManager.installVersion(version.id);
}
```

## Version Comparison

```typescript
// Compare two versions to see what changed
const comparison = await contentPackManager.compareVersions(
  'old-version-id',
  'new-version-id'
);

console.log('Added:', comparison.added.length, 'items');
console.log('Modified:', comparison.modified.length, 'items');
console.log('Removed:', comparison.removed.length, 'items');
console.log('Deprecated:', comparison.deprecated.length, 'items');
```

## Best Practices

### 1. Semantic Versioning
- **Major version (X.0.0)**: Breaking changes that require migration
- **Minor version (1.X.0)**: New features, backward compatible
- **Patch version (1.0.X)**: Bug fixes, no new features

### 2. Always Include Changelog
- Document every change with clear descriptions
- Flag breaking changes explicitly
- Provide migration scripts when needed

### 3. Validate Before Publishing
- Run validation on all versions before publishing
- Fix all errors before making available

### 4. Test Migrations
- Always run dry-run installations first
- Test rollback procedures
- Keep migration scripts for reference

### 5. Document Dependencies
- Specify required versions
- Document deprecated versions
- Clear upgrade paths

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-09
