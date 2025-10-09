import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, RefreshCw, Activity } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface QualityResult {
  id: string;
  check_name: string;
  table_name: string;
  check_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  violation_count: number;
  threshold: number;
  passed: boolean;
  checked_at: string;
  execution_time_ms: number;
  error_message?: string;
}

const severityConfig = {
  critical: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', badge: 'destructive' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', badge: 'default' },
  medium: { icon: Info, color: 'text-yellow-600', bg: 'bg-yellow-50', badge: 'secondary' },
  low: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', badge: 'outline' },
  info: { icon: Info, color: 'text-gray-600', bg: 'bg-gray-50', badge: 'outline' },
} as const;

export const DataQualityDashboard = () => {
  const [results, setResults] = useState<QualityResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const { toast } = useToast();

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('data_quality_results')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setResults((data || []) as QualityResult[]);
    } catch (error: any) {
      console.error('Error fetching data quality results:', error);
      toast({
        title: 'Error loading results',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runQualityCheck = async () => {
    setIsRunning(true);
    try {
      const { error } = await supabase.functions.invoke('data-quality-check');

      if (error) throw error;

      toast({
        title: 'Data quality check completed',
        description: 'Results have been updated',
      });

      await fetchResults();
    } catch (error: any) {
      console.error('Error running quality check:', error);
      toast({
        title: 'Error running quality check',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const tables = ['all', ...Array.from(new Set(results.map(r => r.table_name)))];
  
  const filteredResults = selectedTable === 'all' 
    ? results 
    : results.filter(r => r.table_name === selectedTable);

  const latestResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.check_name] || new Date(result.checked_at) > new Date(acc[result.check_name].checked_at)) {
      acc[result.check_name] = result;
    }
    return acc;
  }, {} as Record<string, QualityResult>);

  const latestResultsArray = Object.values(latestResults);

  const summary = {
    total: latestResultsArray.length,
    passed: latestResultsArray.filter(r => r.passed).length,
    failed: latestResultsArray.filter(r => !r.passed).length,
    critical: latestResultsArray.filter(r => !r.passed && r.severity === 'critical').length,
    high: latestResultsArray.filter(r => !r.passed && r.severity === 'high').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.critical}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.high}</div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {summary.critical > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Critical Data Quality Issues Detected</AlertTitle>
          <AlertDescription>
            {summary.critical} critical data quality violation(s) require immediate attention. 
            Please review and resolve these issues as soon as possible.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Quality Monitoring</CardTitle>
              <CardDescription>
                Automated checks for data completeness, validity, consistency, and timeliness
              </CardDescription>
            </div>
            <Button onClick={runQualityCheck} disabled={isRunning}>
              <Activity className="mr-2 h-4 w-4" />
              {isRunning ? 'Running Checks...' : 'Run Checks Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTable} onValueChange={setSelectedTable}>
            <TabsList>
              {tables.map(table => (
                <TabsTrigger key={table} value={table} className="capitalize">
                  {table === 'all' ? 'All Tables' : table.replace('_', ' ')}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedTable} className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Check Name</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-right">Violations</TableHead>
                    <TableHead className="text-right">Threshold</TableHead>
                    <TableHead>Last Checked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestResultsArray.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No data quality checks have been run yet. Click "Run Checks Now" to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    latestResultsArray.map((result) => {
                      const SeverityIcon = severityConfig[result.severity].icon;
                      return (
                        <TableRow key={result.id}>
                          <TableCell>
                            {result.passed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <SeverityIcon className={`h-5 w-5 ${severityConfig[result.severity].color}`} />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{result.check_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{result.table_name}</Badge>
                          </TableCell>
                          <TableCell className="capitalize">{result.check_type}</TableCell>
                          <TableCell>
                            <Badge variant={severityConfig[result.severity].badge as any}>
                              {result.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${!result.passed ? 'text-red-600' : ''}`}>
                            {result.violation_count}
                          </TableCell>
                          <TableCell className="text-right">{result.threshold}</TableCell>
                          <TableCell>
                            {new Date(result.checked_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
