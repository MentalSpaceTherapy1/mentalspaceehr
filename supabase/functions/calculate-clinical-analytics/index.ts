import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { period = 'monthly', startDate, endDate } = await req.json();
    
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    console.log(`Calculating clinical analytics for ${period} from ${start} to ${end}`);

    // Get total and active patients
    const { data: allPatients } = await supabase
      .from('clients')
      .select('id, status, discharge_date');

    const totalPatients = allPatients?.length || 0;
    const activePatients = allPatients?.filter(p => p.status === 'Active').length || 0;

    // Get sessions in period
    const { data: sessions } = await supabase
      .from('chart_notes')
      .select('id, client_id, session_date')
      .gte('session_date', start.toISOString())
      .lte('session_date', end.toISOString());

    const totalSessions = sessions?.length || 0;
    const avgSessionsPerPatient = activePatients > 0 ? totalSessions / activePatients : 0;

    // Get appointments for utilization
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, status, appointment_date')
      .gte('appointment_date', start.toISOString().split('T')[0])
      .lte('appointment_date', end.toISOString().split('T')[0]);

    const totalAppointments = appointments?.length || 0;
    const completedAppointments = appointments?.filter(a => a.status === 'Completed').length || 0;
    const noShowCount = appointments?.filter(a => a.status === 'No Show').length || 0;
    
    const utilizationRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
    const noShowRate = totalAppointments > 0 ? (noShowCount / totalAppointments) * 100 : 0;

    // Get assessment scores for outcomes
    const { data: assessments } = await supabase
      .from('assessment_administrations')
      .select('assessment_id, raw_score, administration_date, assessments(name)')
      .gte('administration_date', start.toISOString())
      .lte('administration_date', end.toISOString());

    const phq9Scores = assessments?.filter((a: any) => a.assessments?.name?.includes('PHQ-9')) || [];
    const gad7Scores = assessments?.filter((a: any) => a.assessments?.name?.includes('GAD-7')) || [];

    const avgPHQ9 = phq9Scores.length > 0 
      ? phq9Scores.reduce((sum: number, a: any) => sum + (a.raw_score || 0), 0) / phq9Scores.length 
      : null;
    const avgGAD7 = gad7Scores.length > 0
      ? gad7Scores.reduce((sum: number, a: any) => sum + (a.raw_score || 0), 0) / gad7Scores.length
      : null;

    // Get crisis alerts
    const { data: crisisAlerts } = await supabase
      .from('assessment_critical_alerts')
      .select('id')
      .gte('triggered_at', start.toISOString())
      .lte('triggered_at', end.toISOString());

    const metricData = {
      totalPatients,
      activePatients,
      totalSessions,
      avgSessionsPerPatient,
      utilizationRate,
      noShowRate,
      totalAppointments,
      completedAppointments,
      noShowCount,
      avgPHQ9,
      avgGAD7,
      crisisEvents: crisisAlerts?.length || 0,
      calculatedAt: new Date().toISOString(),
    };

    // Cache the results
    await supabase
      .from('clinical_analytics_cache')
      .upsert({
        metric_type: 'utilization',
        aggregation_period: period,
        period_start: start.toISOString().split('T')[0],
        period_end: end.toISOString().split('T')[0],
        metric_data: metricData,
        calculated_at: new Date().toISOString(),
      }, {
        onConflict: 'metric_type,aggregation_period,period_start,period_end'
      });

    console.log('Clinical analytics calculated and cached successfully');

    return new Response(
      JSON.stringify({ success: true, data: metricData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error calculating clinical analytics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
