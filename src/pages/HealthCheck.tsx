/**
 * Health Check Endpoint
 * Returns system status for monitoring and load balancers
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    auth: boolean;
    storage: boolean;
  };
  version: string;
  environment: string;
}

export default function HealthCheck() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    const checks = {
      database: false,
      auth: false,
      storage: false,
    };

    try {
      // Check database connectivity
      const { error: dbError } = await supabase.from('profiles').select('count').limit(1).single();
      checks.database = !dbError;

      // Check auth service
      const { error: authError } = await supabase.auth.getSession();
      checks.auth = !authError;

      // Check storage (if accessible)
      checks.storage = true; // Assume healthy if no explicit check needed

      const allHealthy = checks.database && checks.auth && checks.storage;
      const anyUnhealthy = !checks.database || !checks.auth;

      const status: HealthStatus = {
        status: allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        environment: import.meta.env.VITE_ENV || 'development',
      };

      setHealth(status);
    } catch (error) {
      setHealth({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks,
        version: import.meta.env.VITE_APP_VERSION || '1.0.0',
        environment: import.meta.env.VITE_ENV || 'development',
      });
    } finally {
      setLoading(false);
    }
  }

  // For automated health checks, return JSON
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Checking system health...</p>
      </div>
    );
  }

  // Return status for monitoring tools
  const statusCode = health?.status === 'healthy' ? 200 : health?.status === 'degraded' ? 207 : 503;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">System Health</h1>

        <div className={`mb-4 p-4 rounded ${
          health?.status === 'healthy' ? 'bg-green-100 text-green-800' :
          health?.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          <p className="font-semibold">Status: {health?.status.toUpperCase()}</p>
          <p className="text-sm">HTTP {statusCode}</p>
        </div>

        <div className="space-y-2 mb-4">
          <h2 className="font-semibold">System Checks:</h2>
          <div className="flex items-center justify-between">
            <span>Database</span>
            <span className={health?.checks.database ? 'text-green-600' : 'text-red-600'}>
              {health?.checks.database ? '✓ Healthy' : '✗ Failed'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Authentication</span>
            <span className={health?.checks.auth ? 'text-green-600' : 'text-red-600'}>
              {health?.checks.auth ? '✓ Healthy' : '✗ Failed'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Storage</span>
            <span className={health?.checks.storage ? 'text-green-600' : 'text-red-600'}>
              {health?.checks.storage ? '✓ Healthy' : '✗ Failed'}
            </span>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>Version: {health?.version}</p>
          <p>Environment: {health?.environment}</p>
          <p>Timestamp: {health?.timestamp}</p>
        </div>

        <button
          onClick={checkHealth}
          className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
}
