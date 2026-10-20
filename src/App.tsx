import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { courses, plans, testimonials } from './data'
import { api, getApiErrorMessage, type NewsArticle } from './api/client'
import MemberPortal, { ThemeToggle, type Theme } from './MemberPortal'
import TradingBackground from './components/TradingBackground'
import logo from '../images/logo/logos.jpeg'
import whiteLogo from '../images/logo/namedWhiteLogo.png'
import heroImage from '../images/background/software.png'
import launchImage from '../images/background/launch_day.webp'
import telegramIcon from '../images/svg/telegram-icon.svg'
import tele1 from '../images/telegram/telegram1.jpg'
import tele2 from '../images/telegram/telegram2.jpg'
import tele3 from '../images/telegram/telegram3.jpg'
import tele4 from '../images/telegram/telegram4.jpg'
import apollo from '../images/intraday/apollotire.webp'
import coforge from '../images/intraday/coforge.webp'
import crudeOil from '../images/intraday/crudeoil.webp'
import abbIndia from '../images/positional/abbindia.jpg'
import hul from '../images/positional/hul.jpg'
import tataCom from '../images/positional/tatacom.jpg'
import normalLogo from '../images/logo/normalLogo.png'

const TELEGRAM_URL = 'https://t.me/menezes725'
const TELEGRAM_GROUP_URL = 'https://t.me/+RqumyUtpnyZiY2Jl'
const WHATSAPP_URL = 'https://wa.me/9591463584'

type Policy = 'cookies' | 'terms' | 'privacy' | 'disclaimer' | 'careers'

const policyContent: Record<Policy, { title: string; body: string[] }> = {
  cookies: { title: 'Cookie Policy', body: ['We use essential browser storage to remember your cookie preference and keep the website working.', 'You can clear this preference at any time from your browser settings.'] },
  terms: { title: 'Terms & Conditions', body: ['This website provides educational market content. It does not provide investment advice or guarantee returns.', 'By using the site, you accept responsibility for your own trading and investment decisions.'] },
  privacy: { title: 'Privacy Policy', body: ['We only use details you deliberately provide to contact us. Do not submit sensitive financial or payment information through the contact form.', 'Third-party checkout, Telegram, WhatsApp and YouTube services apply their own privacy policies.'] },
  disclaimer: { title: 'Market Disclaimer', body: ['All posts, discussions and setups are for educational purposes only. We do not provide tips, recommendations or advisory services.', 'Markets and derivatives involve significant risk. Consult a registered financial adviser before making decisions.'] },
  careers: { title: 'Careers', body: ['There are currently no open positions.'] },
}

