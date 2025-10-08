import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ScheduleException {
  id: string;
  clinicianId: string;
  exceptionType: 'Time Off' | 'Holiday' | 'Conference' | 'Training' | 'Modified Hours' | 'Emergency' | 'Other';
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  reason: string;
  notes?: string;
  status: 'Requested' | 'Approved' | 'Denied';
  approvedBy?: string;
  approvalDate?: string;
  denialReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export const useScheduleExceptions = (clinicianId?: string) => {
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchExceptions = async (id?: string) => {
    const targetId = id || clinicianId;
    if (!targetId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('schedule_exceptions')
        .select('*')
        .eq('clinician_id', targetId)
        .order('start_date', { ascending: false });

      if (fetchError) throw fetchError;

      setExceptions(
        (data || []).map((item) => ({
          id: item.id,
          clinicianId: item.clinician_id,
          exceptionType: item.exception_type as ScheduleException['exceptionType'],
          startDate: item.start_date,
          endDate: item.end_date,
          startTime: item.start_time,
          endTime: item.end_time,
          allDay: item.all_day,
          reason: item.reason,
          notes: item.notes,
          status: item.status as ScheduleException['status'],
          approvedBy: item.approved_by,
          approvalDate: item.approval_date,
          denialReason: item.denial_reason,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          createdBy: item.created_by,
        }))
      );
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast({
        title: 'Error fetching exceptions',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createException = async (exceptionData: Omit<ScheduleException, 'id' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error: insertError } = await supabase
        .from('schedule_exceptions')
        .insert({
          clinician_id: exceptionData.clinicianId,
          exception_type: exceptionData.exceptionType,
          start_date: exceptionData.startDate,
          end_date: exceptionData.endDate,
          start_time: exceptionData.startTime,
          end_time: exceptionData.endTime,
          all_day: exceptionData.allDay,
          reason: exceptionData.reason,
          notes: exceptionData.notes,
          status: exceptionData.status,
          created_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send notification for approval
      try {
        await supabase.functions.invoke('send-schedule-exception-notification', {
          body: {
            exceptionId: data.id,
            clinicianId: exceptionData.clinicianId,
            exceptionType: exceptionData.exceptionType,
            startDate: exceptionData.startDate,
            endDate: exceptionData.endDate,
            reason: exceptionData.reason
          }
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the exception creation if notification fails
      }

      toast({
        title: 'Success',
        description: 'Exception created and submitted for approval',
      });

      await fetchExceptions();
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Error creating exception',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateException = async (id: string, updates: Partial<ScheduleException>) => {
    setLoading(true);
    try {
      const payload: any = {};
      
      if (updates.exceptionType) payload.exception_type = updates.exceptionType;
      if (updates.startDate) payload.start_date = updates.startDate;
      if (updates.endDate) payload.end_date = updates.endDate;
      if (updates.startTime !== undefined) payload.start_time = updates.startTime;
      if (updates.endTime !== undefined) payload.end_time = updates.endTime;
      if (updates.allDay !== undefined) payload.all_day = updates.allDay;
      if (updates.reason) payload.reason = updates.reason;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.status) payload.status = updates.status;
      if (updates.approvedBy) payload.approved_by = updates.approvedBy;
      if (updates.approvalDate) payload.approval_date = updates.approvalDate;
      if (updates.denialReason) payload.denial_reason = updates.denialReason;

      const { error: updateError } = await supabase
        .from('schedule_exceptions')
        .update(payload)
        .eq('id', id);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Exception updated successfully',
      });

      await fetchExceptions();
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Error updating exception',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const approveException = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await updateException(id, {
      status: 'Approved',
      approvedBy: user?.id,
      approvalDate: new Date().toISOString(),
    });
  };

  const denyException = async (id: string, reason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await updateException(id, {
      status: 'Denied',
      approvedBy: user?.id,
      approvalDate: new Date().toISOString(),
      denialReason: reason,
    });
  };

  const deleteException = async (id: string) => {
    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('schedule_exceptions')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Success',
        description: 'Exception deleted successfully',
      });

      await fetchExceptions();
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Error deleting exception',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clinicianId) {
      fetchExceptions();
    }
  }, [clinicianId]);

  return {
    exceptions,
    loading,
    error,
    fetchExceptions,
    createException,
    updateException,
    approveException,
    denyException,
    deleteException,
    refreshExceptions: fetchExceptions,
  };
};
