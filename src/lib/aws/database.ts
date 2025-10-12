/**
 * AWS Aurora PostgreSQL Database Connection
 *
 * This utility should ONLY be used in Supabase Edge Functions (backend),
 * NEVER in frontend code. Database credentials are stored in AWS Secrets Manager.
 *
 * Usage in Supabase Edge Function:
 *
 * import { queryDatabase } from '../../../src/lib/aws/database.ts';
 *
 * const result = await queryDatabase('SELECT * FROM clients WHERE id = $1', [clientId]);
 */

// NOTE: This file is for reference only.
// Actual implementation will be in Supabase Edge Functions with Deno runtime.

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * PLACEHOLDER: Actual implementation in Supabase Edge Functions
 *
 * In Supabase Edge Functions, use this pattern:
 *
 * ```typescript
 * import { Client } from 'https://deno.land/x/postgres/mod.ts';
 *
 * // Get credentials from AWS Secrets Manager
 * const secrets = await getSecrets();
 *
 * const client = new Client({
 *   hostname: Deno.env.get('DATABASE_ENDPOINT'),
 *   port: 5432,
 *   database: 'mentalspaceehr',
 *   user: secrets.username,
 *   password: secrets.password,
 *   tls: {
 *     enabled: true,
 *     enforce: true,
 *   },
 * });
 *
 * await client.connect();
 * const result = await client.queryObject('SELECT * FROM clients');
 * await client.end();
 * ```
 */

export const DATABASE_CONFIG = {
  endpoint: 'mentalspaceehrstack-databaseb269d8bb-edwdzckxbkt7.cluster-ci16iwey2cac.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'mentalspaceehr',
  secretArn: 'arn:aws:secretsmanager:us-east-1:706704660887:secret:mentalspace-ehr-db-credentials-al4fLD',
} as const;

/**
 * Example Edge Function Template
 *
 * Save this in: supabase/functions/example-aws-query/index.ts
 *
 * ```typescript
 * import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
 * import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';
 *
 * serve(async (req) => {
 *   try {
 *     // Get database password from AWS Secrets Manager
 *     const secretArn = Deno.env.get('DATABASE_SECRET_ARN');
 *
 *     // Call AWS Secrets Manager via AWS SDK
 *     // Or use Supabase secrets: const password = Deno.env.get('DATABASE_PASSWORD');
 *
 *     const client = new Client({
 *       hostname: Deno.env.get('DATABASE_ENDPOINT'),
 *       port: 5432,
 *       database: 'mentalspaceehr',
 *       user: 'postgres',
 *       password: password,
 *       tls: { enabled: true },
 *     });
 *
 *     await client.connect();
 *
 *     const result = await client.queryObject({
 *       text: 'SELECT * FROM clients WHERE id = $1',
 *       args: [clientId],
 *     });
 *
 *     await client.end();
 *
 *     return new Response(JSON.stringify(result.rows), {
 *       headers: { 'Content-Type': 'application/json' },
 *     });
 *   } catch (error) {
 *     return new Response(JSON.stringify({ error: error.message }), {
 *       status: 500,
 *       headers: { 'Content-Type': 'application/json' },
 *     });
 *   }
 * });
 * ```
 */

// This module is informational only for frontend developers
// Real database access happens in Supabase Edge Functions
export const INFO = {
  message: 'Database access is only available in Supabase Edge Functions (backend)',
  endpoint: DATABASE_CONFIG.endpoint,
  database: DATABASE_CONFIG.database,
  documentation: 'See comments in this file for Edge Function examples',
} as const;
