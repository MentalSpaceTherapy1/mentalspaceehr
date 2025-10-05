import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Mail, Search, Filter, Download, Clock, CheckCircle, AlertCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { NotificationLogItem } from "@/hooks/useNoteCosignatures";

interface DetailedNotificationLogProps {
  cosignatureId?: string;
}

interface NotificationWithDetails extends NotificationLogItem {
  cosignatureId?: string;
  clinicianName?: string;
  supervisorName?: string;
  clientName?: string;
}

export function DetailedNotificationLog({ cosignatureId }: DetailedNotificationLogProps) {
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchNotifications();
  }, [cosignatureId]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Fetch cosignatures with notification logs
      let query = supabase
        .from('note_cosignatures')
        .select('id, notification_log, clinician_id, supervisor_id')
        .order('created_date', { ascending: false });

      if (cosignatureId) {
        query = query.eq('id', cosignatureId);
      }

      const { data: cosignatures, error } = await query;

      if (error) throw error;

      // Fetch profile information for clinicians and supervisors
      const clinicianIds = [...new Set(cosignatures?.map(c => c.clinician_id) || [])];
      const supervisorIds = [...new Set(cosignatures?.map(c => c.supervisor_id) || [])];
      const allUserIds = [...new Set([...clinicianIds, ...supervisorIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', allUserIds);

      const profileMap = new Map(
        profiles?.map(p => [p.id, `${p.first_name} ${p.last_name}`]) || []
      );

      // Extract and flatten all notifications
      const allNotifications: NotificationWithDetails[] = [];

      for (const cosig of cosignatures || []) {
        const notifLog = Array.isArray(cosig.notification_log) ? cosig.notification_log : [];
        
        for (const notif of notifLog) {
          if (typeof notif === 'object' && notif !== null) {
            allNotifications.push({
              notificationDate: (notif as any).notificationDate || new Date().toISOString(),
              notificationType: (notif as any).notificationType || 'Unknown',
              recipient: (notif as any).recipient || 'Unknown',
              cosignatureId: cosig.id,
              clinicianName: profileMap.get(cosig.clinician_id) || 'Unknown',
              supervisorName: profileMap.get(cosig.supervisor_id) || 'Unknown',
            });
          }
        }
      }

      // Sort by date (newest first)
      allNotifications.sort((a, b) => 
        new Date(b.notificationDate).getTime() - new Date(a.notificationDate).getTime()
      );

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notification log');
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = !searchQuery || 
      n.clinicianName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.supervisorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.recipient.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || n.notificationType === typeFilter;

    return matchesSearch && matchesType;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'Submitted':
        return <Send className="h-4 w-4 text-blue-600" />;
      case 'Reminder':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'Overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'Cosigned':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Revisions Requested':
        return <Mail className="h-4 w-4 text-purple-600" />;
      default:
        return <Mail className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'Overdue':
        return 'destructive';
      case 'Reminder':
        return 'secondary';
      case 'Cosigned':
        return 'default';
      default:
        return 'outline';
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Type', 'Recipient', 'Clinician', 'Supervisor'],
      ...filteredNotifications.map(n => [
        format(new Date(n.notificationDate), 'yyyy-MM-dd HH:mm'),
        n.notificationType,
        n.recipient,
        n.clinicianName || '',
        n.supervisorName || '',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast.success('Notification log exported');
  };

  const notificationTypes = [
    'Submitted',
    'Reminder',
    'Overdue',
    'Cosigned',
    'Revisions Requested'
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Notification Log
            </CardTitle>
            <CardDescription>
              {cosignatureId ? 
                'Notifications for this cosignature' : 
                'All cosignature notifications'
              }
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by clinician, supervisor, or recipient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {notificationTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{notifications.length}</div>
              <p className="text-xs text-muted-foreground">Total Sent</p>
            </CardContent>
          </Card>
          {notificationTypes.slice(0, 4).map(type => (
            <Card key={type}>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {notifications.filter(n => n.notificationType === type).length}
                </div>
                <p className="text-xs text-muted-foreground">{type}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notifications Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notifications found</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Clinician</TableHead>
                  <TableHead>Supervisor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.map((notification, index) => (
                  <TableRow key={`${notification.cosignatureId}-${index}`}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(notification.notificationDate), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getNotificationIcon(notification.notificationType)}
                        <Badge variant={getNotificationBadgeVariant(notification.notificationType)}>
                          {notification.notificationType}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{notification.recipient}</TableCell>
                    <TableCell className="text-sm">{notification.clinicianName}</TableCell>
                    <TableCell className="text-sm">{notification.supervisorName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredNotifications.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredNotifications.length} of {notifications.length} notifications
          </p>
        )}
      </CardContent>
    </Card>
  );
}
