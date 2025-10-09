# Rollback Playbook

## Purpose
This playbook provides step-by-step procedures for rolling back deployments when issues arise in production.

## When to Rollback

### Immediate Rollback (Critical)
Roll back immediately if you observe:
- **Data Loss or Corruption**: Any evidence of data being deleted, modified, or corrupted
- **Authentication Failures**: Users cannot log in or access their accounts
- **Complete System Outage**: Application is completely inaccessible
- **Security Breach**: Evidence of unauthorized access or data exposure
- **Critical Business Function Failure**: Core workflows are completely broken

### Urgent Rollback (High Priority)
Roll back within 15 minutes if:
- **Significant Performance Degradation**: >50% slower response times
- **High Error Rates**: >5% of requests failing
- **Major Feature Broken**: Key features are non-functional
- **Data Integrity Issues**: Reports of incorrect data being displayed

### Scheduled Rollback (Medium Priority)
Plan rollback within 1-2 hours if:
- **Minor Features Broken**: Non-critical features not working
- **UI/UX Issues**: Visual problems affecting user experience
- **Performance Issues**: Noticeable but not critical slowdown

## Rollback Decision Matrix

| Severity | User Impact | Rollback Time | Approval Required |
|----------|-------------|---------------|-------------------|
| Critical | >50% users  | Immediate     | Any Admin         |
| High     | 10-50% users| 15 minutes    | Senior Admin      |
| Medium   | <10% users  | 1-2 hours     | Team Discussion   |
| Low      | Minimal     | Next Deploy   | Standard Process  |

## Pre-Rollback Checklist

Before initiating rollback:

- [ ] **Document the Issue**
  - Screenshot error messages
  - Copy error logs
  - Note affected users/features
  - Record exact time issue started

- [ ] **Notify Stakeholders**
  - Alert admin team
  - Inform affected users (if time permits)
  - Update status page

- [ ] **Verify Rollback Target**
  - Confirm last known good version
  - Check rollback target is tested
  - Ensure rollback target is available

- [ ] **Backup Current State**
  - Create database snapshot (if applicable)
  - Save current deployment logs
  - Export any critical recent data

## Rollback Procedures

### Method 1: Automated Rollback Script (Recommended)

```bash
# Navigate to project directory
cd /path/to/mentalspace-ehrs

# Run the rollback script
./scripts/rollback.sh

# Follow the interactive prompts
# Option 1: Rollback to previous commit
# Option 2: Rollback to specific commit
# Option 3: Rollback to tagged version
```

The script will:
1. Create a backup branch
2. Revert to specified version
3. Reinstall dependencies
4. Run verification checks

### Method 2: Manual Git Rollback

```bash
# 1. Create backup branch
git branch backup-$(date +%Y%m%d-%H%M%S)

# 2. View recent commits
git log --oneline -10

# 3. Revert to specific commit
git reset --hard <commit-hash>

# 4. Force push (if already deployed)
git push origin main --force-with-lease

# 5. Reinstall dependencies
npm install

# 6. Rebuild application
npm run build
```

### Method 3: Lovable Version History

1. Open the Lovable editor
2. Click on the **History** tab (top of chat)
3. Find the last working version
4. Click **Restore** on that version
5. Wait for restoration to complete
6. Test the application

### Method 4: GitHub Tag/Release Rollback

```bash
# 1. List available tags
git tag -l

# 2. Checkout specific tag
git checkout tags/<tag-name>

# 3. Create new branch from tag
git checkout -b rollback-to-<tag-name>

# 4. Push to main (or create PR)
git push origin rollback-to-<tag-name>
```

## Database Rollback Considerations

### Important: Database migrations cannot be automatically rolled back!

If the deployment included database changes:

1. **Check Migration Status**
   ```sql
   SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;
   ```

2. **Manual Migration Rollback** (if needed)
   - Review the migration file
   - Create a reverse migration
   - Test in staging first
   - Apply manually if critical

3. **Data Preservation**
   - Never delete data during rollback
   - Mark records as inactive instead
   - Keep audit trail of changes

### Database Rollback Decision Tree

```
Is there a database migration in this deploy?
├─ No → Proceed with code rollback
└─ Yes
   ├─ Is it backwards compatible?
   │  ├─ Yes → Proceed with code rollback
   │  └─ No → Manual intervention required
   │
   └─ Does it include data changes?
      ├─ No → Consider forward fix
      └─ Yes → Consult database specialist
```

## Post-Rollback Procedures

### Immediate (0-5 minutes)

1. **Verify Rollback Success**
   - [ ] Application is accessible
   - [ ] Users can log in
   - [ ] Core features working
   - [ ] No new errors in logs

