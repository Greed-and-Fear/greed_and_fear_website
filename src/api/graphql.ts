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

// User Stock Favorites
export interface StockDetailFromGraphQL {
  stock_id: number
  symbol: string
  company_name: string
  exchange?: { name: string } | null
  isin?: string | null
  scripcode?: number | null
  co_code?: number | null
  fincode?: number | null
  source_stock_id?: number | null
  source_company_id?: number | null
  pe?: number | null
  roe?: number | null
  market_cap?: number | null
  is_active?: boolean | null
  stock_current_price?: {
    close: number | null
    open: number | null
    high: number | null
    low: number | null
    change: number | null
    change_percent: number | null
    previous_close: number | null
    volume: number | null
    price_at: string | null
  } | null
}

export interface UserStockFavoriteRecord {
  user_stock_favourite_id: number | string
  user_id: number | string
  stock_id: number | string
  is_favourite: boolean
  created_at: string
  stock: StockDetailFromGraphQL
}

const GET_USER_FAVORITE_IDS_QUERY = `
  query GetUserFavoriteStockIds($userId: bigint!) {
    user_stock_favourite(
      where: { user_id: { _eq: $userId }, is_favourite: { _eq: true } }
    ) {
      stock_id
      is_favourite
    }
  }
`

export async function getUserFavoriteStockIds(userId: number | string): Promise<Set<number>> {
  try {
    const result = await graphqlRequest<{ user_stock_favourite: Array<{ stock_id: number | string; is_favourite: boolean }> }, { userId: number | string }>(
      GET_USER_FAVORITE_IDS_QUERY,
      { userId },
      'GetUserFavoriteStockIds',
    )
    const set = new Set<number>()
    result.user_stock_favourite.forEach((row) => {
      if (row.is_favourite) set.add(Number(row.stock_id))
    })
    return set
  } catch (error) {
    console.error('Failed to load user favorite IDs:', error)
    return new Set<number>()
  }
}

const GET_USER_FAVORITES_FULL_QUERY = `
  query GetUserFavoritesFull($userId: bigint!) {
    user_stock_favourite(
      where: {
        user_id: { _eq: $userId },
        is_favourite: { _eq: true },
        stock: { is_active: { _eq: true } }
      }
      order_by: { created_at: desc }
    ) {
      user_stock_favourite_id
      user_id
      stock_id
      is_favourite
      created_at
      stock {
        stock_id
        symbol
        company_name
        exchange { name }
        isin
        scripcode
        co_code
        fincode
        source_stock_id
        source_company_id
        pe
        roe
        market_cap
        is_active
        stock_current_price {
          close
          open
          high
          low
          change
          change_percent
          previous_close
          volume
          price_at
        }
      }
    }
  }
`

export async function getUserFavoriteStocks(userId: number | string): Promise<UserStockFavoriteRecord[]> {
  const result = await graphqlRequest<{ user_stock_favourite: UserStockFavoriteRecord[] }, { userId: number | string }>(
    GET_USER_FAVORITES_FULL_QUERY,
    { userId },
    'GetUserFavoritesFull',
  )
  return result.user_stock_favourite
}

const LOOKUP_STOCKS_BY_SYMBOLS_QUERY = `
  query LookupStocksBySymbols($symbols: [String!]) {
    stocks(where: { symbol: { _in: $symbols } }) {
      stock_id
      symbol
      source_stock_id
      is_active
    }
  }
`

export interface StockLookupInfo {
  stock_id: number
  symbol: string
  source_stock_id: number | null
  is_active: boolean
}

export async function lookupStocksBySymbols(symbols: string[]): Promise<Map<string, StockLookupInfo>> {
  if (!symbols.length) return new Map()
  try {
    const result = await graphqlRequest<{ stocks: StockLookupInfo[] }, { symbols: string[] }>(
      LOOKUP_STOCKS_BY_SYMBOLS_QUERY,
      { symbols },
      'LookupStocksBySymbols',
    )
    const map = new Map<string, StockLookupInfo>()
    result.stocks.forEach((s) => map.set(s.symbol.toUpperCase(), s))
    return map
  } catch (error) {
    console.error('Failed to lookup stocks by symbols:', error)
    return new Map()
  }
}

const UPDATE_USER_FAVOURITE_MUTATION = `
  mutation UpdateUserFavourite($userId: bigint!, $stockId: bigint!, $isFavorite: Boolean!) {
    update_user_stock_favourite(
      where: { user_id: { _eq: $userId }, stock_id: { _eq: $stockId } }
      _set: { is_favourite: $isFavorite }
    ) {
      affected_rows
      returning {
        user_stock_favourite_id
        user_id
        stock_id
        is_favourite
      }
    }
  }
`

const INSERT_USER_FAVOURITE_MUTATION = `
  mutation InsertUserFavourite($userId: bigint!, $stockId: bigint!, $isFavorite: Boolean!) {
    insert_user_stock_favourite_one(
      object: {
        user_id: $userId
        stock_id: $stockId
        is_favourite: $isFavorite
      }
    ) {
      user_stock_favourite_id
      user_id
      stock_id
      is_favourite
    }
  }
`

