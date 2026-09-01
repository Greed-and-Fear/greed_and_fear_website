import { useEffect, useState } from 'react'
import { getApiErrorMessage } from './api/client'
import { getGlobalIndexHistory, getGlobalIndicesLive, type GlobalIndexHistoryRow, type GlobalIndexLive } from './api/graphql'

type HistoryRange = '24H' | '7D' | '30D' | '90D'
const REFRESH_INTERVAL = 30_000

export default function GlobalIndicesPage() {
  const [indices, setIndices] = useState<GlobalIndexLive[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [history, setHistory] = useState<GlobalIndexHistoryRow[]>([])
  const [range, setRange] = useState<HistoryRange>('24H')
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('all')
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const loadLive = async (quiet = false) => {
    if (quiet) setRefreshing(true)
    setError('')
    try {
      const rows = await getGlobalIndicesLive()
      setIndices(rows)
      setSelectedId((current) => current && rows.some((row) => String(row.global_index_id) === current) ? current : String(rows[0]?.global_index_id ?? ''))
      setLastRefresh(new Date())
    } catch (reason) { setError(getApiErrorMessage(reason, 'Unable to load global indices.')) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const rows = await getGlobalIndicesLive()
        if (!active) return
        setIndices(rows)
        setSelectedId((current) => current && rows.some((row) => String(row.global_index_id) === current) ? current : String(rows[0]?.global_index_id ?? ''))
        setLastRefresh(new Date())
        setError('')
      } catch (reason) { if (active) setError(getApiErrorMessage(reason, 'Unable to load global indices.')) }
      finally { if (active) setLoading(false) }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    void getGlobalIndexHistory(selectedId, rangeStart(range).toISOString())
      .then((rows) => { if (active) setHistory(rows) })
      .catch((reason) => { if (active) setHistoryError(getApiErrorMessage(reason, 'Unable to load index history.')) })
      .finally(() => { if (active) setHistoryLoading(false) })
    return () => { active = false }
  }, [range, selectedId])

  const regions = Array.from(new Set(indices.map((index) => index.market_region))).sort()
  const filtered = indices.filter((index) => {
    const matchesSearch = `${index.name} ${index.source_symbol}`.toLowerCase().includes(search.toLowerCase())
    return matchesSearch && (region === 'all' || index.market_region === region)
  })
  const selected = indices.find((index) => String(index.global_index_id) === selectedId) ?? null
  const priced = indices.filter((index) => index.current?.price !== null && index.current !== null)
  const gainers = priced.filter((index) => numeric(index.current?.percent_change) > 0).length
  const decliners = priced.filter((index) => numeric(index.current?.percent_change) < 0).length
  const openMarkets = priced.filter((index) => index.current?.market_state?.toLowerCase() === 'open').length

  if (loading) return <div className="global-index-loading"><span /><p>Loading authenticated global market data...</p></div>
  return <div className="global-indices-page">
    <section className="global-index-summary">
      <div><span>Tracked indices</span><strong>{indices.length}</strong><small>{regions.length} regions</small></div>
      <div><span>Markets open</span><strong>{openMarkets}</strong><small>Current source state</small></div>
      <div><span>Advancing</span><strong className="positive">{gainers}</strong><small>Positive session</small></div>
      <div><span>Declining</span><strong className="negative">{decliners}</strong><small>Negative session</small></div>
      <div><span>Last refresh</span><strong className="refresh-time">{lastRefresh?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '—'}</strong><small>Auto-refreshes every 30s</small></div>
    </section>

    <section className="global-index-controls">
      <label><span>Find an index</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or symbol" /></label>
      <label><span>Market region</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">All regions</option>{regions.map((item) => <option value={item} key={item}>{formatRegion(item)}</option>)}</select></label>
      <button onClick={() => void loadLive(true)} disabled={refreshing}>{refreshing ? 'Refreshing...' : 'Refresh now'}</button>
    </section>

    {error && <div className="global-index-error" role="alert"><p>{error}</p><button onClick={() => void loadLive()}>Try again</button></div>}
    {!error && filtered.length === 0 && <div className="global-index-empty">No indices match the current filters.</div>}
    <section className="global-index-grid">{filtered.map((index) => <IndexCard index={index} selected={String(index.global_index_id) === selectedId} onSelect={() => { setHistoryLoading(true); setHistoryError(''); setSelectedId(String(index.global_index_id)) }} key={String(index.global_index_id)} />)}</section>

    {selected && <section className="global-index-detail">
      <header><div><p>{formatRegion(selected.market_region)} · {selected.source_symbol}</p><h2>{selected.name}</h2><span>Source updated {formatDateTime(selected.current?.source_updated_at)}</span></div><div className="history-ranges">{(['24H', '7D', '30D', '90D'] as HistoryRange[]).map((item) => <button className={item === range ? 'active' : ''} onClick={() => { setHistoryLoading(true); setHistoryError(''); setRange(item) }} key={item}>{item}</button>)}</div></header>
      <div className="index-detail-metrics"><Metric label="Price" value={formatNumber(selected.current?.price)} /><Metric label="Session" value={formatPercent(selected.current?.percent_change)} tone={numeric(selected.current?.percent_change)} /><Metric label="Open" value={formatNumber(selected.current?.open)} /><Metric label="High" value={formatNumber(selected.current?.high)} /><Metric label="Low" value={formatNumber(selected.current?.low)} /><Metric label="Previous close" value={formatNumber(selected.current?.previous_close)} /></div>
      <div className="global-history-layout"><div className="global-chart-panel"><div className="panel-heading"><h3>{range} price history</h3><span>{history.length} observations</span></div>{historyLoading ? <div className="chart-state">Loading history...</div> : historyError ? <div className="chart-state error">{historyError}</div> : <IndexHistoryChart rows={history} />}</div><div className="performance-panel"><h3>Performance</h3><Performance label="1 week" value={selected.current?.weekly_percent_change} /><Performance label="1 month" value={selected.current?.monthly_percent_change} /><Performance label="3 months" value={selected.current?.three_month_percent_change} /><Performance label="6 months" value={selected.current?.six_month_percent_change} /><Performance label="Year to date" value={selected.current?.ytd_percent_change} /><Performance label="1 year" value={selected.current?.yearly_percent_change} /><div className="technical-state"><span>Technical rating</span><strong>{selected.current?.technical_rating ?? 'Not available'}</strong><small>{selected.current?.market_state ?? 'Unknown market state'}</small></div></div></div>
      <HistoryTable rows={history} />
    </section>}
    <div className="portal-disclaimer"><strong>Authenticated GraphQL</strong><span>Global market values and history are fetched only through the Greed & Fear FastAPI proxy.</span><small>Source: Moneycontrol sync</small></div>
  </div>
}

