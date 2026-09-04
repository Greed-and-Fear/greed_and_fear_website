import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from './api/client'
import {
  getUserFavoriteStocks,
  toggleStockFavorite,
  type UserStockFavoriteRecord,
} from './api/graphql'
import { getSessionUserId, useAuth } from './auth/auth-context'

export default function FavoriteStocksPage() {
  const { user } = useAuth()
  const userId = user?.id ?? getSessionUserId()
  const [favorites, setFavorites] = useState<UserStockFavoriteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [togglingStockId, setTogglingStockId] = useState<number | null>(null)

  const loadFavorites = async (quiet = false) => {
    if (!userId) {
      setLoading(false)
      return
    }
    if (!quiet) setLoading(true)
    setError('')
    try {
      const records = await getUserFavoriteStocks(userId)
      // Only show stocks that are active and marked as favourite
      const activeFavorites = records.filter(
        (rec) => rec.is_favourite && (rec.stock.is_active !== false),
      )
      setFavorites(activeFavorites)
    } catch (reason: unknown) {
      setError(getApiErrorMessage(reason, 'Unable to load favorite stocks.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFavorites()
  }, [userId])

  // Real-time synchronization when favorites change from AllStocksPage or other tabs
  useEffect(() => {
    const handleSync = () => {
      void loadFavorites(true)
    }
    window.addEventListener('gf:favorites_updated', handleSync)
    return () => window.removeEventListener('gf:favorites_updated', handleSync)
  }, [userId])

  const handleToggleFavorite = async (stockId: number, symbol: string) => {
    if (!userId) return

    // Optimistically remove from view since this is the Favorites dashboard
    const previous = [...favorites]
    setFavorites((prev) => prev.filter((rec) => Number(rec.stock.stock_id) !== stockId))
    setTogglingStockId(stockId)

    try {
      await toggleStockFavorite(userId, stockId, false)
    } catch (err) {
      console.error(`Failed to un-favorite ${symbol}:`, err)
      // Revert on error
      setFavorites(previous)
    } finally {
      setTogglingStockId(null)
    }
  }

  // Transform records to rows formatted identically to AllStocksPage
  const formattedRows = useMemo(() => {
    return favorites.map((rec) => {
      const s = rec.stock
      const p = s.stock_current_price
      return {
        id: s.stock_id,
        symbol: s.symbol,
        company: s.company_name,
        close: p?.close ?? '—',
        change: p?.change ?? '—',
        per_change: p?.change_percent ?? '—',
        open: p?.open ?? '—',
        high: p?.high ?? '—',
        low: p?.low ?? '—',
        volume: p?.volume ?? '—',
        prev_close: p?.previous_close ?? '—',
        exchange: s.exchange?.name ?? 'NSE',
        date: p?.price_at ? new Date(p.price_at).toLocaleString('en-IN') : '—',
        pe: s.pe ?? '—',
        roe: s.roe ?? '—',
        mcap: s.market_cap ?? '—',
        isin: s.isin ?? '—',
        scripcode: s.scripcode ?? '—',
        co_code: s.co_code ?? '—',
        FINCODE: s.fincode ?? '—',
        company_id: s.source_company_id ?? s.co_code ?? '—',
      } as Record<string, unknown>
    })
  }, [favorites])

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return formattedRows
    return formattedRows.filter((row) => {
      const sym = String(row.symbol || '').toLowerCase()
      const comp = String(row.company || '').toLowerCase()
      const isin = String(row.isin || '').toLowerCase()
      return sym.includes(term) || comp.includes(term) || isin.includes(term)
    })
  }, [formattedRows, searchTerm])

  const columns = useMemo(() => {
    if (!formattedRows[0]) return []
    return orderColumns(Object.keys(formattedRows[0]))
  }, [formattedRows])

  return (
    <section className="all-stocks-page favorite-stocks-page">
      <div className="all-stocks-toolbar">
        <div>
          <span>Favorited stocks</span>
          <strong>{favorites.length.toLocaleString('en-IN')}</strong>
        </div>
        <div>
          <span>Filtered</span>
          <strong>{filteredRows.length.toLocaleString('en-IN')}</strong>
        </div>
        <div className="favorite-search-box">
          <input
            type="text"
            placeholder="Filter favorites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="favorite-filter-input"
          />
        </div>
        <div className="all-stocks-links">
          <button onClick={() => void loadFavorites(false)}>↻ Refresh</button>
          <Link to="/market-data" className="browse-stocks-link">Browse all stocks →</Link>
        </div>
      </div>

      {loading && (
        <div className="stocks-loading" aria-live="polite">
          <span />
          <p>Loading your favorite stocks from GraphQL...</p>
        </div>
      )}

      {!loading && error && (
        <div className="stocks-error" role="alert">
          <strong>Favorite stocks could not be loaded</strong>
          <p>{error}</p>
          <button onClick={() => void loadFavorites(false)}>Try again</button>
        </div>
      )}

      {!loading && !error && favorites.length === 0 && (
        <div className="favorites-empty-state">
          <div className="empty-star-badge">★</div>
          <h2>No favorite stocks yet</h2>
          <p>
            You haven't starred any stocks yet. Open the All Stocks dashboard and click the star (★)
            on any row to save it to your personal institutional watchlist.
          </p>
          <Link to="/market-data" className="portal-primary">
            Explore All Stocks ↗
          </Link>
        </div>
      )}

      {!loading && !error && favorites.length > 0 && (
        <div className="raw-stock-table-wrap">
          <table className="raw-stock-table">
            <thead>
              <tr>
                <th className="star-col" title="Favorite stock">Fav</th>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => {
                const stockId = Number(row.id)
                const isPending = togglingStockId === stockId
                const symbol = String(row.symbol || '')

                return (
                  <tr key={String(row.id ?? index)}>
                    <td className="star-col">
                      <button
                        type="button"
                        className={`star-btn active ${isPending ? 'pending' : ''}`}
                        onClick={() => void handleToggleFavorite(stockId, symbol)}
                        title={`Remove ${symbol} from favorites`}
                        aria-label={`Remove ${symbol} from favorites`}
                      >
                        ★
                      </button>
                    </td>
                    {columns.map((column) => (
                      <td
                        className={
                          column === 'change' || column === 'per_change'
                            ? Number(row[column]) >= 0
                              ? 'positive'
                              : 'negative'
                            : undefined
                        }
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
