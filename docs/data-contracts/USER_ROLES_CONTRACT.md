# Data Contract: User Roles Table

## Metadata
- **Contract Name**: User Roles
- **Contract Version**: 1.0.0
- **Effective Date**: 2025-01-09
- **Owner**: Security & Access Control Team
- **Status**: Active
- **Last Updated**: 2025-01-09
- **Updated By**: System Administrator

## Purpose
### Business Context
The user_roles table is the foundation of the application's Role-Based Access Control (RBAC) system. It defines which users have which roles, enabling proper authorization and security throughout the system.

### Use Cases
1. Authorization and access control decisions
2. Role-based UI rendering and feature access
3. Audit trail for permission changes
4. Compliance with least-privilege principle
5. Multi-role user management

### Stakeholders
- **Data Producer**: Administrators
- **Data Consumer**: All application components, RLS policies
- **Data Steward**: Security Administrator

## Schema Definition
### Table Name
`public.user_roles`

### Key Columns
| Column Name | Data Type | Nullable | Description | Business Rules |
|------------|-----------|----------|-------------|----------------|
| id | uuid | No | Primary key | Generated automatically |
| user_id | uuid | No | User reference | Must exist in auth.users |
| role | app_role | No | Assigned role | Valid enum value required |
| assigned_by | uuid | Yes | Admin who assigned | Must exist in auth.users |
| assigned_at | timestamp | No | Assignment timestamp | Default now() |

### Constraints
- **Unique Constraint**: (user_id, role) - prevents duplicate role assignments
- **Foreign Key**: user_id → auth.users(id) ON DELETE CASCADE
- **Check**: role must be valid app_role enum value

## Data Quality Rules
### Completeness
- **Required Fields**: id, user_id, role, assigned_at
- **Conditional Requirements**:
  - All role assignments should have assigned_by (except initial system setup)
  - Users with 'associate_trainee' role should have supervisor relationship

### Validity
- **Role Values**: Must be one of [administrator, supervisor, therapist, psychiatrist, associate_trainee, billing_staff, front_desk]
- **User Existence**: user_id must reference valid auth.users record
- **Assignment Logic**: assigned_at should be ≤ CURRENT_TIMESTAMP

### Uniqueness
- **Composite Uniqueness**: (user_id, role) - enforced by database constraint
- **Business Rule**: Warn if user has conflicting roles (e.g., associate_trainee + supervisor)

### Consistency
- **Foreign Key Integrity**:
  - user_id must exist in auth.users table
  - assigned_by must exist in auth.users table (if not null)
- **Business Logic**:
  - Associate trainees should not have supervisor role
  - At least one administrator should exist at all times
  - New users should have at least one role assigned

## Data Quality Checks
### Automated Validations
```sql
-- Check: No NULL values in required fields
SELECT COUNT(*) as violations
FROM user_roles
WHERE user_id IS NULL 
   OR role IS NULL
   OR assigned_at IS NULL;

-- Check: Invalid role values (should be prevented by enum)
SELECT COUNT(*) as violations
FROM user_roles
WHERE role::text NOT IN (
  'administrator', 'supervisor', 'therapist', 'psychiatrist', 
  'associate_trainee', 'billing_staff', 'front_desk'
);

-- Check: Orphaned user references
SELECT COUNT(*) as violations
FROM user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
WHERE u.id IS NULL;

-- Check: Users without any roles
SELECT COUNT(*) as violations
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.id IS NULL
  AND u.created_at < NOW() - INTERVAL '1 hour';

-- Check: Conflicting roles
SELECT user_id, COUNT(*) as role_count
FROM user_roles
WHERE user_id IN (
  SELECT user_id FROM user_roles WHERE role = 'associate_trainee'
  INTERSECT
  SELECT user_id FROM user_roles WHERE role = 'supervisor'
)
GROUP BY user_id;

-- Check: System has at least one administrator
SELECT CASE 
  WHEN COUNT(*) = 0 THEN 1 
  ELSE 0 
END as violations
FROM user_roles
WHERE role = 'administrator';

-- Check: Duplicate role assignments (should be prevented by unique constraint)
SELECT user_id, role, COUNT(*) as count
FROM user_roles
GROUP BY user_id, role
HAVING COUNT(*) > 1;

-- Check: Future assignment dates
SELECT COUNT(*) as violations
FROM user_roles
WHERE assigned_at > NOW();
```

