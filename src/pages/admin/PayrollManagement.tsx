import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePayrollSessions } from '@/hooks/usePayrollSessions';
import { usePayrollSummaries } from '@/hooks/usePayrollSummaries';
import { format } from 'date-fns';
import { CheckCircle, Clock, DollarSign, Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const sessionTypeColors = {
  Individual: 'default' as const,
  Couples: 'secondary' as const,
  Family: 'outline' as const,
  Group: 'destructive' as const,
  Evaluation: 'default' as const,
  Other: 'secondary' as const,
};

const statusVariants = {
  Draft: 'outline' as const,
  'Pending Approval': 'secondary' as const,
  Approved: 'default' as const,
  Paid: 'default' as const,
};

export default function PayrollManagement() {
  const [activeTab, setActiveTab] = useState('sessions');
  const { sessions, isLoading: sessionsLoading, approveSession } = usePayrollSessions();
  const { summaries, isLoading: summariesLoading, approveSummary } = usePayrollSummaries();

  const unapprovedSessions = sessions.filter(s => !s.approved_for_payroll);
  const approvedSessions = sessions.filter(s => s.approved_for_payroll && !s.paid);
  const paidSessions = sessions.filter(s => s.paid);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">
            Track and manage therapist payroll sessions and summaries
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unapprovedSessions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedSessions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${sessions.reduce((sum, s) => sum + s.payroll_amount, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="summaries">Payroll Summaries</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading sessions...
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payroll sessions found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            {format(new Date(session.session_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {session.session_start_time} - {session.session_end_time}
                          </TableCell>
                          <TableCell>{session.session_duration} min</TableCell>
                          <TableCell>
                            <Badge variant={sessionTypeColors[session.session_type]}>
                              {session.session_type}
                            </Badge>
                          </TableCell>
                          <TableCell>${session.payroll_rate.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">
                            ${session.payroll_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {session.paid ? (
                              <Badge variant="default">Paid</Badge>
                            ) : session.approved_for_payroll ? (
                              <Badge variant="secondary">Approved</Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!session.approved_for_payroll && (
                              <Button
                                size="sm"
                                onClick={() => approveSession(session.id)}
                              >
                                Approve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summaries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Summaries by Period</CardTitle>
              </CardHeader>
              <CardContent>
                {summariesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading summaries...
                  </div>
                ) : summaries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payroll summaries found. Generate summaries from sessions.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Earnings</TableHead>
                        <TableHead>Bonuses</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaries.map((summary) => (
                        <TableRow key={summary.id}>
                          <TableCell>
                            {format(new Date(summary.period_start_date), 'MMM d')} -{' '}
                            {format(new Date(summary.period_end_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{summary.total_sessions}</TableCell>
                          <TableCell>{summary.total_hours.toFixed(1)}</TableCell>
                          <TableCell>${summary.total_earnings.toFixed(2)}</TableCell>
                          <TableCell>
                            ${(summary.bonuses || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            ${(summary.deductions || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-bold">
                            ${summary.net_earnings.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariants[summary.status]}>
                              {summary.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {summary.status === 'Pending Approval' && (
                              <Button
                                size="sm"
                                onClick={() => approveSummary(summary.id)}
                              >
                                Approve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
