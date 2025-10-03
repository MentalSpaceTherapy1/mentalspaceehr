import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface AppointmentParticipant {
  id: string;
  appointment_id: string;
  client_id: string;
  status: string;
  added_date: string;
  added_by?: string;
  notes?: string;
}

export const useGroupSessions = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const addParticipantsToAppointment = async (
    appointmentId: string,
    clientIds: string[]
  ) => {
    try {
      setLoading(true);

      const participants = clientIds.map(clientId => ({
        appointment_id: appointmentId,
        client_id: clientId,
        status: 'Confirmed',
        added_by: user?.id,
      }));

      const { error } = await supabase
        .from('appointment_participants')
        .insert(participants);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${clientIds.length} participants to group session`,
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add participants';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeParticipant = async (participantId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('appointment_participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Participant removed from group session",
      });

      return true;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to remove participant",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentParticipants = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointment_participants')
        .select(`
          *,
          client:clients(
            id,
            first_name,
            last_name,
            medical_record_number
          )
        `)
        .eq('appointment_id', appointmentId);

      if (error) throw error;
      return data as any[];
    } catch (err) {
      console.error('Error fetching participants:', err);
      return [];
    }
  };

  const updateParticipantStatus = async (
    participantId: string,
    status: string
  ) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('appointment_participants')
        .update({ status })
        .eq('id', participantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Participant status updated",
      });

      return true;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update participant status",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    addParticipantsToAppointment,
    removeParticipant,
    getAppointmentParticipants,
    updateParticipantStatus,
  };
};
