import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePortalMessages } from '@/hooks/usePortalMessages';
import { useStaffMessages } from '@/hooks/useStaffMessages';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Filter,
  CheckCircle2,
  Circle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ClientMessagesSectionProps {
  clientId: string;
}

export const ClientMessagesSection = ({ clientId }: ClientMessagesSectionProps) => {
  const { user } = useAuth();
  const { messages: portalMessages, loading: portalLoading, sendMessage: sendPortalMessage, markAsRead: markPortalAsRead } = usePortalMessages(clientId);
  const { messages: staffMessages, loading: staffLoading, sendMessage: sendStaffMessage, markAsRead: markStaffAsRead } = useStaffMessages();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'requires-response'>('all');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeType, setComposeType] = useState<'portal' | 'staff'>('portal');
  const [newMessage, setNewMessage] = useState({
    subject: '',
    message: '',
    priority: 'Normal' as 'Normal' | 'Urgent',
    requiresResponse: false
  });

  // Filter messages based on search and status
  const filterMessages = (messages: any[]) => {
    let filtered = messages;

    if (searchTerm) {
      filtered = filtered.filter(msg => 
        msg.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus === 'unread') {
      filtered = filtered.filter(msg => !msg.readByRecipient && !msg.isRead);
    } else if (filterStatus === 'requires-response') {
      filtered = filtered.filter(msg => msg.requiresResponse && !msg.respondedTo);
    }

    return filtered;
  };

  const filteredPortalMessages = filterMessages(portalMessages);
  const filteredStaffMessages = filterMessages(staffMessages.filter(msg => msg.clientId === clientId));

  const handleSendMessage = async () => {
    if (!newMessage.subject || !newMessage.message) {
      toast.error('Please fill in subject and message');
      return;
    }

    try {
      if (composeType === 'portal') {
        await sendPortalMessage({
          clientId,
          clinicianId: user?.id || '',
          subject: newMessage.subject,
          message: newMessage.message,
          priority: newMessage.priority,
          requiresResponse: newMessage.requiresResponse
        });
        toast.success('Portal message sent');
      } else {
        await sendStaffMessage({
          clientId,
          subject: newMessage.subject,
          message: newMessage.message,
          priority: newMessage.priority,
          requiresResponse: newMessage.requiresResponse
        });
        toast.success('Staff message sent');
      }
      
      setNewMessage({ subject: '', message: '', priority: 'Normal', requiresResponse: false });
      setIsComposeOpen(false);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleMarkAsRead = async (messageId: string, type: 'portal' | 'staff') => {
    try {
      if (type === 'portal') {
        await markPortalAsRead(messageId);
      } else {
        await markStaffAsRead(messageId);
      }
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const renderMessage = (msg: any, type: 'portal' | 'staff') => {
    const isUnread = type === 'portal' ? !msg.readByRecipient : !msg.isRead;
    
    return (
      <Card 
        key={msg.id} 
        className={`mb-3 cursor-pointer hover:border-primary/50 transition-colors ${isUnread ? 'border-primary/30 bg-primary/5' : ''}`}
        onClick={() => isUnread && handleMarkAsRead(msg.id, type)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {isUnread ? (
                <Circle className="h-4 w-4 fill-primary text-primary" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="text-base">{msg.subject}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  From: {msg.fromUserName || msg.senderName} • {format(new Date(msg.sentDate || msg.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {msg.priority === 'Urgent' && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Urgent
                </Badge>
              )}
              {msg.requiresResponse && !msg.respondedTo && (
                <Badge variant="secondary">Requires Response</Badge>
              )}
              {msg.respondedTo && (
                <Badge variant="outline">Responded</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Compose Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose New Message</DialogTitle>
                <DialogDescription>
                  Send a message to the client via portal or to staff members
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Message Type</label>
                  <Select value={composeType} onValueChange={(value: 'portal' | 'staff') => setComposeType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portal">Portal Message (Client)</SelectItem>
                      <SelectItem value="staff">Staff Message (Internal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Subject</label>
                  <Input 
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    placeholder="Enter subject"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea 
                    value={newMessage.message}
                    onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                    placeholder="Enter your message"
                    rows={6}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Priority</label>
                    <Select 
                      value={newMessage.priority} 
                      onValueChange={(value: 'Normal' | 'Urgent') => setNewMessage({ ...newMessage, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input 
                      type="checkbox" 
                      id="requiresResponse"
                      checked={newMessage.requiresResponse}
                      onChange={(e) => setNewMessage({ ...newMessage, requiresResponse: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label htmlFor="requiresResponse" className="text-sm">Requires Response</label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="requires-response">Requires Response</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Message Tabs */}
          <Tabs defaultValue="portal" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="portal" className="flex-1">
                Portal Messages
                {filteredPortalMessages.filter(m => !m.readByRecipient).length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {filteredPortalMessages.filter(m => !m.readByRecipient).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex-1">
                Staff Messages
                {filteredStaffMessages.filter(m => !m.isRead).length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {filteredStaffMessages.filter(m => !m.isRead).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="portal">
              <ScrollArea className="h-[600px] pr-4">
                {portalLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading messages...</p>
                ) : filteredPortalMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No portal messages found</p>
                ) : (
                  filteredPortalMessages.map(msg => renderMessage(msg, 'portal'))
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="staff">
              <ScrollArea className="h-[600px] pr-4">
                {staffLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading messages...</p>
                ) : filteredStaffMessages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No staff messages found</p>
                ) : (
                  filteredStaffMessages.map(msg => renderMessage(msg, 'staff'))
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};