### Quality Thresholds
| Check | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| Null required fields | 0% | Critical | Alert immediately |
| Invalid role values | 0% | Critical | Alert immediately |
| Orphaned user references | 0% | Critical | Alert immediately |
| Users without roles (>1hr old) | 0% | High | Alert within 1 hour |
| Conflicting roles | 0 | High | Daily review |
| No administrators | 0 | Critical | Alert immediately |
| Duplicate assignments | 0 | Critical | Alert immediately |
| Future assignment dates | 0% | High | Alert immediately |

## Access Control & Security
### Row-Level Security (RLS)
```sql
-- Users can view their own roles
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- Administrators can view all roles
CREATE POLICY "Admins view all roles"
ON user_roles FOR SELECT
USING (has_role(auth.uid(), 'administrator'));

-- Only administrators can manage roles
CREATE POLICY "Admins manage roles"
ON user_roles FOR ALL
USING (has_role(auth.uid(), 'administrator'))
WITH CHECK (has_role(auth.uid(), 'administrator'));
```

### Authorized Roles
| Role | Select | Insert | Update | Delete | Notes |
|------|--------|--------|--------|--------|-------|
| administrator | Yes | Yes | Yes | Yes | Full role management |
| user (self) | Limited | No | No | No | View own roles only |
| other users | No | No | No | No | No access to others' roles |

### PHI/PII Classification
- **Contains PHI**: No
- **Contains PII**: No (only user IDs)
- **Encryption Required**: Yes (in transit)
- **Audit Required**: Yes (all role changes)

### Compliance Requirements
- Security: Principle of least privilege
- Audit: Complete history of role assignments
- Segregation of Duties: Prevent conflicting role combinations
- Access Control: Regular access reviews

## Service Level Agreements (SLAs)
### Data Quality
- **Accuracy**: 100% (critical for security)
- **Completeness**: 100% (all users must have roles)
- **Timeliness**: Real-time (immediate effect on permissions)

### Support
- **Critical Issues**: Response < 15 min, resolution < 30 min
- **High Issues**: Response < 1 hour, resolution < 4 hours

## Monitoring & Alerting
### Key Metrics
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Users without roles | 0 | N/A | Any |
| Administrator count | ≥ 2 | 1 | 0 |
| Role changes per day | [Baseline] | 2x baseline | 5x baseline |
| Failed role checks | 0 | > 0 | > 10/hour |

### Alert Configuration
| Alert | Condition | Recipients | Escalation |
|-------|-----------|-----------|------------|
| No administrators | Count = 0 | All admins + Security | Immediate |
| Last admin role removed | Attempted removal | Security team | Immediate |
| Unusual role activity | >20 changes/hour | Security Administrator | Immediate |
| Conflicting roles detected | Any occurrence | Administrator | Within 1 hour |
| Orphaned role assignment | FK violation | System Admin | Immediate |

## Special Considerations
### Security Definer Functions
The `has_role()` function is critical for RLS policies and must:
- Use SECURITY DEFINER to bypass RLS
- Set search_path to prevent injection
- Be stable and efficient (used in many policies)
- Never be modified without thorough testing

### Critical Operations
- **Never delete all administrators**: System prevents last admin removal
- **Role assignment**: Must be audited in audit_logs table
- **Role removal**: Verify no active sessions before removal
- **Database migrations**: Test RLS policies after role enum changes

## Support Contacts
- **Primary Contact**: Security Administrator
- **Escalation Contact**: Chief Information Security Officer
- **Technical Support**: System Administrator

## Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-09 | System | Initial contract for user_roles table |
