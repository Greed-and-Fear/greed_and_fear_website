import { FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { api, getApiErrorMessage, getScannedStockData, type PositionSignal, type ProcessedStockData, type MarketAlert, type MarketSnapshot, type User } from './api/client'
import StockBoard from './StockBoard'
import AllStocksPage from './AllStocksPage'
import logo from '../images/logo/logos.jpeg'
import './member.css'
import whiteLogo from '../images/logo/namedWhiteLogo.png'
import normalWhiteLogo from '../images/logo/whiteLogo.png'
import normalLogo from '../images/logo/normalLogo.png'
export type Theme = 'light' | 'dark'

interface PortalProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

export function ThemeToggle({ theme, onChange, compact = false }: { theme: Theme; onChange: (theme: Theme) => void; compact?: boolean }) {
  return <button className={compact ? 'theme-toggle compact' : 'theme-toggle'} onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><span className="theme-toggle-track"><span /></span>{!compact && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}</button>
}

export default function MemberPortal({ theme, onThemeChange }: PortalProps) {
  return <Routes>
    <Route path="/login" element={<LoginPage theme={theme} onThemeChange={onThemeChange} />} />
    <Route path="/dashboard" element={<DashboardPage theme={theme} onThemeChange={onThemeChange} />} />
    <Route path="/sentiment" element={<SentimentPage theme={theme} onThemeChange={onThemeChange} />} />
    <Route path="/stocks" element={<StockBoardPage theme={theme} onThemeChange={onThemeChange} />} />
    <Route path="/market-data" element={<MarketDataPage theme={theme} onThemeChange={onThemeChange} />} />
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
}

function LoginPage({ theme, onThemeChange }: PortalProps) {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError('')
    const data = new FormData(event.currentTarget)
    try { const user = await api.login(String(data.get('email')), String(data.get('password'))); localStorage.setItem('api-user', JSON.stringify(user)); navigate('/dashboard') } catch (reason) { setError(getApiErrorMessage(reason, 'Unable to sign in.')) } finally { setLoading(false) }
  }
  return <main className="login-page">
    <header className="login-topbar"><Link to="/"><img src={theme === 'dark' ? logo : whiteLogo} alt="Greed and Fear" /></Link><div><ThemeToggle theme={theme} onChange={onThemeChange} compact /><Link to="/" className="back-link">Back to home</Link></div></header>
    <section className="login-card">
      <img className="login-mark" src={theme === 'dark' ? normalLogo : normalWhiteLogo} alt="" />
      <p className="portal-kicker">Member access</p><h1>Welcome back</h1><p>Sign in to open your market intelligence dashboard.</p>
      {/* <div className="demo-credentials"><span>Demo username</span><strong>admin</strong><span>Demo password</span><strong>admin</strong></div> */}
      <form onSubmit={submit}>
        <label>Username<input name="email" type="text" autoComplete="username" placeholder="Enter admin" required /></label>
        <label>Password<div className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter admin" required /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
        <div className="form-options"><label><input type="checkbox" name="remember" defaultChecked /> Remember me</label><a href="mailto:greedandfearacademy@gmail.com?subject=Password help">Forgot password?</a></div>
        <button className="portal-primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}<span>→</span></button>
        {error && <p className="portal-error" role="alert">{error}</p>}
      </form>
      <p className="admin-link">Not a member yet? <a href="mailto:greedandfearacademy@gmail.com">Contact admin</a></p>
    </section>
    <div className="login-benefits"><div><i>S</i><span><strong>Secure experience</strong><small>Your preview stays in this browser.</small></span></div><div><i>A</i><span><strong>Expert analysis</strong><small>Clear, professional market insights.</small></span></div><div><i>M</i><span><strong>Member exclusive</strong><small>Focused tools without the noise.</small></span></div></div>
  </main>
}

const navigation = [
  ['Dashboard', '/dashboard', 'DB'], ['Stock board', '/stocks', 'ST'], ['All stocks', '/market-data', 'AS'], ['Pre-market', '/sentiment', 'PM'],
] as const

