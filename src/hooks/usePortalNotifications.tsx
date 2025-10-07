import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAccount } from './usePortalAccount';
import { toast } from 'sonner';

export interface PortalNotification {
  id: string;
  clientId: string;
  notificationType: 'appointment' | 'message' | 'document' | 'billing' | 'system' | 'form' | 'resource' | 'reminder' | 'alert';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export const usePortalNotifications = () => {
  const { portalContext } = usePortalAccount();
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (portalContext?.client.id) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [portalContext?.client.id]);

  const fetchNotifications = async () => {
    if (!portalContext?.client.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('portal_notifications')
        .select('*')
        .eq('client_id', portalContext.client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedNotifications = (data || []).map(mapNotification);
      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter(n => !n.isRead).length);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!portalContext?.client.id) return;

    const channel = supabase
      .channel('portal-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portal_notifications',
          filter: `client_id=eq.${portalContext.client.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('portal_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      await fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const markAllAsRead = async () => {
    if (!portalContext?.client.id) return;

    try {
      const { error } = await supabase
        .from('portal_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('client_id', portalContext.client.id)
        .eq('is_read', false);

      if (error) throw error;

      toast.success('All notifications marked as read');
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('portal_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      toast.success('Notification archived');
      await fetchNotifications();
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    refreshNotifications: fetchNotifications
  };
};

function mapNotification(data: any): PortalNotification {
  return {
    id: data.id,
    clientId: data.client_id,
    notificationType: data.notification_type,
    title: data.title,
    message: data.message,
    actionUrl: data.action_url,
    actionLabel: data.action_label,
    priority: data.priority,
    isRead: data.is_read,
    readAt: data.read_at ? new Date(data.read_at) : undefined,
    createdAt: new Date(data.created_at),
    metadata: data.metadata || {},
  };
}