function IndexCard({ index, selected, onSelect }: { index: GlobalIndexLive; selected: boolean; onSelect: () => void }) {
  const change = numeric(index.current?.percent_change)
  return <button className={`global-index-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
    <div className="index-card-heading"><span className="index-flag">{index.flag_url ? <img src={index.flag_url} alt="" /> : index.source_symbol.slice(0, 2)}</span><div><strong>{index.name}</strong><small>{index.source_symbol} · {formatRegion(index.market_region)}</small></div><em className={index.current?.market_state?.toLowerCase() === 'open' ? 'open' : ''}>{index.current?.market_state ?? 'Unknown'}</em></div>
    <div className="index-card-price"><strong>{formatNumber(index.current?.price)}</strong><span className={change >= 0 ? 'positive' : 'negative'}>{formatSigned(index.current?.net_change)} · {formatPercent(index.current?.percent_change)}</span></div>
    <div className="index-range"><span>Low {formatNumber(index.current?.low)}</span><i><b style={{ width: `${rangePosition(index.current)}%` }} /></i><span>High {formatNumber(index.current?.high)}</span></div>
    <footer><span>{index.current?.technical_rating ?? 'No rating'}</span><time>{formatDateTime(index.current?.source_updated_at, true)}</time></footer>
  </button>
}

function IndexHistoryChart({ rows }: { rows: GlobalIndexHistoryRow[] }) {
  const points = rows.filter((row) => row.price !== null).map((row) => ({ value: numeric(row.price), time: row.source_updated_at }))
  if (points.length < 2) return <div className="chart-state">History will appear after at least two sync observations.</div>
  const width = 900; const height = 260; const pad = 24
  const values = points.map((point) => point.value)
  const min = Math.min(...values); const max = Math.max(...values); const spread = max - min || 1
  const coordinates = points.map((point, index) => ({ x: pad + index / (points.length - 1) * (width - pad * 2), y: pad + (max - point.value) / spread * (height - pad * 2), ...point }))
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`
  const positive = points.at(-1)!.value >= points[0].value
  return <div className="index-chart"><div className="chart-scale"><span>{formatNumber(max)}</span><span>{formatNumber((max + min) / 2)}</span><span>{formatNumber(min)}</span></div><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Price history from ${formatDateTime(points[0].time)} to ${formatDateTime(points.at(-1)!.time)}`}><defs><linearGradient id="index-area-positive" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#35b95f" stopOpacity=".34" /><stop offset="1" stopColor="#35b95f" stopOpacity="0" /></linearGradient><linearGradient id="index-area-negative" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ef4b55" stopOpacity=".32" /><stop offset="1" stopColor="#ef4b55" stopOpacity="0" /></linearGradient></defs>{[.25, .5, .75].map((ratio) => <line x1={pad} y1={height * ratio} x2={width - pad} y2={height * ratio} key={ratio} />)}<polygon points={area} fill={`url(#index-area-${positive ? 'positive' : 'negative'})`} /><polyline className={positive ? 'positive-line' : 'negative-line'} points={line} fill="none" /></svg><div className="chart-axis"><span>{new Date(points[0].time).toLocaleDateString('en-IN')}</span><span>{new Date(points.at(-1)!.time).toLocaleDateString('en-IN')}</span></div></div>
}

function HistoryTable({ rows }: { rows: GlobalIndexHistoryRow[] }) {
  if (!rows.length) return null
  return <div className="global-history-table-wrap"><table><thead><tr><th>Timestamp</th><th>Price</th><th>Change</th><th>Change %</th><th>Open</th><th>High</th><th>Low</th><th>State</th><th>Rating</th></tr></thead><tbody>{[...rows].reverse().slice(0, 100).map((row) => <tr key={String(row.global_index_history_id)}><td>{formatDateTime(row.source_updated_at)}</td><td>{formatNumber(row.price)}</td><td className={numeric(row.net_change) >= 0 ? 'positive' : 'negative'}>{formatSigned(row.net_change)}</td><td className={numeric(row.percent_change) >= 0 ? 'positive' : 'negative'}>{formatPercent(row.percent_change)}</td><td>{formatNumber(row.open)}</td><td>{formatNumber(row.high)}</td><td>{formatNumber(row.low)}</td><td>{row.market_state ?? '—'}</td><td>{row.technical_rating ?? '—'}</td></tr>)}</tbody></table></div>
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: number }) { return <div><span>{label}</span><strong className={tone === undefined ? '' : tone >= 0 ? 'positive' : 'negative'}>{value}</strong></div> }
function Performance({ label, value }: { label: string; value: string | number | null | undefined }) { const number = numeric(value); return <div><span>{label}</span><strong className={number >= 0 ? 'positive' : 'negative'}>{formatPercent(value)}</strong></div> }
function numeric(value: string | number | null | undefined) { const number = Number(value); return Number.isFinite(number) ? number : 0 }
function formatNumber(value: string | number | null | undefined) { if (value === null || value === undefined || value === '') return '—'; return numeric(value).toLocaleString('en-IN', { maximumFractionDigits: 2 }) }
function formatSigned(value: string | number | null | undefined) { if (value === null || value === undefined || value === '') return '—'; const number = numeric(value); return `${number >= 0 ? '+' : ''}${number.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` }
function formatPercent(value: string | number | null | undefined) { if (value === null || value === undefined || value === '') return '—'; const number = numeric(value); return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%` }
function formatRegion(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
function formatDateTime(value: string | null | undefined, timeOnly = false) { if (!value) return '—'; const date = new Date(value); return timeOnly ? date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) }
function rangePosition(current: GlobalIndexLive['current']) { const low = numeric(current?.low); const high = numeric(current?.high); const price = numeric(current?.price); if (high <= low) return 50; return Math.max(0, Math.min(100, (price - low) / (high - low) * 100)) }
function rangeStart(range: HistoryRange) { const hours = range === '24H' ? 24 : range === '7D' ? 24 * 7 : range === '30D' ? 24 * 30 : 24 * 90; return new Date(Date.now() - hours * 60 * 60 * 1000) }