function App() {
  const location = useLocation()
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('theme') === 'light' ? 'light' : 'dark')
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [cookieVisible, setCookieVisible] = useState(() => localStorage.getItem('cookie-consent') === null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }, [theme])

  if (['/login', '/dashboard', '/sentiment', '/pre-market', '/premarket', '/stocks', '/market-data', '/favorites', '/mwpl-saturation', '/global-indices'].some((path) => location.pathname.startsWith(path))) {
    return <MemberPortal theme={theme} onThemeChange={setTheme} />
  }

  const setConsent = (value: 'accepted' | 'rejected') => {
    localStorage.setItem('cookie-consent', value)
    setCookieVisible(false)
  }

  return (
    <div className="app-shell">
      <TradingBackground theme={theme} />
      <a className="skip-link" href="#main-content">Skip to content</a>
      <ScrollManager />
      <Header theme={theme} onThemeChange={setTheme} />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<HomePage onPolicy={setPolicy} />} />
          {/* <Route path="/products" element={<ProductsPage />} /> */}
          {/* <Route path="/products/daily" element={<ProductsPage />} /> */}
          <Route path="/products/cartesian-waveshots" element={<LaunchPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/checkout/:planId" element={<CheckoutPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/account" element={<Navigate to="/login" replace />} />
          <Route path="/internal/chat" element={<UnavailablePage title="Community chat" />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="/productpage.html" element={<Navigate to="/products/daily" replace />} />
          <Route path="/bookpage.html" element={<Navigate to="/courses" replace />} />
          <Route path="/launch.html" element={<Navigate to="/products/cartesian-waveshots" replace />} />
          <Route path="/news.html" element={<Navigate to="/news" replace />} />
          <Route path="/result.html" element={<Navigate to="/results" replace />} />
          <Route path="/secretpage.html" element={<Navigate to="/join" replace />} />
          <Route path="/dev.html" element={<Navigate to="/internal/chat" replace />} />
          <Route path="/orderpages/:legacy" element={<LegacyCheckout />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer onPolicy={setPolicy} />
      <a className="telegram-float" href={TELEGRAM_URL} target="_blank" rel="noreferrer" aria-label="Join us on Telegram"><img src={telegramIcon} alt="" /></a>
      {cookieVisible && <CookieBanner onChoice={setConsent} onRead={() => setPolicy('cookies')} />}
      {policy && <PolicyModal policy={policy} onClose={() => setPolicy(null)} />}
    </div>
  )
}

function Header({ theme, onThemeChange }: { theme: Theme; onThemeChange: (theme: Theme) => void }) {
  const [open, setOpen] = useState(false)
  const navClass = ({ isActive }: { isActive: boolean }) => isActive ? 'active' : undefined
  return (
    <header className="site-header">
      <Link to="/" className="brand"><img src={theme === 'dark' ? logo : whiteLogo} alt="Greed and Fear" /></Link>
      <button className="menu-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Toggle navigation"><span /><span /><span /></button>
      <nav className={open ? 'site-nav open' : 'site-nav'} onClick={() => setOpen(false)}>
        <NavLink to="/" end className={navClass}>Home</NavLink><NavLink to="/courses" className={navClass}>Learn</NavLink>
        {/* <NavLink to="/products" className={navClass}>Membership</NavLink> */}
        <NavLink to="/results" className={navClass}>Results</NavLink><NavLink to="/news" className={navClass}>News</NavLink><NavLink to="/contact" className={navClass}>Contact</NavLink><ThemeToggle theme={theme} onChange={onThemeChange} compact /><Link className="button login-button" to="/login">Member login</Link>
      </nav>
    </header>
  )
}

function ScrollManager() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash) {
      window.requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }))
      return
    }
    window.scrollTo({ top: 0 })
  }, [location.pathname, location.hash])
  return null
}

function HomePage({ onPolicy }: { onPolicy: (policy: Policy) => void }) {
  const charts = [apollo, coforge, crudeOil]
  const positions = [abbIndia, hul, tataCom]
  return <>
    <section className="hero section-pad">
      <div>
        <h1>Start your trading journey by understanding the <span className="shimmer-text">market structure</span></h1>
        <p className="lead">Advanced technical analysis built around Elliott Wave Theory, Fibonacci harmony and price action.</p>
        <div className="button-row">
          <ExternalButton href={TELEGRAM_URL}>Join the trading desk</ExternalButton>
          <Link className="button login-button" to="/courses">Learn the strategy</Link>
          <Link className="button login-button" to="/login">Open terminal →</Link>
        </div>
        <div className="trust-row">
          <span>Risk-first approach</span>
          <span>Multi-timeframe analysis</span>
          <span>Real chart studies</span>
        </div>
      </div>
      <div className="hero-art">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <img src={heroImage} alt="Trading analysis workspace" />
      </div>
    </section>
    <section className="community-section section-pad">
      <TelegramGallery />
      <div><p className="eyebrow">Telegram community</p><h2>Market thinking, shared openly.</h2><p>Follow free Elliott Wave trade setups, market observations and educational chart breakdowns.</p><ExternalButton href={TELEGRAM_URL}>Open Telegram ↗</ExternalButton></div>
    </section>
    <section id="about" className="about section-pad">
      <div><p className="eyebrow">About us</p><h2>Built on Structure, Driven by Analysis.</h2><p>GREED & FEAR is a technical analysis platform focused on understanding markets through structure, cycles and price behaviour. Our methodology combines Elliott Wave Theory, Fibonacci relationships and price action to study market trends and potential scenarios across equities, indices and other financial markets. We don't aim to predict every move. We aim to understand what the market is telling us.</p><button className="text-button" onClick={() => onPolicy('disclaimer')}>Read our market disclaimer</button></div>
      <div className="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/crcPugw4Ddk" title="Why choose Greed and Fear" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
    </section>
    <ChartStrip title="Recent intraday charts" charts={charts} />
    <ChartStrip title="Positional market studies" charts={positions} />
    <ElliottWaveSection />
    {/* <PlanPreview /> */}
    <section className="testimonials section-pad"><SectionTitle eyebrow="Community" title="What our students say" /><div className="testimonial-grid">{testimonials.map((item) => <article className="quote-card" key={item.name}><p>“{item.text}”</p><strong>{item.name}</strong></article>)}</div></section>
  </>
}

