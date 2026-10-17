import { useEffect, useRef, useState } from 'react'

interface TradingBackgroundProps {
  theme?: 'dark' | 'light'
  variant?: 'full' | 'subtle'
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  alpha: number
  baseAlpha: number
}

interface FloatingCandle {
  x: number
  y: number
  vy: number
  width: number
  bodyHeight: number
  wickTop: number
  wickBottom: number
  isBullish: boolean
  alpha: number
  swayOffset: number
  swaySpeed: number
}

export default function TradingBackground({ theme = 'dark', variant = 'full' }: TradingBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1000, y: -1000, active: false })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setAnimationsEnabled(!e.matches)
    }
    mediaQuery.addEventListener('change', handleMotionChange)

    if (!animationsEnabled) {
      return () => {
        mediaQuery.removeEventListener('change', handleMotionChange)
      }
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return () => {
        mediaQuery.removeEventListener('change', handleMotionChange)
      }
    }

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) {
      return () => {
        mediaQuery.removeEventListener('change', handleMotionChange)
      }
    }

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      if (!canvas) return
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
      mouseRef.current.active = true
    }

    const handleMouseLeave = () => {
      mouseRef.current.active = false
      mouseRef.current.x = -1000
      mouseRef.current.y = -1000
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true })

    // Setup Particles
    const isDark = theme === 'dark'
    const particleCount = variant === 'subtle' ? 30 : Math.min(Math.floor(width / 35), 65)
    const particles: Particle[] = []

    const particleColors = isDark
      ? ['#a855f7', '#38bdf8', '#34d399', '#6366f1', '#e0e7ff']
      : ['#7c3aed', '#0284c7', '#059669', '#4f46e5', '#334155']

    for (let i = 0; i < particleCount; i++) {
      const alpha = Math.random() * 0.45 + 0.15
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 0.9,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        alpha,
        baseAlpha: alpha,
      })
    }

    // Setup Floating Candlesticks
    const candleCount = variant === 'subtle' ? 10 : 22
    const candles: FloatingCandle[] = []

    for (let i = 0; i < candleCount; i++) {
      const isBullish = Math.random() > 0.42
      const bodyH = Math.random() * 22 + 12
      candles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vy: -(Math.random() * 0.4 + 0.22),
        width: Math.random() * 5 + 4,
        bodyHeight: bodyH,
        wickTop: Math.random() * 10 + 6,
        wickBottom: Math.random() * 10 + 6,
        isBullish,
        alpha: Math.random() * 0.28 + 0.1,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: Math.random() * 0.02 + 0.01,
      })
    }

    let time = 0
    let scannerY = 0

    // Animation loop
    const render = () => {
      time += 0.016
      scannerY = (scannerY + 0.8) % (height * 1.5)

      ctx.clearRect(0, 0, width, height)

      // 1. Draw subtle perspective grid lines
      const gridSpacing = 60
      const gridAlpha = isDark ? 0.035 : 0.04
      ctx.strokeStyle = isDark ? `rgba(168, 85, 247, ${gridAlpha})` : `rgba(124, 58, 237, ${gridAlpha})`
      ctx.lineWidth = 1

      // Subtle horizontal grid with wave modulation
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Subtle vertical grid
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // 2. Draw Digital Radar / Market Scanner Line
      if (scannerY <= height) {
        const scanGrad = ctx.createLinearGradient(0, scannerY - 80, 0, scannerY)
        scanGrad.addColorStop(0, 'rgba(56, 189, 248, 0)')
        scanGrad.addColorStop(0.85, isDark ? 'rgba(168, 85, 247, 0.05)' : 'rgba(124, 58, 237, 0.04)')
        scanGrad.addColorStop(1, isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)')

        ctx.fillStyle = scanGrad
        ctx.fillRect(0, Math.max(0, scannerY - 80), width, Math.min(80, scannerY))

        ctx.beginPath()
        ctx.moveTo(0, scannerY)
        ctx.lineTo(width, scannerY)
        ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(2, 132, 199, 0.25)'
        ctx.lineWidth = 1.2
        ctx.stroke()
      }

      // 3. Draw Multi-Harmonic Elliott Wave Curves
      const waveY1 = height * 0.48
      const waveY2 = height * 0.68

      // Main primary wave
      ctx.beginPath()
      for (let x = 0; x <= width; x += 8) {
        const y =
          waveY1 +
          Math.sin(x * 0.003 + time * 0.6) * 55 +
          Math.sin(x * 0.007 - time * 0.8) * 28 +
          Math.cos(x * 0.0015 + time * 0.3) * 40
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      const waveGrad1 = ctx.createLinearGradient(0, 0, width, 0)
      if (isDark) {
        waveGrad1.addColorStop(0, 'rgba(56, 189, 248, 0.06)')
        waveGrad1.addColorStop(0.3, 'rgba(168, 85, 247, 0.22)')
        waveGrad1.addColorStop(0.7, 'rgba(52, 211, 153, 0.25)')
        waveGrad1.addColorStop(1, 'rgba(99, 102, 241, 0.08)')
      } else {
        waveGrad1.addColorStop(0, 'rgba(2, 132, 199, 0.08)')
        waveGrad1.addColorStop(0.3, 'rgba(124, 58, 237, 0.18)')
        waveGrad1.addColorStop(0.7, 'rgba(5, 150, 105, 0.18)')
        waveGrad1.addColorStop(1, 'rgba(79, 70, 229, 0.08)')
      }

      ctx.strokeStyle = waveGrad1
      ctx.lineWidth = 2.2
      ctx.shadowBlur = isDark ? 16 : 6
      ctx.shadowColor = isDark ? 'rgba(168, 85, 247, 0.45)' : 'rgba(124, 58, 237, 0.25)'
      ctx.stroke()
      ctx.shadowBlur = 0

      // Secondary harmonic wave
      ctx.beginPath()
      for (let x = 0; x <= width; x += 10) {
        const y =
          waveY2 +
          Math.cos(x * 0.0035 - time * 0.5) * 42 +
          Math.sin(x * 0.005 + time * 0.7) * 25
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.1)'
      ctx.lineWidth = 1.4
      ctx.stroke()

      // 4. Draw Floating Candlesticks
      candles.forEach((c) => {
        c.y += c.vy
        c.swayOffset += c.swaySpeed
        const currentX = c.x + Math.sin(c.swayOffset) * 14

        // Recycle when out of view
        if (c.y + c.wickBottom < -30) {
          c.y = height + 40
          c.x = Math.random() * width
          c.isBullish = Math.random() > 0.42
        }

        const candleColor = c.isBullish
          ? isDark
            ? `rgba(52, 211, 153, ${c.alpha})`
            : `rgba(5, 150, 105, ${c.alpha})`
          : isDark
          ? `rgba(244, 63, 94, ${c.alpha})`
          : `rgba(225, 29, 72, ${c.alpha})`

        const wickColor = c.isBullish
          ? isDark
            ? `rgba(52, 211, 153, ${c.alpha * 1.5})`
            : `rgba(5, 150, 105, ${c.alpha * 1.5})`
          : isDark
          ? `rgba(244, 63, 94, ${c.alpha * 1.5})`
          : `rgba(225, 29, 72, ${c.alpha * 1.5})`

        // Draw wick
        ctx.beginPath()
        ctx.moveTo(currentX + c.width / 2, c.y - c.wickTop)
        ctx.lineTo(currentX + c.width / 2, c.y + c.bodyHeight + c.wickBottom)
        ctx.strokeStyle = wickColor
        ctx.lineWidth = 1
        ctx.stroke()

        // Draw body
        ctx.fillStyle = candleColor
        ctx.fillRect(currentX, c.y, c.width, c.bodyHeight)

        // Subtle glow for bullish candles
        if (c.isBullish && isDark) {
          ctx.shadowBlur = 8
          ctx.shadowColor = 'rgba(52, 211, 153, 0.3)'
          ctx.strokeRect(currentX, c.y, c.width, c.bodyHeight)
          ctx.shadowBlur = 0
        }
      })

      // 5. Draw Constellation Network & Cursor Attraction
      const mouse = mouseRef.current
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Move
        p.x += p.vx
        p.y += p.vy

        // Bounce on boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        // Mouse interaction
        if (mouse.active) {
          const dx = mouse.x - p.x
          const dy = mouse.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const maxDist = 160

          if (dist < maxDist && dist > 0) {
            const force = (maxDist - dist) / maxDist
            p.x += (dx / dist) * force * 1.2
            p.y += (dy / dist) * force * 1.2
            p.alpha = Math.min(0.9, p.baseAlpha + force * 0.5)

            // Draw interactive laser connection to cursor
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = isDark
              ? `rgba(56, 189, 248, ${0.35 * force})`
              : `rgba(2, 132, 199, ${0.3 * force})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          } else {
            p.alpha = p.baseAlpha
          }
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
        ctx.globalAlpha = 1

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const connectionDist = 115

          if (dist < connectionDist) {
            const lineAlpha = (1 - dist / connectionDist) * 0.16
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = isDark
              ? `rgba(168, 85, 247, ${lineAlpha})`
              : `rgba(124, 58, 237, ${lineAlpha})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    // Handle tab visibility changes to pause rendering and save resources
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId)
      } else {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      mediaQuery.removeEventListener('change', handleMotionChange)
    }
  }, [theme, variant, animationsEnabled])

  return (
    <div className="trading-background-root" aria-hidden="true">
      {/* Dynamic Aurora Ambient Blobs */}
      <div className="aurora-container">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
        <div className="aurora-grid-overlay" />
      </div>

      {/* Interactive Canvas */}
      {animationsEnabled && (
        <canvas ref={canvasRef} className="trading-canvas" />
      )}
    </div>
  )
}
