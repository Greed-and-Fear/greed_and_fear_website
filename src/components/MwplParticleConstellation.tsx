import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react'
import './MwplParticleConstellation.css'

export interface ConstellationStockItem {
  symbol: string
  companyName: string
  exchange?: string
  priceChangePercent?: number | null
  day0Mwpl: number
  day1Mwpl?: number | null
  day2Mwpl?: number | null
  day0OI?: number | null
  mwplUtilizationPercent?: number | null
  mwplRiskZone?: string
  signal?: string
}

interface MwplParticleConstellationProps {
  stocks: ConstellationStockItem[]
  banWatchStocks?: ConstellationStockItem[]
  isBanWatchConnected?: boolean
  onToggleBanWatchConnection?: () => void
  tableFallback?: ReactNode
}

interface ParticleNode {
  stock: ConstellationStockItem
  x: number
  y: number
  vx: number
  vy: number
  baseX: number
  baseY: number
  radius: number
  tone: 'red' | 'green' | 'amber' | 'blue'
  color: string
  glowColor: string
  phase: number
  frequency: number
  isBanCluster: boolean
  isLongBuilder: boolean
}

interface ThreadConnection {
  fromIndex: number
  toIndex: number
  color: string
  opacity: number
  pulseProgress: number
  pulseSpeed: number
  isBanThread: boolean
}

