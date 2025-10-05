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

    console.log('[Waiting Room Timeout] Checking for timed out waiting rooms...');

    // Get timeout setting from practice settings
    const { data: settings } = await supabaseClient
      .from('practice_settings')
      .select('telehealth_settings')
      .single();

    const timeoutMinutes = (settings?.telehealth_settings as any)?.waiting_room_timeout_minutes || 30;
    console.log(`[Waiting Room Timeout] Timeout set to ${timeoutMinutes} minutes`);

    // Calculate timeout threshold
    const timeoutThreshold = new Date();
    timeoutThreshold.setMinutes(timeoutThreshold.getMinutes() - timeoutMinutes);

    // Find waiting rooms that have timed out
    const { data: timedOutRooms, error: fetchError } = await supabaseClient
      .from('telehealth_waiting_rooms')
      .select(`
        id,
        client_arrived_time,
        appointments:appointment_id (
          clinician_id
        )
      `)
      .eq('status', 'Waiting')
      .lt('client_arrived_time', timeoutThreshold.toISOString());

    if (fetchError) {
      console.error('[Waiting Room Timeout] Error fetching waiting rooms:', fetchError);
      throw fetchError;
    }

    if (!timedOutRooms || timedOutRooms.length === 0) {
      console.log('[Waiting Room Timeout] No timed out waiting rooms found');
      return new Response(
        JSON.stringify({ message: 'No timed out waiting rooms', count: 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`[Waiting Room Timeout] Found ${timedOutRooms.length} timed out waiting rooms`);

    // Update timed out waiting rooms
    const { error: updateError } = await supabaseClient
      .from('telehealth_waiting_rooms')
      .update({
        status: 'Timed Out',
        client_timed_out: true,
        timeout_time: new Date().toISOString()
      })
      .in('id', timedOutRooms.map(room => room.id));

    if (updateError) {
      console.error('[Waiting Room Timeout] Error updating waiting rooms:', updateError);
      throw updateError;
    }

    console.log(`[Waiting Room Timeout] Successfully timed out ${timedOutRooms.length} waiting rooms`);

    return new Response(
      JSON.stringify({
        message: 'Waiting rooms timed out successfully',
        count: timedOutRooms.length,
        timedOutRoomIds: timedOutRooms.map(room => room.id)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Waiting Room Timeout] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
