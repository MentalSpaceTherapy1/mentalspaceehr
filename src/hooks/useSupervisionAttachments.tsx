import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SupervisionAttachment {
  id: string;
  session_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
  description: string | null;
}

export const useSupervisionAttachments = (sessionId?: string) => {
  const [attachments, setAttachments] = useState<SupervisionAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId) {
      setAttachments([]);
      return;
    }

    const fetchAttachments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('supervision_session_attachments')
          .select('*')
          .eq('session_id', sessionId)
          .order('uploaded_at', { ascending: false });

        if (error) throw error;
        setAttachments(data || []);
      } catch (err) {
        console.error('Error fetching attachments:', err);
        toast({
          title: "Error",
          description: "Failed to load attachments",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAttachments();

    const channel = supabase
      .channel(`attachments_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'supervision_session_attachments',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchAttachments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, toast]);

  const uploadFile = async (file: File, sessionId: string, description?: string) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${sessionId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('supervision-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('supervision_session_attachments')
        .insert({
          session_id: sessionId,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
          description: description || null,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      return true;
    } catch (err) {
      console.error('Error uploading file:', err);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachmentId: string, filePath: string) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('supervision-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('supervision_session_attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });

      return true;
    } catch (err) {
      console.error('Error deleting attachment:', err);
      toast({
        title: "Error",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
      return false;
    }
  };

  const downloadAttachment = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('supervision-documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error('Error downloading attachment:', err);
      toast({
        title: "Error",
        description: "Failed to download attachment",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    attachments,
    loading,
    uploading,
    uploadFile,
    deleteAttachment,
    downloadAttachment,
  };
};
