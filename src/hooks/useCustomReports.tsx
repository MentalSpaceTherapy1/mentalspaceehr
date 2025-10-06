import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not equals' | 'contains' | 'greater than' | 'less than' | 'between';
  value: any;
}

export interface ReportColumn {
  field: string;
  label: string;
  dataType: 'string' | 'number' | 'date' | 'currency' | 'percentage';
  sortable: boolean;
  format?: string;
}

export interface ReportAggregation {
  field: string;
  function: 'sum' | 'average' | 'count' | 'min' | 'max';
}

export interface CustomReport {
  id: string;
  report_name: string;
  report_category: 'Clinical' | 'Financial' | 'Operational' | 'Compliance' | 'Custom';
  created_by: string;
  created_date: string;
  data_source: string;
  filters: ReportFilter[];
  date_range_type: string;
  custom_date_range?: { startDate: string; endDate: string };
  columns: ReportColumn[];
  group_by?: string[];
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  aggregations?: ReportAggregation[];
  include_chart: boolean;
  chart_type?: 'bar' | 'line' | 'pie' | 'table';
  is_shared: boolean;
  shared_with?: string[];
  is_scheduled: boolean;
  schedule_frequency?: 'Daily' | 'Weekly' | 'Monthly';
  schedule_day_of_week?: string;
  schedule_time?: string;
  send_to?: string[];
  last_run_date?: string;
  last_run_by?: string;
  updated_at: string;
}

export function useCustomReports(category?: string) {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['custom-reports', category],
    queryFn: async () => {
      let query = supabase
        .from('custom_reports')
        .select('*')
        .order('created_date', { ascending: false });

      if (category) {
        query = query.eq('report_category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        filters: d.filters as unknown as ReportFilter[],
        columns: d.columns as unknown as ReportColumn[],
        group_by: d.group_by as unknown as string[],
        aggregations: d.aggregations as unknown as ReportAggregation[],
        shared_with: d.shared_with as unknown as string[],
        send_to: d.send_to as unknown as string[],
        custom_date_range: d.custom_date_range as any
      })) as CustomReport[];
    },
  });

  const createReport = useMutation({
    mutationFn: async (report: Omit<CustomReport, 'id' | 'created_date' | 'created_by' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('custom_reports')
        .insert([{
          ...report,
          filters: report.filters as any,
          columns: report.columns as any,
          group_by: report.group_by as any,
          aggregations: report.aggregations as any,
          shared_with: report.shared_with as any,
          send_to: report.send_to as any,
          custom_date_range: report.custom_date_range as any,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      toast.success('Report created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create report: ' + error.message);
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomReport> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updateData.filters) updateData.filters = updateData.filters as any;
      if (updateData.columns) updateData.columns = updateData.columns as any;
      if (updateData.group_by) updateData.group_by = updateData.group_by as any;
      if (updateData.aggregations) updateData.aggregations = updateData.aggregations as any;
      if (updateData.shared_with) updateData.shared_with = updateData.shared_with as any;
      if (updateData.send_to) updateData.send_to = updateData.send_to as any;
      if (updateData.custom_date_range) updateData.custom_date_range = updateData.custom_date_range as any;

      const { data, error } = await supabase
        .from('custom_reports')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      toast.success('Report updated successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to update report: ' + error.message);
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      toast.success('Report deleted successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to delete report: ' + error.message);
    },
  });

  return {
    reports,
    isLoading,
    createReport: createReport.mutate,
    updateReport: updateReport.mutate,
    deleteReport: deleteReport.mutate,
    isCreating: createReport.isPending,
    isUpdating: updateReport.isPending,
    isDeleting: deleteReport.isPending,
  };
}