function TelegramGallery() {
  const images = [tele1, tele2, tele3, tele4]
  const [active, setActive] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => setActive((value) => (value + 1) % images.length), 2500); return () => window.clearInterval(timer) }, [images.length])
  return <div className="gallery"><img src={images[active]} alt={`Telegram community result ${active + 1}`} /><div className="gallery-dots">{images.map((_, index) => <button className={index === active ? 'active' : ''} onClick={() => setActive(index)} key={index} aria-label={`Show image ${index + 1}`} />)}</div></div>
}

function ElliottWaveSection() {
  const [started, setStarted] = useState(false)
  const [waveStep, setWaveStep] = useState(0)
  const [cycle, setCycle] = useState(0)

  // Start on intersection, then loop forever
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true) },
      { threshold: 0.25 },
    )
    const el = document.getElementById('elliott-wave-section')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Step-by-step progressive draw without blinking past waves, then pause and restart fresh cycle
  useEffect(() => {
    if (!started) return
    if (waveStep < 8) {
      const delay = waveStep === 0 ? 350 : 650
      const t = setTimeout(() => setWaveStep((s) => s + 1), delay)
      return () => clearTimeout(t)
    } else {
      // Completed full 8-wave structure: pause 2.5s to display, then start new cycle
      const t = setTimeout(() => {
        setCycle((c) => c + 1)
        setWaveStep(0)
      }, 2500)
      return () => clearTimeout(t)
    }
  }, [started, waveStep])

  // SVG viewport 500×240 coordinates
  const pts = [
    { x: 40, y: 195 }, // 0: Origin
    { x: 110, y: 108 }, // 1: Wave 1 high
    { x: 165, y: 148 }, // 2: Wave 2 low
    { x: 265, y: 52 }, // 3: Wave 3 high
    { x: 315, y: 102 }, // 4: Wave 4 low
    { x: 395, y: 35 }, // 5: Wave 5 high
    { x: 425, y: 68 }, // 6: Wave A low
    { x: 452, y: 48 }, // 7: Wave B high
    { x: 472, y: 90 }, // 8: Wave C low
  ]

  // Distinct wave segments: 1-2-3-4-5 impulse (green), A-B-C corrective (orange)
  const segments = [
    { id: '1', from: pts[0], to: pts[1], wave: 1, isCorr: false },
    { id: '2', from: pts[1], to: pts[2], wave: 2, isCorr: false },
    { id: '3', from: pts[2], to: pts[3], wave: 3, isCorr: false },
    { id: '4', from: pts[3], to: pts[4], wave: 4, isCorr: false },
    { id: '5', from: pts[4], to: pts[5], wave: 5, isCorr: false },
    { id: 'A', from: pts[5], to: pts[6], wave: 6, isCorr: true },
    { id: 'B', from: pts[6], to: pts[7], wave: 7, isCorr: true },
    { id: 'C', from: pts[7], to: pts[8], wave: 8, isCorr: true },
  ]

  const waveLabels = [
    { pt: pts[1], label: '1', dx: -18, dy: -14, wave: 1 },
    { pt: pts[2], label: '2', dx: 6, dy: 18, wave: 2 },
    { pt: pts[3], label: '3', dx: 0, dy: -16, wave: 3 },
    { pt: pts[4], label: '4', dx: 6, dy: 18, wave: 4 },
    { pt: pts[5], label: '5', dx: 0, dy: -16, wave: 5 },
    { pt: pts[6], label: 'A', dx: 4, dy: 18, wave: 6 },
    { pt: pts[7], label: 'B', dx: 6, dy: -14, wave: 7 },
    { pt: pts[8], label: 'C', dx: 0, dy: 18, wave: 8 },
  ]

  const invalidY = 148
  const waveNames = ['—', '1', '2', '3', '4', '5', 'A', 'B', 'C']
  const currentWave = waveNames[Math.min(waveStep, 8)]
  const structureLabel = waveStep >= 6 ? 'A-B-C Correction' : 'Impulse'
  const confidence = waveStep >= 5 ? 'High' : waveStep >= 3 ? 'Building' : waveStep >= 1 ? 'Forming' : '—'

  return (
    <section id="elliott-wave-section" className="elliott-wave-section section-pad">
      <div className="ew-inner">
        {/* ── Left copy ── */}
        <div className="ew-copy">
          <p className="eyebrow">Elliott Wave Intelligence</p>
          <h2>Read the wave.<br /><span className="shimmer-text">Know the level.</span></h2>
          <p className="ew-lead">Markets move in impulses and corrections. We label the wave structure automatically, so you can see where price is in the cycle and what level breaks the count.</p>
          <div className="ew-features">
            <div className="ew-feat">
              <span className="ew-feat-num">5</span>
              <div>
                <strong>Impulse Waves, labelled</strong>
                <small>Impulse 1-2-3-4-5 mapped automatically</small>
              </div>
            </div>
            <div className="ew-feat">
              <span className="ew-feat-num">3</span>
              <div>
                <strong>A-B-C with Fibonacci zones</strong>
                <small>Corrective waves, plotted</small>
              </div>
            </div>
            <div className="ew-feat">
              <span className="ew-feat-num">1</span>
              <div>
                <strong>One clear count</strong>
                <small>Current wave, target and invalidation</small>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: cinematic wave chart ── */}
        <div className="ew-chart-wrap">
          {/* Header — wave type badge only */}
          <div className="ew-chart-header ew-chart-header--clean">
            <span className="ew-wave-label">Elliott Wave · Live Count</span>
            <span className={`ew-badge ${waveStep >= 6 ? 'ew-badge--corr' : ''}`}>
              {waveStep >= 6 ? 'Correction A-B-C' : 'Impulse 1-2-3-4-5'}
            </span>
          </div>

          {/* SVG chart */}
          <div className="ew-svg-wrap">
            <svg viewBox="0 0 500 240" className="ew-svg" aria-label="Animated Elliott Wave structure">
              <defs>
                <linearGradient id="ew-grad-green" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="ew-grad-orange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Subtle grid */}
              {[55, 95, 135, 175, 215].map((y) => (
                <line key={y} x1="25" y1={y} x2="490" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}

              {/* Invalidation dashed line — once mounted, stays static */}
              {waveStep >= 2 && (
                <g key={`c${cycle}-inv`} className="ew-fade-in">
                  <line
                    x1="120" y1={invalidY} x2="490" y2={invalidY}
                    stroke="rgba(239,68,68,0.35)" strokeWidth="1" strokeDasharray="5 4"
                  />
                  <text x="485" y={invalidY - 4} textAnchor="end" fill="rgba(239,68,68,0.6)" fontSize="8.5" fontFamily="monospace">
                    Wave 1 Invalidation
                  </text>
                </g>
              )}

              {/* Area fill under each formed segment — persists without blinking */}
              {segments.map((seg) => {
                if (waveStep < seg.wave) return null
                const isCorr = seg.isCorr
                return (
                  <polygon
                    key={`c${cycle}-area-${seg.id}`}
                    points={`${seg.from.x},${seg.from.y} ${seg.to.x},${seg.to.y} ${seg.to.x},240 ${seg.from.x},240`}
                    fill={isCorr ? 'url(#ew-grad-orange)' : 'url(#ew-grad-green)'}
                    className="ew-fade-in"
                  />
                )
              })}

              {/* Wave segments — each draws only when its turn comes, previous segments remain completely static */}
              {segments.map((seg) => {
                if (waveStep < seg.wave) return null
                const len = Math.ceil(Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y)) + 2
                const strokeColor = seg.isCorr ? '#f97316' : '#22c55e'
                return (
                  <line
                    key={`c${cycle}-seg-${seg.id}`}
                    x1={seg.from.x}
                    y1={seg.from.y}
                    x2={seg.to.x}
                    y2={seg.to.y}
                    stroke={strokeColor}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="ew-seg-draw"
                    style={{
                      strokeDasharray: len,
                      strokeDashoffset: len,
                      ['--seg-len' as string]: `${len}px`,
                    } as React.CSSProperties}
                  />
                )
              })}

              {/* Confirmed pivot nodes */}
              {waveStep >= 1 && (
                <circle key={`c${cycle}-p0`} cx={pts[0].x} cy={pts[0].y} r="2.5" fill="#22c55e" className="ew-fade-in" />
              )}
              {segments.map((seg) => {
                if (waveStep < seg.wave) return null
                return (
                  <circle
                    key={`c${cycle}-pv-${seg.id}`}
                    cx={seg.to.x}
                    cy={seg.to.y}
                    r="2.5"
                    fill={seg.isCorr ? '#f97316' : '#22c55e'}
                    className="ew-fade-in"
                  />
                )
              })}

              {/* Wave labels (1, 2, 3, 4, 5, A, B, C) — stable keys so they never re-pop/blink */}
              {waveLabels.map(({ pt, label, dx, dy, wave }) => {
                if (waveStep < wave) return null
                const isCorr = ['A', 'B', 'C'].includes(label)
                const cx = pt.x + dx + 8
                const cy = pt.y + dy + 8
                return (
                  <g key={`c${cycle}-lbl-${label}`} className="ew-label-appear">
                    <circle
                      cx={cx} cy={cy} r="10.5"
                      fill={isCorr ? 'rgba(249,115,22,0.16)' : 'rgba(34,197,94,0.16)'}
                      stroke={isCorr ? '#f97316' : '#22c55e'}
                      strokeWidth="1.1"
                    />
                    <text x={cx} y={cy + 3.5} textAnchor="middle" fill={isCorr ? '#f97316' : '#22c55e'} fontSize="9.5" fontWeight="800" fontFamily="monospace">
                      {label}
                    </text>
                  </g>
                )
              })}

              {/* Pulsing live tip dot — indicates the active wave formation head */}
              {waveStep > 0 && waveStep <= 8 && (
                <g key={`c${cycle}-tip-${waveStep}`} className="ew-fade-in">
                  <circle
                    cx={pts[waveStep].x}
                    cy={pts[waveStep].y}
                    r="8"
                    fill={waveStep >= 6 ? 'rgba(249,115,22,0.2)' : 'rgba(34,197,94,0.2)'}
                    className="ew-dot-ring"
                  />
                  <circle
                    cx={pts[waveStep].x}
                    cy={pts[waveStep].y}
                    r="3.5"
                    fill={waveStep >= 6 ? '#f97316' : '#22c55e'}
                    className="ew-live-dot"
                  />
                </g>
              )}
            </svg>
          </div>

          {/* Bottom live stats */}
          <div className="ew-stats">
            <div>
              <span>WAVE</span>
              <strong>{currentWave}</strong>
            </div>
            <div>
              <span>STRUCTURE</span>
              <strong>{structureLabel}</strong>
            </div>
            <div>
              <span>SIGNAL</span>
              <strong className={waveStep >= 5 ? 'ew-stat-green' : ''}>{confidence}</strong>
            </div>
          </div>
          <p className="ew-disclaimer">Educational demonstration only. Not investment advice.</p>
        </div>
      </div>
    </section>
  )
}

