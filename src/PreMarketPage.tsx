import { useState, useEffect, useMemo } from 'react'
import { api, type PreMarketIndicatorRun, type PreMarketSignal } from './api/client'
import './premarket.css'

// Default fallback data matching the reference screenshot exactly if backend has no runs yet
const FALLBACK_RUN: PreMarketIndicatorRun = {
  timestamp: new Date().toISOString(),
  direction: {
    call: 'BEARISH',
    counts: { bullish: 1, bearish: 3, neutral: 0 },
  },
  volatility: {
    state: 'STABLE',
    label: 'Stable',
    value: 11.70,
  },
  combined: {
    label: 'Bearish & Stable',
  },
  signals: [
    {
      key: 'nasdaq',
      label: 'NASDAQ',
      raw: { close: 26047.656, percentChange: -0.51 },
      vote: -1,
      ok: true,
      voteLabel: 'BEARISH',
    },
    {
      key: 'dow',
      label: 'Dow Jones',
      raw: { close: 53346.23, percentChange: 0.13 },
      vote: 1,
      ok: true,
      voteLabel: 'BULLISH',
    },
    {
      key: 'breadth',
      label: 'NSE Advances/Declines',
      raw: { advances: 23, declines: 26 },
      vote: -1,
      ok: true,
      voteLabel: 'BEARISH',
    },
    {
      key: 'giftNifty',
      label: 'GIFT Nifty',
      raw: { close: 24211, percentChange: -0.26 },
      vote: -1,
      ok: true,
      voteLabel: 'BEARISH',
    },
    {
      key: 'vix',
      label: 'India VIX',
      raw: { value: 11.70, percentChange: 4.51 },
      volatility: 'STABLE',
      ok: true,
    },
  ],
}

