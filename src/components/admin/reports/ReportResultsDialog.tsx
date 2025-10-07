import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface ReportResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportName: string;
  reportData: any;
  isLoading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'];

export function ReportResultsDialog({ open, onOpenChange, reportName, reportData, isLoading }: ReportResultsDialogProps) {
  const exportToPDF = () => {
    // TODO: Implement PDF export
  };

  const exportToCSV = () => {
    if (!reportData?.tableData) return;
    
    const headers = Object.keys(reportData.tableData[0] || {});
    const csvContent = [
      headers.join(','),
      ...reportData.tableData.map((row: any) => 
        headers.map(h => row[h]).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToExcel = () => {
    // TODO: Implement Excel export
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Generating {reportName}</DialogTitle>
            <DialogDescription>
              Please wait while we generate your report...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!reportData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reportName}</DialogTitle>
          <DialogDescription>
            Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            {reportData.chartData && <TabsTrigger value="charts">Charts</TabsTrigger>}
            {reportData.tableData && <TabsTrigger value="data">Data Table</TabsTrigger>}
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            {reportData.summary && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {reportData.summary.map((metric: any, idx: number) => (
                  <Card key={idx}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {metric.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{metric.value}</div>
                      {metric.change && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {metric.change}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {reportData.insights && (
              <Card>
                <CardHeader>
                  <CardTitle>Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {reportData.insights.map((insight: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {reportData.chartData && (
            <TabsContent value="charts" className="space-y-4">
              {reportData.chartData.bar && (
                <Card>
                  <CardHeader>
                    <CardTitle>{reportData.chartData.bar.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.chartData.bar.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {reportData.chartData.pie && (
                <Card>
                  <CardHeader>
                    <CardTitle>{reportData.chartData.pie.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.chartData.pie.data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.chartData.pie.data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {reportData.chartData.line && (
                <Card>
                  <CardHeader>
                    <CardTitle>{reportData.chartData.line.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={reportData.chartData.line.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {reportData.tableData && (
            <TabsContent value="data">
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(reportData.tableData[0] || {}).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.tableData.map((row: any, idx: number) => (
                          <TableRow key={idx}>
                            {Object.values(row).map((value: any, cellIdx: number) => (
                              <TableCell key={cellIdx}>{value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
