import { useNavigate } from 'react-router-dom';
import { usePortalNotifications } from '@/hooks/usePortalNotifications';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MessageSquare, 
  FileText, 
  Bell as BellIcon,
  BookOpen,
  File,
  AlertCircle,
  CheckCheck,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

interface NotificationPanelProps {
  onClose: () => void;
}

export const NotificationPanel = ({ onClose }: NotificationPanelProps) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = usePortalNotifications();

  const recentNotifications = notifications?.slice(0, 10) || [];

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, any> = {
      appointment: Calendar,
      message: MessageSquare,
      form: FileText,
      resource: BookOpen,
      document: File,
      reminder: BellIcon,
      alert: AlertCircle,
      billing: FileText,
      system: BellIcon,
    };
    const Icon = icons[type] || BellIcon;
    return <Icon className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string): 'default' | 'secondary' | 'destructive' => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive'> = {
      low: 'secondary',
      normal: 'default',
      high: 'default',
      urgent: 'destructive',
    };
    return colors[priority] || 'default';
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b">
        <h3 className="font-semibold">Notifications</h3>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <ScrollArea className="h-[400px]">
        {recentNotifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <BellIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className={`rounded-full p-2 shrink-0 ${
                    !notification.isRead ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    {getNotificationIcon(notification.notificationType)}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-none">
                        {notification.title}
                      </p>
                      {notification.priority !== 'normal' && (
                        <Badge 
                          variant={getPriorityColor(notification.priority)}
                          className="shrink-0"
                        >
                          {notification.priority}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notification.createdAt), 'MMM dd, h:mm a')}
                        </p>
                        {notification.actionUrl && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            {notification.actionLabel || 'View'} 
                            <ExternalLink className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {recentNotifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                navigate('/portal/notifications');
                onClose();
              }}
            >
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
