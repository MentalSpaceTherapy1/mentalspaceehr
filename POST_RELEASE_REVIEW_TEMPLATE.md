# Post-Release Review Template

## Release Information
- **Release ID**: [e.g., v1.2.3]
- **Release Date**: [YYYY-MM-DD]
- **Release Manager**: [Name]
- **Review Date**: [YYYY-MM-DD]
- **Review Participants**: [List of attendees]

## Executive Summary
[Brief 2-3 sentence overview of the release outcome]

---

## Release Scope
### Features Delivered
| Feature | Owner | Status | Notes |
|---------|-------|--------|-------|
| [Feature name] | [Team/Person] | [Delivered/Delayed/Deferred] | [Brief note] |

### Database Changes
- [ ] Schema migrations: [Number of migrations]
- [ ] New tables: [List]
- [ ] Modified tables: [List]
- [ ] RLS policy updates: [Count]

### Edge Function Changes
- [ ] New functions: [List]
- [ ] Modified functions: [List]
- [ ] Deprecated functions: [List]

### Integration Changes
- [ ] API integrations added/modified: [List]
- [ ] Third-party service changes: [List]

---

## Release Metrics

### Deployment Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Deployment duration | < 30 min | [XX min] | ✅/⚠️/❌ |
| Rollback time (if needed) | < 10 min | [XX min or N/A] | ✅/⚠️/❌ |
| Pre-deployment checks passed | 100% | [XX%] | ✅/⚠️/❌ |
| Critical paths tested | 100% | [XX%] | ✅/⚠️/❌ |

### Stability Metrics (First 48 Hours)
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Uptime | > 99.9% | [XX%] | ✅/⚠️/❌ |
| Error rate | < 0.1% | [XX%] | ✅/⚠️/❌ |
| API response time (p95) | < 500ms | [XXXms] | ✅/⚠️/❌ |
| Database query time (p95) | < 200ms | [XXXms] | ✅/⚠️/❌ |
| Edge function failures | < 0.5% | [XX%] | ✅/⚠️/❌ |

### User Impact Metrics
| Metric | Pre-Release | Post-Release | Change |
|--------|-------------|--------------|--------|
| Daily active users | [XXX] | [XXX] | [+/-XX%] |
| User-reported issues | [XX] | [XX] | [+/-XX] |
| Support tickets | [XX] | [XX] | [+/-XX] |
| User satisfaction score | [X.X/5] | [X.X/5] | [+/-X.X] |

### Data Quality Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Critical data quality checks passed | 100% | [XX%] | ✅/⚠️/❌ |
| Data completeness | > 99% | [XX%] | ✅/⚠️/❌ |
| RLS policy violations | 0 | [XX] | ✅/⚠️/❌ |

### Security Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Security linter warnings | 0 | [XX] | ✅/⚠️/❌ |
| Failed authentication attempts | [Baseline] | [XX] | ✅/⚠️/❌ |
| Suspicious access patterns | 0 | [XX] | ✅/⚠️/❌ |

---

## What Went Well ✅

### Process
1. [Specific thing that worked well in the release process]
2. [Another success]
3. [Continue listing...]

### Technical
1. [Technical success - e.g., "Database migration completed smoothly"]
2. [Another technical success]
3. [Continue listing...]

### Team Collaboration
1. [Collaboration success]
2. [Another success]
3. [Continue listing...]

---

## What Didn't Go Well ❌

### Issues Encountered
| Issue | Severity | Impact | Time to Resolve | Owner |
|-------|----------|--------|-----------------|-------|
| [Issue description] | [Critical/High/Medium/Low] | [Description] | [XX min/hours] | [Name] |

### Root Causes
For each major issue, perform a 5-Whys analysis:

#### Issue: [Issue Name]
1. **Why did this happen?** [Answer]
2. **Why?** [Deeper cause]
3. **Why?** [Even deeper]
4. **Why?** [Root cause emerging]
5. **Why?** [Root cause identified]

**Root Cause**: [Final root cause statement]

---

## Action Items