function formatCompactNumber(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return '—'
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`
  if (num >= 100000) return `${(num / 100000).toFixed(2)} L`
  if (num >= 1000) return `${(num / 1000).toFixed(1)} K`
  return String(num)
}

export default function MwplParticleConstellation({
  stocks,
  banWatchStocks = [],
  isBanWatchConnected = false,
  onToggleBanWatchConnection,
  tableFallback,
}: MwplParticleConstellationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [viewMode, setViewMode] = useState<'constellation' | 'cards' | 'table'>('constellation')
  const [filterCluster, setFilterCluster] = useState<'ALL' | 'BAN' | 'LONG' | 'SHORT' | 'CRITICAL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredNode, setHoveredNode] = useState<{ node: ParticleNode; screenX: number; screenY: number } | null>(null)
  const [isPlaying, setIsPlaying] = useState(true)

  // Filter stocks based on search and cluster
  const filteredStocks = useMemo(() => {
    let list = stocks
    if (filterCluster === 'BAN') {
      list = list.filter(
        (s) =>
          (s.mwplUtilizationPercent ?? s.day0Mwpl) >= 80 ||
          s.mwplRiskZone === 'Ban zone' ||
          s.mwplRiskZone === 'High risk' ||
          s.day0Mwpl >= 80,
      )
    } else if (filterCluster === 'LONG') {
      list = list.filter((s) => s.signal === 'Long build-up')
    } else if (filterCluster === 'SHORT') {
      list = list.filter((s) => s.signal === 'Short build-up')
    } else if (filterCluster === 'CRITICAL') {
      list = list.filter((s) => s.day0Mwpl >= 75)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((s) => s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q))
    }

    return list
  }, [stocks, filterCluster, searchQuery])

  // Canvas physics simulation & animation loop
  useEffect(() => {
    if (viewMode !== 'constellation') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = 0
    let height = 0

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.resetTransform()
      ctx.scale(dpr, dpr)
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    // Build particle nodes
    const sample = filteredStocks.slice(0, 48) // Up to 48 active nodes for optimal density & 60fps
    const nodes: ParticleNode[] = sample.map((stock, i) => {
      const isBan =
        (stock.mwplUtilizationPercent ?? stock.day0Mwpl) >= 80 ||
        stock.mwplRiskZone === 'Ban zone' ||
        stock.mwplRiskZone === 'High risk' ||
        stock.day0Mwpl >= 80
      const isLong = stock.signal === 'Long build-up'
      const isShort = stock.signal === 'Short build-up'
      const isCovering = stock.signal === 'Short covering'

      let tone: 'red' | 'green' | 'amber' | 'blue' = 'green'
      let color = '#10b981'
      let glowColor = 'rgba(16, 185, 129, 0.45)'

      if (isBan) {
        tone = 'red'
        color = '#ef4444'
        glowColor = 'rgba(239, 68, 68, 0.6)'
      } else if (isShort) {
        tone = 'red'
        color = '#f87171'
        glowColor = 'rgba(248, 113, 113, 0.45)'
      } else if (isCovering) {
        tone = 'blue'
        color = '#38bdf8'
        glowColor = 'rgba(56, 189, 248, 0.45)'
      } else if (stock.day0Mwpl >= 70) {
        tone = 'amber'
        color = '#f59e0b'
        glowColor = 'rgba(245, 158, 11, 0.5)'
      }

      // Cluster positioning:
      // Red/Ban stocks cluster on the top-right / right quadrant (connecting to F&O Ban Watch)
      // Green/Long stocks cluster on the central-left area
      // Others spread organically across the canvas
      let targetX = 0
      let targetY = 0
      const padding = 60

      if (isBan) {
        // Upper-right sector (Ban Zone)
        const angle = -0.3 + (i % 6) * 0.25
        const rad = 70 + (i * 22) % 140
        targetX = Math.max(padding, width * 0.75 + Math.cos(angle) * rad)
        targetY = Math.max(padding, height * 0.35 + Math.sin(angle) * rad)
      } else if (isLong) {
        // Center-left sector (Opportunity Zone)
        const angle = Math.PI * 0.6 + (i % 8) * 0.3
        const rad = 80 + (i * 18) % 160
        targetX = Math.max(padding, width * 0.32 + Math.cos(angle) * rad)
        targetY = Math.max(padding, height * 0.45 + Math.sin(angle) * rad)
      } else {
        // Natural distribution
        const cols = 6
        const row = Math.floor(i / cols)
        const col = i % cols
        const jitterX = (Math.sin(i * 13) * width) / 12
        const jitterY = (Math.cos(i * 17) * height) / 12
        targetX = padding + (col / (cols - 1)) * (width - padding * 2) + jitterX
        targetY = padding + (row / 7) * (height - padding * 2) + jitterY
      }

      // Radius based on MWPL saturation
      const minRadius = 7
      const maxRadius = 15
      const radius = minRadius + Math.min(1, Math.max(0, stock.day0Mwpl / 100)) * (maxRadius - minRadius)

      return {
        stock,
        x: targetX,
        y: targetY,
        baseX: targetX,
        baseY: targetY,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius,
        tone,
        color,
        glowColor,
        phase: Math.random() * Math.PI * 2,
        frequency: 0.6 + Math.random() * 0.8,
        isBanCluster: isBan,
        isLongBuilder: isLong,
      }
    })

    // Build threads
    const threads: ThreadConnection[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]

        // Connect if both are Ban stocks (Red thread)
        if (a.isBanCluster && b.isBanCluster) {
          threads.push({
            fromIndex: i,
            toIndex: j,
            color: 'rgba(239, 68, 68, 0.45)',
            opacity: 0.5,
            pulseProgress: Math.random(),
            pulseSpeed: 0.008 + Math.random() * 0.008,
            isBanThread: true,
          })
          continue
        }

        // Connect if both are Long builders (Green thread)
        if (a.isLongBuilder && b.isLongBuilder) {
          const dx = a.baseX - b.baseX
          const dy = a.baseY - b.baseY
          const dist = Math.hypot(dx, dy)
          if (dist < 220) {
            threads.push({
              fromIndex: i,
              toIndex: j,
              color: 'rgba(16, 185, 129, 0.35)',
              opacity: 0.4,
              pulseProgress: Math.random(),
              pulseSpeed: 0.007 + Math.random() * 0.006,
              isBanThread: false,
            })
          }
          continue
        }

        // Proximity connections
        const dx = a.baseX - b.baseX
        const dy = a.baseY - b.baseY
        const dist = Math.hypot(dx, dy)
        if (dist < 115) {
          const isCrossColor = a.tone !== b.tone
          threads.push({
            fromIndex: i,
            toIndex: j,
            color: isCrossColor ? 'rgba(168, 85, 247, 0.22)' : a.tone === 'red' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
            opacity: 0.25,
            pulseProgress: Math.random(),
            pulseSpeed: 0.005 + Math.random() * 0.005,
            isBanThread: false,
          })
        }
      }
    }

    // Animation loop
    let mousePos = { x: -1000, y: -1000 }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mousePos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }

      // Check hover
      let found: ParticleNode | null = null
      for (const node of nodes) {
        const d = Math.hypot(node.x - mousePos.x, node.y - mousePos.y)
        if (d < node.radius + 8) {
          found = node
          break
        }
      }

      if (found) {
        setHoveredNode({
          node: found,
          screenX: found.x,
          screenY: found.y,
        })
      } else {
        setHoveredNode(null)
      }
    }

    const onMouseLeave = () => {
      mousePos = { x: -1000, y: -1000 }
      setHoveredNode(null)
    }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height)

      // Background subtle constellation grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)'
      ctx.lineWidth = 1
      const gridSize = 45
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Draw F&O Ban Gateway Sector Halo on Top-Right
      const banHubX = width * 0.82
      const banHubY = height * 0.28
      const banGrad = ctx.createRadialGradient(banHubX, banHubY, 10, banHubX, banHubY, 180)
      banGrad.addColorStop(0, 'rgba(239, 68, 68, 0.14)')
      banGrad.addColorStop(0.6, 'rgba(239, 68, 68, 0.04)')
      banGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = banGrad
      ctx.beginPath()
      ctx.arc(banHubX, banHubY, 180, 0, Math.PI * 2)
      ctx.fill()

      // Gateway Label
      ctx.fillStyle = 'rgba(239, 68, 68, 0.65)'
      ctx.font = '600 10.5px Inter, system-ui, sans-serif'
      ctx.fillText('⚡ F&O BAN THREAT CLUSTER', banHubX - 70, banHubY - 140)

      // Opportunity Zone Halo on Left
      const oppHubX = width * 0.3
      const oppHubY = height * 0.42
      const oppGrad = ctx.createRadialGradient(oppHubX, oppHubY, 10, oppHubX, oppHubY, 190)
      oppGrad.addColorStop(0, 'rgba(16, 185, 129, 0.12)')
      oppGrad.addColorStop(0.6, 'rgba(16, 185, 129, 0.03)')
      oppGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = oppGrad
      ctx.beginPath()
      ctx.arc(oppHubX, oppHubY, 190, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(16, 185, 129, 0.65)'
      ctx.font = '600 10.5px Inter, system-ui, sans-serif'
      ctx.fillText('✦ MOMENTUM & LONG BUILDERS', oppHubX - 75, oppHubY - 145)

      // Update Node positions with organic oscillation
      const t = time / 1000
      for (const node of nodes) {
        if (isPlaying) {
          const oscX = Math.sin(t * node.frequency + node.phase) * 9
          const oscY = Math.cos(t * node.frequency * 0.8 + node.phase) * 9
          node.x = node.baseX + oscX
          node.y = node.baseY + oscY

          // Mouse gentle repulsion
          const mdist = Math.hypot(node.x - mousePos.x, node.y - mousePos.y)
          if (mdist < 80) {
            const force = (80 - mdist) / 80
            const angle = Math.atan2(node.y - mousePos.y, node.x - mousePos.x)
            node.x += Math.cos(angle) * force * 15
            node.y += Math.sin(angle) * force * 15
          }
        }
      }

      // Draw Threads
      for (const thread of threads) {
        const a = nodes[thread.fromIndex]
        const b = nodes[thread.toIndex]
        if (!a || !b) continue

        // Active thread highlighting on hover
        const isHoveredThread = hoveredNode && (hoveredNode.node === a || hoveredNode.node === b)
        const isBanHighlight = isBanWatchConnected && thread.isBanThread

        ctx.strokeStyle = isBanHighlight
          ? 'rgba(239, 68, 68, 0.85)'
          : isHoveredThread
          ? '#c084fc'
          : thread.color

        ctx.lineWidth = isBanHighlight ? 2.2 : isHoveredThread ? 1.8 : 1

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()

        // Moving Photon / Energy Pulse along thread
        if (isPlaying) {
          thread.pulseProgress = (thread.pulseProgress + thread.pulseSpeed * (isBanHighlight ? 2 : 1)) % 1
        }
        const px = a.x + (b.x - a.x) * thread.pulseProgress
        const py = a.y + (b.y - a.y) * thread.pulseProgress

        ctx.fillStyle = thread.isBanThread ? '#ef4444' : thread.color.includes('16, 185, 129') ? '#10b981' : '#c084fc'
        ctx.shadowColor = ctx.fillStyle
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(px, py, isBanHighlight ? 3.2 : 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // If Ban Watch is actively connected from top metric card, draw animated feeder beam
      if (isBanWatchConnected) {
        ctx.save()
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 6])
        ctx.lineDashOffset = -time * 0.05
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)'
        ctx.shadowBlur = 10

        // Draw beam from top right corner (where Ban Watch sits) to Ban Cluster
        ctx.beginPath()
        ctx.moveTo(width - 20, 10)
        ctx.bezierCurveTo(width - 40, height * 0.15, banHubX + 60, banHubY - 40, banHubX, banHubY)
        ctx.stroke()
        ctx.restore()
      }

      // Draw Nodes
      for (const node of nodes) {
        const isHovered = hoveredNode && hoveredNode.node === node
        const isSearched = searchQuery.trim() && node.stock.symbol.toLowerCase().includes(searchQuery.trim().toLowerCase())

        // Pulsing outer aura ring
        const pulse = Math.sin(t * 3 + node.phase) * 3
        const currentRadius = node.radius + (isHovered ? 4 : 0)

        // Outer glow halo
        ctx.save()
        ctx.shadowColor = node.color
        ctx.shadowBlur = isHovered || isSearched ? 20 : node.tone === 'red' ? 12 : 8

        // Node fill
        const grad = ctx.createRadialGradient(node.x - 2, node.y - 2, 1, node.x, node.y, currentRadius)
        grad.addColorStop(0, '#ffffff')
        grad.addColorStop(0.3, node.color)
        grad.addColorStop(1, node.tone === 'red' ? '#991b1b' : node.tone === 'green' ? '#065f46' : '#92400e')

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2)
        ctx.fill()

        // Pulse ring around critical / ban stocks
        if (node.isBanCluster || isHovered || isSearched) {
          ctx.strokeStyle = node.color
          ctx.lineWidth = 1.2
          ctx.beginPath()
          ctx.arc(node.x, node.y, currentRadius + 5 + pulse, 0, Math.PI * 2)
          ctx.stroke()
        }

        ctx.restore()

        // Stock Symbol Label
        ctx.font = `${isHovered ? '700' : '600'} 10.5px Inter, system-ui, sans-serif`
        const textMetrics = ctx.measureText(node.stock.symbol)
        const textWidth = textMetrics.width

        // Pill background behind text for crisp contrast
        ctx.fillStyle = 'rgba(8, 10, 18, 0.85)'
        ctx.beginPath()
        ctx.roundRect(node.x - textWidth / 2 - 3, node.y + currentRadius + 3, textWidth + 6, 14, 3)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.stroke()

        // Symbol Text
        ctx.fillStyle = node.tone === 'red' ? '#fca5a5' : node.tone === 'green' ? '#86efac' : '#fde68a'
        ctx.textAlign = 'center'
        ctx.fillText(node.stock.symbol, node.x, node.y + currentRadius + 13.5)

        // Saturation % small sub-label
        ctx.font = '500 8.5px Inter, system-ui, sans-serif'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
        ctx.fillText(`${node.stock.day0Mwpl.toFixed(0)}%`, node.x, node.y + currentRadius + 23)
      }

      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', updateSize)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [viewMode, filteredStocks, isPlaying, searchQuery, isBanWatchConnected])

  return (
    <div className="mwpl-constellation-container" ref={containerRef}>
      {/* Top Banner indicating F&O Ban Watch connection */}
      {isBanWatchConnected && (
        <div className="mwpl-ban-connection-ribbon">
          <span className="mwpl-pulse-dot" />
          <span>
            Active Link: <strong>F&O Ban Watch ({banWatchStocks.length} Stocks)</strong> connected to Constellation Network
          </span>
          <button
            type="button"
            onClick={onToggleBanWatchConnection}
            style={{
              marginLeft: 'auto',
              border: 0,
              background: 'transparent',
              color: '#fca5a5',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="mwpl-constellation-toolbar">
        <div className="mwpl-constellation-title-group">
          <span className="mwpl-network-indicator" />
          <h2 className="mwpl-constellation-title">
            Top MWPL Opportunities &amp; Ban Constellation
            <span className="badge">{filteredStocks.length} Nodes</span>
          </h2>
        </div>

        {/* View Switcher: Constellation / Cards / Table */}
        <div className="mwpl-view-switcher">
          <button
            type="button"
            className={`mwpl-view-btn ${viewMode === 'constellation' ? 'active' : ''}`}
            onClick={() => setViewMode('constellation')}
            title="Interactive animated particle constellation"
          >
            🌌 Constellation
          </button>
          <button
            type="button"
            className={`mwpl-view-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            title="Visual opportunity cards"
          >
            ⚡ Cards
          </button>
          {tableFallback && (
            <button
              type="button"
              className={`mwpl-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Classic data table"
            >
              📋 Table
            </button>
          )}
        </div>
      </div>

      {/* Cluster Filters & Search */}
      <div className="mwpl-filter-bar">
        <div className="mwpl-cluster-chips">
          <button
            type="button"
            className={`mwpl-cluster-chip all ${filterCluster === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterCluster('ALL')}
          >
            <span className="chip-dot" />
            All Universe ({stocks.length})
          </button>
          <button
            type="button"
            className={`mwpl-cluster-chip red ${filterCluster === 'BAN' ? 'active' : ''}`}
            onClick={() => setFilterCluster('BAN')}
          >
            <span className="chip-dot" />
            Ban Watch ({banWatchStocks.length})
          </button>
          <button
            type="button"
            className={`mwpl-cluster-chip green ${filterCluster === 'LONG' ? 'active' : ''}`}
            onClick={() => setFilterCluster('LONG')}
          >
            <span className="chip-dot" />
            Long Builders ({stocks.filter((s) => s.signal === 'Long build-up').length})
          </button>
          <button
            type="button"
            className={`mwpl-cluster-chip red ${filterCluster === 'SHORT' ? 'active' : ''}`}
            onClick={() => setFilterCluster('SHORT')}
          >
            <span className="chip-dot" />
            Short Builders ({stocks.filter((s) => s.signal === 'Short build-up').length})
          </button>
          <button
            type="button"
            className={`mwpl-cluster-chip ${filterCluster === 'CRITICAL' ? 'active' : ''}`}
            onClick={() => setFilterCluster('CRITICAL')}
          >
            Critical &gt;75% ({stocks.filter((s) => s.day0Mwpl >= 75).length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="mwpl-search-wrap">
            <span className="mwpl-search-icon">🔍</span>
            <input
              type="text"
              className="mwpl-search-input"
              placeholder="Find stock particle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {viewMode === 'constellation' && (
            <button
              type="button"
              className="mwpl-cluster-chip"
              onClick={() => setIsPlaying((p) => !p)}
              title={isPlaying ? 'Pause animation' : 'Play animation'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: Particle Constellation Canvas */}
      {viewMode === 'constellation' && (
        <div className="mwpl-canvas-wrap">
          <canvas ref={canvasRef} className="mwpl-canvas" />

          {/* Canvas Bottom Legend */}
          <div className="mwpl-canvas-legend">
            <div className="mwpl-legend-item">
              <span className="mwpl-legend-circle green" />
              <span>Green: Long Build-up / Low Saturation</span>
            </div>
            <div className="mwpl-legend-item">
              <span className="mwpl-legend-circle red" />
              <span>Red: F&amp;O Ban Zone / High Saturation</span>
            </div>
            <div className="mwpl-legend-item">
              <span className="mwpl-legend-line" />
              <span>Glowing Thread: Inter-stock Signal Correlation</span>
            </div>
          </div>

          {/* Glassmorphic Inspection HUD on Hover */}
          {hoveredNode && (
            <div
              className="mwpl-particle-hud"
              style={{
                left: `${hoveredNode.screenX}px`,
                top: `${hoveredNode.screenY}px`,
              }}
            >
              <div className="mwpl-hud-head">
                <span className="mwpl-hud-symbol">{hoveredNode.node.stock.symbol}</span>
                <span className="mwpl-hud-exchange">{hoveredNode.node.stock.exchange || 'NSE'}</span>
              </div>
              <div className="mwpl-hud-company">{hoveredNode.node.stock.companyName}</div>

              <div className="mwpl-hud-metrics">
                <div className="mwpl-hud-metric-item">
                  <span>Price Change</span>
                  <strong className={(hoveredNode.node.stock.priceChangePercent ?? 0) >= 0 ? 'bullish' : 'bearish'}>
                    {hoveredNode.node.stock.priceChangePercent != null
                      ? `${hoveredNode.node.stock.priceChangePercent > 0 ? '+' : ''}${hoveredNode.node.stock.priceChangePercent.toFixed(2)}%`
                      : '—'}
                  </strong>
                </div>
                <div className="mwpl-hud-metric-item">
                  <span>Open Interest</span>
                  <strong>{formatCompactNumber(hoveredNode.node.stock.day0OI)}</strong>
                </div>
              </div>

              <div className="mwpl-hud-meter-wrap">
                <div className="mwpl-hud-meter-label">
                  <span>Day 0 MWPL</span>
                  <b>{hoveredNode.node.stock.day0Mwpl.toFixed(1)}%</b>
                </div>
                <div className="mwpl-hud-meter-track">
                  <div
                    className="mwpl-hud-meter-fill"
                    style={{
                      width: `${Math.min(100, hoveredNode.node.stock.day0Mwpl)}%`,
                      background:
                        hoveredNode.node.stock.day0Mwpl >= 80
                          ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                          : 'linear-gradient(90deg, #3b82f6, #10b981)',
                    }}
                  />
                </div>
              </div>

              <div className="mwpl-hud-footer">
                <span
                  className={`mwpl-hud-tag ${
                    hoveredNode.node.stock.mwplRiskZone === 'Ban zone'
                      ? 'ban-zone'
                      : hoveredNode.node.stock.mwplRiskZone === 'High risk'
                      ? 'high-risk'
                      : 'normal'
                  }`}
                >
                  {hoveredNode.node.stock.mwplRiskZone}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--portal-muted)' }}>
                  {hoveredNode.node.stock.signal}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Dynamic Opportunity Card Stream */}
      {viewMode === 'cards' && (
        <div className="mwpl-card-stream-grid">
          {filteredStocks.map((stock) => {
            const isBan = (stock.mwplUtilizationPercent ?? stock.day0Mwpl) >= 80 || stock.mwplRiskZone === 'Ban zone'
            const isLong = stock.signal === 'Long build-up'
            const pPct = stock.priceChangePercent ?? 0
            return (
              <div
                key={stock.symbol}
                className={`mwpl-stream-card ${isBan ? 'ban-risk' : isLong ? 'long-builder' : 'neutral'}`}
              >
                <div className="mwpl-stream-card-head">
                  <span className="mwpl-stream-card-symbol">{stock.symbol}</span>
                  <span className={`mwpl-stream-card-price ${pPct >= 0 ? 'bullish' : 'bearish'}`}>
                    {stock.priceChangePercent != null
                      ? `${pPct > 0 ? '+' : ''}${pPct.toFixed(2)}%`
                      : '—'}
                  </span>
                </div>

                <div className="mwpl-stream-card-bar-wrap">
                  <div className="mwpl-stream-card-bar-label">
                    <span>MWPL Utilization</span>
                    <strong>{stock.day0Mwpl.toFixed(1)}%</strong>
                  </div>
                  <div className="mwpl-stream-card-track">
                    <div
                      className="mwpl-stream-card-fill"
                      style={{
                        width: `${Math.min(100, stock.day0Mwpl)}%`,
                        background: isBan ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #06b6d4)',
                      }}
                    />
                  </div>
                </div>

                <div className="mwpl-stream-card-footer">
                  <span className="mwpl-stream-card-oi">OI: {formatCompactNumber(stock.day0OI)}</span>
                  <span className={`mwpl-stream-card-tag ${isBan ? 'ban' : isLong ? 'long' : 'short'}`}>
                    {stock.signal}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VIEW 3: Classic Table View */}
      {viewMode === 'table' && tableFallback}
    </div>
  )
}