function ChartStrip({ title, charts }: { title: string; charts: string[] }) {
  return <section className="chart-section section-pad"><SectionTitle eyebrow="Track record" title={title} /><div className="chart-strip">{charts.map((chart) => <img src={chart} alt="Technical analysis chart" loading="lazy" key={chart} />)}</div></section>
}

// function PlanPreview() {
//   return <section className="plans-section section-pad"><SectionTitle eyebrow="Membership" title="Choose the depth you need" /><div className="plan-grid">{plans.map((plan) => <PlanCard planId={plan.id} key={plan.id} />)}</div></section>
// }

// function PlanCard({ planId }: { planId: PlanId }) {
//   const plan = plans.find((item) => item.id === planId)!
//   return <article className={plan.id === 'premium' ? 'plan-card featured' : 'plan-card'}>{plan.id === 'premium' && <span className="popular-badge">Most popular</span>}<p className="eyebrow">{plan.name}</p><h3>₹{plan.weeklyPrice}<small>/week</small></h3><p className="monthly-price">or ₹{plan.monthlyPrice} monthly</p><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><Link className="button" to={`/checkout/${plan.id}`}>See {plan.name.toLowerCase()} details</Link></article>
// }

// function ProductsPage() {
//   return <Page><PageHero eyebrow="Greed & Fear Daily" title="A plan for every stage of your process." copy="Every membership is built around educational setups and transparent chart analysis. Choose the cadence and market coverage that suits you." /><div className="plan-grid wide">{plans.map((plan) => <PlanCard planId={plan.id} key={plan.id} />)}</div><p className="page-note">After successful payment, the checkout provider will share access instructions for the relevant community.</p></Page>
// }

