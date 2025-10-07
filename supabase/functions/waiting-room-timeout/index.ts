import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get timeout setting from practice settings
    const { data: settings } = await supabaseClient
      .from('practice_settings')
      .select('telehealth_settings')
      .single();

    const timeoutMinutes = (settings?.telehealth_settings as any)?.waiting_room_timeout_minutes || 30;

    // Calculate timeout threshold
    const timeoutThreshold = new Date();
    timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - timeoutMinutes);

    // Find waiting rooms that have timed out
    const { data: timedOutRooms, error: fetchError } = await supabaseClient
      .from('telehealth_waiting_rooms')
      .select(`
        id,
        client_arrived_time,
        last_heartbeat,
        appointments:appointment_id (
          clinician_id
        )
      `)
      .eq('status', 'Waiting')
      .lt('client_arrived_time', timeoutThreshold.toISOString());

    if (fetchError) {
      throw fetchError;
    }

    // Find rooms with stale heartbeats (client disconnected)
    const heartbeatThreshold = new Date();
    heartbeatThreshold.setMinutes(heartbeatThreshold.getMinutes() - 2); // 2 minutes no heartbeat

    const { data: staleHeartbeatRooms } = await supabaseClient
      .from('telehealth_waiting_rooms')
      .select('id, last_heartbeat')
      .eq('status', 'Waiting')
      .not('last_heartbeat', 'is', null)
      .lt('last_heartbeat', heartbeatThreshold.toISOString());

    const totalRooms = (timedOutRooms?.length || 0) + (staleHeartbeatRooms?.length || 0);

    if (totalRooms === 0) {
      return new Response(
        JSON.stringify({ message: 'No timed out waiting rooms', count: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Update timed out waiting rooms
    if (timedOutRooms && timedOutRooms.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('telehealth_waiting_rooms')
        .update({
          status: 'Timed Out',
          client_timed_out: true,
          timeout_time: new Date().toISOString()
        })
        .in('id', timedOutRooms.map(room => room.id));

      if (updateError) {
        // Continue processing
      }
    }

    // Update rooms with stale heartbeats to 'Left'
    if (staleHeartbeatRooms && staleHeartbeatRooms.length > 0) {
      const { error: leftError } = await supabaseClient
        .from('telehealth_waiting_rooms')
        .update({
          status: 'Left',
          left_time: new Date().toISOString()
        })
        .in('id', staleHeartbeatRooms.map(room => room.id));

      if (leftError) {
        // Continue processing
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Waiting rooms processed successfully',
        timedOutCount: timedOutRooms?.length || 0,
        leftCount: staleHeartbeatRooms?.length || 0,
        totalCount: totalRooms
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Timeout processing failed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
