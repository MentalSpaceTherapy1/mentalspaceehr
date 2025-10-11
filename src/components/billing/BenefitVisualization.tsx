/**
 * Benefit Visualization Component
 *
 * Displays insurance benefits and coverage details in a visual format
 */

import { CheckCircle2, XCircle, AlertTriangle, DollarSign, Calendar, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { EligibilityResponse, CoverageStatus } from '@/lib/advancedmd';

interface BenefitVisualizationProps {
  eligibility: EligibilityResponse;
  showHeader?: boolean;
}

export function BenefitVisualization({ eligibility, showHeader = true }: BenefitVisualizationProps) {
  const getCoverageIcon = (status: CoverageStatus) => {
    switch (status) {
      case 'Active':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'Inactive':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'Pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getCoverageColor = (status: CoverageStatus) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'Inactive':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'Pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const calculateDeductibleProgress = () => {
    if (!eligibility.deductibleTotal || eligibility.deductibleTotal === 0) return 0;
    return (eligibility.deductibleMet / eligibility.deductibleTotal) * 100;
  };

  const calculateOOPProgress = () => {
    if (!eligibility.oopMaxTotal || eligibility.oopMaxTotal === 0) return 0;
    return (eligibility.oopMaxMet / eligibility.oopMaxTotal) * 100;
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {showHeader && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getCoverageIcon(eligibility.coverageStatus)}
                  Coverage Status
                </CardTitle>
                <CardDescription>
                  {eligibility.payerName} - {eligibility.planName || 'Plan'}
                </CardDescription>
              </div>
              <Badge className={getCoverageColor(eligibility.coverageStatus)} variant="outline">
                {eligibility.coverageStatus}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Member ID</p>
                <p className="font-semibold">{eligibility.memberId}</p>
              </div>
              {eligibility.groupNumber && (
                <div>
                  <p className="text-muted-foreground">Group Number</p>
                  <p className="font-semibold">{eligibility.groupNumber}</p>
                </div>
              )}
              {eligibility.effectiveDate && (
                <div>
                  <p className="text-muted-foreground">Effective Date</p>
                  <p className="font-semibold">{formatDate(eligibility.effectiveDate)}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Checked On</p>
                <p className="font-semibold">{formatDate(eligibility.checkDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Responsibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Responsibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Copay */}
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900">
              <p className="text-sm text-muted-foreground mb-1">Copay</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(eligibility.copay)}
              </p>
            </div>

            {/* Coinsurance */}
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-100 dark:border-purple-900">
              <p className="text-sm text-muted-foreground mb-1">Coinsurance</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {eligibility.coinsurance ? `${eligibility.coinsurance}%` : 'N/A'}
              </p>
            </div>

            {/* Prior Auth Required */}
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-100 dark:border-orange-900">
              <p className="text-sm text-muted-foreground mb-1">Prior Auth Required</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {eligibility.priorAuthRequired ? 'Yes' : 'No'}
              </p>
              {eligibility.priorAuthNumber && (
                <p className="text-xs text-muted-foreground mt-1">
                  #{eligibility.priorAuthNumber}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductible */}
      {eligibility.deductibleTotal !== undefined && eligibility.deductibleTotal > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Deductible
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">
                  {formatCurrency(eligibility.deductibleMet)} / {formatCurrency(eligibility.deductibleTotal)}
                </span>
              </div>
              <Progress value={calculateDeductibleProgress()} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm pt-2">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground mb-1">Total</p>
                <p className="font-semibold">{formatCurrency(eligibility.deductibleTotal)}</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-muted-foreground mb-1">Met</p>
                <p className="font-semibold text-green-600">{formatCurrency(eligibility.deductibleMet)}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                <p className="text-muted-foreground mb-1">Remaining</p>
                <p className="font-semibold text-orange-600">{formatCurrency(eligibility.deductibleRemaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Out-of-Pocket Maximum */}
      {eligibility.oopMaxTotal !== undefined && eligibility.oopMaxTotal > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Out-of-Pocket Maximum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">
                  {formatCurrency(eligibility.oopMaxMet)} / {formatCurrency(eligibility.oopMaxTotal)}
                </span>
              </div>
              <Progress value={calculateOOPProgress()} className="h-3" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm pt-2">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-muted-foreground mb-1">Total</p>
                <p className="font-semibold">{formatCurrency(eligibility.oopMaxTotal)}</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <p className="text-muted-foreground mb-1">Met</p>
                <p className="font-semibold text-green-600">{formatCurrency(eligibility.oopMaxMet)}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                <p className="text-muted-foreground mb-1">Remaining</p>
                <p className="font-semibold text-orange-600">{formatCurrency(eligibility.oopMaxRemaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Benefits */}
      {eligibility.benefits && eligibility.benefits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Covered Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eligibility.benefits.map((benefit, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{benefit.serviceType}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={benefit.inNetwork ? 'default' : 'secondary'}>
                          {benefit.inNetwork ? 'In-Network' : 'Out-of-Network'}
                        </Badge>
                        {benefit.coverageLevel && (
                          <Badge variant="outline">{benefit.coverageLevel}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                      {benefit.copay !== undefined && (
                        <div>
                          <p className="text-muted-foreground">Copay</p>
                          <p className="font-semibold">{formatCurrency(benefit.copay)}</p>
                        </div>
                      )}
                      {benefit.coinsurance !== undefined && (
                        <div>
                          <p className="text-muted-foreground">Coinsurance</p>
                          <p className="font-semibold">{benefit.coinsurance}%</p>
                        </div>
                      )}
                      {benefit.limitationType && (
                        <div>
                          <p className="text-muted-foreground">Limitation</p>
                          <p className="font-semibold">
                            {benefit.limitationAmount} {benefit.limitationType}
                            {benefit.limitationPeriod && ` / ${benefit.limitationPeriod}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Limitations */}
      {eligibility.limitations && eligibility.limitations.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Coverage Limitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {eligibility.limitations.map((limitation: any, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{limitation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
