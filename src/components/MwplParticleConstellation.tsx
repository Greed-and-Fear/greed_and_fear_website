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
  tableFallback?: ReactNode
}

interface TopFeederThread {
  originX: number
  originY: number
  targetIndex: number
  color: string
  pulseProgress: number
  pulseSpeed: number
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
  tableFallback,
}: MwplParticleConstellationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [viewMode, setViewMode] = useState<'constellation' | 'cards' | 'table'>('constellation')
  const [filterCluster, setFilterCluster] = useState<'ALL' | 'BAN' | 'LONG' | 'SHORT' | 'CRITICAL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredNode, setHoveredNode] = useState<{ node: ParticleNode; screenX: number; screenY: number } | null>(null)
  const hoveredNodeRef = useRef<{ node: ParticleNode; screenX: number; screenY: number } | null>(null)
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

      // Natural organic constellation layout:
      // Nodes are distributed gracefully across the canvas, with top-tier
      // opportunity & high-MWPL stocks positioned in the upper region to receive
      // the glowing data thread flowing from the top of the card.
      const paddingX = 60
      const paddingY = 45
      const cols = Math.min(8, Math.max(5, Math.floor(width / 135)))
      const row = Math.floor(i / cols)
      const col = i % cols
      const colStep = (width - paddingX * 2) / Math.max(1, cols - 1)
      const totalRows = Math.ceil(sample.length / cols)
      const rowStep = (height - paddingY * 2 - 35) / Math.max(1, totalRows)

      // Stagger alternating rows for a natural celestial grid
      const stagger = (row % 2) * (colStep * 0.42)
      const jitterX = Math.sin(i * 11 + 1.7) * (colStep * 0.18)
      const jitterY = Math.cos(i * 13 + 2.1) * 14

      const targetX = Math.min(width - paddingX, Math.max(paddingX, paddingX + col * colStep + stagger + jitterX))
      const targetY = Math.min(height - paddingY, Math.max(paddingY + 30, paddingY + 35 + row * rowStep + jitterY))

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

    // Build Top Feeder Threads (flowing down from top of card into anchor nodes)
    const topFeeders: TopFeederThread[] = []
    const topPorts = [
      { x: width * 0.5, y: 0 },
      { x: width * 0.26, y: 0 },
      { x: width * 0.74, y: 0 },
    ]

    topPorts.forEach((port) => {
      // Find upper-tier anchor nodes nearest to this top feed port
      const candidates = nodes
        .map((n, idx) => ({
          idx,
          node: n,
          dist: Math.hypot(n.baseX - port.x, (n.baseY - port.y) * 1.35),
        }))
        .filter((c) => c.node.baseY < height * 0.58)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2)

      candidates.forEach((c, ci) => {
        topFeeders.push({
          originX: port.x,
          originY: 0,
          targetIndex: c.idx,
          color: c.node.tone === 'red' ? '#f87171' : c.node.tone === 'blue' ? '#38bdf8' : '#34d399',
          pulseProgress: (ci * 0.45 + Math.random() * 0.2) % 1,
          pulseSpeed: 0.007 + Math.random() * 0.004,
        })
      })
    })

    // Build Inter-Node Network Threads
    const threads: ThreadConnection[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const dx = a.baseX - b.baseX
        const dy = a.baseY - b.baseY
        const dist = Math.hypot(dx, dy)

        // Connect nearby nodes within proximity radius
        if (dist < 130) {
          const isCrossColor = a.tone !== b.tone
          const threadColor = isCrossColor
            ? 'rgba(168, 85, 247, 0.26)'
            : a.tone === 'red'
            ? 'rgba(239, 68, 68, 0.3)'
            : a.tone === 'blue'
            ? 'rgba(56, 189, 248, 0.3)'
            : 'rgba(16, 185, 129, 0.3)'

          threads.push({
            fromIndex: i,
            toIndex: j,
            color: threadColor,
            opacity: 0.35,
            pulseProgress: Math.random(),
            pulseSpeed: 0.005 + Math.random() * 0.005,
            isBanThread: a.tone === 'red' && b.tone === 'red',
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
        const next = {
          node: found,
          screenX: found.x,
          screenY: found.y,
        }
        hoveredNodeRef.current = next
        setHoveredNode(next)
      } else {
        hoveredNodeRef.current = null
        setHoveredNode(null)
      }
    }

    const onMouseLeave = () => {
      mousePos = { x: -1000, y: -1000 }
      hoveredNodeRef.current = null
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

      // Render Top Conduit Emitters along the top boundary of the card
      for (const port of topPorts) {
        // Ambient downward radiance from top of card
        const radGrad = ctx.createRadialGradient(port.x, 0, 0, port.x, 0, 48)
        radGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)')
        radGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.12)')
        radGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = radGrad
        ctx.beginPath()
        ctx.arc(port.x, 0, 48, 0, Math.PI)
        ctx.fill()

        // Core pulsing energy port at the card's top edge
        const pulseR = 3.5 + Math.sin(t * 4 + port.x) * 1
        ctx.fillStyle = '#38bdf8'
        ctx.shadowColor = '#38bdf8'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(port.x, 1, pulseR, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Draw Top Feeder Threads (flowing from the top of the card into the anchor nodes)
      for (const feeder of topFeeders) {
        const target = nodes[feeder.targetIndex]
        if (!target) continue

        const originX = feeder.originX
        const originY = 0

        // Smooth vertical-curving bezier control points
        const cp1x = originX
        const cp1y = target.y * 0.4
        const cp2x = target.x
        const cp2y = target.y * 0.65

        const isHoveredTarget = hoveredNodeRef.current?.node === target

        ctx.save()
        const streamGrad = ctx.createLinearGradient(originX, 0, target.x, target.y)
        streamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)')
        streamGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.75)')
        streamGrad.addColorStop(1, target.color)

        ctx.strokeStyle = isHoveredTarget ? '#38bdf8' : streamGrad
        ctx.lineWidth = isHoveredTarget ? 2.8 : 1.8
        ctx.shadowColor = isHoveredTarget ? '#38bdf8' : 'rgba(56, 189, 248, 0.65)'
        ctx.shadowBlur = isHoveredTarget ? 16 : 8

        ctx.beginPath()
        ctx.moveTo(originX, originY)
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, target.x, target.y)
        ctx.stroke()
        ctx.restore()

        // Animated Energy Packets / Photons streaming DOWN from the top of the card into the node
        if (isPlaying) {
          feeder.pulseProgress = (feeder.pulseProgress + feeder.pulseSpeed) % 1
        }

        // Two streaming pulses per thread for a continuous flow
        for (const offset of [0, 0.5]) {
          const p = (feeder.pulseProgress + offset) % 1
          const t1 = 1 - p
          const px =
            t1 * t1 * t1 * originX +
            3 * t1 * t1 * p * cp1x +
            3 * t1 * p * p * cp2x +
            p * p * p * target.x
          const py =
            t1 * t1 * t1 * originY +
            3 * t1 * t1 * p * cp1y +
            3 * t1 * p * p * cp2y +
            p * p * p * target.y

          ctx.save()
          ctx.fillStyle = '#ffffff'
          ctx.shadowColor = '#38bdf8'
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.arc(px, py, 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

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

      // Draw Inter-Node Connecting Threads
      for (const thread of threads) {
        const a = nodes[thread.fromIndex]
        const b = nodes[thread.toIndex]
        if (!a || !b) continue

        // Active thread highlighting on hover
        const isHoveredThread =
          hoveredNodeRef.current &&
          (hoveredNodeRef.current.node === a || hoveredNodeRef.current.node === b)

        ctx.save()
        ctx.strokeStyle = isHoveredThread ? '#c084fc' : thread.color
        ctx.lineWidth = isHoveredThread ? 2 : 1
        ctx.shadowColor = isHoveredThread ? '#c084fc' : 'transparent'
        ctx.shadowBlur = isHoveredThread ? 10 : 0

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.restore()

        // Moving Photon / Energy Pulse along thread
        if (isPlaying) {
          thread.pulseProgress = (thread.pulseProgress + thread.pulseSpeed) % 1
        }
        const px = a.x + (b.x - a.x) * thread.pulseProgress
        const py = a.y + (b.y - a.y) * thread.pulseProgress

        ctx.save()
        ctx.fillStyle = isHoveredThread ? '#ffffff' : thread.color.includes('16, 185, 129') ? '#10b981' : '#c084fc'
        ctx.shadowColor = ctx.fillStyle
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Draw Nodes
      for (const node of nodes) {
        const isHovered = hoveredNodeRef.current?.node === node
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
  }, [viewMode, filteredStocks, isPlaying, searchQuery])

  return (
    <div className="mwpl-constellation-container" ref={containerRef}>

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
