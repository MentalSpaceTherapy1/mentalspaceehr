-- Add dashboard_settings column to practice_settings table
ALTER TABLE public.practice_settings
ADD COLUMN dashboard_settings jsonb DEFAULT '{
  "administrator": {
    "widgets": {
      "system_health": true,
      "active_users": true,
      "pending_approvals": true,
      "compliance_alerts": true,
      "financial_summary": true,
      "recent_activity": true,
      "quick_actions": true
    }
  },
  "therapist": {
    "widgets": {
      "todays_sessions": true,
      "pending_notes": true,
      "active_clients": true,
      "compliance": true,
      "schedule": true,
      "tasks": true,
      "productivity": true,
      "recent_activity": true,
      "quick_actions": true
    }
  },
  "associate_trainee": {
    "widgets": {
      "todays_sessions": true,
      "pending_notes": true,
      "active_clients": true,
      "compliance": true,
      "schedule": true,
      "tasks": true,
      "productivity": true,
      "recent_activity": true,
      "quick_actions": true
    }
  },
  "supervisor": {
    "widgets": {
      "supervisees": true,
      "pending_cosigns": true,
      "supervision_hours": true,
      "compliance_issues": true,
      "supervisee_list": true,
      "pending_notes": true,
      "supervision_summary": true,
      "compliance_status": true,
      "upcoming_meetings": true,
      "quick_actions": true
    }
  },
  "billing_staff": {
    "widgets": {
      "revenue_today": true,
      "pending_claims": true,
      "outstanding_balance": true,
      "collection_rate": true,
      "claims_status": true,
      "revenue_summary": true,
      "insurance_verification": true,
      "client_balances": true,
      "quick_actions": true
    }
  },
  "front_desk": {
    "widgets": {
      "todays_appointments": true,
      "checkins": true,
      "waiting": true,
      "messages": true,
      "schedule": true,
      "pending_tasks": true,
      "checkin_queue": true,
      "quick_actions": true
    }
  }
}'::jsonb;