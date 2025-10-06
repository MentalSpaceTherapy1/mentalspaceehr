import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCurrentUserRoles } from './useUserRoles';
import { isAdmin } from '@/lib/roleUtils';

export interface StaffMessage {
  id: string;
  threadId?: string;
  clientId: string;
  clientName: string;
  clinicianId: string;
  clinicianName: string;
  senderId: string;
  senderName: string;
  senderType: 'Client' | 'Clinician';
  subject: string;
  message: string;
  status: string;
  sentDate: string;
  readAt?: string;
  isRead: boolean;
  priority: string;
  requiresResponse: boolean;
  respondedTo: boolean;
  createdAt: string;
}

export const useStaffMessages = () => {
  const { user } = useAuth();
  const { roles } = useCurrentUserRoles();
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('staff_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_portal_messages',
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMessages = async () => {
    try {
      setLoading(true);

      // Build query based on user role
      let query = supabase
        .from('client_portal_messages')
        .select(`
          *,
          client:clients!client_portal_messages_client_id_fkey (
            id,
            first_name,
            last_name
          ),
          clinician:profiles!client_portal_messages_clinician_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      // If not admin, only show messages for clinician's assigned clients
      if (!isAdmin(roles)) {
        query = query.eq('clinician_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedMessages: StaffMessage[] = (data || []).map((msg: any) => {
        const clientName = msg.client 
          ? `${msg.client.first_name} ${msg.client.last_name}`
          : 'Unknown Client';
        const clinicianName = msg.clinician
          ? `${msg.clinician.first_name} ${msg.clinician.last_name}`
          : 'Unknown Clinician';
        const senderType = msg.sender_id === msg.client_id ? 'Client' : 'Clinician';
        const senderName = senderType === 'Client' ? clientName : clinicianName;

        return {
          id: msg.id,
          threadId: msg.thread_id,
          clientId: msg.client_id,
          clientName,
          clinicianId: msg.clinician_id,
          clinicianName,
          senderId: msg.sender_id,
          senderName,
          senderType,
          subject: msg.subject,
          message: msg.message,
          status: msg.status,
          sentDate: msg.sent_date || msg.created_at,
          readAt: msg.read_at,
          isRead: msg.is_read || false,
          priority: msg.priority || 'normal',
          requiresResponse: msg.requires_response || false,
          respondedTo: msg.responded_to || false,
          createdAt: msg.created_at,
        };
      });

      setMessages(mappedMessages);
      
      // Calculate unread count (messages sent by clients that haven't been read)
      const unread = mappedMessages.filter(
        m => m.senderType === 'Client' && !m.isRead
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching staff messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageData: {
    clientId: string;
    subject: string;
    message: string;
    priority?: string;
    requiresResponse?: boolean;
    threadId?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('client_portal_messages')
        .insert({
          client_id: messageData.clientId,
          clinician_id: user?.id,
          sender_id: user?.id,
          subject: messageData.subject,
          message: messageData.message,
          priority: messageData.priority || 'normal',
          requires_response: messageData.requiresResponse || false,
          thread_id: messageData.threadId,
          status: 'Sent',
          sent_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await fetchMessages();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('client_portal_messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      await fetchMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  };

  return {
    messages,
    loading,
    unreadCount,
    sendMessage,
    markAsRead,
    refreshMessages: fetchMessages,
  };
};
