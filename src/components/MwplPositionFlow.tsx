import { useMemo } from 'react'
import type { ProcessedStockData } from '../api/client'
import './MwplPositionFlow.css'

interface Props {
  stocks: ProcessedStockData[]
  loading?: boolean
}

function tone(value: number) {
  if (value >= 95) return 'ban'
  if (value >= 85) return 'critical'
  if (value >= 75) return 'elevated'
  return 'normal'
}

function signalTone(signal: string) {
  const normalized = signal.toLowerCase()
  if (normalized.includes('long build') || normalized.includes('short cover')) return 'positive'
  if (normalized.includes('short build') || normalized.includes('long unwind')) return 'negative'
  return 'neutral'
}

export default function MwplPositionFlow({ stocks, loading = false }: Props) {
  const leaders = useMemo(
    () => [...stocks].sort((a, b) => b.mwplUtilizationPercent - a.mwplUtilizationPercent).slice(0, 10),
    [stocks],
  )
  const average = stocks.length
    ? stocks.reduce((sum, stock) => sum + stock.mwplUtilizationPercent, 0) / stocks.length
    : 0
  const pressureCount = stocks.filter((stock) => stock.mwplUtilizationPercent >= 80).length

  return (
    <section className="position-flow" aria-label="Animated institutional position flow">
      <header className="position-flow-head">
        <div>
          <span className="position-flow-kicker"><i /> Live institutional flow</span>
          <h2>Position Flow</h2>
          <p>Watch open-interest pressure move toward the exchange ban threshold.</p>
        </div>
        <div className="position-flow-stats">
          <div><span>Average pressure</span><strong>{average.toFixed(1)}%</strong></div>
          <div><span>Above 80%</span><strong>{pressureCount}</strong></div>
        </div>
      </header>

      <div className="position-flow-scale" aria-hidden="true">
        <span>0%</span><span>50%</span><span className="warn">80% alert</span><span className="danger">95% ban</span>
      </div>

      <div className="position-flow-board">
        <div className="position-flow-beam" aria-hidden="true" />
        <div className="position-flow-limit limit-80" aria-hidden="true" />
        <div className="position-flow-limit limit-95" aria-hidden="true" />

        {leaders.map((stock, index) => {
          const utilization = Math.max(0, stock.mwplUtilizationPercent)
          const position = Math.min(100, utilization)
          const riskTone = tone(utilization)
          const direction = signalTone(stock.signal)
          return (
            <article className="position-flow-row" key={stock.symbol}>
              <div className="position-flow-stock">
                <strong>{stock.symbol}</strong>
                <span>{stock.exchange || 'NSE'}</span>
              </div>
              <div className="position-flow-track">
                <div className={`position-flow-fill ${riskTone}`} style={{ width: `${position}%` }} />
                <span
                  className={`position-flow-orb ${riskTone}`}
                  style={{ left: `${position}%`, animationDelay: `${index * -0.18}s` }}
                ><i /></span>
              </div>
              <div className="position-flow-reading">
                <strong className={riskTone}>{utilization.toFixed(1)}%</strong>
                <span className={direction}>{stock.signal}</span>
              </div>
            </article>
          )
        })}

        {!loading && leaders.length === 0 && <div className="position-flow-empty">No MWPL records available.</div>}
        {loading && leaders.length === 0 && <div className="position-flow-empty">Loading position flow…</div>}
      </div>

      <footer className="position-flow-foot">
        <span><i className="normal" /> Normal</span>
        <span><i className="elevated" /> Elevated</span>
        <span><i className="critical" /> Critical</span>
        <span><i className="ban" /> Ban zone</span>
        <small>Top 10 stocks ranked by MWPL utilization</small>
      </footer>
    </section>
  )
}