export async function toggleStockFavorite(
  userId: number | string,
  stockId: number | string,
  isFavorite: boolean,
): Promise<boolean> {
  const numericUserId = Number(userId)
  const numericStockId = Number(stockId)

  // 1. Try updating existing record
  const updateResult = await graphqlRequest<{
    update_user_stock_favourite: {
      affected_rows: number
      returning: Array<{ user_stock_favourite_id: number; is_favourite: boolean }>
    }
  }>(
    UPDATE_USER_FAVOURITE_MUTATION,
    { userId: numericUserId, stockId: numericStockId, isFavorite },
    'UpdateUserFavourite',
  )

  if (updateResult.update_user_stock_favourite.affected_rows === 0) {
    // 2. If row does not exist, insert
    await graphqlRequest(
      INSERT_USER_FAVOURITE_MUTATION,
      { userId: numericUserId, stockId: numericStockId, isFavorite },
      'InsertUserFavourite',
    )
  }

  // Notify listeners across components for real-time synchronization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gf:favorites_updated', {
        detail: { stockId: numericStockId, isFavorite },
      }),
    )
  }

  return isFavorite
}

// BSE MWPL Snapshots & Saturation Dashboard
export interface BseMwplSnapshotRow {
  bse_mwpl_snapshot_id: number | string
  scrip_code: number | string
  scrip_name: string
  isin: string
  mwpl: number | string
  open_interest: number | string
  permit_limit: number | string
  estimated_mwpl: number | string
  nse_exposure: number | string
  flag_80: string | null
  flag_95: string | null
  source_updated_at: string
  fetched_at: string
  stock: {
    stock_id: number
    symbol: string
    company_name: string
    exchange?: { name: string } | null
    stock_current_price?: {
      close: number | null
      change: number | null
      change_percent: number | null
      volume: number | null
      previous_close: number | null
      price_at: string | null
    } | null
  } | null
}

export type MwplRiskZone = 'In Ban' | 'Critical' | 'Elevated' | 'Moderate' | 'Normal'

export interface MwplSaturationStock {
  snapshotId: number
  stockId: number | null
  symbol: string
  companyName: string
  exchange: string
  isin: string
  scripCode: number
  mwpl: number
  openInterest: number
  permitLimit: number
  estimatedMwpl: number
  utilizationPercent: number
  remainingToBanPercent: number
  riskZone: MwplRiskZone
  currentPrice: number | null
  priceChange: number | null
  priceChangePercent: number | null
  volume: number | null
  sourceUpdatedAt: string
}

const LATEST_BSE_MWPL_SNAPSHOTS_QUERY = `
  query LatestBseMwplSnapshots {
    bse_mwpl_snapshots(
      distinct_on: [scrip_name]
      order_by: [{ scrip_name: asc }, { source_updated_at: desc }]
    ) {
      bse_mwpl_snapshot_id
      scrip_code
      scrip_name
      isin
      mwpl
      open_interest
      permit_limit
      estimated_mwpl
      nse_exposure
      flag_80
      flag_95
      source_updated_at
      fetched_at
      stock {
        stock_id
        symbol
        company_name
        exchange { name }
        stock_current_price {
          close
          change
          change_percent
          volume
          previous_close
          price_at
        }
      }
    }
  }
`

export async function getBseMwplSaturationData(): Promise<MwplSaturationStock[]> {
  const result = await graphqlRequest<{ bse_mwpl_snapshots: BseMwplSnapshotRow[] }>(
    LATEST_BSE_MWPL_SNAPSHOTS_QUERY,
    {},
    'LatestBseMwplSnapshots',
  )

  return result.bse_mwpl_snapshots
    .map((row) => {
      const mwpl = Number(row.mwpl) || 0
      const oi = Number(row.open_interest) || 0
      const util = mwpl > 0 ? (oi / mwpl) * 100 : 0
      const remaining = Math.max(0, 95 - util)

      let riskZone: MwplRiskZone = 'Normal'
      if (util >= 95) riskZone = 'In Ban'
      else if (util >= 85) riskZone = 'Critical'
      else if (util >= 75) riskZone = 'Elevated'
      else if (util >= 50) riskZone = 'Moderate'

      const p = row.stock?.stock_current_price
      return {
        snapshotId: Number(row.bse_mwpl_snapshot_id),
        stockId: row.stock?.stock_id ? Number(row.stock.stock_id) : null,
        symbol: row.scrip_name || row.stock?.symbol || '—',
        companyName: row.stock?.company_name || row.scrip_name || '—',
        exchange: row.stock?.exchange?.name || 'NSE',
        isin: row.isin || '—',
        scripCode: Number(row.scrip_code) || 0,
        mwpl,
        openInterest: oi,
        permitLimit: Number(row.permit_limit) || 0,
        estimatedMwpl: Number(row.estimated_mwpl) || 0,
        utilizationPercent: util,
        remainingToBanPercent: remaining,
        riskZone,
        currentPrice: p?.close != null ? Number(p.close) : null,
        priceChange: p?.change != null ? Number(p.change) : null,
        priceChangePercent: p?.change_percent != null ? Number(p.change_percent) : null,
        volume: p?.volume != null ? Number(p.volume) : null,
        sourceUpdatedAt: row.source_updated_at || row.fetched_at,
      }
    })
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
}


