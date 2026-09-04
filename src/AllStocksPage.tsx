import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_BASE_URL, api, getApiErrorMessage, type PaginatedAllStocks } from './api/client'
import {
  getUserFavoriteStockIds,
  lookupStocksBySymbols,
  toggleStockFavorite,
  type StockLookupInfo,
} from './api/graphql'
import { getSessionUserId, useAuth } from './auth/auth-context'

const PAGE_SIZE = 100

export default function AllStocksPage() {
  const { user } = useAuth()
  const userId = user?.id ?? getSessionUserId()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedPage = Number(searchParams.get('page') ?? '1')
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const [data, setData] = useState<PaginatedAllStocks | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [linkCopied, setLinkCopied] = useState(false)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [stockMap, setStockMap] = useState<Map<string, StockLookupInfo>>(new Map())
  const [togglingStockId, setTogglingStockId] = useState<number | null>(null)

  // 1. Fetch user favorite IDs on mount or when userId changes
  useEffect(() => {
    if (!userId) return
    let active = true
    void getUserFavoriteStockIds(userId).then((favIds) => {
      if (active) setFavorites(favIds)
    })
    return () => {
      active = false
    }
  }, [userId])

  // 2. Listen for cross-dashboard favorite updates
  useEffect(() => {
    const handleSync = (e: Event) => {
      const { stockId, isFavorite } = (e as CustomEvent<{ stockId: number; isFavorite: boolean }>).detail
      setFavorites((prev) => {
        const next = new Set(prev)
        if (isFavorite) next.add(stockId)
        else next.delete(stockId)
        return next
      })
    }
    window.addEventListener('gf:favorites_updated', handleSync)
    return () => window.removeEventListener('gf:favorites_updated', handleSync)
  }, [])

  // 3. Fetch all-stocks page data
  useEffect(() => {
    const controller = new AbortController()
    api.allStocks(page, PAGE_SIZE, controller.signal)
      .then((response) => {
        setData(response)
        setError('')
        setLoading(false)

        // Resolve symbols to Hasura stock_id
        const symbols = response.results
          .map((r) => String(r.symbol || ''))
          .filter(Boolean)
        if (symbols.length > 0) {
          void lookupStocksBySymbols(symbols).then((map) => {
            setStockMap((prev) => new Map([...prev, ...map]))
          })
        }
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(getApiErrorMessage(reason, 'Unable to load stock data.'))
        setLoading(false)
      })
    return () => controller.abort()
  }, [page, retry])

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1
  const columns = useMemo(() => (data?.results[0] ? orderColumns(Object.keys(data.results[0])) : []), [data])

  const goToPage = (nextPage: number) => {
    setLoading(true)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(Math.max(1, Math.min(nextPage, totalPages))))
    setSearchParams(nextParams)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const copyPageLink = async () => {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(window.location.href)
    else window.prompt('Copy this page link:', window.location.href)
    setLinkCopied(true)
    window.setTimeout(() => setLinkCopied(false), 1800)
  }

  const handleToggleFavorite = async (row: Record<string, unknown>) => {
    const currentUserId = userId ?? getSessionUserId()
    if (!currentUserId) {
      alert('Please log in to add stocks to your favorites.')
      return
    }

    const symbol = String(row.symbol || '').toUpperCase()
    let stockInfo = stockMap.get(symbol)

    if (!stockInfo) {
      // Lazy lookup
      const freshMap = await lookupStocksBySymbols([symbol])
      stockInfo = freshMap.get(symbol)
      if (stockInfo) {
        setStockMap((prev) => new Map([...prev, [symbol, stockInfo!]]))
      }
    }

    const stockId = stockInfo?.stock_id ?? (Number(row.id) || null)
    if (!stockId) {
      console.warn('Could not resolve stock_id for symbol:', symbol)
      return
    }

    const currentlyFav = favorites.has(stockId)
    const nextFavState = !currentlyFav

    // Optimistic UI update
    setFavorites((prev) => {
      const next = new Set(prev)
      if (nextFavState) next.add(stockId)
      else next.delete(stockId)
      return next
    })

    setTogglingStockId(stockId)
    try {
      await toggleStockFavorite(currentUserId, stockId, nextFavState)
    } catch (err) {
      // Revert on failure
      console.error('Failed to toggle favorite:', err)
      setFavorites((prev) => {
        const next = new Set(prev)
        if (currentlyFav) next.add(stockId)
        else next.delete(stockId)
        return next
      })
    } finally {
      setTogglingStockId(null)
    }
  }

  return (
    <section className="all-stocks-page">
      <div className="all-stocks-toolbar">
        <div><span>Source records</span><strong>{data?.count.toLocaleString('en-IN') ?? '—'}</strong></div>
        <div><span>Rows per page</span><strong>{PAGE_SIZE}</strong></div>
        <div><span>Current page</span><strong>{page} / {totalPages}</strong></div>
        <div className="all-stocks-links">
          <button onClick={() => void copyPageLink()}>{linkCopied ? 'Link copied' : 'Copy page link'}</button>
          <a href={`${API_BASE_URL}/api/market/all-stocks?ascending=true&by=company&page=${page}&per_page=100`} target="_blank" rel="noreferrer">Open API ↗</a>
        </div>
      </div>

      {loading && <div className="stocks-loading" aria-live="polite"><span /><p>Loading page {page} with {PAGE_SIZE} records...</p></div>}
      {!loading && error && <div className="stocks-error" role="alert"><strong>Stock data could not be loaded</strong><p>{error}</p><button onClick={() => { setLoading(true); setRetry((value) => value + 1) }}>Try again</button></div>}
      {!loading && data && (
        <>
          <div className="raw-stock-table-wrap">
            <table className="raw-stock-table">
              <thead>
                <tr>
                  <th className="star-col" title="Favorite stock">Fav</th>
                  {columns.map((column) => <th key={column}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.results.map((row, index) => {
                  const symbol = String(row.symbol || '').toUpperCase()
                  const stockInfo = stockMap.get(symbol)
                  const stockId = stockInfo?.stock_id ?? (Number(row.id) || null)
                  const isFavorited = stockId ? favorites.has(stockId) : false
                  const isPending = togglingStockId === stockId

                  return (
                    <tr key={String(row.id ?? `${page}-${index}`)}>
                      <td className="star-col">
                        <button
                          type="button"
                          className={`star-btn ${isFavorited ? 'active' : ''} ${isPending ? 'pending' : ''}`}
                          onClick={() => void handleToggleFavorite(row)}
                          title={isFavorited ? `Remove ${symbol} from favorites` : `Add ${symbol} to favorites`}
                          aria-label={isFavorited ? `Remove ${symbol} from favorites` : `Add ${symbol} to favorites`}
                        >
                          ★
                        </button>
                      </td>
                      {columns.map((column) => (
                        <td
                          className={column === 'change' || column === 'per_change' ? Number(row[column]) >= 0 ? 'positive' : 'negative' : undefined}
                          key={column}
                        >
                          {renderValue(row[column])}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <footer className="stocks-pagination">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.count)} of {data.count.toLocaleString('en-IN')}</span>
            <div>
              <button onClick={() => goToPage(1)} disabled={!data.previous}>First</button>
              <button onClick={() => goToPage(page - 1)} disabled={!data.previous}>← Previous</button>
              <strong>Page {page} of {totalPages}</strong>
              <button onClick={() => goToPage(page + 1)} disabled={!data.next}>Next →</button>
              <button onClick={() => goToPage(totalPages)} disabled={!data.next}>Last</button>
            </div>
          </footer>
        </>
      )}
    </section>
  )
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function orderColumns(columns: string[]) {
  const middle = columns.filter((column) => !['id', 'symbol', 'company', 'close', 'company_id'].includes(column))
  return ['id', 'symbol', 'company', 'close', ...middle, 'company_id'].filter((column) => columns.includes(column))
}
