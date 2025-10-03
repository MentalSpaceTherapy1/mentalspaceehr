-- Add schedule_settings column to practice_settings table
ALTER TABLE practice_settings
ADD COLUMN IF NOT EXISTS schedule_settings JSONB DEFAULT '{
  "time_slot_interval": 15,
  "buffer_time": 0,
  "max_advance_booking_days": 90,
  "min_advance_booking_hours": 24,
  "allow_same_day_booking": false,
  "allow_online_booking": false,
  "cancellation_notice_hours": 24,
  "no_show_fee_enabled": false,
  "no_show_fee_amount": 0,
  "late_cancellation_fee_enabled": false,
  "late_cancellation_fee_amount": 0,
  "enable_waitlist": true,
  "send_appointment_reminders": true,
  "reminder_hours_before": [24, 2],
  "allow_recurring_appointments": true,
  "max_recurring_instances": 52
}'::jsonb;