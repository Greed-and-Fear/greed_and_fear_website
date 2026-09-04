import { useEffect, useMemo, useState } from 'react'
import { getApiErrorMessage } from './api/client'
import {
  getBseMwplSaturationData,
  getUserFavoriteStockIds,
  toggleStockFavorite,
  type MwplSaturationStock,
} from './api/graphql'
import { getSessionUserId, useAuth } from './auth/auth-context'

type FilterCategory = 'ALL' | 'BAN' | 'CRITICAL' | 'ELEVATED' | 'MODERATE' | 'NORMAL'
type SortField = 'utilization' | 'remaining' | 'oi' | 'price_change' | 'symbol'

export default function MwplSaturationPage() {
  const { user } = useAuth()
  const userId = user?.id ?? getSessionUserId()
  const [stocks, setStocks] = useState<MwplSaturationStock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterCategory>('ALL')
  const [sortField, setSortField] = useState<SortField>('utilization')
  const [sortAsc, setSortAsc] = useState(false)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [togglingStockId, setTogglingStockId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // 1. Fetch user favorite IDs
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

  // 2. Listen to cross-dashboard favorite updates
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

  // 3. Load BSE MWPL Snapshots
  useEffect(() => {
    let active = true
    getBseMwplSaturationData()
      .then((data) => {
        if (!active) return
        setStocks(data)
        setError('')
        setLoading(false)
        setRefreshing(false)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(getApiErrorMessage(reason, 'Unable to load MWPL snapshot data.'))
        setLoading(false)
        setRefreshing(false)
      })
    return () => {
      active = false
    }
  }, [refreshKey])

  const handleRefresh = () => {
    setRefreshing(true)
    setRefreshKey((k) => k + 1)
  }

  // Toggle favorite
  const handleToggleFavorite = async (stock: MwplSaturationStock) => {
    if (!userId || !stock.stockId) {
      alert('Please sign in to favorite stocks.')
      return
    }

    const stockId = stock.stockId
    const currentlyFav = favorites.has(stockId)
    const nextFavState = !currentlyFav

    setFavorites((prev) => {
      const next = new Set(prev)
      if (nextFavState) next.add(stockId)
      else next.delete(stockId)
      return next
    })

    setTogglingStockId(stockId)
    try {
      await toggleStockFavorite(userId, stockId, nextFavState)
    } catch (err) {
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

  // Summary counts
  const banCount = useMemo(() => stocks.filter((s) => s.utilizationPercent >= 95).length, [stocks])
  const criticalCount = useMemo(
    () => stocks.filter((s) => s.utilizationPercent >= 85 && s.utilizationPercent < 95).length,
    [stocks],
  )
  const elevatedCount = useMemo(
    () => stocks.filter((s) => s.utilizationPercent >= 75 && s.utilizationPercent < 85).length,
    [stocks],
  )
  const moderateCount = useMemo(
    () => stocks.filter((s) => s.utilizationPercent >= 50 && s.utilizationPercent < 75).length,
    [stocks],
  )
  const normalCount = useMemo(() => stocks.filter((s) => s.utilizationPercent < 50).length, [stocks])

  const avgSaturation = useMemo(() => {
    if (stocks.length === 0) return 0
    const sum = stocks.reduce((acc, s) => acc + s.utilizationPercent, 0)
    return sum / stocks.length
  }, [stocks])

  // Filtered and sorted stocks
  const displayedStocks = useMemo(() => {
    let list = stocks

    // Category filter
    if (filter === 'BAN') list = list.filter((s) => s.utilizationPercent >= 95)
    else if (filter === 'CRITICAL') list = list.filter((s) => s.utilizationPercent >= 85 && s.utilizationPercent < 95)
    else if (filter === 'ELEVATED') list = list.filter((s) => s.utilizationPercent >= 75 && s.utilizationPercent < 85)
    else if (filter === 'MODERATE') list = list.filter((s) => s.utilizationPercent >= 50 && s.utilizationPercent < 75)
    else if (filter === 'NORMAL') list = list.filter((s) => s.utilizationPercent < 50)

    // Search filter
    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter(
        (s) =>
          s.symbol.toLowerCase().includes(term) ||
          s.companyName.toLowerCase().includes(term) ||
          String(s.scripCode).includes(term),
      )
    }

    // Sort
    return [...list].sort((a, b) => {
      let comparison = 0
      if (sortField === 'utilization') comparison = a.utilizationPercent - b.utilizationPercent
      else if (sortField === 'remaining') comparison = a.remainingToBanPercent - b.remainingToBanPercent
      else if (sortField === 'oi') comparison = a.openInterest - b.openInterest
      else if (sortField === 'price_change') comparison = (a.priceChangePercent ?? 0) - (b.priceChangePercent ?? 0)
      else if (sortField === 'symbol') comparison = a.symbol.localeCompare(b.symbol)

      return sortAsc ? comparison : -comparison
    })
  }, [stocks, filter, search, sortField, sortAsc])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const latestTimestamp = stocks[0]?.sourceUpdatedAt

  return (
    <section className="mwpl-saturation-page">
      {/* Top KPI Metrics Cards */}
      <div className="saturation-kpi-grid">
        <article className="kpi-card tone-ban">
          <div>
            <span>In Ban Zone (≥95%)</span>
            <strong>{banCount}</strong>
            <small>F&O trading entry restricted</small>
          </div>
          <div className="kpi-icon">⛔</div>
        </article>
        <article className="kpi-card tone-critical">
          <div>
            <span>Critical Saturation (85–95%)</span>
            <strong>{criticalCount}</strong>
            <small>Imminent ban candidates</small>
          </div>
          <div className="kpi-icon">⚠️</div>
        </article>
        <article className="kpi-card tone-elevated">
          <div>
            <span>High Saturation (75–85%)</span>
            <strong>{elevatedCount}</strong>
            <small>Position limits building</small>
          </div>
          <div className="kpi-icon">📈</div>
        </article>
        <article className="kpi-card tone-avg">
          <div>
            <span>Average Saturation</span>
            <strong>{avgSaturation.toFixed(1)}%</strong>
            <small>Across all tracked F&O stocks</small>
          </div>
          <div className="kpi-icon">📊</div>
        </article>
        <article className="kpi-card tone-universe">
          <div>
            <span>Tracked Universe</span>
            <strong>{stocks.length}</strong>
            <small>BSE MWPL snapshot feeds</small>
          </div>
          <div className="kpi-icon">🎯</div>
        </article>
      </div>

      {/* Control Bar: Filter Pills & Search */}
      <div className="saturation-toolbar">
        <div className="filter-pill-group">
          <button
            type="button"
            className={filter === 'ALL' ? 'filter-pill active' : 'filter-pill'}
            onClick={() => setFilter('ALL')}
          >
            All Stocks ({stocks.length})
          </button>
          <button
            type="button"
            className={filter === 'BAN' ? 'filter-pill ban active' : 'filter-pill ban'}
            onClick={() => setFilter('BAN')}
          >
            In Ban ({banCount})
          </button>
          <button
            type="button"
            className={filter === 'CRITICAL' ? 'filter-pill critical active' : 'filter-pill critical'}
            onClick={() => setFilter('CRITICAL')}
          >
            Critical 85–95% ({criticalCount})
          </button>
          <button
            type="button"
            className={filter === 'ELEVATED' ? 'filter-pill elevated active' : 'filter-pill elevated'}
            onClick={() => setFilter('ELEVATED')}
          >
            High 75–85% ({elevatedCount})
          </button>
          <button
            type="button"
            className={filter === 'MODERATE' ? 'filter-pill active' : 'filter-pill'}
            onClick={() => setFilter('MODERATE')}
          >
            Moderate 50–75% ({moderateCount})
          </button>
          <button
            type="button"
            className={filter === 'NORMAL' ? 'filter-pill active' : 'filter-pill'}
            onClick={() => setFilter('NORMAL')}
          >
            Normal &lt;50% ({normalCount})
          </button>
        </div>

        <div className="saturation-actions">
          <input
            type="text"
            className="saturation-search-input"
            placeholder="Search symbol, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="saturation-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? '↻ Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {latestTimestamp && (
        <div className="saturation-meta-bar">
          <span>Source: <strong>BSE MWPL Snapshots</strong></span>
          <span>Latest Exchange Observation: <time>{new Date(latestTimestamp).toLocaleString('en-IN')}</time></span>
          <span>Showing: <strong>{displayedStocks.length}</strong> stocks</span>
        </div>
      )}

      {loading && (
        <div className="stocks-loading" aria-live="polite">
          <span />
          <p>Analyzing live BSE MWPL snapshots and saturation limits...</p>
        </div>
      )}

      {!loading && error && (
        <div className="stocks-error" role="alert">
          <strong>MWPL snapshots could not be loaded</strong>
          <p>{error}</p>
          <button onClick={handleRefresh}>Try again</button>
        </div>
      )}

      {!loading && !error && (
        <div className="raw-stock-table-wrap saturation-table-wrap">
          <table className="raw-stock-table saturation-table">
            <thead>
              <tr>
                <th className="star-col" title="Favorite stock">Fav</th>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th onClick={() => toggleSort('symbol')} className="sortable-th">
                  Stock {sortField === 'symbol' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('price_change')} className="sortable-th">
                  LTP / 1D % {sortField === 'price_change' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('utilization')} className="sortable-th" style={{ minWidth: '220px' }}>
                  MWPL Saturation {sortField === 'utilization' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('remaining')} className="sortable-th">
                  Headroom to 95% {sortField === 'remaining' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('oi')} className="sortable-th">
                  Open Interest {sortField === 'oi' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th>MWPL Limit</th>
                <th>Permissible Limit</th>
                <th>Risk Tier</th>
              </tr>
            </thead>
            <tbody>
              {displayedStocks.map((stock, index) => {
                const stockId = stock.stockId
                const isFavorited = stockId ? favorites.has(stockId) : false
                const isPending = togglingStockId === stockId
                const util = stock.utilizationPercent
                const remaining = stock.remainingToBanPercent

                return (
                  <tr key={stock.snapshotId || stock.symbol}>
                    <td className="star-col">
                      <button
                        type="button"
                        className={`star-btn ${isFavorited ? 'active' : ''} ${isPending ? 'pending' : ''}`}
                        onClick={() => void handleToggleFavorite(stock)}
                        title={isFavorited ? `Remove ${stock.symbol} from favorites` : `Add ${stock.symbol} to favorites`}
                        aria-label={isFavorited ? `Remove ${stock.symbol} from favorites` : `Add ${stock.symbol} to favorites`}
                      >
                        ★
                      </button>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--portal-muted)' }}>{index + 1}</td>
                    <td>
                      <div className="stock-info-cell">
                        <strong>{stock.symbol}</strong>
                        <small>{stock.companyName}</small>
                      </div>
                    </td>
                    <td>
                      <div className="price-cell">
                        <span>{stock.currentPrice != null ? `₹${stock.currentPrice.toLocaleString('en-IN')}` : '—'}</span>
                        {stock.priceChangePercent != null && (
                          <small className={stock.priceChangePercent >= 0 ? 'positive' : 'negative'}>
                            {stock.priceChangePercent >= 0 ? '+' : ''}
                            {stock.priceChangePercent.toFixed(2)}%
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="saturation-cell">
                        <div className="saturation-val-row">
                          <strong className={getSaturationColorClass(util)}>{util.toFixed(1)}%</strong>
                          <small>{util >= 95 ? 'In Ban' : `${(95 - util).toFixed(1)}% to Ban`}</small>
                        </div>
                        <div className="saturation-meter-track">
                          <div
                            className={`saturation-meter-fill ${getSaturationColorClass(util)}`}
                            style={{ width: `${Math.min(100, (util / 120) * 100)}%` }}
                          />
                          <div className="threshold-marker marker-85" title="85% Critical Threshold" />
                          <div className="threshold-marker marker-95" title="95% F&O Ban Threshold" />
                        </div>
                      </div>
                    </td>
                    <td>
                      {util >= 95 ? (
                        <span className="over-ban-pill">Exceeded by +{(util - 95).toFixed(1)}%</span>
                      ) : (
                        <span className={remaining <= 5 ? 'critical-headroom' : 'normal-headroom'}>
                          {remaining.toFixed(1)}% remaining
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>{formatCompactNumber(stock.openInterest)}</strong>
                      <small className="cell-sub">{stock.openInterest.toLocaleString('en-IN')} shares</small>
                    </td>
                    <td>
                      <span>{formatCompactNumber(stock.mwpl)}</span>
                      <small className="cell-sub">{stock.mwpl.toLocaleString('en-IN')} shares</small>
                    </td>
                    <td>
                      <span>{formatCompactNumber(stock.permitLimit)}</span>
                    </td>
                    <td>
                      <span className={`risk-badge ${getRiskBadgeClass(stock.riskZone)}`}>
                        {stock.riskZone}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {displayedStocks.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px' }}>
                    No stocks matching the selected filter or search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="portal-disclaimer">
        <strong>Educational Information</strong>
        <span>
          Market Wide Position Limits (MWPL) and F&amp;O ban thresholds (95% entry, 80% exit) are defined by the exchange.
          This dashboard is updated from BSE MWPL snapshot observation feeds and is for educational tracking only.
        </span>
        <small>Source: BSE MWPL Snapshots · Greed &amp; Fear Platform</small>
      </div>
    </section>
  )
}

function getSaturationColorClass(util: number): string {
  if (util >= 95) return 'tone-ban'
  if (util >= 85) return 'tone-critical'
  if (util >= 75) return 'tone-elevated'
  if (util >= 50) return 'tone-moderate'
  return 'tone-normal'
}

function getRiskBadgeClass(risk: string): string {
  switch (risk) {
    case 'In Ban':
      return 'risk-in-ban'
    case 'Critical':
      return 'risk-critical'
    case 'Elevated':
      return 'risk-elevated'
    case 'Moderate':
      return 'risk-moderate'
    default:
      return 'risk-normal'
  }
}

function formatCompactNumber(num: number): string {
  if (!num || isNaN(num)) return '0'
  const abs = Math.abs(num)
  if (abs >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`
  if (abs >= 100000) return `${(num / 100000).toFixed(2)} L`
  if (abs >= 1000) return `${(num / 1000).toFixed(1)} K`
  return num.toLocaleString('en-IN')
}
