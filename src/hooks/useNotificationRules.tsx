import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface NotificationRule {
  id: string;
  rule_name: string;
  rule_type: string;
  is_active: boolean;
  trigger_event: string;
  conditions: any;
  recipient_type: string;
  recipients: string[];
  timing_type: string;
  timing_offset?: number;
  message_template: string;
  message_subject?: string;
  send_once: boolean;
  send_repeatedly: boolean;
  repeat_interval?: number;
  max_repeats?: number;
  created_date: string;
  created_by?: string;
  updated_at: string;
  last_executed_at?: string;
  execution_count: number;
}

export const useNotificationRules = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .order('created_date', { ascending: false });

      if (error) throw error;

      setRules(data || []);
    } catch (error) {
      logger.error('Failed to fetch notification rules', { context: 'useNotificationRules' });
      toast.error('Failed to load notification rules');
    } finally {
      setLoading(false);
    }
  };

  const createRule = async (rule: Omit<NotificationRule, 'id' | 'created_date' | 'created_by' | 'updated_at' | 'last_executed_at' | 'execution_count'>) => {
    try {
      const { data, error } = await supabase
        .from('notification_rules')
        .insert({
          ...rule,
          execution_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Notification rule created');
      await fetchRules();
      return data;
    } catch (error) {
      logger.error('Failed to create notification rule', { context: 'useNotificationRules' });
      toast.error('Failed to create notification rule');
      throw error;
    }
  };

  const updateRule = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Notification rule updated');
      await fetchRules();
    } catch (error) {
      logger.error('Failed to update notification rule', { context: 'useNotificationRules' });
      toast.error('Failed to update notification rule');
      throw error;
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Notification rule deleted');
      await fetchRules();
    } catch (error) {
      logger.error('Failed to delete notification rule', { context: 'useNotificationRules' });
      toast.error('Failed to delete notification rule');
      throw error;
    }
  };

  const toggleRuleActive = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Notification rule ${is_active ? 'activated' : 'deactivated'}`);
      await fetchRules();
    } catch (error) {
      logger.error('Failed to toggle notification rule', { context: 'useNotificationRules' });
      toast.error('Failed to update notification rule');
      throw error;
    }
  };

  const triggerRule = async (triggerEvent: string, entityId: string, entityData: any) => {
    try {
      const { error } = await supabase.functions.invoke('process-notification-rules', {
        body: {
          trigger_event: triggerEvent,
          entity_id: entityId,
          entity_data: entityData,
        },
      });

      if (error) throw error;

      logger.info('Notification rules triggered', { 
        context: 'useNotificationRules',
        triggerEvent,
        entityId,
      });
    } catch (error) {
      logger.error('Failed to trigger notification rules', { 
        context: 'useNotificationRules',
        error,
      });
      // Don't show toast error to avoid disrupting user flow
    }
  };

  return {
    rules,
    loading,
    fetchRules,
    createRule,
    updateRule,
    deleteRule,
    toggleRuleActive,
    triggerRule,
  };
};