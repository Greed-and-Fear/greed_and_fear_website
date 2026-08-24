import { FormEvent, type ReactNode, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { alerts, heatmap, marketCards, opportunities } from './memberData'
import { login } from './services/mockApi'
import logo from '../images/logo/logo.jpg'
import './member.css'

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
    try { await login(String(data.get('email')), String(data.get('password'))); navigate('/dashboard') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in.') } finally { setLoading(false) }
  }
  return <main className="login-page">
    <header className="login-topbar"><Link to="/"><img src={logo} alt="Greed and Fear" /></Link><div><ThemeToggle theme={theme} onChange={onThemeChange} compact /><Link to="/" className="back-link">Back to home</Link></div></header>
    <section className="login-card">
      <img className="login-mark" src={logo} alt="" />
      <p className="portal-kicker">Member access</p><h1>Welcome back</h1><p>Sign in to open your market intelligence dashboard.</p>
      <div className="demo-credentials"><span>Demo username</span><strong>admin</strong><span>Demo password</span><strong>admin</strong></div>
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
  ['Dashboard', '/dashboard', 'DB'], ['Pre-market', '/sentiment', 'PM'], ['Top opportunities', '/dashboard#opportunities', 'OP'], ['Ban watch', '/dashboard#ban-watch', 'BW'], ['Long builders', '/dashboard#opportunities', 'LB'], ['Short builders', '/dashboard#opportunities', 'SB'], ['Heatmap', '/dashboard#heatmap', 'HM'], ['Alerts', '/dashboard#alerts', 'AL'],
] as const

