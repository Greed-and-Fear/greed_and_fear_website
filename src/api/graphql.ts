import { scanStockUniverse, type RawStockMWPLRecord, type ProcessedStockData } from '../services/greedFearScanner.ts';

export const GRAPHQL_ENDPOINT = (import.meta.env.VITE_GRAPHQL_ENDPOINT as string | undefined) ?? 'https://gql.greedandfear.in/v1/graphql';

export const STOCK_MWPL_QUERY = `
  query StockMWPLQuery {
    stock_mwpl_history(order_by: [{scrip_name: asc}, {trade_date: desc}]) {
      id
      stock_id
      trade_date
      isin
      scrip_code
      scrip_name
      mwpl
      open_interest
      recorded_at
      stock {
        id
        symbol
        company_name
        exchange {
          name
        }
        stock_current_price {
          close
          previous_close
          change
          change_percent
          volume
          price_at
        }
      }
    }
  }
`;

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export interface StockMWPLHistoryQueryResult {
  stock_mwpl_history: RawStockMWPLRecord[];
}

/**
 * Fetch raw stock MWPL and Open Interest history from Hasura GraphQL backend.
 * If no local credentials are found, it queries the backend proxy endpoint to hide the secret.
 */
export async function fetchStockMWPLHistory(adminSecret?: string): Promise<RawStockMWPLRecord[]> {
  const secret = adminSecret || (import.meta.env.VITE_HASURA_ADMIN_SECRET as string | undefined);
  if (secret) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': secret,
    };

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operationName: 'StockMWPLQuery',
        query: STOCK_MWPL_QUERY,
        variables: {},
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with HTTP status ${response.status}`);
    }

    const result = (await response.json()) as GraphQLResponse<StockMWPLHistoryQueryResult>;
    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL Error: ${result.errors.map((e) => e.message).join(', ')}`);
    }

    return result.data?.stock_mwpl_history || [];
  }

  // Proxy call to backend to fetch raw data
  return apiRequest<RawStockMWPLRecord[]>('/api/market/raw-mwpl-history');
}

import { apiRequest } from './client.ts';

/**
 * Fetches data and processes it through the Greed & Fear scanner engine
 */
export async function getScannedStockData(adminSecret?: string): Promise<ProcessedStockData[]> {
  const rawRecords = await fetchStockMWPLHistory(adminSecret);
  return scanStockUniverse(rawRecords);
}