### Immediate Actions (Within 1 Week)
| Action | Owner | Due Date | Priority | Status |
|--------|-------|----------|----------|--------|
| [Action item] | [Name] | [Date] | [Critical/High/Medium] | [Not Started/In Progress/Complete] |

### Short-term Actions (1-4 Weeks)
| Action | Owner | Due Date | Priority | Status |
|--------|-------|----------|----------|--------|
| [Action item] | [Name] | [Date] | [High/Medium] | [Not Started/In Progress/Complete] |

### Long-term Actions (1-3 Months)
| Action | Owner | Due Date | Priority | Status |
|--------|-------|----------|----------|--------|
| [Action item] | [Name] | [Date] | [Medium/Low] | [Not Started/In Progress/Complete] |

---

## Lessons Learned

### For Future Releases
1. **[Category - e.g., Testing]**: [Specific lesson learned]
   - **Action**: [What we'll do differently]

2. **[Category]**: [Lesson learned]
   - **Action**: [What we'll do differently]

3. **[Category]**: [Lesson learned]
   - **Action**: [What we'll do differently]

### Documentation Updates Needed
- [ ] Update deployment runbook with: [Specific addition]
- [ ] Update rollback playbook with: [Specific addition]
- [ ] Update integration runbook for: [Service name]
- [ ] Add new data contract for: [Table name]
- [ ] Update RACI matrix for: [Module name]

### Process Improvements
1. **[Process area]**: [Improvement needed]
   - **Expected benefit**: [How this will help]
   - **Owner**: [Name]

2. **[Process area]**: [Improvement needed]
   - **Expected benefit**: [How this will help]
   - **Owner**: [Name]

---

## Stakeholder Communication

### Internal Communication
- [ ] Engineering team notified of lessons learned
- [ ] Operations team updated on new monitoring requirements
- [ ] Security team informed of any incidents
- [ ] Leadership briefed on release outcome

### External Communication
- [ ] Users notified of new features (if applicable)
- [ ] Known issues published to status page
- [ ] Documentation updated for public features

---

## Compliance & Risk Assessment

### Compliance Items
- [ ] HIPAA audit trail verified for all PHI access
- [ ] Data contracts validated for critical tables
- [ ] RLS policies reviewed and confirmed
- [ ] Backup and recovery tested post-deployment

### Risk Mitigation
| Identified Risk | Likelihood | Impact | Mitigation Status |
|----------------|------------|--------|-------------------|
| [Risk description] | [High/Medium/Low] | [High/Medium/Low] | [Mitigated/In Progress/Accepted] |

---

## Technical Debt

### Debt Introduced
| Item | Justification | Planned Resolution | Priority |
|------|---------------|-------------------|----------|
| [Technical debt item] | [Why it was necessary] | [When/how to fix] | [High/Medium/Low] |

### Debt Resolved
| Item | Resolution | Benefit |
|------|-----------|---------|
| [Technical debt item] | [How it was resolved] | [Impact of resolution] |

---

## Success Criteria Assessment

### Pre-defined Success Criteria
| Criterion | Target | Actual | Met? |
|-----------|--------|--------|------|
| [Success criterion] | [Target value] | [Actual value] | ✅/❌ |

### Overall Release Assessment
**Rating**: [Success / Partial Success / Needs Improvement / Failure]

**Justification**: 
[Detailed explanation of the overall assessment, considering all metrics, issues, and outcomes]

---

## Follow-up Review Schedule

- **1-Week Check-in**: [Date] - Review immediate action items
- **1-Month Review**: [Date] - Assess long-term stability and user feedback
- **Quarterly Review**: [Date] - Evaluate if lessons learned were applied

---

## Appendices

### A. Detailed Metrics Graphs
[Link to dashboard or attach screenshots]

### B. Incident Reports
[Links to any incident reports filed during/after release]

### C. User Feedback Summary
[Summary of user feedback received post-release]

### D. Performance Benchmarks
[Detailed performance data and comparisons]

---

## Approvals

- **Release Manager**: _________________ Date: _______
- **Engineering Lead**: _________________ Date: _______
- **Operations Lead**: _________________ Date: _______
- **Product Owner**: _________________ Date: _______

---

## Notes
[Any additional notes or context that doesn't fit in other sections]
