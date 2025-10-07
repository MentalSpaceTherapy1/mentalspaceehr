import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useCriticalAlerts = (clientId?: string) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlerts();
    setupRealtimeSubscription();
  }, [clientId]);

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from('assessment_critical_alerts')
        .select('*')
        .eq('alert_status', 'Active')
        .order('triggered_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading critical alerts',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('critical-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assessment_critical_alerts',
        },
        (payload) => {
          if (!clientId || payload.new.client_id === clientId) {
            setAlerts((prev) => [payload.new as any, ...prev]);
            toast({
              title: 'New Critical Alert',
              description: 'A critical assessment item has been triggered',
              variant: 'destructive',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const checkCriticalItems = async (administrationId: string) => {
    try {
      const { error } = await supabase.functions.invoke('check-critical-assessment-items', {
        body: { administrationId },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error checking critical items:', error);
    }
  };

  return {
    alerts,
    isLoading,
    checkCriticalItems,
    refresh: fetchAlerts,
  };
};
