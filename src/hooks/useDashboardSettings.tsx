import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardWidgetSettings {
  [widgetName: string]: boolean;
}

export interface DashboardSettings {
  administrator?: { widgets: DashboardWidgetSettings };
  therapist?: { widgets: DashboardWidgetSettings };
  associate_trainee?: { widgets: DashboardWidgetSettings };
  supervisor?: { widgets: DashboardWidgetSettings };
  billing_staff?: { widgets: DashboardWidgetSettings };
  front_desk?: { widgets: DashboardWidgetSettings };
}

export const useDashboardSettings = (role?: string) => {
  const [settings, setSettings] = useState<DashboardWidgetSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('practice_settings')
          .select('dashboard_settings')
          .maybeSingle();

        if (error) throw error;

        if (data?.dashboard_settings && role) {
          const roleSettings = (data.dashboard_settings as DashboardSettings)[role];
          setSettings(roleSettings?.widgets || {});
        }
      } catch (error) {
        console.error('Error fetching dashboard settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (role) {
      fetchSettings();
    }
  }, [role]);

  const isWidgetEnabled = (widgetName: string): boolean => {
    return settings[widgetName] !== false; // Default to true if not set
  };

  return { settings, loading, isWidgetEnabled };
};
