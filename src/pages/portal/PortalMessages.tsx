import { useState } from 'react';
import { PortalLayout } from '@/components/portal/PortalLayout';
import { usePortalMessages } from '@/hooks/usePortalMessages';
import { usePortalAccount } from '@/hooks/usePortalAccount';
import { ComposeMessageDialog } from '@/components/portal/ComposeMessageDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, MailOpen, Send, Reply, AlertCircle, Paperclip, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function PortalMessages() {
  const { portalContext } = usePortalAccount();
  const { messages, loading, markAsRead } = usePortalMessages(portalContext?.client?.id);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);

  const unreadMessages = messages.filter(msg => !msg.readByRecipient);
  const urgentMessages = messages.filter(msg => msg.priority === 'Urgent');

  const handleMessageClick = async (messageId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(messageId);
    }
  };

  const handleReply = (message: any) => {
    setReplyTo({
      recipientId: message.clinicianId,
      recipientName: message.senderName,
      subject: message.subject,
      originalMessage: message.message,
      threadId: message.threadId
    });
    setComposeOpen(true);
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">Secure messaging with your care team</p>
          </div>
          <Button onClick={() => { setReplyTo(null); setComposeOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Message
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messages.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <MailOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadMessages.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent Messages</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{urgentMessages.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Messages List */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Messages</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadMessages.length})</TabsTrigger>
            <TabsTrigger value="urgent">Urgent ({urgentMessages.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Messages</CardTitle>
                <CardDescription>Your message history with your care team</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <Card 
                          key={message.id}
                          className={`cursor-pointer transition-colors hover:bg-accent ${!message.readByRecipient ? 'border-primary' : ''}`}
                          onClick={() => handleMessageClick(message.id, message.readByRecipient)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">{message.subject}</CardTitle>
                                  {!message.readByRecipient && (
                                    <Badge variant="default" className="text-xs">New</Badge>
                                  )}
                                  {message.priority === 'Urgent' && (
                                    <Badge variant="destructive" className="text-xs">Urgent</Badge>
                                  )}
                                  {message.requiresResponse && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Reply className="h-3 w-3 mr-1" />
                                      Response Needed
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription>
                                  From {message.fromUserType} • {format(new Date(message.sentDate), 'MMM dd, yyyy h:mm a')}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                                {message.attachments.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                    <Paperclip className="h-4 w-4" />
                                    <span>{message.attachments.length} attachment(s)</span>
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReply(message);
                                }}
                              >
                                <Reply className="h-4 w-4 mr-2" />
                                Reply
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unread" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Unread Messages</CardTitle>
                <CardDescription>Messages you haven't read yet</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {unreadMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MailOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No unread messages</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {unreadMessages.map((message) => (
                        <Card 
                          key={message.id}
                          className="cursor-pointer transition-colors hover:bg-accent border-primary"
                          onClick={() => handleMessageClick(message.id, message.readByRecipient)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">{message.subject}</CardTitle>
                                  <Badge variant="default" className="text-xs">New</Badge>
                                  {message.priority === 'Urgent' && (
                                    <Badge variant="destructive" className="text-xs">Urgent</Badge>
                                  )}
                                </div>
                                <CardDescription>
                                  From {message.fromUserType} • {format(new Date(message.sentDate), 'MMM dd, yyyy h:mm a')}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="urgent" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Urgent Messages</CardTitle>
                <CardDescription>Messages marked as urgent by your care team</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {urgentMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No urgent messages</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {urgentMessages.map((message) => (
                        <Card 
                          key={message.id}
                          className="cursor-pointer transition-colors hover:bg-accent border-destructive"
                          onClick={() => handleMessageClick(message.id, message.readByRecipient)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-base">{message.subject}</CardTitle>
                                  {!message.readByRecipient && (
                                    <Badge variant="default" className="text-xs">New</Badge>
                                  )}
                                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                                </div>
                                <CardDescription>
                                  From {message.fromUserType} • {format(new Date(message.sentDate), 'MMM dd, yyyy h:mm a')}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ComposeMessageDialog 
        open={composeOpen} 
        onOpenChange={(open) => {
          setComposeOpen(open);
          if (!open) setReplyTo(null);
        }}
        replyTo={replyTo}
      />
    </PortalLayout>
  );
}