function CoursesPage() {
  return <Page><PageHero eyebrow="Market education" title="Learn the logic behind the chart." copy="Structured learning paths for traders who want to move beyond signals and build independent analysis skills." /><div className="course-grid">{courses.map((course, index) => <article className="course-card" key={course.name}><span>0{index + 1}</span><h2>{course.name}</h2><p>{course.description}</p><ExternalButton href={WHATSAPP_URL}>Register interest</ExternalButton></article>)}</div></Page>
}

function CheckoutPage() {
  const { planId } = useParams()
  const plan = plans.find((item) => item.id === planId)
  if (!plan) return <NotFoundPage />
  return <Page><PageHero eyebrow="Secure checkout" title={`${plan.name} plan`} copy="Select a billing period. Payment is handled by Cosmofeed in a separate, secure window." /><div className="checkout-layout"><article className="checkout-summary"><h2>What is included</h2><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></article><div className="billing-options"><BillingOption label="Weekly" price={plan.weeklyPrice} href={plan.weeklyCheckout} /><BillingOption label="Monthly" price={plan.monthlyPrice} href={plan.monthlyCheckout} /></div></div><div className="support-box"><p>Questions before joining?</p><ExternalButton href={WHATSAPP_URL}>Contact on WhatsApp</ExternalButton><ExternalButton href={TELEGRAM_GROUP_URL} secondary>Contact on Telegram</ExternalButton></div></Page>
}

