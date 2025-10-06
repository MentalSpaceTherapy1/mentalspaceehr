import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEligibilityChecks } from '@/hooks/useEligibilityChecks';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const statusIcons = {
  Active: <CheckCircle className="w-4 h-4 text-success" />,
  Inactive: <XCircle className="w-4 h-4 text-destructive" />,
  Pending: <Clock className="w-4 h-4 text-warning" />,
  Unknown: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
};

const statusVariants = {
  Active: 'default' as const,
  Inactive: 'destructive' as const,
  Pending: 'secondary' as const,
  Unknown: 'outline' as const,
};

export default function EligibilityVerification() {
  const { checks, isLoading } = useEligibilityChecks();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Eligibility Verification</h1>
            <p className="text-muted-foreground">
              Verify and manage client insurance eligibility
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Eligibility Check
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Coverage</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {checks.filter((c) => c.eligibility_status === 'Active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Checks</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {checks.filter((c) => c.eligibility_status === 'Pending').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {checks.filter((c) => c.eligibility_status === 'Inactive').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Eligibility Checks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading eligibility checks...
              </div>
            ) : checks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No eligibility checks found. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check Date</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead>Copay</TableHead>
                    <TableHead>Deductible Remaining</TableHead>
                    <TableHead>Sessions Remaining</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((check) => (
                    <TableRow key={check.id}>
                      <TableCell>
                        {format(new Date(check.check_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(check.service_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statusIcons[check.eligibility_status]}
                          <Badge variant={statusVariants[check.eligibility_status]}>
                            {check.eligibility_status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {check.coverage_details?.mentalHealthCovered ? (
                          <Badge variant="default">Covered</Badge>
                        ) : (
                          <Badge variant="destructive">Not Covered</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        ${check.coverage_details?.copay?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell>
                        $
                        {check.coverage_details?.deductible?.individualRemaining?.toFixed(
                          2
                        ) || '0.00'}
                      </TableCell>
                      <TableCell>
                        {check.coverage_details?.coverageLimits?.sessionsRemaining || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(check.valid_until), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{check.source}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