function PortalLayout({ children, theme, onThemeChange, title }: PortalProps & { children: ReactNode; title: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <div className="portal-shell">
    <aside className={menuOpen ? 'portal-sidebar open' : 'portal-sidebar'}><Link className="portal-logo" to="/"><img src={logo} alt="Greed and Fear" /></Link><nav>{navigation.map(([label, href, icon]) => <NavLink to={href} className={({ isActive }) => isActive && href === '/dashboard' ? 'active' : undefined} key={label} onClick={() => setMenuOpen(false)}><span>{icon}</span>{label}</NavLink>)}</nav><div className="upgrade-card"><p>Greed & Fear Pro</p><small>Unlock advanced analytics, alerts and market tools.</small><Link to="/products">View plans</Link></div></aside>
    <div className="portal-workspace"><header className="portal-header"><button className="portal-menu" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle member navigation">Menu</button><div><span className="market-time">Market data: 22 Aug 2026, 06:35 PM IST</span><span className="live-pill">Live</span><ThemeToggle theme={theme} onChange={onThemeChange} compact /><Link className="run-button" to="/dashboard">Run now</Link><span className="member-avatar">S</span></div></header><div className="portal-content"><div className="portal-page-title"><div><p>Member intelligence</p><h1>{title}</h1></div><Link to="/login">Sign out</Link></div>{children}</div></div>
  </div>
}

function DashboardPage(props: PortalProps) {
  const summary = [['Ban watch', '7', 'High ban risk'], ['Long builders', '18', 'Strong long build-up'], ['Short builders', '12', 'Strong short build-up'], ['Short covering', '9', 'Existing shorts closing'], ['Long unwinding', '6', 'Existing longs unwinding'], ['Scan universe', '198', 'F&O eligible stocks']]
  return <PortalLayout {...props} title="MWPL institutional tracker">
    <p className="portal-subtitle">Identify position build-up and F&O ban candidates from one clear view.</p>
    <section className="metric-grid">{summary.map(([label, value, detail], index) => <article key={label}><i className={`metric-icon tone-${index}`}>{index + 1}</i><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>)}</section>
    <div className="dashboard-grid">
      <section className="portal-panel opportunities-panel" id="opportunities"><PanelHeading title="Top MWPL opportunities" action="View all" /><div className="table-scroll"><table><thead><tr><th>#</th><th>Stock</th><th>MWPL</th><th>1D</th><th>2D</th><th>Price</th><th>OI</th><th>Volume</th><th>Signal</th><th>Score</th></tr></thead><tbody>{opportunities.map((row, index) => <tr key={row.stock}><td>{index + 1}</td><td><strong>{row.stock}</strong></td><td>{row.mwpl}% <Meter value={row.mwpl} /></td><Delta value={row.oneDay} /><Delta value={row.twoDay} /><Delta value={row.price} /><Delta value={row.oi} /><Delta value={row.volume} /><td><span className={`signal ${row.signal.toLowerCase().replaceAll(' ', '-')}`}>{row.signal}</span></td><td><b className="score">{row.score}</b></td></tr>)}</tbody></table></div></section>
      <section className="portal-panel ban-panel" id="ban-watch"><PanelHeading title="F&O ban watch" action="View all" /><div className="ban-list">{opportunities.slice(0, 4).map((row) => <div key={row.stock}><strong>{row.stock}</strong><span>{row.mwpl}%</span><span>{(95 - row.mwpl).toFixed(1)}% to 95%</span><Meter value={row.mwpl} /><em>{row.mwpl > 88 ? 'High' : 'Elevated'}</em></div>)}</div></section>
      <section className="portal-panel heatmap-panel" id="heatmap"><PanelHeading title="MWPL heatmap" /><div className="heatmap">{heatmap.map(([name, value]) => <div className={value >= 85 ? 'hot' : value >= 70 ? 'warm' : 'cool'} key={name}><span>{name}</span><strong>{value}%</strong></div>)}<div className="more-stocks"><strong>+183</strong><span>More stocks</span></div></div></section>
      <section className="portal-panel alerts-panel" id="alerts"><PanelHeading title="Latest alerts" action="View all" /><div className="alerts-list">{alerts.map(([stock, text, time], index) => <div key={stock}><i>{index + 1}</i><p><strong>{stock}</strong>{text}</p><time>{time}</time></div>)}</div></section>
    </div>
    <div className="portal-disclaimer"><strong>Educational use only</strong><span>MWPL is an exchange-defined threshold. This dashboard uses simulated data and is not financial advice.</span><small>Source: Preview data</small></div>
  </PortalLayout>
}

function SentimentPage(props: PortalProps) {
  return <PortalLayout {...props} title="Pre-market sentiment indicator">
    <div className="sentiment-meta"><span>Direction: NASDAQ · Dow Jones · NSE Advances/Declines · GIFT Nifty</span><time>Last run: 24 Aug, 11:39 PM IST</time></div>
    <section className="sentiment-hero"><div className="sentiment-ring"><span>↘</span></div><div><p>Combined outlook</p><h2>Bearish & stable</h2><span><b>1 bullish</b> · <em>3 bearish</em> · 0 neutral</span><div className="stability-pill">Stable · VIX 11.70</div></div><Sparkline tone="negative" large /></section>
    <section className="market-card-grid">{marketCards.map((card, index) => <article className={index === 4 ? 'wide' : ''} key={card.name}><div className={`market-card-icon ${card.tone}`}>{card.name.slice(0, 2)}</div><div className="market-copy"><h3>{card.name}</h3><strong className={card.tone}>{card.value}</strong><p>{card.detail}</p></div><Sparkline tone={card.tone} /></article>)}</section>
    <div className="portal-disclaimer sentiment"><strong>Information, not advice</strong><span>Market sentiment indicators are for educational purposes only and should not be considered financial advice.</span><small>Source: Preview market data</small></div>
  </PortalLayout>
}

function PanelHeading({ title, action }: { title: string; action?: string }) { return <header className="panel-heading"><h2>{title}</h2>{action && <button>{action} →</button>}</header> }
function Delta({ value }: { value: number }) { return <td className={value >= 0 ? 'positive' : 'negative'}>{value >= 0 ? '+' : ''}{value}%</td> }
function Meter({ value }: { value: number }) { return <span className="meter"><i style={{ width: `${Math.min(value, 100)}%` }} /></span> }
function Sparkline({ tone, large = false }: { tone: string; large?: boolean }) {
  const points = tone === 'positive' ? '2,48 25,40 45,46 66,31 90,38 113,22 138,30 164,14 190,24 218,8' : tone === 'warning' ? '2,50 25,41 48,42 70,28 95,35 120,20 145,26 170,8 195,22 218,4' : '2,14 25,26 48,34 70,31 94,44 118,38 143,48 168,41 193,52 218,56'
  return <svg className={large ? `sparkline ${tone} large` : `sparkline ${tone}`} viewBox="0 0 220 64" aria-hidden="true"><polyline points={points} fill="none" vectorEffect="non-scaling-stroke" /><polygon points={`2,64 ${points} 218,64`} /></svg>
}
