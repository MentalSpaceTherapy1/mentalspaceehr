// SUPABASE HAS BEEN COMPLETELY REPLACED WITH AWS
// This file now re-exports the AWS API client for backward compatibility
// ALL new code should import from '@/lib/aws-api-client' directly

import { supabase as awsSupabaseCompat } from '@/lib/aws-api-client';
import type { Database } from './types';

console.warn('⚠️  Supabase deprecated. Using AWS API Gateway + Lambda + Aurora PostgreSQL');

// Re-export AWS-backed supabase client
export const supabase = awsSupabaseCompat;

// Re-export type for compatibility
export type { Database };