2. **Monitor Key Metrics**
   - [ ] Response times normal
   - [ ] Error rate <1%
   - [ ] Database connections stable
   - [ ] No unusual traffic patterns

3. **Notify Users**
   - [ ] Update status page: "Issue Resolved"
   - [ ] Send notification to affected users
   - [ ] Post in admin chat

### Short-term (1-24 hours)

1. **Root Cause Analysis**
   - Document what went wrong
   - Identify why it wasn't caught in testing
   - Determine preventive measures

2. **Plan Forward**
   - Create fix for the original issue
   - Enhanced testing procedures
   - Schedule fix deployment

3. **Update Documentation**
   - Add issue to known issues log
   - Update rollback playbook if needed
   - Document lessons learned

### Long-term (1-7 days)

1. **Conduct Retrospective**
   - What went well?
   - What could be improved?
   - What will we do differently?

2. **Implement Improvements**
   - Add automated tests for the issue
   - Improve monitoring/alerting
   - Update deployment checklist

3. **Close Out**
   - Archive incident report
   - Share learnings with team
   - Update metrics/KPIs

## Common Rollback Scenarios

### Scenario 1: Broken Authentication

**Symptoms**: Users cannot log in

**Quick Fix**:
```bash
# Rollback to previous version
./scripts/rollback.sh

# Check Supabase auth status
# Verify RLS policies unchanged
# Test login with test account
```

**Prevention**: Always test auth flows before deployment

### Scenario 2: Performance Degradation

**Symptoms**: Slow page loads, timeouts

**Quick Fix**:
```bash
# Check if database migration caused issue
# Rollback code first
./scripts/rollback.sh

# Monitor database performance
# Check for missing indexes
```

**Prevention**: Load testing, database query optimization

### Scenario 3: Data Display Issues

**Symptoms**: Incorrect data showing, missing information

**Quick Fix**:
```bash
# If display only (no data corruption)
# Rollback UI changes
./scripts/rollback.sh

# If data corruption suspected
# STOP - consult database specialist
# Do not modify data
```

**Prevention**: Comprehensive data validation, staging environment testing

### Scenario 4: Integration Failure

**Symptoms**: External service calls failing

**Quick Fix**:
```bash
# Rollback integration code
./scripts/rollback.sh

# Verify API keys/credentials
# Check external service status
# Test integration in isolation
```

**Prevention**: Mock external services, fallback handling

## Emergency Contacts

### Rollback Authority
- **Primary**: System Administrator
- **Secondary**: Senior Developer
- **Emergency**: Any Administrator (for critical issues)

### Technical Contacts
- **Database Issues**: Database Administrator
- **Infrastructure**: DevOps Lead
- **Security Issues**: Security Officer

### Communication Channels
- **Emergency**: Admin team chat
- **Status Updates**: Status page dashboard
- **User Communication**: Email notification system

## Rollback Success Criteria

A rollback is successful when:

✅ Application is fully functional
✅ No critical errors in logs (last 15 min)
✅ Response times within normal range
✅ Users can complete core workflows
✅ Database integrity maintained
✅ No security vulnerabilities introduced
✅ Monitoring shows normal metrics

## Testing After Rollback

### Critical Path Testing (5 minutes)
- [ ] User login/logout
- [ ] View client list
- [ ] Open client chart
- [ ] Create/view appointment
- [ ] Access admin functions

### Extended Testing (15 minutes)
- [ ] Create clinical note
- [ ] Portal access (client view)
- [ ] Billing operations
- [ ] Document upload
- [ ] Search functionality

### Full Regression (30+ minutes)
- [ ] Run automated test suite
- [ ] Manual testing of all features
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Integration points

## Prevention Strategies

### Pre-Deployment
1. **Comprehensive Testing**
   - Run pre-deployment check script
   - Execute smoke tests
   - Verify in staging environment

2. **Code Review**
   - Peer review all changes
   - Security review for sensitive changes
   - Database migration review

3. **Gradual Rollout**
   - Deploy to staging first
   - Canary deployment when possible
   - Monitor closely post-deployment

### Monitoring
1. **Real-time Alerts**
   - Error rate thresholds
   - Performance degradation
   - Failed authentication attempts

2. **Health Checks**
   - Automated endpoint monitoring
   - Database connection checks
   - External service availability

3. **User Impact Tracking**
   - Failed request counts
   - User session duration
   - Feature usage patterns

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-09 | 1.0 | Initial rollback playbook | System |

---

**Remember**: When in doubt, rollback. It's better to revert and fix than to leave broken code in production.
