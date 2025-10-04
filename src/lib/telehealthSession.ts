import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures a telehealth session exists for an appointment
 * Returns the canonical session ID (with session_ prefix)
 */
export async function ensureTelehealthSession(
  appointmentId: string,
  clinicianId: string
): Promise<string> {
  // Check if session already exists
  const { data: existing } = await supabase
    .from('telehealth_sessions')
    .select('session_id')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  if (existing?.session_id) {
    return existing.session_id;
  }

  // Create new session with canonical format
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  const { error } = await supabase.from('telehealth_sessions').insert({
    appointment_id: appointmentId,
    host_id: clinicianId,
    session_id: sessionId,
    status: 'waiting'
  });

  if (error) throw error;

  // Update appointment with canonical link
  await supabase
    .from('appointments')
    .update({ 
      telehealth_link: `/telehealth/session/${sessionId}`,
      last_modified: new Date().toISOString() 
    })
    .eq('id', appointmentId);

  return sessionId;
}

/**
 * Normalizes various session ID formats to canonical format
 */
export function normalizeSessionId(id: string): string {
  // Remove leading slash if present
  const cleaned = id.startsWith('/') ? id.slice(1) : id;
  
  // If already has session_ prefix, return as-is
  if (cleaned.startsWith('session_')) {
    return cleaned;
  }
  
  // Add session_ prefix
  return `session_${cleaned}`;
}
