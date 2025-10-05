import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CalendarIcon, Download, CheckCircle, XCircle, AlertTriangle, ClipboardCheck, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface IncidentToBillingRecord {
  id: string;
  note_id: string;
  client_id: string;
  session_id: string;
  supervising_provider_id: string;
  rendering_provider_id: string;
  billing_compliant: boolean;
  compliance_check_date: string;
  documentation_complete: boolean;
  created_at: string;
  client?: {
    first_name: string;
    last_name: string;
    medical_record_number: string;
  };
  supervisor?: {
    first_name: string;
    last_name: string;
  };
  supervisee?: {
    first_name: string;
    last_name: string;
  };
  clinical_note?: {
    note_type: string;
    date_of_service: string;
  };
}

export function IncidentToBillingReport() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<IncidentToBillingRecord[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [supervisorFilter, setSupervisorFilter] = useState<string>("all");
  const [complianceFilter, setComplianceFilter] = useState<string>("all");
  const [supervisors, setSupervisors] = useState<any[]>([]);

  useEffect(() => {
    loadSupervisors();
  }, []);

  const loadSupervisors = async () => {
    try {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'supervisor');

      if (!roles || roles.length === 0) return;

      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      setSupervisors(profiles || []);
    } catch (error) {
      console.error('Error loading supervisors:', error);
    }
  };

  const loadRecords = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select date range");
      return;
    }

    setLoading(true);
    try {
      // Fetch incident-to billing records
      const { data: billingData, error: billingError } = await supabase
        .from('incident_to_billing')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (billingError) throw billingError;

      // Fetch related data separately
      const recordsWithData = await Promise.all(
        (billingData || []).map(async (record) => {
          // Apply filters if needed
          if (supervisorFilter !== 'all' && record.supervising_provider_id !== supervisorFilter) {
            return null;
          }
          if (complianceFilter === 'compliant' && !record.billing_compliant) {
            return null;
          }
          if (complianceFilter === 'non_compliant' && record.billing_compliant) {
            return null;
          }

          const [clientData, supervisorData, superviseeData, noteData] = await Promise.all([
            supabase.from('clients').select('first_name, last_name, medical_record_number').eq('id', record.client_id).maybeSingle(),
            supabase.from('profiles').select('first_name, last_name').eq('id', record.supervising_provider_id).maybeSingle(),
            supabase.from('profiles').select('first_name, last_name').eq('id', record.rendering_provider_id).maybeSingle(),
            supabase.from('clinical_notes').select('note_type, date_of_service').eq('id', record.note_id).maybeSingle()
          ]);

          return {
            ...record,
            client: clientData.data || undefined,
            supervisor: supervisorData.data || undefined,
            supervisee: superviseeData.data || undefined,
            clinical_note: noteData.data || undefined
          };
        })
      );

      const filteredRecords = recordsWithData.filter(r => r !== null) as IncidentToBillingRecord[];

      setRecords(filteredRecords);
    } catch (error: any) {
      console.error('Error loading incident-to records:', error);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (records.length === 0) {
      toast.error("No records to export");
      return;
    }

    const headers = [
      "Date of Service",
      "Client Name",
      "MRN",
      "Supervising Provider",
      "Rendering Provider",
      "Note Type",
      "Compliance Status",
      "Documentation Complete",
      "Created Date"
    ];

    const rows = records.map(record => [
      record.clinical_note?.date_of_service || '',
      `${record.client?.first_name} ${record.client?.last_name}`,
      record.client?.medical_record_number || '',
      `${record.supervisor?.first_name} ${record.supervisor?.last_name}`,
      `${record.supervisee?.first_name} ${record.supervisee?.last_name}`,
      record.clinical_note?.note_type || '',
      record.billing_compliant ? 'Compliant' : 'Non-Compliant',
      record.documentation_complete ? 'Yes' : 'No',
      format(new Date(record.created_at), 'MM/dd/yyyy')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-to-billing-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("Report exported successfully");
  };

  const complianceStats = {
    total: records.length,
    compliant: records.filter(r => r.billing_compliant).length,
    nonCompliant: records.filter(r => !r.billing_compliant).length,
    incomplete: records.filter(r => !r.documentation_complete).length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Incident-to Billing Report
            </CardTitle>
            <CardDescription>
              Generate compliance reports for incident-to billing sessions
            </CardDescription>
          </div>
          {records.length > 0 && (
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Supervisor</Label>
            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Supervisors</SelectItem>
                {supervisors.map(sup => (
                  <SelectItem key={sup.id} value={sup.id}>
                    {sup.first_name} {sup.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Compliance Status</Label>
            <Select value={complianceFilter} onValueChange={setComplianceFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="compliant">Compliant Only</SelectItem>
                <SelectItem value="non_compliant">Non-Compliant Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={loadRecords} disabled={loading} className="w-full">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </Button>

        {/* Summary Stats */}
        {records.length > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{complianceStats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{complianceStats.compliant}</p>
                  <p className="text-sm text-muted-foreground">Compliant</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-destructive">{complianceStats.nonCompliant}</p>
                  <p className="text-sm text-muted-foreground">Non-Compliant</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{complianceStats.incomplete}</p>
                  <p className="text-sm text-muted-foreground">Incomplete Docs</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Records Table */}
        {records.length > 0 && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Providers</TableHead>
                  <TableHead>Note Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {record.clinical_note?.date_of_service 
                        ? format(new Date(record.clinical_note.date_of_service), 'MM/dd/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {record.client?.first_name} {record.client?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.client?.medical_record_number}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Sup:</span> {record.supervisor?.first_name} {record.supervisor?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Ren:</span> {record.supervisee?.first_name} {record.supervisee?.last_name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.clinical_note?.note_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {record.billing_compliant ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Compliant
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            Non-Compliant
                          </Badge>
                        )}
                        {!record.documentation_complete && (
                          <Badge variant="outline" className="border-amber-600 text-amber-600">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Incomplete
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && records.length === 0 && startDate && endDate && (
          <div className="text-center py-8 text-muted-foreground">
            No incident-to billing records found for the selected criteria
          </div>
        )}
      </CardContent>
    </Card>
  );
}
