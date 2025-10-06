import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useStaffMessages } from '@/hooks/useStaffMessages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, MailOpen, AlertCircle, Reply, User, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export default function StaffMessages() {
  const { messages, loading, unreadCount, markAsRead, sendMessage } = useStaffMessages();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyPriority, setReplyPriority] = useState('normal');

  const unreadMessages = messages.filter(msg => !msg.isRead && msg.senderType === 'Client');
  const urgentMessages = messages.filter(msg => msg.priority === 'urgent');
  const requiresResponseMessages = messages.filter(msg => msg.requiresResponse && !msg.respondedTo);

  const handleMessageClick = async (message: any) => {
    setSelectedMessage(message);
    if (!message.isRead && message.senderType === 'Client') {
      await markAsRead(message.id);
    }
  };

  const handleReply = (message: any) => {
    setReplySubject(`Re: ${message.subject}`);
    setReplyContent('');
    setReplyPriority('normal');
    setReplyOpen(true);
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendMessage({
        clientId: selectedMessage.clientId,
        subject: replySubject,
        message: replyContent,
        priority: replyPriority,
        threadId: selectedMessage.threadId || selectedMessage.id,
      });

      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });

      setReplyOpen(false);
      setReplyContent('');
      setSelectedMessage(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Client Messages</h1>
          <p className="text-muted-foreground">View and respond to client messages</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <MailOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{urgentMessages.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Response</CardTitle>
              <Reply className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requiresResponseMessages.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Messages List */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Message List */}
          <Card className="h-[700px]">
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Click a message to view details</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="w-full">
                  <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                  <TabsTrigger value="unread" className="flex-1">
                    Unread {unreadCount > 0 && `(${unreadCount})`}
                  </TabsTrigger>
                  <TabsTrigger value="urgent" className="flex-1">Urgent</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <ScrollArea className="h-[550px]">
                    <div className="space-y-2">
                      {messages.map((message) => (
                        <Card
                          key={message.id}
                          className={`cursor-pointer transition-colors hover:bg-accent ${
                            selectedMessage?.id === message.id ? 'border-primary bg-accent' : ''
                          } ${!message.isRead && message.senderType === 'Client' ? 'border-primary' : ''}`}
                          onClick={() => handleMessageClick(message)}
                        >
                          <CardHeader className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium truncate">{message.clientName}</span>
                                  {!message.isRead && message.senderType === 'Client' && (
                                    <Badge variant="default" className="text-xs shrink-0">New</Badge>
                                  )}
                                  {message.priority === 'urgent' && (
                                    <Badge variant="destructive" className="text-xs shrink-0">Urgent</Badge>
                                  )}
                                </div>
                                <p className="text-sm font-semibold truncate">{message.subject}</p>
                                <p className="text-xs text-muted-foreground truncate">{message.message}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(message.sentDate), 'MMM dd, h:mm a')}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                      {messages.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No messages</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="unread" className="mt-4">
                  <ScrollArea className="h-[550px]">
                    <div className="space-y-2">
                      {unreadMessages.map((message) => (
                        <Card
                          key={message.id}
                          className={`cursor-pointer transition-colors hover:bg-accent border-primary ${
                            selectedMessage?.id === message.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleMessageClick(message)}
                        >
                          <CardHeader className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium truncate">{message.clientName}</span>
                                  <Badge variant="default" className="text-xs shrink-0">New</Badge>
                                </div>
                                <p className="text-sm font-semibold truncate">{message.subject}</p>
                                <p className="text-xs text-muted-foreground truncate">{message.message}</p>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                      {unreadMessages.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <MailOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No unread messages</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="urgent" className="mt-4">
                  <ScrollArea className="h-[550px]">
                    <div className="space-y-2">
                      {urgentMessages.map((message) => (
                        <Card
                          key={message.id}
                          className={`cursor-pointer transition-colors hover:bg-accent border-destructive ${
                            selectedMessage?.id === message.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => handleMessageClick(message)}
                        >
                          <CardHeader className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-sm font-medium truncate">{message.clientName}</span>
                                  <Badge variant="destructive" className="text-xs shrink-0">Urgent</Badge>
                                </div>
                                <p className="text-sm font-semibold truncate">{message.subject}</p>
                                <p className="text-xs text-muted-foreground truncate">{message.message}</p>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                      {urgentMessages.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No urgent messages</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Message Details */}
          <Card className="h-[700px]">
            <CardHeader>
              <CardTitle>Message Details</CardTitle>
              <CardDescription>View and respond to selected message</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedMessage ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{selectedMessage.clientName}</span>
                      </div>
                      {selectedMessage.priority === 'urgent' && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedMessage.sentDate), 'MMMM dd, yyyy • h:mm a')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{selectedMessage.subject}</h3>
                  </div>

                  <ScrollArea className="h-[400px] border rounded-md p-4">
                    <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                  </ScrollArea>

                  <Button onClick={() => handleReply(selectedMessage)} className="w-full">
                    <Reply className="h-4 w-4 mr-2" />
                    Reply to Client
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a message to view details</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reply Dialog */}
      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Client</DialogTitle>
            <DialogDescription>
              Send a reply to {selectedMessage?.clientName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reply-subject">Subject</Label>
              <Input
                id="reply-subject"
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply-priority">Priority</Label>
              <Select value={replyPriority} onValueChange={setReplyPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reply-message">Message</Label>
              <Textarea
                id="reply-message"
                rows={8}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReplyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendReply}>
                Send Reply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
