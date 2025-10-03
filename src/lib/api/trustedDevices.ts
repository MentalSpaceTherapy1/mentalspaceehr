import { supabase } from '@/integrations/supabase/client';
import { generateDeviceFingerprint, getDeviceName } from '@/lib/deviceFingerprint';

export const checkTrustedDevice = async (userId: string): Promise<boolean> => {
  const fingerprint = generateDeviceFingerprint();
  
  const { data, error } = await supabase
    .from('trusted_devices')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('device_fingerprint', fingerprint)
    .single();

  if (error || !data) return false;

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    await supabase.from('trusted_devices').delete().eq('id', data.id);
    return false;
  }

  // Update last used
  await supabase
    .from('trusted_devices')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return true;
};

export const addTrustedDevice = async (userId: string) => {
  const fingerprint = generateDeviceFingerprint();
  const deviceName = getDeviceName();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  const { error } = await supabase.from('trusted_devices').insert({
    user_id: userId,
    device_fingerprint: fingerprint,
    device_name: deviceName,
    user_agent: navigator.userAgent,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;
};

export const getTrustedDevices = async (userId: string) => {
  const { data, error } = await supabase
    .from('trusted_devices')
    .select('*')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const removeTrustedDevice = async (deviceId: string) => {
  const { error } = await supabase
    .from('trusted_devices')
    .delete()
    .eq('id', deviceId);

  if (error) throw error;
};
