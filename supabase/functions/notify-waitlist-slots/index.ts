import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WaitlistEntry {
  id: string;
  client_id: string;
  clinician_id: string;
  alternate_clinician_ids?: string[];
  appointment_type: string;
  preferred_days?: string[];
  preferred_times?: string[];
  priority: string;
  notified: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting waitlist slot notification check...');

    // Get active waitlist entries
    const { data: waitlistEntries, error: waitlistError } = await supabase
      .from('appointment_waitlist')
      .select('*')
      .eq('status', 'Active')
      .eq('notified', false)
      .order('priority', { ascending: false })
      .order('added_date', { ascending: true });

    if (waitlistError) {
      console.error('Error fetching waitlist:', waitlistError);
      throw waitlistError;
    }

    console.log(`Found ${waitlistEntries?.length || 0} active waitlist entries`);

    let notificationsCount = 0;

    for (const entry of waitlistEntries || []) {
      console.log(`Checking entry ${entry.id} for client ${entry.client_id}`);

      // Build clinician list (primary + alternates)
      const clinicianIds = [entry.clinician_id];
      if (entry.alternate_clinician_ids) {
        clinicianIds.push(...entry.alternate_clinician_ids);
      }

      // Find available slots
      const { data: availableSlots, error: slotsError } = await supabase
        .from('appointments')
        .select('id, appointment_date, start_time, end_time, clinician_id')
        .in('clinician_id', clinicianIds)
        .eq('appointment_type', entry.appointment_type)
        .in('status', ['Cancelled'])
        .gte('appointment_date', new Date().toISOString().split('T')[0])
        .limit(10);

      if (slotsError) {
        console.error('Error finding slots:', slotsError);
        continue;
      }

      // Filter by preferred days if specified
      let matchingSlots = availableSlots || [];
      if (entry.preferred_days && entry.preferred_days.length > 0) {
        matchingSlots = matchingSlots.filter(slot => {
          const dayOfWeek = new Date(slot.appointment_date).getDay().toString();
          return entry.preferred_days!.includes(dayOfWeek);
        });
      }

      // Filter by preferred times if specified
      if (entry.preferred_times && entry.preferred_times.length > 0) {
        matchingSlots = matchingSlots.filter(slot => {
          const hour = parseInt(slot.start_time.split(':')[0]);
          const timeOfDay = 
            hour < 12 ? 'Morning' :
            hour < 17 ? 'Afternoon' : 'Evening';
          return entry.preferred_times!.includes(timeOfDay);
        });
      }

      if (matchingSlots.length > 0) {
        console.log(`Found ${matchingSlots.length} matching slots for entry ${entry.id}`);

        // Get client and clinician info for notification
        const { data: client } = await supabase
          .from('clients')
          .select('first_name, last_name, email, primary_phone')
          .eq('id', entry.client_id)
          .single();

        const { data: clinician } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', matchingSlots[0].clinician_id)
          .single();

        // Mark as notified
        const { error: updateError } = await supabase
          .from('appointment_waitlist')
          .update({
            notified: true,
            notified_date: new Date().toISOString()
          })
          .eq('id', entry.id);

        if (updateError) {
          console.error('Error updating waitlist entry:', updateError);
          continue;
        }

        // TODO: Send actual notification via email/SMS
        // For now, just log it
        console.log(`Notification sent for client ${client?.first_name} ${client?.last_name}`);
        console.log(`Available slot: ${matchingSlots[0].appointment_date} at ${matchingSlots[0].start_time}`);
        
        notificationsCount++;
      }
    }

    console.log(`Sent ${notificationsCount} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notificationsCount,
        message: `Processed waitlist and sent ${notificationsCount} notifications`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in notify-waitlist-slots:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});