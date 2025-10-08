import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface NotificationLog {
  id: string;
  rule_id?: string;
  recipient_id: string;
  recipient_type: string;
  recipient_email?: string;
  recipient_phone?: string;
  notification_type: string;
  message_content: string;
  message_subject?: string;
  sent_date: string;
  sent_successfully: boolean;
  error_message?: string;
  opened?: boolean;
  opened_date?: string;
  clicked?: boolean;
  clicked_date?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: any;
}

export const useNotificationLogs = (ruleId?: string) => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
  });

  useEffect(() => {
    fetchLogs();
  }, [ruleId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('notification_logs')
        .select('*')
        .order('sent_date', { ascending: false })
        .limit(100);

      if (ruleId) {
        query = query.eq('rule_id', ruleId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const successful = data?.filter(log => log.sent_successfully).length || 0;
      const failed = total - successful;
      const opened = data?.filter(log => log.opened).length || 0;
      const clicked = data?.filter(log => log.clicked).length || 0;

      setStats({ total, successful, failed, opened, clicked });
    } catch (error) {
      logger.error('Failed to fetch notification logs', { context: 'useNotificationLogs' });
      toast.error('Failed to load notification logs');
    } finally {
      setLoading(false);
    }
  };

  const markAsOpened = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('notification_logs')
        .update({
          opened: true,
          opened_date: new Date().toISOString(),
        })
        .eq('id', logId);

      if (error) throw error;

      await fetchLogs();
    } catch (error) {
      logger.error('Failed to mark notification as opened', { context: 'useNotificationLogs' });
    }
  };

  const markAsClicked = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('notification_logs')
        .update({
          clicked: true,
          clicked_date: new Date().toISOString(),
        })
        .eq('id', logId);

      if (error) throw error;

      await fetchLogs();
    } catch (error) {
      logger.error('Failed to mark notification as clicked', { context: 'useNotificationLogs' });
    }
  };

  return {
    logs,
    loading,
    stats,
    fetchLogs,
    markAsOpened,
    markAsClicked,
  };
};