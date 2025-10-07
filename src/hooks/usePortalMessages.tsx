import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
}

export interface PortalMessage {
  id: string;
  threadId?: string;
  fromUserId: string;
  fromUserName: string;
  fromUserType: 'Client' | 'Clinician' | 'Staff';
  toUserId: string;
  clientId: string;
  subject: string;
  message: string;
  attachments: MessageAttachment[];
  status: 'Draft' | 'Sent' | 'Read' | 'Archived';
  sentDate: string;
  readDate?: string;
  readByRecipient: boolean;
  priority: 'Normal' | 'Urgent';
  requiresResponse: boolean;
  respondedTo: boolean;
  responseMessageId?: string;
  addedToChart: boolean;
  chartNoteId?: string;
  createdAt: string;
  updatedAt: string;
}

export const usePortalMessages = (clientId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchMessages();
  }, [user, clientId]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('client_portal_messages')
        .select(`
          *,
          message_attachments (
            id,
            file_name,
            file_size,
            file_type,
            file_url
          )
        `)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedMessages: PortalMessage[] = data.map((msg: any) => ({
        id: msg.id,
        threadId: msg.thread_id,
        fromUserId: msg.sender_id,
        fromUserName: '', // Will be populated from profiles
        fromUserType: msg.sender_id === msg.clinician_id ? 'Clinician' : 'Client',
        toUserId: msg.sender_id === msg.clinician_id ? msg.client_id : msg.clinician_id,
        clientId: msg.client_id,
        subject: msg.subject,
        message: msg.message,
        attachments: (msg.message_attachments || []).map((att: any) => ({
          id: att.id,
          fileName: att.file_name,
          fileSize: att.file_size,
          fileType: att.file_type,
          fileUrl: att.file_url,
        })),
        status: msg.status,
        sentDate: msg.sent_date || msg.created_at,
        readDate: msg.read_at,
        readByRecipient: msg.is_read,
        priority: msg.priority,
        requiresResponse: msg.requires_response || false,
        respondedTo: msg.responded_to || false,
        responseMessageId: msg.response_message_id,
        addedToChart: msg.added_to_chart || false,
        chartNoteId: msg.chart_note_id,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
      }));

      setMessages(mappedMessages);
    } catch (error) {
      logger.error('Failed to fetch portal messages', { context: 'usePortalMessages' });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (messageData: {
    clientId: string;
    clinicianId: string;
    subject: string;
    message: string;
    priority?: 'Normal' | 'Urgent';
    requiresResponse?: boolean;
    threadId?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('client_portal_messages')
        .insert({
          client_id: messageData.clientId,
          clinician_id: messageData.clinicianId,
          sender_id: user?.id,
          subject: messageData.subject,
          message: messageData.message,
          priority: (messageData.priority || 'Normal').toLowerCase(),
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
      logger.error('Failed to send portal message', { context: 'usePortalMessages' });
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
      logger.error('Failed to mark message as read', { context: 'usePortalMessages' });
      throw error;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    refreshMessages: fetchMessages,
  };
};
