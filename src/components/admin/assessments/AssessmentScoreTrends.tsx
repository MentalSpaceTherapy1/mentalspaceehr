import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface ScoreHistory {
  administration_date: string;
  score: number;
  severity_level?: string;
}

interface AssessmentScoreTrendsProps {
  clientId: string;
}

export const AssessmentScoreTrends = ({ clientId }: AssessmentScoreTrendsProps) => {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssessments();
  }, [clientId]);

  useEffect(() => {
    if (selectedAssessmentId) {
      fetchScoreHistory();
    }
  }, [selectedAssessmentId, clientId]);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('clinical_assessments')
        .select('id, assessment_name')
        .eq('is_active', true)
        .order('assessment_name');

      if (error) throw error;
      setAssessments(data || []);
      if (data && data.length > 0) {
        setSelectedAssessmentId(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading assessments',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScoreHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('assessment_score_history')
        .select('*')
        .eq('client_id', clientId)
        .eq('assessment_id', selectedAssessmentId)
        .order('administration_date', { ascending: true });

      if (error) throw error;
      setScoreHistory(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading score history',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const chartData = scoreHistory.map((item) => ({
    date: format(new Date(item.administration_date), 'MMM d, yyyy'),
    score: item.score,
    severity: item.severity_level,
  }));

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Assessment Score Trends
            </CardTitle>
            <CardDescription>Track progress over time</CardDescription>
          </div>
          <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select assessment" />
            </SelectTrigger>
            <SelectContent>
              {assessments.map((assessment) => (
                <SelectItem key={assessment.id} value={assessment.id}>
                  {assessment.assessment_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : scoreHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No score history available</p>
            <p className="text-sm mt-2">
              Complete assessments to see trends over time
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Latest Score</p>
                <p className="text-2xl font-bold">
                  {scoreHistory[scoreHistory.length - 1]?.score || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">
                  {(
                    scoreHistory.reduce((sum, item) => sum + item.score, 0) /
                    scoreHistory.length
                  ).toFixed(1)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Administrations</p>
                <p className="text-2xl font-bold">{scoreHistory.length}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
