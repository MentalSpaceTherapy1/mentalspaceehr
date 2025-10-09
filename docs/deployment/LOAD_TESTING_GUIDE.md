# Load Testing Guide

## Overview
This guide provides comprehensive procedures for load testing the mental health EHR system before production deployment.

## Prerequisites
- Access to staging environment
- Load testing tools installed (k6, Artillery, or Apache JMeter)
- Test user accounts with various roles
- Sample data in staging database

---

## Test Categories

### 1. Authentication Load Test
**Objective**: Verify authentication system can handle concurrent logins

**Test Scenarios**:
- 100 concurrent user logins
- 500 concurrent user logins (peak load)
- 1000 concurrent user logins (stress test)

**Expected Results**:
- Response time < 2 seconds for 95% of requests
- No authentication failures
- No database connection pool exhaustion

**Sample k6 Script**:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
};

export default function() {
  const loginData = {
    email: `testuser${__VU}@example.com`,
    password: 'TestPassword123!',
  };

  const res = http.post('https://your-app.lovable.app/api/login', JSON.stringify(loginData));
  
  check(res, {
    'login successful': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);
}
```

---

### 2. Chart Notes Load Test
**Objective**: Test clinical documentation system under load

**Test Scenarios**:
- 50 clinicians creating notes simultaneously
- 100 concurrent chart note queries
- Mixed read/write operations (70% read, 30% write)

**Expected Results**:
- Note creation time < 3 seconds
- Query response time < 1 second
- No data consistency issues

**Critical Metrics**:
- Database CPU usage < 80%
- Connection pool utilization < 90%
- Error rate < 0.1%

---

### 3. Appointment Scheduling Load Test
**Objective**: Verify appointment system handles concurrent bookings

**Test Scenarios**:
- 200 concurrent appointment queries
- 50 concurrent appointment bookings
- Conflict resolution under load

**Expected Results**:
- No double-booking conflicts
- Calendar queries < 500ms
- Booking confirmation < 2 seconds

**Test Data Requirements**:
- 20+ clinicians with varied schedules
- 200+ available appointment slots
- Mix of appointment types

---

### 4. Document Upload Load Test
**Objective**: Test file storage system capacity

**Test Scenarios**:
- 20 concurrent uploads (1-5 MB files)
- 50 concurrent document retrievals
- Mixed operations (upload + download)

**Expected Results**:
- Upload time < 5 seconds per MB
- Download time < 2 seconds
- No storage quota exceeded errors

---

### 5. Assessment Administration Load Test
**Objective**: Verify assessment system performance

**Test Scenarios**:
- 100 concurrent assessment completions
- 50 concurrent score calculations
- Critical alert processing under load

**Expected Results**:
- Assessment completion < 100ms per item
- Score calculation < 500ms
- Critical alerts processed within 1 second

---

### 6. Telehealth Session Load Test
**Objective**: Test video session infrastructure

**Test Scenarios**:
- 25 concurrent video sessions
- 50 concurrent waiting room entries
- Session join/leave cycling

**Expected Results**:
- Session join time < 3 seconds
- No dropped connections
- Audio/video quality maintained

---

## Performance Benchmarks

### Response Time Targets
| Operation | Target | Max Acceptable |
|-----------|--------|----------------|
| Page Load | < 2s | 3s |
| API Call | < 500ms | 1s |
| Database Query | < 100ms | 500ms |
| File Upload (1MB) | < 3s | 5s |
| Report Generation | < 5s | 10s |

### Throughput Targets
| Metric | Target |
|--------|--------|
| Concurrent Users | 500 |
| Requests/Second | 1000 |
| Database Connections | 200 |
| Storage I/O | 50 MB/s |

### Resource Utilization Limits
| Resource | Warning Threshold | Critical Threshold |
|----------|-------------------|-------------------|
| CPU Usage | 70% | 85% |
| Memory Usage | 75% | 90% |
| Database CPU | 60% | 80% |
| Connection Pool | 80% | 95% |

---

## Load Testing Execution Plan

### Phase 1: Baseline Testing (Week 1)
1. Run each test scenario at 25% target load
2. Establish baseline metrics
3. Identify initial bottlenecks
4. Document baseline performance

### Phase 2: Target Load Testing (Week 2)
1. Increase to 100% target load
2. Monitor all performance metrics
3. Verify all acceptance criteria met
4. Document any degradation

### Phase 3: Stress Testing (Week 3)
1. Increase to 150% target load
2. Identify breaking points
3. Test failure recovery
4. Document system limits

### Phase 4: Endurance Testing (Week 4)
1. Run at 100% load for 24 hours
2. Monitor for memory leaks
3. Check for performance degradation
4. Verify system stability

---

## Monitoring During Tests

### Key Metrics to Track
1. **Application Metrics**:
   - Response times (p50, p95, p99)
   - Error rates
   - Request throughput
   - Active sessions

2. **Database Metrics**:
   - Query execution time
   - Connection pool usage
   - Lock contention
   - Replication lag

3. **System Metrics**:
   - CPU utilization
   - Memory usage
   - Network I/O
   - Disk I/O

4. **Edge Function Metrics**:
   - Invocation count
   - Execution time
   - Error rate
   - Cold start frequency

---

## Issue Resolution Process

### When Performance Issues Arise:
1. **Identify**: Use monitoring to pinpoint bottleneck
2. **Isolate**: Reproduce issue in controlled environment
3. **Analyze**: Review logs, metrics, and traces
4. **Resolve**: Implement fix (cache, index, optimize query)
5. **Verify**: Re-run load test to confirm resolution
6. **Document**: Record issue and solution

### Common Issues and Solutions:
| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| Slow queries | Missing indexes | Add database indexes |
| High CPU | Inefficient code | Optimize algorithms |
| Memory leaks | Unclosed connections | Fix resource cleanup |
| Timeout errors | Long-running ops | Add caching/pagination |

---

## Sign-Off Criteria

Before production deployment, confirm:
- [ ] All load tests pass at target load
- [ ] No critical performance issues
- [ ] Resource utilization within limits
- [ ] Error rates below 0.1%
- [ ] Recovery procedures tested
- [ ] Monitoring alerts configured
- [ ] Capacity planning documented
- [ ] Stakeholder approval obtained

---

## Post-Production Monitoring

### First 24 Hours:
- Monitor all metrics every hour
- Be prepared for immediate rollback
- Have on-call team available
- Review error logs continuously

### First Week:
- Daily performance reviews
- User feedback collection
- Gradual load increase
- Fine-tune configurations

### Ongoing:
- Weekly performance reports
- Monthly capacity planning reviews
- Quarterly load test execution
- Continuous optimization

---

**Last Updated**: 2025-10-09  
**Prepared By**: DevOps Team  
**Version**: 1.0
