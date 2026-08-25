export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://api.greedandfear.in').replace(/\/$/, '')

export interface ValidationIssue {
  type: string
  loc: Array<string | number>
  msg: string
  input?: unknown
}

export class ApiRequestError extends Error {
  constructor(public readonly status: number, public readonly body: unknown) {
    super(getApiErrorMessage(body, `API request failed with status ${status}`))
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as unknown
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