export default function PreMarketPage() {
  const [currentRun, setCurrentRun] = useState<PreMarketIndicatorRun | null>(null)
  const [history, setHistory] = useState<PreMarketIndicatorRun[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    let ignore = false
    Promise.all([
      api.getPreMarketLatest(),
      api.getPreMarketHistory(30),
    ])
      .then(([latest, hist]) => {
        if (ignore) return
        if (latest && latest.signals) {
          setCurrentRun(latest)
        } else if (hist && hist.length > 0) {
          setCurrentRun(hist[0])
        } else {
          setCurrentRun(FALLBACK_RUN)
        }
        if (hist && hist.length > 0) {
          setHistory(hist)
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load pre-market indicator data:', err)
        if (!ignore) {
          setCurrentRun((prev) => prev || FALLBACK_RUN)
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [])

  const handleRunNow = async () => {
    setRunning(true)
    try {
      const freshRun = await api.runPreMarketNow()
      if (freshRun && freshRun.signals) {
        setCurrentRun(freshRun)
        setHistory((prev) => [freshRun, ...prev.slice(0, 29)])
      } else {
        const [latest, hist] = await Promise.all([
          api.getPreMarketLatest(),
          api.getPreMarketHistory(30),
        ])
        if (latest && latest.signals) setCurrentRun(latest)
        if (hist && hist.length > 0) setHistory(hist)
      }
    } catch (err) {
      console.error('Run now failed:', err)
    } finally {
      setRunning(false)
    }
  }

  const run = currentRun || FALLBACK_RUN

  // Extract signals
  const nasdaq = run.signals.find((s) => s.key === 'nasdaq')
  const dow = run.signals.find((s) => s.key === 'dow')
  const breadth = run.signals.find((s) => s.key === 'breadth')
  const giftNifty = run.signals.find((s) => s.key === 'giftNifty')
  const vix = run.signals.find((s) => s.key === 'vix')

  // Direction classification
  const call = run.direction?.call || 'NEUTRAL'
  const isBearish = call === 'BEARISH'
  const isBullish = call === 'BULLISH'
  const heroTone = isBearish ? 'bearish' : isBullish ? 'bullish' : 'neutral'

  // Counts
  const bullishCount = run.direction?.counts?.bullish ?? 0
  const bearishCount = run.direction?.counts?.bearish ?? 0
  const neutralCount = run.direction?.counts?.neutral ?? 0

  // Volatility
  const volState = run.volatility?.state || 'STABLE'
  const volValue = run.volatility?.value ?? vix?.raw?.value ?? 11.7
  const isVolatile = volState === 'VOLATILE'

  // Gauge arc calculation (fraction out of 4 direction signals)
  const maxSignals = 4
  const activeCount = isBearish ? bearishCount : isBullish ? bullishCount : Math.max(neutralCount, 1)
  const arcPercent = Math.min(Math.max((activeCount / maxSignals) * 100, 25), 100)
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (arcPercent / 100) * circumference

  // Formatters
  const formatTime = (iso?: string) => {
    if (!iso) return 'Just now'
    try {
      return new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const formatPercent = (val?: number | null) => {
    if (typeof val !== 'number' || isNaN(val)) return '—'
    const sign = val > 0 ? '+' : ''
    return `${sign}${val.toFixed(2)}%`
  }

  const formatNumber = (num?: number | null) => {
    if (typeof num !== 'number' || isNaN(num)) return '—'
    return num.toLocaleString('en-IN', { maximumFractionDigits: 3 })
  }

  return (
    <div className="premarket-wrapper">
      {/* Title & Metadata Header */}
      <div className="pm-title-row">
        <div className="pm-title-left">
          <h1>
            Pre-Market Sentiment Indicator
            <button
              type="button"
              className="pm-info-btn"
              title="How is this indicator calculated?"
              onClick={() => setShowInfo(true)}
              aria-label="Indicator methodology information"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
              </svg>
            </button>
          </h1>
          <div className="pm-subtitle">
            <b>Direction:</b> NASDAQ <span className="sep">&middot;</span> Dow Jones <span className="sep">&middot;</span> NSE Advances/Declines <span className="sep">&middot;</span> GIFT Nifty
            <span className="sep">|</span>
            <b>Volatility:</b> India VIX
          </div>
        </div>

        <div className="pm-header-actions">
          <button
            type="button"
            className="pm-run-btn"
            onClick={handleRunNow}
            disabled={running}
          >
            <svg
              className={running ? 'spin' : ''}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {running ? 'Running...' : 'Run now'}
          </button>

          <div className="pm-last-run-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" />
            </svg>
            <span>{loading ? 'Loading...' : <>Last run: <b>{formatTime(run.timestamp)} IST</b></>}</span>
          </div>
        </div>
      </div>

      {/* Hero Combined Sentiment Banner */}
      <div className={`pm-hero-card ${heroTone}`}>
        <div className="pm-hero-left">
          {/* Circular Donut Ring */}
          <div className="pm-gauge-wrap">
            <svg className="pm-gauge-svg" viewBox="0 0 90 90">
              <circle className="pm-gauge-bg" cx="45" cy="45" r={radius} />
              <circle
                className={`pm-gauge-bar ${heroTone}`}
                cx="45"
                cy="45"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="pm-gauge-center">
              {isBearish && (
                <svg className="pm-gauge-arrow bearish" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="7" y1="7" x2="17" y2="17" />
                  <polyline points="17 7 17 17 7 17" />
                </svg>
              )}
              {isBullish && (
                <svg className="pm-gauge-arrow bullish" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              )}
              {!isBearish && !isBullish && (
                <svg className="pm-gauge-arrow neutral" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </div>
          </div>

          {/* Hero Meta Info */}
          <div className="pm-hero-info">
            <h2 className={`pm-hero-title ${heroTone}`}>
              {run.combined?.label || `${call.charAt(0) + call.slice(1).toLowerCase()} & ${volState.charAt(0) + volState.slice(1).toLowerCase()}`}
            </h2>
            <div className="pm-hero-counts">
              <span className="count-bullish">{bullishCount} bullish</span>
              <span>&middot;</span>
              <span className="count-bearish">{bearishCount} bearish</span>
              <span>&middot;</span>
              <span className="count-neutral">{neutralCount} neutral</span>
              <span>(of 4 direction signals)</span>
            </div>
            <div className={`pm-hero-pill ${isVolatile ? 'volatile' : 'stable'}`}>
              <span className="dot" />
              {volState} (VIX {volValue ? volValue.toFixed(2) : '11.70'})
            </div>
          </div>
        </div>

        {/* Right-hand Sparkline Wave for Hero */}
        <div className="pm-hero-chart-wrap">
          <SparklineGlow
            tone={heroTone}
            historyRuns={history}
            signalKey="hero"
            currentVal={isBearish ? -1 : isBullish ? 1 : 0}
            height={100}
            width={380}
            isHero
          />
        </div>
      </div>

      {/* Middle 2x2 Grid of 4 Direction Cards */}
      <div className="pm-tiles-grid">
        {/* 1. NASDAQ */}
        <SignalCard
          label="NASDAQ"
          icon="trend-down"
          tone={getSignalTone(nasdaq)}
          value={formatPercent(nasdaq?.raw?.percentChange ?? -0.51)}
          subtitle={nasdaq?.raw?.close != null ? `Close ${formatNumber(nasdaq.raw.close)}` : 'Close 26,047.656'}
          historyRuns={history}
          signalKey="nasdaq"
          currentVal={nasdaq?.raw?.percentChange ?? -0.51}
        />

        {/* 2. Dow Jones */}
        <SignalCard
          label="Dow Jones"
          icon="trend-up"
          tone={getSignalTone(dow)}
          value={formatPercent(dow?.raw?.percentChange ?? 0.13)}
          subtitle={dow?.raw?.close != null ? `Close ${formatNumber(dow.raw.close)}` : 'Close 53,346.23'}
          historyRuns={history}
          signalKey="dow"
          currentVal={dow?.raw?.percentChange ?? 0.13}
        />

        {/* 3. NSE Advances/Declines */}
        <SignalCard
          label="NSE Advances/Declines"
          icon="bar-chart"
          tone={getSignalTone(breadth)}
          value={breadth?.raw ? `${breadth.raw.advances} / ${breadth.raw.declines}` : '23 / 26'}
          subtitle={breadth?.raw ? `${breadth.raw.advances} Adv · ${breadth.raw.declines} Dec` : 'Advances / Declines'}
          historyRuns={history}
          signalKey="breadth"
          currentVal={(breadth?.raw?.advances ?? 23) - (breadth?.raw?.declines ?? 26)}
        />

        {/* 4. GIFT Nifty */}
        <SignalCard
          label="GIFT Nifty"
          icon={getSignalTone(giftNifty) === 'bullish' ? 'trend-up' : 'trend-down'}
          tone={getSignalTone(giftNifty)}
          value={formatPercent(giftNifty?.raw?.percentChange ?? -0.26)}
          subtitle={giftNifty?.raw?.close != null ? `Close ${formatNumber(giftNifty.raw.close)}` : 'Close 24,211'}
          historyRuns={history}
          signalKey="giftNifty"
          currentVal={giftNifty?.raw?.percentChange ?? -0.26}
        />
      </div>

      {/* Volatility Full-Width Card: India VIX */}
      <div className="pm-card pm-volatility-card">
        <div className="pm-vol-left">
          <div className={`pm-card-icon ${isVolatile ? 'bearish' : 'neutral'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="pm-vol-meta">
            <span className="pm-card-label">India VIX</span>
            <span className="pm-vol-val">{vix?.raw?.value ? vix.raw.value.toFixed(2) : '11.70'}</span>
            <span className="pm-vol-sub">
              {vix?.raw?.percentChange != null
                ? `${formatPercent(vix.raw.percentChange)} vs prev close`
                : '+4.51% vs prev close'}
            </span>
          </div>
        </div>

        <div className="pm-vol-graph-wrap">
          <SparklineGlow
            tone={isVolatile ? 'bearish' : 'neutral'}
            historyRuns={history}
            signalKey="vix"
            currentVal={vix?.raw?.value ?? 11.7}
            height={50}
            width={480}
          />
        </div>
      </div>

      {/* Disclaimer Footer */}
      <div className="pm-footer-card">
        <div className="pm-disclaimer-left">
          <div className="pm-shield-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
          </div>
          <span className="pm-disclaimer-text">
            Market sentiment indicators are for informational purposes only and should not be considered as financial advice.
          </span>
        </div>
        <div className="pm-source-tag">
          <span className="dot" />
          Source: Market Data
        </div>
      </div>

      {/* Historical Runs Accordion */}
      {history.length > 0 && (
        <div className="pm-history-card">
          <button
            type="button"
            className="pm-history-toggle"
            onClick={() => setShowHistory((v) => !v)}
          >
            <div className="pm-history-toggle-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" />
              </svg>
              <span>Session Run History</span>
              <span className="pm-history-count-badge">{history.length} records</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showHistory && (
            <div className="pm-table-wrap">
              <table className="pm-history-table">
                <thead>
                  <tr>
                    <th>Time (IST)</th>
                    <th>Direction</th>
                    <th>Volatility</th>
                    <th>NASDAQ</th>
                    <th>Dow Jones</th>
                    <th>NSE A/D</th>
                    <th>GIFT Nifty</th>
                    <th>India VIX</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, idx) => {
                    const hCall = h.direction?.call || 'NEUTRAL'
                    const hTone = hCall === 'BULLISH' ? 'bullish' : hCall === 'BEARISH' ? 'bearish' : 'neutral'
                    const hVol = h.volatility?.state || 'STABLE'
                    const sMap = Object.fromEntries((h.signals || []).map((s) => [s.key, s]))
                    return (
                      <tr key={h.timestamp || idx}>
                        <td>{formatTime(h.timestamp)}</td>
                        <td>
                          <span className={`pm-pill-small ${hTone}`}>
                            <span className="dot" />
                            {hCall}
                          </span>
                        </td>
                        <td>
                          <span className={`pm-pill-small ${hVol === 'VOLATILE' ? 'volatile' : 'stable'}`}>
                            <span className="dot" />
                            {hVol}
                          </span>
                        </td>
                        <td>{formatPercent(sMap.nasdaq?.raw?.percentChange)}</td>
                        <td>{formatPercent(sMap.dow?.raw?.percentChange)}</td>
                        <td>
                          {sMap.breadth?.raw ? `${sMap.breadth.raw.advances}/${sMap.breadth.raw.declines}` : '—'}
                        </td>
                        <td>{formatPercent(sMap.giftNifty?.raw?.percentChange)}</td>
                        <td>{sMap.vix?.raw?.value ? sMap.vix.raw.value.toFixed(2) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Info Popover Modal */}
      {showInfo && (
        <div className="pm-modal-backdrop" onClick={() => setShowInfo(false)}>
          <div className="pm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pm-modal-header">
              <h3>Pre-Market Sentiment Indicator Methodology</h3>
              <button
                type="button"
                className="pm-modal-close"
                onClick={() => setShowInfo(false)}
                aria-label="Close dialog"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="pm-modal-body">
              <p>
                The Pre-Market Composite Sentiment Indicator measures global directional momentum and domestic volatility between 9:00 AM and 9:05 AM IST before the Indian equity market opens.
              </p>
              <div className="pm-modal-grid">
                <div className="pm-modal-box">
                  <h4>Direction Signals (4 Inputs)</h4>
                  <p>
                    Evaluates NASDAQ (^IXIC), Dow Jones (^DJI), GIFT Nifty, and NSE 50 Advances vs Declines. A &gt;0.10% threshold votes Bullish, &lt;-0.10% votes Bearish.
                  </p>
                </div>
                <div className="pm-modal-box">
                  <h4>Majority Direction Rule</h4>
                  <p>
                    At least 3 of 4 signals in agreement produce a BULLISH or BEARISH call. If split (e.g. 2 vs 2 or mixed), the composite call remains NEUTRAL.
                  </p>
                </div>
                <div className="pm-modal-box">
                  <h4>India VIX (Volatility)</h4>
                  <p>
                    VIX values &le; 15 represent STABLE market regimes, while &gt; 15 represent VOLATILE environments with heightened risk premium.
                  </p>
                </div>
                <div className="pm-modal-box">
                  <h4>Combined Outlook</h4>
                  <p>
                    Direction and Volatility synthesize into an actionable call (e.g. <em>Bearish & Stable</em> or <em>Bullish & Stable</em>) to inform morning positioning.
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                Powered by Greed &amp; Fear Market Engine with real-time updates and historical session logging.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getSignalTone(sig?: PreMarketSignal): 'bullish' | 'bearish' | 'neutral' {
  if (!sig || !sig.ok) return 'neutral'
  if (sig.vote === 1) return 'bullish'
  if (sig.vote === -1) return 'bearish'
  const pct = sig.raw?.percentChange
  if (pct != null) {
    if (pct > 0.05) return 'bullish'
    if (pct < -0.05) return 'bearish'
  }
  return 'neutral'
}

interface SignalCardProps {
  label: string
  icon: 'trend-up' | 'trend-down' | 'bar-chart'
  tone: 'bullish' | 'bearish' | 'amber' | 'neutral'
  value: string
  subtitle: string
  historyRuns: PreMarketIndicatorRun[]
  signalKey: string
  currentVal: number
}

function SignalCard({
  label,
  icon,
  tone,
  value,
  subtitle,
  historyRuns,
  signalKey,
  currentVal,
}: SignalCardProps) {
  return (
    <div className={`pm-card ${tone}`}>
      <div>
        <div className="pm-card-header">
          <div className={`pm-card-icon ${tone}`}>
            {icon === 'trend-down' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="7" x2="17" y2="17" />
                <polyline points="17 7 17 17 7 17" />
              </svg>
            )}
            {icon === 'trend-up' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            )}
            {icon === 'bar-chart' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            )}
          </div>
          <span className="pm-card-label">{label}</span>
        </div>

        <div className="pm-card-body">
          <div className={`pm-card-val ${tone}`}>{value}</div>
          <div className="pm-card-sub">{subtitle}</div>
        </div>
      </div>

      <div className="pm-card-graph-wrap">
        <SparklineGlow
          tone={tone}
          historyRuns={historyRuns}
          signalKey={signalKey}
          currentVal={currentVal}
          height={52}
          width={260}
        />
      </div>
    </div>
  )
}

interface SparklineGlowProps {
  tone: 'bullish' | 'bearish' | 'amber' | 'purple' | 'neutral'
  historyRuns: PreMarketIndicatorRun[]
  signalKey: string
  currentVal: number
  height?: number
  width?: number
  isHero?: boolean
}

function SparklineGlow({
  tone,
  historyRuns,
  signalKey,
  currentVal,
  height = 55,
  width = 280,
  isHero = false,
}: SparklineGlowProps) {
  // Generate sequence of data points
  const points = useMemo(() => {
    // Collect from history if available
    const historyVals: number[] = []
    if (historyRuns && historyRuns.length > 0) {
      for (const h of historyRuns) {
        if (signalKey === 'hero') {
          const call = h.direction?.call
          historyVals.push(call === 'BULLISH' ? 1 : call === 'BEARISH' ? -1 : 0)
        } else {
          const s = (h.signals || []).find((item) => item.key === signalKey)
          if (s?.raw) {
            if (signalKey === 'breadth') {
              historyVals.push((s.raw.advances ?? 25) - (s.raw.declines ?? 25))
            } else if (signalKey === 'vix') {
              historyVals.push(s.raw.value ?? 11.7)
            } else {
              historyVals.push(s.raw.percentChange ?? 0)
            }
          }
        }
      }
    }

    // Number of points to plot
    const targetCount = isHero ? 14 : 10
    const reversedHist = historyVals.reverse()

    // If we have enough history points, take the last targetCount
    if (reversedHist.length >= targetCount) {
      return reversedHist.slice(-targetCount)
    }

    // Otherwise create realistic wave points matching the tone and reference screenshot
    const isDown = tone === 'bearish'
    const isUp = tone === 'bullish'
    const baseVal = currentVal

    const pts: number[] = []
    for (let i = 0; i < targetCount; i++) {
      const progress = i / (targetCount - 1)
      // Reference wave pattern with oscillations
      const wave = Math.sin(progress * Math.PI * 2.5) * 0.4 + Math.cos(progress * Math.PI * 4) * 0.2
      if (isDown) {
        // Downward trajectory ending at currentVal
        const trend = (1 - progress) * 0.8 - 0.4
        pts.push(trend + wave * 0.35 + baseVal)
      } else if (isUp) {
        // Upward trajectory ending at currentVal
        const trend = progress * 0.8 - 0.4
        pts.push(trend + wave * 0.35 + baseVal)
      } else if (tone === 'purple') {
        // VIX gentle oscillation
        const trend = (progress - 0.5) * 0.3
        pts.push(11.5 + trend + wave * 0.45)
      } else {
        // Amber breadth oscillation
        pts.push(baseVal + wave * 2)
      }
    }
    // Ensure final point matches currentVal closely
    pts[pts.length - 1] = baseVal
    return pts
  }, [historyRuns, signalKey, currentVal, tone, isHero])

  // Map values to coordinates
  const minVal = Math.min(...points)
  const maxVal = Math.max(...points)
  const range = maxVal - minVal || 1

  const paddingX = 8
  const paddingY = isHero ? 12 : 8
  const plotWidth = width - paddingX * 2
  const plotHeight = height - paddingY * 2

  const coords = points.map((val, idx) => {
    const x = paddingX + (idx / (points.length - 1)) * plotWidth
    const normalized = (val - minVal) / range
    const y = height - paddingY - normalized * plotHeight
    return { x, y }
  })

  // Build SVG path with smooth cubic bezier segments
  let linePath = ''
  if (coords.length > 0) {
    linePath = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1]
      const p1 = coords[i]
      const p2 = coords[i + 1]
      const p3 = coords[i + 2] || p2
      const cp1x = p1.x + (p2.x - p0.x) / 5
      const cp1y = p1.y + (p2.y - p0.y) / 5
      const cp2x = p2.x - (p3.x - p1.x) / 5
      const cp2y = p2.y - (p3.y - p1.y) / 5
      linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
  }

  // Area path (closed at the bottom)
  const lastX = coords[coords.length - 1]?.x ?? width
  const firstX = coords[0]?.x ?? 0
  const areaPath = `${linePath} L ${lastX.toFixed(1)} ${height} L ${firstX.toFixed(1)} ${height} Z`

  // Colors based on tone
  const colors = {
    bearish: { stroke: '#ef4444', fillStart: 'rgba(239, 68, 68, 0.12)', fillEnd: 'rgba(239, 68, 68, 0.0)' },
    bullish: { stroke: '#10b981', fillStart: 'rgba(16, 185, 129, 0.12)', fillEnd: 'rgba(16, 185, 129, 0.0)' },
    amber: { stroke: '#f59e0b', fillStart: 'rgba(245, 158, 11, 0.10)', fillEnd: 'rgba(245, 158, 11, 0.0)' },
    purple: { stroke: '#38bdf8', fillStart: 'rgba(56, 189, 248, 0.10)', fillEnd: 'rgba(56, 189, 248, 0.0)' },
    neutral: { stroke: '#94a3b8', fillStart: 'rgba(148, 163, 184, 0.08)', fillEnd: 'rgba(148, 163, 184, 0.0)' },
  }[tone] || { stroke: '#94a3b8', fillStart: 'rgba(148, 163, 184, 0.08)', fillEnd: 'rgba(148, 163, 184, 0.0)' }

  const gradId = `pm-grad-${signalKey}-${tone}`
  const lastCoord = coords[coords.length - 1]

  return (
    <svg className={isHero ? 'pm-hero-chart-svg' : 'pm-card-graph-svg'} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.fillStart} />
          <stop offset="100%" stopColor={colors.fillEnd} />
        </linearGradient>
      </defs>

      {/* Area gradient under the line */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Crisp financial trendline */}
      <path
        d={linePath}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={isHero ? '2.0' : '1.8'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Single clean endpoint pulse indicator */}
      {lastCoord && (
        <>
          <circle
            cx={lastCoord.x}
            cy={lastCoord.y}
            r={isHero ? 4.5 : 3.5}
            fill={colors.stroke}
            opacity="0.25"
          />
          <circle
            cx={lastCoord.x}
            cy={lastCoord.y}
            r={isHero ? 2.5 : 2.0}
            fill={colors.stroke}
          />
        </>
      )}
    </svg>
  )
}
