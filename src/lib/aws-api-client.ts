/**
 * AWS API Gateway Client
 * Replaces Supabase Client for database operations
 */

import { cognitoAuth } from './aws-cognito';

const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT || 'https://xmbq984faa.execute-api.us-east-1.amazonaws.com/prod';

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

// Export singleton instance
export const apiClient = new APIClient(API_BASE_URL);

// Export types
export type { APIClient, TableQueryBuilder };
