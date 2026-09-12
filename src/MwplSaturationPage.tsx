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
type ViewMode = 'CORE' | 'EXTENDED'
type SortField =
  | 'symbol'
  | 'day0Mwpl'
  | 'day1Mwpl'
  | 'day2Mwpl'
  | 'day1_change'
  | 'day2_change'
  | 'day0OI'
  | 'day1OI'
  | 'day2OI'
  | 'oi1Change'
  | 'oi2Change'
  | 'price_change'
  | 'remaining'
  | 'mwpl'

export default function MwplSaturationPage() {
  const { user } = useAuth()
  const userId = user?.id ?? getSessionUserId()
  const [stocks, setStocks] = useState<MwplSaturationStock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterCategory>('ALL')
  const [viewMode, setViewMode] = useState<ViewMode>('EXTENDED')
  const [sortField, setSortField] = useState<SortField>('day0Mwpl')
  const [sortAsc, setSortAsc] = useState(false)
  const [favorites, setFavorites] = useState<Set<number>>(new Set())
  const [togglingStockId, setTogglingStockId] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

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

  // 3. Load BSE MWPL Multi-Day Snapshots
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
        setError(getApiErrorMessage(reason, 'Unable to load BSE MWPL snapshot data.'))
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

  // Summary counts based on Day 0 Saturation %
  const banCount = useMemo(() => stocks.filter((s) => s.day0Mwpl >= 95).length, [stocks])
  const criticalCount = useMemo(
    () => stocks.filter((s) => s.day0Mwpl >= 85 && s.day0Mwpl < 95).length,
    [stocks],
  )
  const elevatedCount = useMemo(
    () => stocks.filter((s) => s.day0Mwpl >= 75 && s.day0Mwpl < 85).length,
    [stocks],
  )
  const moderateCount = useMemo(
    () => stocks.filter((s) => s.day0Mwpl >= 50 && s.day0Mwpl < 75).length,
    [stocks],
  )
  const normalCount = useMemo(() => stocks.filter((s) => s.day0Mwpl < 50).length, [stocks])

  const avgSaturation = useMemo(() => {
    if (stocks.length === 0) return 0
    const sum = stocks.reduce((acc, s) => acc + s.day0Mwpl, 0)
    return sum / stocks.length
  }, [stocks])

  // Filtered and sorted stocks
  const displayedStocks = useMemo(() => {
    let list = stocks

    // Category filter
    if (filter === 'BAN') list = list.filter((s) => s.day0Mwpl >= 95)
    else if (filter === 'CRITICAL') list = list.filter((s) => s.day0Mwpl >= 85 && s.day0Mwpl < 95)
    else if (filter === 'ELEVATED') list = list.filter((s) => s.day0Mwpl >= 75 && s.day0Mwpl < 85)
    else if (filter === 'MODERATE') list = list.filter((s) => s.day0Mwpl >= 50 && s.day0Mwpl < 75)
    else if (filter === 'NORMAL') list = list.filter((s) => s.day0Mwpl < 50)

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
      if (sortField === 'day0Mwpl') comparison = a.day0Mwpl - b.day0Mwpl
      else if (sortField === 'day1Mwpl') comparison = (a.day1Mwpl ?? -1) - (b.day1Mwpl ?? -1)
      else if (sortField === 'day2Mwpl') comparison = (a.day2Mwpl ?? -1) - (b.day2Mwpl ?? -1)
      else if (sortField === 'day1_change') comparison = (a.day1MwplChange ?? -9999) - (b.day1MwplChange ?? -9999)
      else if (sortField === 'day2_change') comparison = (a.day2MwplChange ?? -9999) - (b.day2MwplChange ?? -9999)
      else if (sortField === 'day0OI') comparison = a.day0OI - b.day0OI
      else if (sortField === 'day1OI') comparison = (a.day1OI ?? -1) - (b.day1OI ?? -1)
      else if (sortField === 'day2OI') comparison = (a.day2OI ?? -1) - (b.day2OI ?? -1)
      else if (sortField === 'oi1Change') comparison = (a.day1OIChange ?? -99999999) - (b.day1OIChange ?? -99999999)
      else if (sortField === 'oi2Change') comparison = (a.day2OIChange ?? -99999999) - (b.day2OIChange ?? -99999999)
      else if (sortField === 'remaining') comparison = a.remainingToBanPercent - b.remainingToBanPercent
      else if (sortField === 'mwpl') comparison = a.mwpl - b.mwpl
      else if (sortField === 'price_change') comparison = (a.priceChangePercent ?? 0) - (b.priceChangePercent ?? 0)
      else if (sortField === 'symbol') comparison = a.symbol.localeCompare(b.symbol)

      return sortAsc ? comparison : -comparison
    })
  }, [stocks, filter, search, sortField, sortAsc])

  // Pagination calculation
  const totalRecords = displayedStocks.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedStocks = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return displayedStocks.slice(start, start + pageSize)
  }, [displayedStocks, safeCurrentPage, pageSize])

  const handleFilterChange = (f: FilterCategory) => {
    setFilter(f)
    setCurrentPage(1)
  }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  // Download CSV export
  const downloadCsv = () => {
    if (displayedStocks.length === 0) return
    const headers = [
      'Stock',
      'Exchange',
      'Company',
      'Day 0 MWPL %',
      'Day 1 MWPL %',
      'Day 2 MWPL %',
      'Day 1 Change %',
      'Day 2 Change %',
      'Day 0 OI',
      'Day 1 OI',
      'Day 2 OI',
      '1D OI Change',
      '2D OI Change',
      'MWPL Total Shares',
      'Permit Limit',
      'LTP',
      '1D Price Change %',
      'Risk Zone',
    ]

    const rows = displayedStocks.map((s) => [
      s.symbol,
      s.exchange,
      `"${s.companyName.replace(/"/g, '""')}"`,
      s.day0Mwpl.toFixed(2),
      s.day1Mwpl != null ? s.day1Mwpl.toFixed(2) : '',
      s.day2Mwpl != null ? s.day2Mwpl.toFixed(2) : '',
      s.day1MwplChange != null ? s.day1MwplChange.toFixed(2) : '',
      s.day2MwplChange != null ? s.day2MwplChange.toFixed(2) : '',
      s.day0OI,
      s.day1OI ?? '',
      s.day2OI ?? '',
      s.day1OIChange ?? '',
      s.day2OIChange ?? '',
      s.mwpl,
      s.permitLimit,
      s.currentPrice ?? '',
      s.priceChangePercent != null ? s.priceChangePercent.toFixed(2) : '',
      s.riskZone,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `bse_mwpl_saturation_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
            <small>Across all tracked BSE F&O stocks</small>
          </div>
          <div className="kpi-icon">📊</div>
        </article>
        <article className="kpi-card tone-universe">
          <div>
            <span>Tracked Universe</span>
            <strong>{stocks.length}</strong>
            <small>BSE multi-day snapshots</small>
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
            onClick={() => handleFilterChange('ALL')}
          >
            All Stocks ({stocks.length})
          </button>
          <button
            type="button"
            className={filter === 'BAN' ? 'filter-pill ban active' : 'filter-pill ban'}
            onClick={() => handleFilterChange('BAN')}
          >
            In Ban ({banCount})
          </button>
          <button
            type="button"
            className={filter === 'CRITICAL' ? 'filter-pill critical active' : 'filter-pill critical'}
            onClick={() => handleFilterChange('CRITICAL')}
          >
            Critical 85–95% ({criticalCount})
          </button>
          <button
            type="button"
            className={filter === 'ELEVATED' ? 'filter-pill elevated active' : 'filter-pill elevated'}
            onClick={() => handleFilterChange('ELEVATED')}
          >
            High 75–85% ({elevatedCount})
          </button>
          <button
            type="button"
            className={filter === 'MODERATE' ? 'filter-pill active' : 'filter-pill'}
            onClick={() => handleFilterChange('MODERATE')}
          >
            Moderate 50–75% ({moderateCount})
          </button>
          <button
            type="button"
            className={filter === 'NORMAL' ? 'filter-pill active' : 'filter-pill'}
            onClick={() => handleFilterChange('NORMAL')}
          >
            Normal &lt;50% ({normalCount})
          </button>
        </div>

        <div className="saturation-actions">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={viewMode === 'CORE' ? 'view-mode-btn active' : 'view-mode-btn'}
              onClick={() => setViewMode('CORE')}
              title="Show core multi-day MWPL change columns matching reference"
            >
              Core Screenshot View
            </button>
            <button
              type="button"
              className={viewMode === 'EXTENDED' ? 'view-mode-btn active' : 'view-mode-btn'}
              onClick={() => setViewMode('EXTENDED')}
              title="Show extended table with MWPL, Open Interest, Limits and Prices"
            >
              Extended View (MWPL + OI)
            </button>
          </div>

          <button
            type="button"
            className="download-btn"
            onClick={downloadCsv}
            title="Download table data as CSV"
          >
            ⤓ Download
          </button>

          <input
            type="text"
            className="saturation-search-input"
            placeholder="Search symbol, company..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
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

      {/* Meta Bar with Pagination Controls */}
      <div className="saturation-meta-bar">
        <div className="meta-info">
          <span>Source: <strong>BSE MWPL Snapshots</strong></span>
          <span className="exchange-badge bse">Exchange: BSE</span>
          {latestTimestamp && (
            <span>Latest Observation: <time>{new Date(latestTimestamp).toLocaleString('en-IN')}</time></span>
          )}
        </div>

        <div className="table-pagination-bar">
          <span className="record-count"><strong>{totalRecords}</strong> Records</span>
          <div className="page-nav">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous Page"
            >
              ‹
            </button>
            <span>
              Page <strong>{safeCurrentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next Page"
            >
              ›
            </button>
          </div>

          <select
            className="page-size-select"
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            aria-label="Rows per page"
          >
            <option value={15}>15 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>
      </div>

      {loading && (
        <div className="stocks-loading" aria-live="polite">
          <span />
          <p>Analyzing live BSE multi-day MWPL snapshots and open interest changes...</p>
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
        <div className="raw-stock-table-wrap saturation-table-wrap screenshot-styled-wrap">
          <table className="raw-stock-table saturation-table appsmith-styled-table">
            <thead>
              <tr>
                <th className="star-col" title="Favorite stock">Fav</th>
                <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                <th onClick={() => toggleSort('symbol')} className="sortable-th">
                  Stock {sortField === 'symbol' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('day0Mwpl')} className="sortable-th core-mwpl-th">
                  Day 0 MWPL {sortField === 'day0Mwpl' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('day1Mwpl')} className="sortable-th core-mwpl-th">
                  Day 1 MWPL {sortField === 'day1Mwpl' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('day2Mwpl')} className="sortable-th core-mwpl-th">
                  Day 2 MWPL {sortField === 'day2Mwpl' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('day1_change')} className="sortable-th screenshot-th">
                  day_1_change {sortField === 'day1_change' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => toggleSort('day2_change')} className="sortable-th screenshot-th">
                  day_2_change {sortField === 'day2_change' ? (sortAsc ? '▲' : '▼') : ''}
                </th>

                {viewMode === 'EXTENDED' && (
                  <>
                    <th onClick={() => toggleSort('day0OI')} className="sortable-th">
                      Day 0 OI {sortField === 'day0OI' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => toggleSort('day1OI')} className="sortable-th">
                      Day 1 OI {sortField === 'day1OI' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => toggleSort('day2OI')} className="sortable-th">
                      Day 2 OI {sortField === 'day2OI' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => toggleSort('oi1Change')} className="sortable-th">
                      1D OI Change {sortField === 'oi1Change' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => toggleSort('oi2Change')} className="sortable-th">
                      2D OI Change {sortField === 'oi2Change' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => toggleSort('price_change')} className="sortable-th">
                      LTP / 1D % {sortField === 'price_change' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => toggleSort('remaining')} className="sortable-th">
                      Headroom to 95% {sortField === 'remaining' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => toggleSort('mwpl')} className="sortable-th">
                      MWPL Limit {sortField === 'mwpl' ? (sortAsc ? '▲' : '▼') : ''}
                    </th>
                    <th>Risk Tier</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedStocks.map((stock, index) => {
                const globalIndex = (currentPage - 1) * pageSize + index + 1
                const stockId = stock.stockId
                const isFavorited = stockId ? favorites.has(stockId) : false
                const isPending = togglingStockId === stockId
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
                    <td style={{ textAlign: 'center', color: 'var(--portal-muted)' }}>{globalIndex}</td>
                    <td>
                      <div className="stock-info-cell">
                        <div className="symbol-row">
                          <strong>{stock.symbol}</strong>
                          <span className="exchange-tag bse">BSE</span>
                        </div>
                        <small>{stock.companyName}</small>
                      </div>
                    </td>

                    {/* Day 0 MWPL */}
                    <td className="mwpl-num-cell day-0-cell">
                      <span className={`mwpl-val-bold ${getSaturationColorClass(stock.day0Mwpl)}`}>
                        {stock.day0Mwpl.toFixed(2)}
                      </span>
                    </td>

                    {/* Day 1 MWPL */}
                    <td className="mwpl-num-cell">
                      <span>{stock.day1Mwpl != null ? stock.day1Mwpl.toFixed(2) : '—'}</span>
                    </td>

                    {/* Day 2 MWPL */}
                    <td className="mwpl-num-cell">
                      <span>{stock.day2Mwpl != null ? stock.day2Mwpl.toFixed(2) : '—'}</span>
                    </td>

                    {/* day_1_change */}
                    {renderChangeCell(stock.day1MwplChange)}

                    {/* day_2_change */}
                    {renderChangeCell(stock.day2MwplChange)}

                    {viewMode === 'EXTENDED' && (
                      <>
                        {/* Day 0 OI */}
                        <td>
                          <strong>{formatCompactNumber(stock.day0OI)}</strong>
                          <small className="cell-sub">{stock.day0OI.toLocaleString('en-IN')}</small>
                        </td>

                        {/* Day 1 OI */}
                        <td>
                          <span>{stock.day1OI != null ? formatCompactNumber(stock.day1OI) : '—'}</span>
                          {stock.day1OI != null && (
                            <small className="cell-sub">{stock.day1OI.toLocaleString('en-IN')}</small>
                          )}
                        </td>

                        {/* Day 2 OI */}
                        <td>
                          <span>{stock.day2OI != null ? formatCompactNumber(stock.day2OI) : '—'}</span>
                          {stock.day2OI != null && (
                            <small className="cell-sub">{stock.day2OI.toLocaleString('en-IN')}</small>
                          )}
                        </td>

                        {/* 1D OI Change */}
                        {renderOiChangeCell(stock.day1OIChange, stock.day1OIChangePercent)}

                        {/* 2D OI Change */}
                        {renderOiChangeCell(stock.day2OIChange, stock.day2OIChangePercent)}

                        {/* LTP / 1D Price % */}
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

                        {/* Headroom to 95% */}
                        <td>
                          {stock.day0Mwpl >= 95 ? (
                            <span className="over-ban-pill">Exceeded by +{(stock.day0Mwpl - 95).toFixed(1)}%</span>
                          ) : (
                            <span className={remaining <= 5 ? 'critical-headroom' : 'normal-headroom'}>
                              {remaining.toFixed(1)}% remaining
                            </span>
                          )}
                        </td>

                        {/* MWPL Limit */}
                        <td>
                          <span>{formatCompactNumber(stock.mwpl)}</span>
                          <small className="cell-sub">{stock.mwpl.toLocaleString('en-IN')} shares</small>
                        </td>

                        {/* Risk Tier */}
                        <td>
                          <span className={`risk-badge ${getRiskBadgeClass(stock.riskZone)}`}>
                            {stock.riskZone}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
              {displayedStocks.length === 0 && (
                <tr>
                  <td colSpan={viewMode === 'EXTENDED' ? 17 : 8} style={{ textAlign: 'center', padding: '36px' }}>
                    No stocks matching the selected filter or search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Pagination controls */}
      {totalPages > 1 && (
        <div className="bottom-pagination-bar">
          <span>Showing {(safeCurrentPage - 1) * pageSize + 1} to {Math.min(totalRecords, safeCurrentPage * pageSize)} of {totalRecords} stocks</span>
          <div className="page-nav">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              title="First Page"
            >
              ««
            </button>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ‹ Prev
            </button>
            <span>Page <strong>{safeCurrentPage}</strong> of <strong>{totalPages}</strong></span>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next ›
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last Page"
            >
              »»
            </button>
          </div>
        </div>
      )}

      <div className="portal-disclaimer">
        <strong>Educational Information · BSE Exchange MWPL Feed</strong>
        <span>
          Market Wide Position Limits (MWPL) and F&amp;O ban thresholds (95% entry, 80% exit) are computed directly
          from BSE MWPL observation snapshots. Day 0, Day 1, and Day 2 reflect the closing trading day observations.
        </span>
        <small>Source: BSE MWPL Snapshots Feed · Greed &amp; Fear Platform</small>
      </div>
    </section>
  )
}

/**
 * Renders the day_1_change / day_2_change cell using the site's native positive/negative UI colors
 */
function renderChangeCell(val: number | null | undefined) {
  if (val == null || isNaN(val)) {
    return <td className="mwpl-num-cell empty">—</td>
  }

  const isPos = val > 0
  const isNeg = val < 0
  const colorClass = isPos ? 'positive' : isNeg ? 'negative' : 'neutral'
  const formattedVal = `${val > 0 ? '+' : ''}${val.toFixed(2)}`

  return (
    <td className={`mwpl-num-cell ${colorClass}`}>
      <strong>{formattedVal}</strong>
    </td>
  )
}

/**
 * Renders Open Interest Change cell with compact shares count and percentage
 */
function renderOiChangeCell(absChange: number | null | undefined, pctChange: number | null | undefined) {
  if (absChange == null && pctChange == null) {
    return <td className="oi-cell empty">—</td>
  }

  const abs = absChange ?? 0
  const isPos = abs > 0
  const isNeg = abs < 0
  const colorClass = isPos ? 'positive' : isNeg ? 'negative' : 'neutral'

  return (
    <td className="oi-change-cell">
      <strong className={colorClass}>
        {abs >= 0 ? '+' : ''}{formatCompactNumber(abs)}
      </strong>
      {pctChange != null && (
        <small className={`cell-sub ${colorClass}`}>
          {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(2)}%
        </small>
      )}
    </td>
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
  const sign = num < 0 ? '-' : ''
  if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(2)} Cr`
  if (abs >= 100000) return `${sign}${(abs / 100000).toFixed(2)} L`
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)} K`
  return num.toLocaleString('en-IN')
}
