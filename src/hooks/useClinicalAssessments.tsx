import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AssessmentItem {
  id: number;
  text: string;
  points?: number[];
}

export interface InterpretationRange {
  range: number[];
  severity: string;
  recommendation: string;
}

export interface ScoringAlgorithm {
  items: AssessmentItem[];
  response_options?: { value: number; label: string }[];
  scoring: { type: 'sum' | 'average' | 'custom'; formula?: string };
  interpretation: InterpretationRange[];
}

export interface ClinicalAssessment {
  id: string;
  assessment_name: string;
  acronym: string;
  description?: string;
  category: string;
  version: string;
  scoring_algorithm: ScoringAlgorithm;
  total_items: number;
  estimated_minutes?: number;
  is_active: boolean;
  is_custom: boolean;
  created_at: string;
}

export interface AssessmentAdministration {
  id: string;
  assessment_id: string;
  client_id: string;
  administered_by?: string;
  administration_date: string;
  responses: { item_id: number; response: number }[];
  raw_score?: number;
  interpreted_severity?: string;
  interpretation_notes?: string;
  clinical_recommendations?: string;
  time_taken_seconds?: number;
  completion_status: string;
  administered_via: string;
  added_to_chart: boolean;
  assessment?: ClinicalAssessment;
}

export interface AssessmentScoreHistory {
  id: string;
  client_id: string;
  assessment_id: string;
  administration_id: string;
  score: number;
  severity_level?: string;
  administration_date: string;
}

export const useClinicalAssessments = () => {
  const [assessments, setAssessments] = useState<ClinicalAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('clinical_assessments')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setAssessments((data || []) as unknown as ClinicalAssessment[]);
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

  const fetchAdministrations = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('assessment_administrations')
        .select(`
          *,
          assessment:clinical_assessments(*)
        `)
        .eq('client_id', clientId)
        .order('administration_date', { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        responses: item.responses as { item_id: number; response: number }[],
        assessment: {
          ...(item.assessment as any),
          scoring_algorithm: (item.assessment as any).scoring_algorithm as ScoringAlgorithm
        }
      })) as AssessmentAdministration[];
    } catch (error: any) {
      toast({
        title: 'Error loading administrations',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const fetchScoreHistory = async (
    clientId: string,
    assessmentId?: string
  ) => {
    try {
      let query = supabase
        .from('assessment_score_history')
        .select('*')
        .eq('client_id', clientId)
        .order('administration_date', { ascending: true });

      if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AssessmentScoreHistory[];
    } catch (error: any) {
      toast({
        title: 'Error loading score history',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    }
  };

  const calculateScore = (
    assessment: ClinicalAssessment,
    responses: { item_id: number; response: number }[]
  ) => {
    const { scoring_algorithm } = assessment;

    if (scoring_algorithm.scoring.type === 'sum') {
      return responses.reduce((sum, r) => sum + r.response, 0);
    } else if (scoring_algorithm.scoring.type === 'average') {
      const sum = responses.reduce((sum, r) => sum + r.response, 0);
      return sum / responses.length;
    }

    return 0;
  };

  const interpretScore = (assessment: ClinicalAssessment, score: number) => {
    const { interpretation } = assessment.scoring_algorithm;

    for (const range of interpretation) {
      if (score >= range.range[0] && score <= range.range[1]) {
        return {
          severity: range.severity,
          recommendation: range.recommendation,
        };
      }
    }

    return {
      severity: 'Unknown',
      recommendation: 'Score out of expected range',
    };
  };

  const administerAssessment = async (
    assessmentId: string,
    clientId: string,
    responses: { item_id: number; response: number }[],
    administeredVia: string = 'In-Session'
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const assessment = assessments.find((a) => a.id === assessmentId);
      if (!assessment) throw new Error('Assessment not found');

      const rawScore = calculateScore(assessment, responses);
      const interpretation = interpretScore(assessment, rawScore);

      const { data, error } = await supabase
        .from('assessment_administrations')
        .insert({
          assessment_id: assessmentId,
          client_id: clientId,
          administered_by: user.user.id,
          responses,
          raw_score: rawScore,
          interpreted_severity: interpretation.severity,
          clinical_recommendations: interpretation.recommendation,
          completion_status: 'completed',
          administered_via: administeredVia,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to score history
      await supabase.from('assessment_score_history').insert({
        client_id: clientId,
        assessment_id: assessmentId,
        administration_id: data.id,
        score: rawScore,
        severity_level: interpretation.severity,
        administration_date: new Date().toISOString(),
      });

      toast({
        title: 'Assessment completed',
        description: `Score: ${rawScore} - ${interpretation.severity}`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Error administering assessment',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  return {
    assessments,
    isLoading,
    fetchAdministrations,
    fetchScoreHistory,
    calculateScore,
    interpretScore,
    administerAssessment,
    refresh: fetchAssessments,
  };
};
