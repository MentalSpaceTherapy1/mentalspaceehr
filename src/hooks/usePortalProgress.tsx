import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/lib/logger';

export interface ProgressTrackerEntry {
  id: string;
  entryDate: string;
  entryTime?: string;
  data: any;
  notes?: string;
  createdAt: string;
}

export interface ProgressTracker {
  id: string;
  clientId: string;
  trackerType: 'Symptom Tracker' | 'Mood Log' | 'Homework Assignment' | 'Journal' | 'Goal Progress' | 'Custom';
  trackerTitle: string;
  assignedBy: string;
  assignedByName?: string;
  assignedDate: string;
  frequency: 'Daily' | 'Weekly' | 'Biweekly' | 'Monthly' | 'As Needed';
  symptoms?: Array<{
    symptomName: string;
    ratingScale: string;
  }>;
  entries: ProgressTrackerEntry[];
  visibleToClient: boolean;
  sharedWithClinician: boolean;
  status: 'Active' | 'Paused' | 'Completed';
  chartType?: 'Line Graph' | 'Bar Chart' | 'Trend Line';
  chartData?: any;
  createdAt: string;
  updatedAt: string;
}

export const usePortalProgress = (clientId?: string) => {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState<ProgressTracker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchTrackers();
  }, [user, clientId]);

  const fetchTrackers = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('progress_trackers')
        .select(`
          *,
          progress_tracker_entries (
            id,
            entry_date,
            entry_time,
            data,
            notes,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedTrackers: ProgressTracker[] = data.map((tracker: any) => ({
        id: tracker.id,
        clientId: tracker.client_id,
        trackerType: tracker.tracker_type,
        trackerTitle: tracker.tracker_title,
        assignedBy: tracker.assigned_by,
        assignedDate: tracker.assigned_date,
        frequency: tracker.frequency,
        symptoms: tracker.symptoms,
        entries: (tracker.progress_tracker_entries || []).map((entry: any) => ({
          id: entry.id,
          entryDate: entry.entry_date,
          entryTime: entry.entry_time,
          data: entry.data,
          notes: entry.notes,
          createdAt: entry.created_at,
        })),
        visibleToClient: tracker.visible_to_client,
        sharedWithClinician: tracker.shared_with_clinician,
        status: tracker.status,
        chartType: tracker.chart_type,
        chartData: tracker.chart_data,
        createdAt: tracker.created_at,
        updatedAt: tracker.updated_at,
      }));

      setTrackers(mappedTrackers);
    } catch (error) {
      logger.error('Failed to fetch progress trackers', { context: 'usePortalProgress' });
    } finally {
      setLoading(false);
    }
  };

  const addEntry = async (trackerId: string, entryData: {
    entryDate: string;
    entryTime?: string;
    data: any;
    notes?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('progress_tracker_entries')
        .insert({
          tracker_id: trackerId,
          entry_date: entryData.entryDate,
          entry_time: entryData.entryTime,
          data: entryData.data,
          notes: entryData.notes,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchTrackers();
      return data;
    } catch (error) {
      logger.error('Failed to add progress tracker entry', { context: 'usePortalProgress' });
      throw error;
    }
  };

  const updateEntry = async (entryId: string, entryData: {
    data?: any;
    notes?: string;
  }) => {
    try {
      const { error } = await supabase
        .from('progress_tracker_entries')
        .update(entryData)
        .eq('id', entryId);

      if (error) throw error;

      await fetchTrackers();
    } catch (error) {
      logger.error('Failed to update progress tracker entry', { context: 'usePortalProgress' });
      throw error;
    }
  };

  return {
    trackers,
    loading,
    addEntry,
    updateEntry,
    refreshTrackers: fetchTrackers,
  };
};
