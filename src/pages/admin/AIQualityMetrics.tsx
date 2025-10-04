import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, TrendingUp, ThumbsUp, ThumbsDown, Clock, CheckCircle2, XCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface AIMetrics {
  totalRequests: number;
  successRate: number;
  avgProcessingTime: number;
  avgConfidenceScore: number;
  feedbackStats: {
    positive: number;
    negative: number;
    total: number;
  };
  requestsByType: { [key: string]: number };
}

export default function AIQualityMetrics() {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const daysAgo = parseInt(timeRange.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Load AI request logs
      const { data: logs, error: logsError } = await supabase
        .from('ai_request_logs')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (logsError) throw logsError;

      // Load feedback data
      const { data: feedback, error: feedbackError } = await supabase
        .from('note_feedback')
        .select('rating')
        .gte('created_at', startDate.toISOString());

      if (feedbackError) throw feedbackError;

      // Calculate metrics
      const totalRequests = logs?.length || 0;
      const successfulRequests = logs?.filter(l => l.success).length || 0;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

      const avgProcessingTime = logs && logs.length > 0
        ? logs.reduce((sum, l) => sum + (l.processing_time_ms || 0), 0) / logs.length
        : 0;

      const avgConfidenceScore = logs && logs.length > 0
        ? logs.reduce((sum, l) => sum + (l.confidence_score || 0), 0) / logs.length
        : 0;

      const positiveCount = feedback?.filter(f => f.rating === 1).length || 0;
      const negativeCount = feedback?.filter(f => f.rating === -1).length || 0;

      const requestsByType = logs?.reduce((acc, log) => {
        acc[log.request_type] = (acc[log.request_type] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }) || {};

      setMetrics({
        totalRequests,
        successRate,
        avgProcessingTime,
        avgConfidenceScore,
        feedbackStats: {
          positive: positiveCount,
          negative: negativeCount,
          total: positiveCount + negativeCount
        },
        requestsByType
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast.error('Failed to load AI quality metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading metrics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI Quality Metrics</h1>
            <p className="text-muted-foreground mt-2">Monitor AI performance and user satisfaction</p>
          </div>
          <div className="flex gap-2">
            <Button variant={timeRange === '7d' ? 'default' : 'outline'} onClick={() => setTimeRange('7d')}>
              7 Days
            </Button>
            <Button variant={timeRange === '30d' ? 'default' : 'outline'} onClick={() => setTimeRange('30d')}>
              30 Days
            </Button>
            <Button variant={timeRange === '90d' ? 'default' : 'outline'} onClick={() => setTimeRange('90d')}>
              90 Days
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last {timeRange}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics && metrics.totalRequests > 0 ? `${Math.round((metrics.successRate / 100) * metrics.totalRequests)} successful` : 'No data'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.avgProcessingTime.toFixed(0)}ms</div>
              <p className="text-xs text-muted-foreground">Response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(metrics?.avgConfidenceScore || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">AI confidence score</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="feedback" className="space-y-4">
          <TabsList>
            <TabsTrigger value="feedback">User Feedback</TabsTrigger>
            <TabsTrigger value="usage">Usage by Type</TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clinician Feedback</CardTitle>
                <CardDescription>User satisfaction with AI-generated content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Positive Feedback</span>
                    </div>
                    <Badge variant="outline">{metrics?.feedbackStats.positive}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-5 w-5 text-red-500" />
                      <span className="font-medium">Negative Feedback</span>
                    </div>
                    <Badge variant="outline">{metrics?.feedbackStats.negative}</Badge>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Satisfaction Rate</span>
                      <span className="text-2xl font-bold">
                        {metrics && metrics.feedbackStats.total > 0
                          ? `${((metrics.feedbackStats.positive / metrics.feedbackStats.total) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Requests by Type</CardTitle>
                <CardDescription>Distribution of AI requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics && Object.entries(metrics.requestsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-primary rounded-full" style={{ width: `${(count / metrics.totalRequests) * 100}px` }} />
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
