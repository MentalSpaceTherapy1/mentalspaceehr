# Data Contract Template

## Metadata
- **Contract Name**: [Table/Dataset Name]
- **Contract Version**: [Semantic Version]
- **Effective Date**: [YYYY-MM-DD]
- **Owner**: [Team/Role]
- **Status**: [Draft | Active | Deprecated]
- **Last Updated**: [YYYY-MM-DD]
- **Updated By**: [Name/Role]

## Purpose
### Business Context
[Describe the business purpose and value of this data]

### Use Cases
1. [Primary use case]
2. [Secondary use cases]

### Stakeholders
- **Data Producer**: [Team/System responsible for creating data]
- **Data Consumer**: [Teams/Systems that use this data]
- **Data Steward**: [Person/Team responsible for data quality]

## Schema Definition
### Table Name
`[schema].[table_name]`

### Columns
| Column Name | Data Type | Nullable | Default | Description | Business Rules |
|------------|-----------|----------|---------|-------------|----------------|
| id | uuid | No | gen_random_uuid() | Primary key | Unique identifier |
| created_at | timestamp | No | now() | Creation timestamp | Immutable after creation |

### Indexes
| Index Name | Columns | Type | Purpose |
|-----------|---------|------|---------|
| [index_name] | [columns] | [btree/gin/gist] | [Performance/uniqueness] |

### Foreign Keys
| Column | References | On Delete | On Update |
|--------|-----------|-----------|-----------|
| [column] | [table].[column] | [CASCADE/RESTRICT] | [CASCADE/RESTRICT] |

## Data Quality Rules
### Completeness
- **Required Fields**: [List fields that must not be null]
- **Conditional Requirements**: [Fields required based on conditions]

### Validity
- **Range Constraints**: [Min/max values, date ranges]
- **Format Rules**: [Email format, phone format, etc.]
- **Enum Values**: [Allowed values for categorical fields]

### Uniqueness
- **Unique Constraints**: [Fields that must be unique]
- **Composite Keys**: [Multiple fields that form unique combination]

### Consistency
- **Cross-Field Rules**: [Relationships between fields]
- **Referential Integrity**: [Foreign key relationships]

### Timeliness
- **Update Frequency**: [How often data should be updated]
- **Freshness Requirements**: [Maximum age of data]

## Data Quality Checks
### Automated Validations
```sql
-- Example check: No NULL values in required fields
SELECT COUNT(*) as violations
FROM [table]
WHERE [required_field] IS NULL;

-- Example check: Valid date ranges
SELECT COUNT(*) as violations
FROM [table]
WHERE [end_date] < [start_date];

-- Example check: Referential integrity
SELECT COUNT(*) as violations
FROM [table] t
LEFT JOIN [referenced_table] r ON t.[fk] = r.id
WHERE t.[fk] IS NOT NULL AND r.id IS NULL;
```

### Quality Thresholds
| Check | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Null values in required fields | 0% | Critical | Alert immediately |
| Invalid date ranges | 0% | High | Alert within 1 hour |
| Orphaned references | < 1% | Medium | Daily report |

## Change Management
### Versioning Strategy
[Describe how schema changes are versioned]

### Breaking Changes
[Define what constitutes a breaking change]

### Migration Process
1. [Step-by-step migration process]
2. [Rollback procedures]
3. [Communication plan]

### Deprecation Policy
- **Notice Period**: [Time before deprecation]
- **Support Period**: [Time after deprecation]
- **Migration Path**: [How to migrate to new version]

## Service Level Agreements (SLAs)
### Availability
- **Target**: [e.g., 99.9% uptime]
- **Measurement**: [How availability is measured]

### Latency
- **Read Operations**: [Target response time]
- **Write Operations**: [Target response time]

### Data Quality
- **Accuracy**: [Target accuracy percentage]
- **Completeness**: [Target completeness percentage]
- **Timeliness**: [Maximum data age]

### Support
- **Response Time**: [Time to acknowledge issues]
- **Resolution Time**: [Time to resolve issues by severity]

## Access Control & Security
### Row-Level Security (RLS)
```sql
-- Document RLS policies
CREATE POLICY "[policy_name]"
ON [table]
FOR [SELECT/INSERT/UPDATE/DELETE]
USING ([condition]);
```

### Authorized Roles
| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| administrator | Yes | Yes | Yes | Yes | Full access |
| [role_name] | Yes | No | Limited | No | [Conditions] |

### PHI/PII Classification
- **Contains PHI**: [Yes/No]
- **Contains PII**: [Yes/No]
- **Encryption Required**: [Yes/No]
- **Audit Required**: [Yes/No]

### Compliance Requirements
- HIPAA: [Applicable requirements]
- GDPR: [Applicable requirements]
- Other: [Specific regulations]

## Monitoring & Alerting
### Key Metrics
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Row count | [Expected range] | [±20%] | [±50%] |
| Null percentage | [< 1%] | [1-5%] | [> 5%] |
| Update frequency | [Daily] | [< Daily] | [< Weekly] |

### Alert Configuration
| Alert | Condition | Recipients | Escalation |
|-------|-----------|-----------|------------|
| Data quality violation | [Condition] | [Team] | [After X hours] |
| Schema change | Any DDL | [Team] | Immediate |

## Documentation & Support
### Technical Documentation
- **Repository**: [Link to code repository]
- **API Documentation**: [Link if applicable]
- **Schema Diagrams**: [Link to ERD]

### Support Contacts
- **Primary Contact**: [Name, Email, Slack]
- **Escalation Contact**: [Name, Email]
- **On-Call Rotation**: [Link to schedule]

### Known Issues & Limitations
1. [Known issue or limitation]
2. [Workaround if available]

## Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | [YYYY-MM-DD] | [Name] | Initial contract |
| 1.1.0 | [YYYY-MM-DD] | [Name] | Added X field |

## Approval
- **Contract Owner**: _________________ Date: _______
- **Data Steward**: _________________ Date: _______
- **Security Review**: _________________ Date: _______
- **Compliance Review**: _________________ Date: _______
