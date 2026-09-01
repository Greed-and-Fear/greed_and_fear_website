import { graphqlRequest } from './client'
import { scanStockUniverse, type ProcessedStockData, type RawStockMWPLRecord } from '../services/greedFearScanner'

export const STOCK_MWPL_QUERY = `
  query StockMWPLQuery {
    stock_mwpl_history(order_by: [{ scrip_name: asc }, { trade_date: desc }]) {
      stock_mwpl_history_id
      stock_id
      trade_date
      isin
      scrip_code
      scrip_name
      mwpl
      open_interest
      recorded_at
      stock {
        stock_id
        symbol
        company_name
        exchange { name }
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
`

interface StockMWPLHistoryQueryResult {
  stock_mwpl_history: RawStockMWPLRecord[]
}

export async function fetchStockMWPLHistory(): Promise<RawStockMWPLRecord[]> {
  const result = await graphqlRequest<StockMWPLHistoryQueryResult>(STOCK_MWPL_QUERY, {}, 'StockMWPLQuery')
  return result.stock_mwpl_history
}

export async function getScannedStockData(): Promise<ProcessedStockData[]> {
  return scanStockUniverse(await fetchStockMWPLHistory())
}

export interface GlobalIndexDefinition {
  global_index_id: number | string
  source_symbol: string
  name: string
  market_region: string
  flag_url: string | null
  detail_available: boolean
  is_derived: boolean
  is_active: boolean
}

export interface GlobalIndexPrice {
  global_index_id: number | string
  price: number | string | null
  net_change: number | string | null
  percent_change: number | string | null
  open: number | string | null
  high: number | string | null
  low: number | string | null
  previous_close: number | string | null
  week_52_high: number | string | null
  week_52_low: number | string | null
  weekly_percent_change: number | string | null
  monthly_percent_change: number | string | null
  three_month_percent_change: number | string | null
  six_month_percent_change: number | string | null
  ytd_percent_change: number | string | null
  yearly_percent_change: number | string | null
  technical_rating: string | null
  market_state: string | null
  source_message: string | null
  source_updated_at: string
  fetched_at: string
}

export interface GlobalIndexLive extends GlobalIndexDefinition {
  current: GlobalIndexPrice | null
}

export interface GlobalIndexHistoryRow extends GlobalIndexPrice {
  global_index_history_id: number | string
}

const GLOBAL_INDEX_LIVE_QUERY = `
  query GlobalIndexLive {
    global_indices(where: { is_active: { _eq: true } }, order_by: [{ market_region: asc }, { name: asc }]) {
      global_index_id
      source_symbol
      name
      market_region
      flag_url
      detail_available
      is_derived
      is_active
    }
    global_index_current(order_by: { source_updated_at: desc }) {
      global_index_id
      price
      net_change
      percent_change
      open
      high
      low
      previous_close
      week_52_high
      week_52_low
      weekly_percent_change
      monthly_percent_change
      three_month_percent_change
      six_month_percent_change
      ytd_percent_change
      yearly_percent_change
      technical_rating
      market_state
      source_message
      source_updated_at
      fetched_at
    }
  }
`

export async function getGlobalIndicesLive(): Promise<GlobalIndexLive[]> {
  const result = await graphqlRequest<{ global_indices: GlobalIndexDefinition[]; global_index_current: GlobalIndexPrice[] }>(GLOBAL_INDEX_LIVE_QUERY, {}, 'GlobalIndexLive')
  const currentById = new Map(result.global_index_current.map((current) => [String(current.global_index_id), current]))
  return result.global_indices.map((index) => ({ ...index, current: currentById.get(String(index.global_index_id)) ?? null }))
}

const GLOBAL_INDEX_HISTORY_QUERY = `
  query GlobalIndexHistory($indexId: bigint!, $from: timestamptz!, $limit: Int!) {
    global_index_history(
      where: { global_index_id: { _eq: $indexId }, source_updated_at: { _gte: $from } }
      order_by: { source_updated_at: asc }
      limit: $limit
    ) {
      global_index_history_id
      global_index_id
      price
      net_change
      percent_change
      open
      high
      low
      previous_close
      week_52_high
      week_52_low
      weekly_percent_change
      monthly_percent_change
      three_month_percent_change
      six_month_percent_change
      ytd_percent_change
      yearly_percent_change
      technical_rating
      market_state
      source_message
      source_updated_at
      fetched_at
    }
  }
`

export async function getGlobalIndexHistory(indexId: number | string, from: string, limit = 1000): Promise<GlobalIndexHistoryRow[]> {
  const result = await graphqlRequest<{ global_index_history: GlobalIndexHistoryRow[] }, { indexId: number | string; from: string; limit: number }>(
    GLOBAL_INDEX_HISTORY_QUERY,
    { indexId, from, limit },
    'GlobalIndexHistory',
  )
  return result.global_index_history
}