function BillingOption({ label, price, href }: { label: string; price: number; href: string }) {
  return <article className="billing-card"><span>{label}</span><strong>₹{price}</strong><ExternalButton href={href}>Continue to payment</ExternalButton></article>
}

function LegacyCheckout() {
  const { legacy = '' } = useParams()
  const planId = legacy.toLowerCase().includes('elite') ? 'elite' : legacy.toLowerCase().includes('premium') ? 'premium' : 'basic'
  return <Navigate to={`/checkout/${planId}`} replace />
}

function ResultsPage() {
  const services = [{ title: 'Analysis', text: 'Elliott Wave analysis across stocks, indices and commodities.' }, { title: 'Market news', text: 'Context for market conditions, corporate actions and global events.' }, { title: 'Premium services', text: 'More frequent educational setups with detailed market logic.' }, { title: 'Education', text: 'Learn the process behind structure, entries and risk management.' }]
  return <Page><PageHero eyebrow="Educational trade studies" title="Review the chart, not just the outcome." copy="Our published studies preserve the market context and technical reasoning behind each setup." /><div className="service-grid">{services.map((service) => <article key={service.title}><span>↗</span><h2>{service.title}</h2><p>{service.text}</p></article>)}</div><ChartStrip title="Selected analysis" charts={[apollo, coforge, abbIndia]} /><div className="center"><ExternalButton href={TELEGRAM_URL}>See current studies</ExternalButton></div></Page>
}

