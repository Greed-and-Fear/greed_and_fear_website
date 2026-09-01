export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://greedandfear.in').replace(/\/$/, '')

export interface ValidationIssue {
  type: string
  loc: Array<string | number>
  msg: string
  input?: unknown
}

export interface ApiErrorBody {
  detail: string | ValidationIssue[]
}

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly body: ApiErrorBody | null) {
    super(getApiErrorMessage(body, `API request failed with status ${status}`))
  }
}

interface ApiRequestInit extends RequestInit {
  handleUnauthorized?: boolean
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { handleUnauthorized = true, ...requestInit } = init
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestInit,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(requestInit.body ? { 'Content-Type': 'application/json' } : {}),
      ...requestInit.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ApiErrorBody | null
    if (response.status === 401 && handleUnauthorized) unauthorizedHandler?.()
    throw new ApiRequestError(response.status, body)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ApiRequestError) return error.message
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'detail' in error) {
    const detail = (error as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((issue) => (issue as ValidationIssue).msg).join(', ')
  }
  return fallback
}

export interface User {
  id: number
  name: string
  phone: string
  plan: string
}

export interface GraphQLError {
  message: string
  path?: Array<string | number>
  extensions?: Record<string, unknown>
}

interface GraphQLResponse<T> {
  data?: T
  errors?: GraphQLError[]
}

export class GraphQLRequestError extends Error {
  constructor(public readonly errors: GraphQLError[]) {
    super(errors.map((error) => error.message).join(', '))
  }
}

export async function graphqlRequest<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(query: string, variables?: TVariables, operationName?: string): Promise<TData> {
  const response = await apiRequest<GraphQLResponse<TData>>('/api/graphql', {
    method: 'POST',
    body: JSON.stringify({ query, variables: variables ?? {}, operationName }),
  })
  if (response.errors?.length) throw new GraphQLRequestError(response.errors)
  if (response.data === undefined) throw new Error('GraphQL response did not contain data')
  return response.data
}

export interface MwplHistoryRow {
  trade_date: string
  isin: string
  scrip_code: number
  scrip_name: string
  mwpl: number
  open_interest: number | string
  recorded_at: string
}

export async function getLatestMwpl(): Promise<MwplHistoryRow[]> {
  const result = await graphqlRequest<{ stock_mwpl_history: MwplHistoryRow[] }>(`
    query LatestMwpl {
      stock_mwpl_history(order_by: [{ trade_date: desc }, { scrip_name: asc }], limit: 500) {
        trade_date
        isin
        scrip_code
        scrip_name
        mwpl
        open_interest
        recorded_at
      }
    }
  `, {}, 'LatestMwpl')
  return result.stock_mwpl_history
}

export interface MarketSnapshot {
  name: string
  value: string
  change_percent: string | null
  detail: string | null
  tone: string | null
  captured_at: string
}

export interface StockMetric {
  symbol: string
  mwpl: string
  one_day_change: string
  two_day_change: string
  price_change: string
  oi_change: string
  volume_change: string
  signal: string
  score: number
  captured_at: string
}

export interface MarketAlert {
  id: number
  symbol: string
  message: string
  created_at: string
}

export interface NewsArticle {
  id: number
  category: string
  title: string
  summary: string
  source: string
  published_at: string
}

export interface ContactRequest {
  name: string
  phone: string
  subject: string
  message: string
}

export interface ContactResponse {
  reference: string
  received_at: string
}

export interface PaginatedAllStocks {
  count: number
  next: string | null
  previous: string | null
  results: Array<Record<string, unknown>>
}

export type BoardStatus = 'under_watch' | 'in_ban' | 'ban_lifted' | 'in_trade' | 'exited_profit' | 'exited_loss'

export interface StockSearchResult {
  id: number
  symbol: string
  company_name: string
  exchange: string
  isin: string | null
  current_price: string | null
  change: string | null
  change_percent: string | null
  price_at: string | null
}

export interface BoardPosition {
  id: number
  reference: string
  stock_id: number
  symbol: string
  company_name: string
  exchange: string
  owner_user_id: number | null
  owner_name: string | null
  status: BoardStatus
  buy_price: string | null
  current_price: string | null
  pnl_percent: string | null
  quantity: string | null
  target_price: string | null
  stop_loss: string | null
  notes: string | null
  opened_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface BoardPositionInput {
  owner_user_id?: number | null
  buy_price?: string | null
  quantity?: string | null
  target_price?: string | null
  stop_loss?: string | null
  notes?: string | null
}

export const api = {
  login: (phone: string, password: string) => apiRequest<User>('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone, password }) }),
  currentUser: async () => {
    try { return await apiRequest<User>('/api/auth/me', { handleUnauthorized: false }) }
    catch (error) { if (error instanceof ApiRequestError && error.status === 401) return null; throw error }
  },
  logout: () => apiRequest<void>('/api/auth/logout', { method: 'POST' }),
  snapshots: () => apiRequest<MarketSnapshot[]>('/api/market/snapshots'),
  stockMetrics: (limit = 100) => apiRequest<StockMetric[]>(`/api/stocks?${new URLSearchParams({ limit: String(limit) })}`),
  alerts: (limit = 50) => apiRequest<MarketAlert[]>(`/api/alerts?${new URLSearchParams({ limit: String(limit) })}`),
  news: (search = '', limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (search.trim()) params.set('search', search.trim())
    return apiRequest<NewsArticle[]>(`/api/news?${params}`)
  },
  contact: (request: ContactRequest) => apiRequest<ContactResponse>('/api/contact', { method: 'POST', body: JSON.stringify(request) }),
  allStocks: (page: number, perPage = 100, signal?: AbortSignal) => apiRequest<PaginatedAllStocks>(`/api/market/all-stocks?${new URLSearchParams({ ascending: 'true', by: 'company', page: String(page), per_page: String(perPage) })}`, { signal }),
  searchCatalog: (search: string, exchange?: string) => {
    const params = new URLSearchParams({ search: search.trim(), limit: '20' })
    if (exchange) params.set('exchange', exchange)
    return apiRequest<StockSearchResult[]>(`/api/catalog/stocks?${params}`)
  },
  board: (search = '') => {
    const params = new URLSearchParams({ limit: '500' })
    if (search.trim()) params.set('search', search.trim())
    return apiRequest<BoardPosition[]>(`/api/board/positions?${params}`)
  },
  createBoardPosition: (stockId: number, status: BoardStatus, input: BoardPositionInput) => apiRequest<BoardPosition>('/api/board/positions', { method: 'POST', body: JSON.stringify({ stock_id: stockId, status, ...input }) }),
  updateBoardPosition: (id: number, input: BoardPositionInput) => apiRequest<BoardPosition>(`/api/board/positions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  moveBoardPosition: (id: number, status: BoardStatus, userId?: number) => apiRequest<BoardPosition>(`/api/board/positions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, changed_by_user_id: userId ?? null }) }),
  deleteBoardPosition: (id: number) => apiRequest<void>(`/api/board/positions/${id}`, { method: 'DELETE' }),
}

export * from '../services/greedFearScanner.ts'

