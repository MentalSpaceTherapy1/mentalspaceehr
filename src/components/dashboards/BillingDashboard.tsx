import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const BillingDashboard = () => {
  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">0 payments received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">Client balances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Claims Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Claims Status
          </CardTitle>
          <CardDescription>Current status of insurance claims</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Submitted</span>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">$0.00</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">$0.00</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Denied</span>
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">$0.00</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid</span>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">$0.00</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Summary
            </CardTitle>
            <CardDescription>Financial overview by period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className="text-sm font-medium">$0.00</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '0%' }} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="text-sm font-medium">$0.00</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '0%' }} />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Year to Date</span>
                  <span className="text-sm font-medium">$0.00</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Verification Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Insurance Verification Queue
            </CardTitle>
            <CardDescription>Items requiring verification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Pending Verification</p>
                    <p className="text-xs text-muted-foreground">New clients</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Expiring Coverage</p>
                    <p className="text-xs text-muted-foreground">Within 30 days</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Verification Failed</p>
                    <p className="text-xs text-muted-foreground">Requires follow-up</p>
                  </div>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Client Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Outstanding Client Balances
          </CardTitle>
          <CardDescription>Clients with unpaid balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">
                No outstanding client balances
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common billing tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
              <FileText className="h-5 w-5" />
              <span className="text-sm">Submit Claim</span>
            </Button>
            <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
              <CreditCard className="h-5 w-5" />
              <span className="text-sm">Process Payment</span>
            </Button>
            <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">Verify Insurance</span>
            </Button>
            <Button variant="outline" className="h-auto flex flex-col gap-2 p-4">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