function NewsPage() {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadNews = async (search = '') => { setLoading(true); setError(''); try { setArticles(await api.news(search)) } catch (reason) { setError(getApiErrorMessage(reason, 'Unable to load news.')) } finally { setLoading(false) } }
  useEffect(() => { void api.news().then(setArticles).catch((reason) => setError(getApiErrorMessage(reason, 'Unable to load news.'))).finally(() => setLoading(false)) }, [])
  const search = (event: FormEvent) => { event.preventDefault(); void loadNews(query) }
  return <Page><PageHero eyebrow="Market brief" title="Find the context behind the move." copy="Browse current market updates from the Greed & Fear data service." /><form className="news-search" onSubmit={search}><label htmlFor="news-query">What would you like to read about?</label><div><input id="news-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try crude, Nifty, or earnings" maxLength={100} /><button className="button" type="submit">Search updates</button></div></form>{loading ? <p className="data-state" aria-live="polite">Loading market updates...</p> : error ? <div className="data-state"><p>{error}</p><button className="text-button" onClick={() => void loadNews(query)}>Try again</button></div> : articles.length ? <div className="topic-grid">{articles.map((article) => <article className="news-card" key={article.id}><span>{article.category}</span><h2>{article.title}</h2><p>{article.summary}</p><small>{article.source} · {new Date(article.published_at).toLocaleDateString('en-IN')}</small></article>)}</div> : <div className="data-state"><p>No updates match “{query}”.</p><button className="text-button" onClick={() => { setQuery(''); void loadNews() }}>Show all updates</button></div>}</Page>
}

