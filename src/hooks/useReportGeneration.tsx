import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReportData {
  summary?: Array<{ label: string; value: string | number; change?: string }>;
  insights?: string[];
  chartData?: {
    bar?: { title: string; data: Array<{ name: string; value: number }> };
    pie?: { title: string; data: Array<{ name: string; value: number }> };
    line?: { title: string; data: Array<{ name: string; value: number }> };
  };
  tableData?: any[];
}

export function useReportGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const generateCaseloadReport = async () => {
    setIsLoading(true);
    try {
      // Fetch active clients per clinician
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, status, primary_therapist_id, psychiatrist_id, case_manager_id, registration_date, discharge_date');

      if (error) throw error;

      // Process data
      const activeClients = clients.filter(c => c.status === 'Active');
      const clinicianCounts = new Map<string, number>();
      
      activeClients.forEach(client => {
        if (client.primary_therapist_id) {
          clinicianCounts.set(
            client.primary_therapist_id,
            (clinicianCounts.get(client.primary_therapist_id) || 0) + 1
          );
        }
      });

      // Get clinician names
      const clinicianIds = Array.from(clinicianCounts.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', clinicianIds);

      const chartData = Array.from(clinicianCounts.entries()).map(([id, count]) => {
        const profile = profiles?.find(p => p.id === id);
        return {
          name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
          value: count
        };
      });

      // Calculate date ranges
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const newClientsThisMonth = clients.filter(c => 
        new Date(c.registration_date) >= thisMonth
      ).length;

      const dischargesThisMonth = clients.filter(c => 
        c.discharge_date && new Date(c.discharge_date) >= thisMonth
      ).length;

      setReportData({
        summary: [
          { label: 'Total Active Clients', value: activeClients.length },
          { label: 'Total Clinicians', value: clinicianCounts.size },
          { label: 'New Clients This Month', value: newClientsThisMonth },
          { label: 'Discharges This Month', value: dischargesThisMonth },
        ],
        insights: [
          `Average caseload per clinician: ${(activeClients.length / Math.max(clinicianCounts.size, 1)).toFixed(1)} clients`,
          `${newClientsThisMonth} new client${newClientsThisMonth !== 1 ? 's' : ''} added this month`,
          `${dischargesThisMonth} discharge${dischargesThisMonth !== 1 ? 's' : ''} completed this month`,
        ],
        chartData: {
          bar: {
            title: 'Active Clients per Clinician',
            data: chartData.slice(0, 10)
          }
        },
        tableData: chartData.map(item => ({
          'Clinician': item.name,
          'Active Clients': item.value
        }))
      });
    } catch (error: any) {
      console.error('Error generating caseload report:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateDiagnosisReport = async () => {
    setIsLoading(true);
    try {
      // Fetch all appointments with diagnosis codes
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('icd_codes')
        .not('icd_codes', 'is', null);

      if (error) throw error;

      // Count diagnosis codes
      const diagnosisCounts = new Map<string, number>();
      appointments.forEach(apt => {
        if (apt.icd_codes && Array.isArray(apt.icd_codes)) {
          apt.icd_codes.forEach((code: string) => {
            diagnosisCounts.set(code, (diagnosisCounts.get(code) || 0) + 1);
          });
        }
      });

      // Sort and get top 10
      const sortedDiagnoses = Array.from(diagnosisCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const chartData = sortedDiagnoses.map(([code, count]) => ({
        name: code,
        value: count
      }));

      setReportData({
        summary: [
          { label: 'Total Unique Diagnoses', value: diagnosisCounts.size },
          { label: 'Total Diagnosed Appointments', value: appointments.length },
          { label: 'Most Common', value: sortedDiagnoses[0]?.[0] || 'N/A' },
          { label: 'Frequency', value: sortedDiagnoses[0]?.[1] || 0 },
        ],
        insights: [
          `${diagnosisCounts.size} unique diagnosis codes recorded`,
          `Top diagnosis: ${sortedDiagnoses[0]?.[0]} (${sortedDiagnoses[0]?.[1]} cases)`,
          `${appointments.length} appointments with diagnosis codes`,
        ],
        chartData: {
          bar: {
            title: 'Top 10 Diagnoses',
            data: chartData
          },
          pie: {
            title: 'Diagnosis Distribution (Top 5)',
            data: chartData.slice(0, 5)
          }
        },
        tableData: sortedDiagnoses.map(([code, count]) => ({
          'Diagnosis Code': code,
          'Count': count,
          'Percentage': `${((count / appointments.length) * 100).toFixed(1)}%`
        }))
      });
    } catch (error: any) {
      console.error('Error generating diagnosis report:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRevenueReport = async () => {
    setIsLoading(true);
    try {
      // Fetch charge entries
      const { data: charges, error } = await supabase
        .from('charge_entries')
        .select('charge_amount, payment_amount, adjustment_amount, service_date, charge_status');

      if (error) throw error;

      const totalCharges = charges.reduce((sum, c) => sum + Number(c.charge_amount || 0), 0);
      const totalPayments = charges.reduce((sum, c) => sum + Number(c.payment_amount || 0), 0);
      const totalAdjustments = charges.reduce((sum, c) => sum + Number(c.adjustment_amount || 0), 0);
      const netCollections = totalPayments - totalAdjustments;

      // Group by month
      const monthlyData = new Map<string, { charges: number; payments: number }>();
      charges.forEach(charge => {
        const month = new Date(charge.service_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        const existing = monthlyData.get(month) || { charges: 0, payments: 0 };
        monthlyData.set(month, {
          charges: existing.charges + Number(charge.charge_amount || 0),
          payments: existing.payments + Number(charge.payment_amount || 0)
        });
      });

      const chartData = Array.from(monthlyData.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .slice(-12)
        .map(([month, data]) => ({
          name: month,
          value: data.payments
        }));

      setReportData({
        summary: [
          { label: 'Gross Charges', value: `$${totalCharges.toFixed(2)}` },
          { label: 'Total Payments', value: `$${totalPayments.toFixed(2)}` },
          { label: 'Adjustments', value: `$${totalAdjustments.toFixed(2)}` },
          { label: 'Net Collections', value: `$${netCollections.toFixed(2)}` },
        ],
        insights: [
          `Collection rate: ${((totalPayments / Math.max(totalCharges, 1)) * 100).toFixed(1)}%`,
          `Average charge amount: $${(totalCharges / Math.max(charges.length, 1)).toFixed(2)}`,
          `Total transactions: ${charges.length}`,
        ],
        chartData: {
          line: {
            title: 'Monthly Revenue Trend',
            data: chartData
          }
        },
        tableData: Array.from(monthlyData.entries()).map(([month, data]) => ({
          'Month': month,
          'Gross Charges': `$${data.charges.toFixed(2)}`,
          'Payments': `$${data.payments.toFixed(2)}`
        }))
      });
    } catch (error: any) {
      console.error('Error generating revenue report:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAppointmentReport = async () => {
    setIsLoading(true);
    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('status, appointment_type, appointment_date');

      if (error) throw error;

      const totalAppointments = appointments.length;
      const statusCounts = new Map<string, number>();
      const typeCounts = new Map<string, number>();

      appointments.forEach(apt => {
        statusCounts.set(apt.status, (statusCounts.get(apt.status) || 0) + 1);
        typeCounts.set(apt.appointment_type, (typeCounts.get(apt.appointment_type) || 0) + 1);
      });

      const noShowCount = statusCounts.get('No Show') || 0;
      const cancelledCount = statusCounts.get('Cancelled') || 0;
      const completedCount = statusCounts.get('Completed') || 0;

      const noShowRate = ((noShowCount / Math.max(totalAppointments, 1)) * 100).toFixed(1);
      const cancellationRate = ((cancelledCount / Math.max(totalAppointments, 1)) * 100).toFixed(1);

      setReportData({
        summary: [
          { label: 'Total Appointments', value: totalAppointments },
          { label: 'Completed', value: completedCount },
          { label: 'No-Show Rate', value: `${noShowRate}%` },
          { label: 'Cancellation Rate', value: `${cancellationRate}%` },
        ],
        insights: [
          `${noShowRate}% no-show rate across all appointments`,
          `${cancellationRate}% cancellation rate`,
          `Most common appointment type: ${Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]}`,
        ],
        chartData: {
          pie: {
            title: 'Appointment Status Distribution',
            data: Array.from(statusCounts.entries()).map(([status, count]) => ({
              name: status,
              value: count
            }))
          },
          bar: {
            title: 'Appointment Types',
            data: Array.from(typeCounts.entries()).map(([type, count]) => ({
              name: type,
              value: count
            }))
          }
        },
        tableData: Array.from(statusCounts.entries()).map(([status, count]) => ({
          'Status': status,
          'Count': count,
          'Percentage': `${((count / totalAppointments) * 100).toFixed(1)}%`
        }))
      });
    } catch (error: any) {
      console.error('Error generating appointment report:', error);
      toast.error('Failed to generate report: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async (reportName: string) => {
    setReportData(null);
    
    switch (reportName) {
      case 'Caseload Report':
        await generateCaseloadReport();
        break;
      case 'Diagnosis Report':
        await generateDiagnosisReport();
        break;
      case 'Revenue Report':
        await generateRevenueReport();
        break;
      case 'Appointment Report':
        await generateAppointmentReport();
        break;
      default:
        toast.info('This report type is not yet implemented');
        setIsLoading(false);
    }
  };

  return {
    generateReport,
    reportData,
    isLoading,
    clearReportData: () => setReportData(null)
  };
}