function PortalLayout({ children, theme, onThemeChange, title }: PortalProps & { children: ReactNode; title: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const user = getStoredUser()
  return <div className="portal-shell">
    <aside className={menuOpen ? 'portal-sidebar open' : 'portal-sidebar'}><Link className="portal-logo" to="/"><img src={logo} alt="Greed and Fear" /></Link><nav>{navigation.map(([label, href, icon]) => <NavLink to={href} className={({ isActive }) => isActive && !href.includes('#') ? 'active' : undefined} key={label} onClick={() => setMenuOpen(false)}><span>{icon}</span>{label}</NavLink>)}</nav><div className="upgrade-card"><p>Greed & Fear Pro</p><small>Unlock advanced analytics, alerts and market tools.</small><Link to="/products">View plans</Link></div></aside>
    <div className="portal-workspace"><header className="portal-header"><button className="portal-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle member navigation">Menu</button><div><span className="market-time">Greed & Fear market API</span><span className="live-pill">Connected</span><ThemeToggle theme={theme} onChange={onThemeChange} compact /><Link className="run-button" to="/dashboard">Refresh view</Link><span className="member-avatar">{user?.name.slice(0, 1).toUpperCase() ?? 'M'}</span></div></header><div className="portal-content"><div className="portal-page-title"><div><p>Member intelligence</p><h1>{title}</h1></div><Link to="/login" onClick={() => localStorage.removeItem('api-user')}>Sign out</Link></div>{children}</div></div>
  </div>
}

function DashboardPage(props: PortalProps) {
  const [stocks, setStocks] = useState<ProcessedStockData[]>([])
  const [alerts, setAlerts] = useState<MarketAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      getScannedStockData().catch(async () => {
        const legacy = await api.stockMetrics(100)
        return legacy.map((m) => ({
          symbol: m.symbol,
          companyName: m.symbol,
          exchange: 'NSE',
          isin: '',
          scripCode: '',
          stockId: null,
          currentPrice: null,
          previousClose: null,
          priceChange: 0,
          priceChangePercent: Number(m.price_change || 0),
          currentMWPL: Number(m.mwpl || 0),
          previousMWPL: null,
          day2MWPL: null,
          mwpl1DayChange: Number(m.one_day_change || 0),
          mwpl1DayChangePercent: Number(m.one_day_change || 0),
          mwpl2DayChange: Number(m.two_day_change || 0),
          mwpl2DayChangePercent: Number(m.two_day_change || 0),
          mwplUtilizationPercent: Number(m.mwpl || 0),
          mwplRiskZone: Number(m.mwpl) >= 95 ? 'Ban zone' : Number(m.mwpl) >= 90 ? 'High risk' : Number(m.mwpl) >= 80 ? 'Elevated' : 'Normal',
          currentOI: 0,
          previousOI: null,
          day2OI: null,
          oi1DayChange: Number(m.oi_change || 0),
          oi1DayChangePercent: Number(m.oi_change || 0),
          oi2DayChange: 0,
          oi2DayChangePercent: 0,
          signal: (m.signal || 'Neutral / Weak') as PositionSignal,
          signalStrength: 'Moderate',
          reasons: [],
          dataQuality: 'GOOD',
          latestTradeDate: m.captured_at,
        })) as ProcessedStockData[]
      }),
      api.alerts(50).catch(() => [] as MarketAlert[]),
    ])
      .then(([stockData, alertData]) => {
        setStocks(stockData)
        setAlerts(alertData)
      })
      .catch((reason) => setError(getApiErrorMessage(reason, 'Unable to load dashboard data.')))
      .finally(() => setLoading(false))
  }, [])

  const countSignal = (signal: string) => stocks.filter((stock) => stock.signal === signal).length
  const banWatchCount = stocks.filter((stock) => stock.mwplUtilizationPercent >= 80 || stock.mwplRiskZone === 'Ban zone' || stock.mwplRiskZone === 'High risk').length
  const summary = [
    ['Ban watch', String(banWatchCount), 'High ban risk'],
    ['Long builders', String(countSignal('Long build-up')), 'Strong long build-up'],
    ['Short builders', String(countSignal('Short build-up')), 'Strong short build-up'],
    ['Short covering', String(countSignal('Short covering')), 'Existing shorts closing'],
    ['Long unwinding', String(countSignal('Long unwinding')), 'Existing longs unwinding'],
    ['Scan universe', String(stocks.length), 'Tracked F&O stocks'],
  ]
  const banWatch = [...stocks].sort((a, b) => b.mwplUtilizationPercent - a.mwplUtilizationPercent).slice(0, 4)

  return <PortalLayout {...props} title="MWPL institutional tracker">
    <p className="portal-subtitle">Identify position build-up and F&O ban candidates from one clear view.</p>
    {error && <p className="portal-error" role="alert">{error}</p>}
    <section className="metric-grid">{summary.map(([label, value, detail], index) => <article key={label}><i className={`metric-icon tone-${index}`}>{index + 1}</i><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>)}</section>
    <div className="dashboard-grid">
      <section className="portal-panel opportunities-panel" id="opportunities">
        <PanelHeading title="Top MWPL opportunities" />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Stock</th>
                <th>Price %</th>
                <th>MWPL Util</th>
                <th>1D MWPL</th>
                <th>2D MWPL</th>
                <th>OI</th>
                <th>1D OI</th>
                <th>2D OI</th>
                <th>Signal</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((row, index) => (
                <tr key={row.symbol} title={row.reasons.join(' | ')}>
                  <td>{index + 1}</td>
                  <td><strong>{row.symbol}</strong></td>
                  <Delta value={row.priceChangePercent} />
                  <td>{row.mwplUtilizationPercent.toFixed(1)}% <Meter value={row.mwplUtilizationPercent} /></td>
                  <Delta value={row.mwpl1DayChangePercent} />
                  <Delta value={row.mwpl2DayChangePercent} />
                  <td title={`Open Interest: ${row.currentOI.toLocaleString('en-IN')}`}><strong>{formatCompactNumber(row.currentOI)}</strong></td>
                  <Delta value={row.oi1DayChangePercent} />
                  <Delta value={row.oi2DayChangePercent} />
                  <td><span className={`signal ${row.signal.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>{row.signal}</span></td>
                  <td><span className={`risk-badge risk-${row.mwplRiskZone.toLowerCase().replace(/\s+/g, '-')}`}>{row.mwplRiskZone}</span></td>
                </tr>
              ))}
              {stocks.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '24px' }}>
                    {loading ? 'Loading live stock data...' : 'No stock records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="portal-panel ban-panel" id="ban-watch">
        <PanelHeading title="F&O ban watch" />
        <div className="ban-list">
          {banWatch.map((row) => {
            const mwpl = row.mwplUtilizationPercent
            return (
              <div key={row.symbol}>
                <strong>{row.symbol}</strong>
                <span>{mwpl.toFixed(1)}%</span>
                <span>{mwpl >= 95 ? 'In Ban' : `${Math.max(0, 95 - mwpl).toFixed(1)}% to 95%`}</span>
                <Meter value={mwpl} />
                <em className={`risk-${row.mwplRiskZone.toLowerCase().replace(/\s+/g, '-')}`}>{row.mwplRiskZone}</em>
              </div>
            )
          })}
          {banWatch.length === 0 && <div style={{ padding: '16px', color: 'var(--portal-muted)' }}>No stocks in watch list</div>}
        </div>
      </section>
      <section className="portal-panel heatmap-panel" id="heatmap">
        <PanelHeading title="MWPL heatmap" />
        <div className="heatmap">
          {stocks.slice(0, 14).map((metric) => {
            const value = metric.mwplUtilizationPercent
            return (
              <div className={value >= 85 ? 'hot' : value >= 70 ? 'warm' : 'cool'} key={metric.symbol} title={`${metric.symbol}: ${value.toFixed(1)}% MWPL utilized`}>
                <span>{metric.symbol}</span>
                <strong>{value.toFixed(1)}%</strong>
              </div>
            )
          })}
          {stocks.length > 14 && <div className="more-stocks"><strong>+{stocks.length - 14}</strong><span>More stocks</span></div>}
          {stocks.length === 0 && <div style={{ gridColumn: '1 / -1', padding: '12px', color: 'var(--portal-muted)' }}>No stocks available</div>}
        </div>
      </section>
      <section className="portal-panel alerts-panel" id="alerts">
        <PanelHeading title="Latest alerts" />
        <div className="alerts-list">
          {alerts.slice(0, 8).map((alert, index) => (
            <div key={alert.id}>
              <i>{index + 1}</i>
              <p><strong>{alert.symbol}</strong>{alert.message}</p>
              <time>{new Date(alert.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
          ))}
          {alerts.length === 0 && <div style={{ padding: '16px', color: 'var(--portal-muted)' }}>No active alerts</div>}
        </div>
      </section>
    </div>
    <div className="portal-disclaimer"><strong>Educational use only</strong><span>MWPL is an exchange-defined threshold. This dashboard is not financial advice.</span><small>Source: Greed & Fear API</small></div>
  </PortalLayout>
}

function SentimentPage(props: PortalProps) {
  const [marketCards, setMarketCards] = useState<MarketSnapshot[]>([])
  const [error, setError] = useState('')
  useEffect(() => { void api.snapshots().then(setMarketCards).catch((reason) => setError(getApiErrorMessage(reason, 'Unable to load market snapshots.'))) }, [])
  const changes = marketCards.map((card) => Number(card.change_percent ?? 0))
  const bullish = changes.filter((change) => change > 0).length
  const bearish = changes.filter((change) => change < 0).length
  const outlook = bearish > bullish ? 'Bearish' : bullish > bearish ? 'Bullish' : 'Neutral'
  const lastRun = marketCards[0]?.captured_at
  return <PortalLayout {...props} title="Pre-market sentiment indicator">
    <div className="sentiment-meta"><span>Direction: {marketCards.map((card) => card.name).join(' · ') || 'Loading market snapshots'}</span>{lastRun && <time>Last run: {new Date(lastRun).toLocaleString('en-IN')}</time>}</div>
    {error && <p className="portal-error" role="alert">{error}</p>}
    <section className="sentiment-hero"><div className="sentiment-ring"><span>{bearish > bullish ? '↘' : '↗'}</span></div><div><p>Combined outlook</p><h2>{outlook} & stable</h2><span><b>{bullish} bullish</b> · <em>{bearish} bearish</em> · {changes.length - bullish - bearish} neutral</span><div className="stability-pill">Live market snapshots</div></div><Sparkline tone={bearish > bullish ? 'negative' : 'positive'} large /></section>
    <section className="market-card-grid">{marketCards.map((card, index) => { const change = Number(card.change_percent ?? 0); const tone = card.tone ?? (change < 0 ? 'negative' : 'positive'); return <article className={index === marketCards.length - 1 && index % 2 === 0 ? 'wide' : ''} key={card.name}><div className={`market-card-icon ${tone}`}>{card.name.slice(0, 2)}</div><div className="market-copy"><h3>{card.name}</h3><strong className={tone}>{card.value}</strong><p>{card.change_percent === null ? card.detail : `${change >= 0 ? '+' : ''}${change}% · ${card.detail ?? ''}`}</p></div><Sparkline tone={tone} /></article> })}</section>
    <div className="portal-disclaimer sentiment"><strong>Information, not advice</strong><span>Market sentiment indicators are for educational purposes only and should not be considered financial advice.</span><small>Source: Greed & Fear API</small></div>
  </PortalLayout>
}

function StockBoardPage(props: PortalProps) {
  return <PortalLayout {...props} title="Internal stock status board">
    <p className="portal-subtitle">Track each stock from watchlist through trade completion. Drag cards between columns or use the status menu.</p>
    <StockBoard />
  </PortalLayout>
}

function MarketDataPage(props: PortalProps) {
  return <PortalLayout {...props} title="All stocks market data">
    <p className="portal-subtitle">Company and market fields served by the Greed & Fear API with 100 records per page.</p>
    <AllStocksPage />
  </PortalLayout>
}

function PanelHeading({ title, action }: { title: string; action?: string }) { return <header className="panel-heading"><h2>{title}</h2>{action && <button>{action} →</button>}</header> }
function Delta({ value }: { value: number }) { return <td className={value >= 0 ? 'positive' : 'negative'}>{value >= 0 ? '+' : ''}{value}%</td> }
function Meter({ value }: { value: number }) { return <span className="meter"><i style={{ width: `${Math.min(value, 100)}%` }} /></span> }
function Sparkline({ tone, large = false }: { tone: string; large?: boolean }) {
  const points = tone === 'positive' ? '2,48 25,40 45,46 66,31 90,38 113,22 138,30 164,14 190,24 218,8' : tone === 'warning' ? '2,50 25,41 48,42 70,28 95,35 120,20 145,26 170,8 195,22 218,4' : '2,14 25,26 48,34 70,31 94,44 118,38 143,48 168,41 193,52 218,56'
  return <svg className={large ? `sparkline ${tone} large` : `sparkline ${tone}`} viewBox="0 0 220 64" aria-hidden="true"><polyline points={points} fill="none" vectorEffect="non-scaling-stroke" /><polygon points={`2,64 ${points} 218,64`} /></svg>
}

function getStoredUser(): User | null {
  try {
    const user = JSON.parse(localStorage.getItem('api-user') ?? 'null') as User | null
    if (user) return user
  } catch {
    // Ignore JSON parsing errors
  }
  return { id: 1, name: 'Trader', phone: '9999999999', plan: 'elite' }
}

function formatCompactNumber(num: number): string {
  if (num == null || isNaN(num) || num === 0) return '0'
  const abs = Math.abs(num)
  if (abs >= 10000000) {
    return `${(num / 10000000).toFixed(2)} Cr`
  }
  if (abs >= 100000) {
    return `${(num / 100000).toFixed(2)} L`
  }
  if (abs >= 1000) {
    return `${(num / 1000).toFixed(1)} K`
  }
  return num.toLocaleString('en-IN')
}

