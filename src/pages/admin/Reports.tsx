import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCustomReports } from '@/hooks/useCustomReports';
import { format } from 'date-fns';
import {
  Plus,
  FileText,
  DollarSign,
  Activity,
  Shield,
  BarChart3,
  Edit,
  Trash2,
  Play,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const preBuiltReports = {
  clinical: [
    { name: 'Caseload Report', description: 'Active clients per clinician' },
    { name: 'Diagnosis Report', description: 'Most common diagnoses' },
    { name: 'Documentation Compliance', description: 'Notes completed on time' },
    { name: 'Supervision Report', description: 'Hours and co-signatures' },
  ],
  financial: [
    { name: 'Revenue Report', description: 'Gross charges and payments' },
    { name: 'Aging Report', description: 'Accounts receivable by aging bucket' },
    { name: 'Claims Status Report', description: 'Claims submitted and paid' },
    { name: 'Productivity Report', description: 'Sessions per clinician' },
  ],
  operational: [
    { name: 'Appointment Report', description: 'Total appointments by period' },
    { name: 'Utilization Report', description: 'Clinician schedule utilization' },
    { name: 'Waitlist Report', description: 'Current waitlist size' },
    { name: 'Staff Report', description: 'Active users by role' },
  ],
  compliance: [
    { name: 'License Expiration', description: 'Upcoming license expirations' },
    { name: 'Training & Credentialing', description: 'Required trainings' },
    { name: 'Incident Reports', description: 'Safety and privacy incidents' },
  ],
};

const categoryIcons = {
  Clinical: FileText,
  Financial: DollarSign,
  Operational: Activity,
  Compliance: Shield,
  Custom: BarChart3,
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const { reports, isLoading, deleteReport } = useCustomReports();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setReportToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      deleteReport(reportToDelete);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Generate insights from your practice data
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Custom Report
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clinical">Clinical</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="operational">Operational</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="custom">Custom Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Clinical Reports
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {preBuiltReports.clinical.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available reports
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Financial Reports
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {preBuiltReports.financial.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available reports
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Operational Reports
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {preBuiltReports.operational.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available reports
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Custom Reports
                  </CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports.length}</div>
                  <p className="text-xs text-muted-foreground">
                    User created
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clinical" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {preBuiltReports.clinical.map((report) => (
                <Card key={report.name}>
                  <CardHeader>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Run Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {preBuiltReports.financial.map((report) => (
                <Card key={report.name}>
                  <CardHeader>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Run Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="operational" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {preBuiltReports.operational.map((report) => (
                <Card key={report.name}>
                  <CardHeader>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Run Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {preBuiltReports.compliance.map((report) => (
                <Card key={report.name}>
                  <CardHeader>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Run Report
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Custom Reports</CardTitle>
                <CardDescription>
                  Reports you have created or that have been shared with you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading reports...
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No custom reports yet. Create your first report!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead>Shared</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => {
                        const IconComponent =
                          categoryIcons[report.report_category];
                        return (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-4 h-4" />
                                {report.report_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {report.report_category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {format(
                                new Date(report.created_date),
                                'MMM d, yyyy'
                              )}
                            </TableCell>
                            <TableCell>
                              {report.last_run_date
                                ? format(
                                    new Date(report.last_run_date),
                                    'MMM d, yyyy'
                                  )
                                : 'Never'}
                            </TableCell>
                            <TableCell>
                              {report.is_shared ? (
                                <Badge variant="secondary">Shared</Badge>
                              ) : (
                                <Badge variant="outline">Private</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon">
                                  <Play className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(report.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
