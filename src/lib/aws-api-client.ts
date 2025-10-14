/**
 * AWS API Gateway Client
 * Replaces Supabase Client for database operations
 */

import { cognitoAuth } from './aws-cognito';

const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || 'https://cyf1w472y8.execute-api.us-east-1.amazonaws.com';

console.log('[aws-api-client] VITE_API_ENDPOINT:', import.meta.env.VITE_API_ENDPOINT);
console.log('[aws-api-client] API_BASE_URL:', API_BASE_URL);

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: APIError | null }> {
    try {
      const accessToken = cognitoAuth.getAccessToken();

      if (!accessToken) {
        throw new APIError('Not authenticated', 401, 'UNAUTHORIZED');
      }

      const url = `${this.baseUrl}/${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.message || errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData.code
        );
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      if (error instanceof APIError) {
        return { data: null, error };
      }
      return {
        data: null,
        error: new APIError(
          error instanceof Error ? error.message : 'Request failed',
          500
        ),
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<{ data: T | null; error: APIError | null }> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<{ data: T | null; error: APIError | null }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<{ data: T | null; error: APIError | null }> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<{ data: T | null; error: APIError | null }> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Database-like query builder (mimics Supabase API)

  /**
   * Query builder for table operations
   */
  from(table: string) {
    return new TableQueryBuilder(this, table);
  }

  /**
   * Call AWS Lambda function (replaces Supabase RPC)
   * Mimics: supabase.rpc('function_name', { params })
   */
  async rpc<T>(
    functionName: string,
    params?: Record<string, any>
  ): Promise<{ data: T | null; error: APIError | null }> {
    return this.post<T>(`rpc/${functionName}`, params);
  }

  /**
   * Create realtime channel (polling implementation)
   * Mimics: supabase.channel(name)
   */
  channel(channelName: string) {
    return new RealtimeChannel(this, channelName);
  }

  /**
   * Remove channel (cleanup)
   */
  removeChannel(channel: RealtimeChannel): void {
    channel.unsubscribe();
  }

  /**
   * Remove all channels
   */
  removeAllChannels(): void {
    // Cleanup handled by individual channels
  }
}

class TableQueryBuilder {
  private client: APIClient;
  private table: string;
  private filters: Record<string, any> = {};
  private selectedColumns: string[] = [];
  private orderByField?: string;
  private orderDirection?: 'asc' | 'desc';
  private limitValue?: number;
  private offsetValue?: number;

  constructor(client: APIClient, table: string) {
    this.client = client;
    this.table = table;
  }

  /**
   * Select specific columns
   */
  select(columns: string = '*') {
    if (columns !== '*') {
      this.selectedColumns = columns.split(',').map(c => c.trim());
    }
    return this;
  }

  /**
   * Equality filter
   */
  eq(column: string, value: any) {
    this.filters[`${column}_eq`] = value;
    return this;
  }

  /**
   * Not equal filter
   */
  neq(column: string, value: any) {
    this.filters[`${column}_neq`] = value;
    return this;
  }

  /**
   * Greater than filter
   */
  gt(column: string, value: any) {
    this.filters[`${column}_gt`] = value;
    return this;
  }

  /**
   * Less than filter
   */
  lt(column: string, value: any) {
    this.filters[`${column}_lt`] = value;
    return this;
  }

  /**
   * IN filter
   */
  in(column: string, values: any[]) {
    this.filters[`${column}_in`] = values;
    return this;
  }

  /**
   * Order by
   */
  order(column: string, options?: { ascending?: boolean }) {
    this.orderByField = column;
    this.orderDirection = options?.ascending === false ? 'desc' : 'asc';
    return this;
  }

  /**
   * Limit results
   */
  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  /**
   * Offset results
   */
  offset(count: number) {
    this.offsetValue = count;
    return this;
  }

  /**
   * Execute SELECT query
   */
  async execute<T>(): Promise<{ data: T[] | null; error: APIError | null }> {
    const params = new URLSearchParams();

    // Add filters
    Object.entries(this.filters).forEach(([key, value]) => {
      params.append(key, JSON.stringify(value));
    });

    // Add select
    if (this.selectedColumns.length > 0) {
      params.append('select', this.selectedColumns.join(','));
    }

    // Add order
    if (this.orderByField) {
      params.append('order_by', this.orderByField);
      params.append('order_dir', this.orderDirection || 'asc');
    }

    // Add pagination
    if (this.limitValue) {
      params.append('limit', this.limitValue.toString());
    }
    if (this.offsetValue) {
      params.append('offset', this.offsetValue.toString());
    }

    const queryString = params.toString();
    const endpoint = `query/${this.table}${queryString ? `?${queryString}` : ''}`;

    return this.client.get<T[]>(endpoint);
  }

  /**
   * Insert data
   */
  async insert(data: any): Promise<{ data: any | null; error: APIError | null }> {
    return this.client.post(`insert/${this.table}`, data);
  }

  /**
   * Update data
   */
  async update(data: any): Promise<{ data: any | null; error: APIError | null }> {
    return this.client.put(`update/${this.table}`, {
      filters: this.filters,
      data,
    });
  }

  /**
   * Delete data
   */
  async delete(): Promise<{ data: any | null; error: APIError | null }> {
    return this.client.post(`delete/${this.table}`, {
      filters: this.filters,
    });
  }

  /**
   * Execute query and get single result
   */
  async single<T>(): Promise<{ data: T | null; error: APIError | null }> {
    this.limitValue = 1;
    const result = await this.execute<T>();

    if (result.error) {
      return result;
    }

    return {
      data: result.data && result.data.length > 0 ? result.data[0] : null,
      error: null,
    };
  }

  /**
   * Execute query and get first result (alias for single)
   */
  async maybeSingle<T>(): Promise<{ data: T | null; error: APIError | null }> {
    return this.single<T>();
  }
}

/**
 * Realtime Channel - Polling-based implementation
 * Replaces Supabase Realtime with polling
 */
class RealtimeChannel {
  private client: APIClient;
  private channelName: string;
  private listeners: Map<string, Function[]> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPollTime: string = new Date().toISOString();
  private isSubscribed: boolean = false;

  constructor(client: APIClient, channelName: string) {
    this.client = client;
    this.channelName = channelName;
  }

  /**
   * Listen to database changes
   * Mimics: channel.on('postgres_changes', { event, schema, table, filter }, callback)
   */
  on(
    event: string,
    config: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema?: string;
      table?: string;
      filter?: string;
    },
    callback: (payload: any) => void
  ) {
    const key = `${event}-${config.table}`;

    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    this.listeners.get(key)!.push(callback);

    return this;
  }

  /**
   * Subscribe to channel and start polling
   * Mimics: channel.subscribe()
   */
  async subscribe() {
    if (this.isSubscribed) return 'SUBSCRIBED';

    this.isSubscribed = true;

    // Start polling every 3 seconds
    this.pollingInterval = setInterval(async () => {
      await this.poll();
    }, 3000);

    return 'SUBSCRIBED';
  }

  /**
   * Poll for new changes
   */
  private async poll() {
    for (const [key, callbacks] of this.listeners.entries()) {
      const [event, table] = key.split('-');

      if (table) {
        // Poll table for changes since last poll
        const { data, error } = await this.client.get(
          `${table}?since=${this.lastPollTime}`
        );

        if (data && !error && Array.isArray(data) && data.length > 0) {
          // Trigger callbacks for each change
          for (const item of data) {
            for (const callback of callbacks) {
              callback({
                eventType: 'INSERT', // Simplified - assume INSERT
                new: item,
                old: null,
                schema: 'public',
                table,
              });
            }
          }
        }
      }
    }

    this.lastPollTime = new Date().toISOString();
  }

  /**
   * Unsubscribe from channel
   * Mimics: channel.unsubscribe()
   */
  unsubscribe() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.isSubscribed = false;
    this.listeners.clear();

    return 'UNSUBSCRIBED';
  }
}

// Export singleton instance
export const apiClient = new APIClient(API_BASE_URL);

// Export compatibility alias for easier migration
export const supabase = {
  from: (table: string) => apiClient.from(table),
  rpc: (fn: string, params?: any) => apiClient.rpc(fn, params),
  channel: (name: string) => apiClient.channel(name),
  removeChannel: (channel: any) => apiClient.removeChannel(channel),
  removeAllChannels: () => apiClient.removeAllChannels(),

  // Mock auth methods (Cognito handles auth)
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },

  // Mock storage (use awsStorage instead)
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: new Error('Use awsStorage instead') }),
      download: () => Promise.resolve({ data: null, error: new Error('Use awsStorage instead') }),
      remove: () => Promise.resolve({ data: null, error: new Error('Use awsStorage instead') }),
      list: () => Promise.resolve({ data: [], error: new Error('Use awsStorage instead') }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
};

// Export types
export type { APIClient, TableQueryBuilder, RealtimeChannel };