function LaunchPage() {
  return <section className="launch-page" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.94), rgba(0,0,0,.45)), url(${launchImage})` }}><p className="eyebrow">Cartesian Waveshots</p><h1>A new market experience is taking shape.</h1><p>Launch timing will be announced to our community.</p><ExternalButton href={TELEGRAM_URL}>Get launch updates</ExternalButton></section>
}

function JoinPage() {
  return <Page><PageHero eyebrow="Join us" title="Continue the conversation." copy="Choose the channel that works for you. Telegram carries community updates, while WhatsApp is best for direct support." /><div className="join-grid"><article><img src={telegramIcon} alt="" /><h2>Telegram community</h2><p>Educational setups, charts and market discussions.</p><ExternalButton href={TELEGRAM_GROUP_URL}>Join Telegram</ExternalButton></article><article><span className="whatsapp-mark">W</span><h2>WhatsApp support</h2><p>Ask a direct question about membership or access.</p><ExternalButton href={WHATSAPP_URL}>Open WhatsApp</ExternalButton></article></div></Page>
}

function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('sending')
    setError('')
    try {
      const response = await api.contact({ name: String(data.get('name')), phone: String(data.get('phone')), subject: String(data.get('subject')), message: String(data.get('message')) })
      setReference(response.reference); setStatus('sent'); form.reset()
    } catch (reason) { setError(getApiErrorMessage(reason, 'Unable to send your enquiry.')); setStatus('error') }
  }
  return <div className="contact-page">
    <section className="contact-main section-pad">
      <div className="contact-intro"><p className="contact-kicker">Get in touch</p><h1>Let’s connect and <span><b>grow</b><b>together</b></span></h1><p className="contact-lead">Have a question, suggestion, or just want to say hello? Our team is here to assist you on your trading journey.</p><div className="contact-options">
        <article><i><ContactIcon type="chat" /></i><h2>Chat with us</h2><p>Join our Telegram community for quick support and market updates.</p><a href={TELEGRAM_URL} target="_blank" rel="noreferrer">Join Telegram ↗</a></article>
        <article><i><ContactIcon type="email" /></i><h2>Email us</h2><p>Drop us an email and we’ll get back to you as soon as possible.</p><a href="mailto:greedandfearacademy@gmail.com" title="greedandfearacademy@gmail.com">Email our team ↗</a></article>
        <article><i><ContactIcon type="clock" /></i><h2>Response time</h2><p>We aim to respond within 24 hours on business days.</p><strong>Mon – Sat: 10 AM – 7 PM</strong></article>
      </div></div>
      <form className="contact-message-card" onSubmit={submit}><p className="contact-kicker">Direct message</p><h2>Send us a message</h2><div className="contact-form-row"><label><span className="sr-only">Your name</span><input name="name" autoComplete="name" placeholder="Your name" maxLength={120} required /></label><label><span className="sr-only">Phone or email</span><input name="phone" autoComplete="tel" placeholder="Phone or email" maxLength={30} required /></label></div><label><span className="sr-only">Subject</span><input name="subject" placeholder="Subject" maxLength={160} required /></label><label><span className="sr-only">Your message</span><textarea name="message" rows={7} placeholder="Your message" maxLength={5000} required /></label><button type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending...' : 'Send message'} <span>↗</span></button>{status === 'sent' && <p className="contact-success" role="status">Message received. Your reference is <strong>{reference}</strong>.</p>}{status === 'error' && <p className="form-error" role="alert">{error}</p>}</form>
    </section>
    <section className="contact-market-banner section-pad"><div className="banner-candles"><i /><i /><i /><i /></div><div><h2>Together, we navigate the markets</h2><p>Knowledge, discipline, and community create stronger traders. Let’s build a better trading future together.</p></div><img src={normalLogo} alt="" /></section>
  </div>
}

function ContactIcon({ type }: { type: 'chat' | 'email' | 'clock' }) {
  if (type === 'chat') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z" /><path d="M8 10.8h.01M12 10.8h.01M16 10.8h.01" /></svg>
  if (type === 'email') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
}

function Footer({ onPolicy }: { onPolicy: (policy: Policy) => void }) {
  return <footer><div className="footer-contact"><a href="mailto:greedandfearacademy@gmail.com">greedandfearacademy@gmail.com</a><a href="tel:+917899404714">+91 78994 04714</a></div><div className="footer-grid"><div><img src={normalLogo} alt="Greed and Fear" /><p>Technical analysis education for thoughtful market participants.</p></div><div><h3>Explore</h3><Link to="/courses">Courses</Link><Link to="/results">Results</Link><Link to="/news">News</Link><Link to="/contact">Contact</Link></div><div><h3>Community</h3><a href={TELEGRAM_URL} target="_blank" rel="noreferrer">Telegram</a><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp</a><Link to="/login">Member login</Link><button onClick={() => onPolicy('careers')}>Careers</button></div><div><h3>Policies</h3>{(['terms', 'privacy', 'cookies', 'disclaimer'] as Policy[]).map((item) => <button onClick={() => onPolicy(item)} key={item}>{policyContent[item].title}</button>)}</div></div><div className="copyright">© {new Date().getFullYear()} Greed & Fear. Educational content only.</div></footer>
}

function CookieBanner({ onChoice, onRead }: { onChoice: (choice: 'accepted' | 'rejected') => void; onRead: () => void }) {
  return <aside className="cookie-banner" aria-label="Cookie preferences"><p>We use essential storage to remember your preferences.</p><div><button className="button" onClick={() => onChoice('accepted')}>Accept</button><button className="button secondary" onClick={() => onChoice('rejected')}>Reject</button><button className="text-button" onClick={onRead}>Read policy</button></div></aside>
}

function PolicyModal({ policy, onClose }: { policy: Policy; onClose: () => void }) {
  const content = policyContent[policy]
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="policy-modal" role="dialog" aria-modal="true" aria-labelledby="policy-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">Greed & Fear</p><h2 id="policy-title">{content.title}</h2>{content.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<button className="button" onClick={onClose}>Close</button></section></div>
}

function Page({ children }: { children: ReactNode }) { return <div className="page section-pad">{children}</div> }
function PageHero({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <header className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></header> }
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <header className="section-title"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></header> }
function ExternalButton({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) { return <a className={secondary ? 'button secondary' : 'button login-button'} href={href} target="_blank" rel="noreferrer">{children}</a> }
function UnavailablePage({ title }: { title: string }) { return <Page><PageHero eyebrow="In development" title={title} copy="This prototype did not have a working backend in the legacy site. It has been retained as a route but is not available yet." /><Link className="button" to="/">Return home</Link></Page> }
function NotFoundPage() { return <Page><PageHero eyebrow="404" title="This page has moved." copy="Use the navigation to find the current page." /><Link className="button" to="/">Return home</Link></Page> }

export default App
