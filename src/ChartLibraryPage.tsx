import { useState, useEffect, useRef, useMemo, type DragEvent, type FormEvent, type KeyboardEvent } from 'react'
import { useAuth } from './auth/auth-context'
import { api, type StockSearchResult } from './api/client'

// ============================================================================
// DATA MODELS & TYPES
// ============================================================================

export interface ChartRecord {
  id: string
  stock: string
  stockId?: number | null
  image: string // Downscaled WebP base64 data URL
  uploadedBy: string
  createdAt: string // ISO 8601 string
  fileSize?: number
}

interface ToastMessage {
  id: string
  text: string
  type?: 'success' | 'error' | 'info'
}

// ============================================================================
// DATA ACCESS LAYER (FASTAPI BACKEND API & LOCALSTORAGE FALLBACK)
// ============================================================================
// Primary: FastAPI backend endpoints from FRONTEND_API.md:
//   - GET /api/charts -> loadAllCharts()
//   - POST /api/charts -> saveChartRecord()
//   - DELETE /api/charts/{id} -> deleteChartRecord()
// Fallback: localStorage persistence with quota handling
// ============================================================================

const STORAGE_KEY = 'gf_chart_library_records_v1'

export async function loadChartsFromStorage(): Promise<ChartRecord[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return []
  } catch (err) {
    console.error('Failed to load charts from localStorage:', err)
    return []
  }
}

export async function saveChartToStorage(
  record: Omit<ChartRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<ChartRecord> {
  const newChart: ChartRecord = {
    id: record.id || `chart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    stock: record.stock.trim().toUpperCase(),
    stockId: record.stockId ?? null,
    image: record.image,
    uploadedBy: record.uploadedBy || 'J',
    createdAt: record.createdAt || new Date().toISOString(),
    fileSize: record.fileSize,
  }

  try {
    const currentCharts = await loadChartsFromStorage()
    const updated = [newChart, ...currentCharts.filter((c) => c.id !== newChart.id)]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return newChart
  } catch (err: unknown) {
    console.error('Error saving chart to localStorage:', err)
    const errorObj = err as { name?: string; code?: number }
    if (
      errorObj?.name === 'QuotaExceededError' ||
      errorObj?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      errorObj?.code === 22 ||
      errorObj?.code === 1014
    ) {
      throw new Error('Browser storage is full. Please delete older charts or clear storage.')
    }
    throw new Error('Unable to save chart to storage.')
  }
}

export async function deleteChartFromStorage(id: string): Promise<void> {
  try {
    const currentCharts = await loadChartsFromStorage()
    const updated = currentCharts.filter((chart) => chart.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Error deleting chart from localStorage:', err)
    throw new Error('Failed to delete chart from storage.')
  }
}

// Unified Loader: Queries FastAPI GET /api/charts, merges with local cache
export async function loadAllCharts(): Promise<ChartRecord[]> {
  try {
    const apiCharts = await api.charts()
    if (Array.isArray(apiCharts) && apiCharts.length > 0) {
      const localCharts = await loadChartsFromStorage()
      const localMap = new Map(localCharts.map((c) => [c.id, c]))

      const mapped: ChartRecord[] = apiCharts.map((sc) => {
        const idStr = String(sc.id)
        const local = localMap.get(idStr)
        const stockSymbol =
          (sc.image_metadata?.stock_symbol as string) ||
          local?.stock ||
          sc.original_filename?.replace(/\.[^/.]+$/, '').toUpperCase() ||
          `STOCK_${sc.stock_id}`
        const uploadedBy =
          (sc.image_metadata?.uploaded_by as string) ||
          local?.uploadedBy ||
          'Member'

        return {
          id: idStr,
          stock: stockSymbol,
          stockId: sc.stock_id,
          image: sc.image_url || (sc.image_metadata?.preview_data as string) || local?.image || '',
          uploadedBy,
          createdAt: sc.created_at,
          fileSize: sc.file_size,
        }
      })

      // Also merge any local-only charts that haven't synced yet
      const apiIds = new Set(mapped.map((m) => m.id))
      const unsynced = localCharts.filter((c) => !apiIds.has(c.id))
      const combined = [...mapped, ...unsynced]
      return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  } catch (err) {
    console.warn('Backend GET /api/charts unavailable, using local persistence:', err)
  }

  return loadChartsFromStorage()
}

// Unified Saver: Calls FastAPI POST /api/charts with stock_id and multipart image
export async function saveChartRecord(
  record: Omit<ChartRecord, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  imageBlob?: Blob | null
): Promise<ChartRecord> {
  let resolvedStockId = record.stockId ?? null

  // If stockId is not provided, try to find it in the catalog
  if (!resolvedStockId && record.stock) {
    try {
      const catalogResults = await api.searchCatalog(record.stock)
      const exactMatch = catalogResults.find(
        (c) => c.symbol.toUpperCase() === record.stock.toUpperCase()
      )
      if (exactMatch) {
        resolvedStockId = exactMatch.id
      } else if (catalogResults.length > 0) {
        resolvedStockId = catalogResults[0].id
      }
    } catch {
      // catalog search optional
    }
  }

  // Attempt upload to backend API if stockId and imageBlob are available
  if (resolvedStockId && imageBlob) {
    try {
      const metadata = {
        stock_symbol: record.stock.toUpperCase(),
        uploaded_by: record.uploadedBy,
        preview_data: record.image,
      }
      const uploaded = await api.uploadChart(
        resolvedStockId,
        imageBlob,
        metadata,
        `${record.stock.toLowerCase()}_chart.jpg`
      )

      const savedChart: ChartRecord = {
        id: String(uploaded.id),
        stock: record.stock.toUpperCase(),
        stockId: uploaded.stock_id,
        image: uploaded.image_url || record.image,
        uploadedBy: (uploaded.image_metadata?.uploaded_by as string) || record.uploadedBy || 'J',
        createdAt: uploaded.created_at || new Date().toISOString(),
        fileSize: uploaded.file_size || record.fileSize,
      }
      await saveChartToStorage(savedChart)
      return savedChart
    } catch (apiErr) {
      console.warn('Backend POST /api/charts failed, falling back to local storage:', apiErr)
    }
  }

  return saveChartToStorage({
    ...record,
    stockId: resolvedStockId,
  })
}

// Unified Deleter: Calls DELETE /api/charts/{id} on backend + removes from storage
export async function deleteChartRecord(id: string): Promise<void> {
  const numericId = Number(id)
  if (!isNaN(numericId) && numericId > 0) {
    try {
      await api.deleteChart(numericId)
    } catch (err) {
      console.warn('Backend DELETE /api/charts failed:', err)
    }
  }
  await deleteChartFromStorage(id)
}

// ============================================================================
// IMAGE DOWNSCALING & PROCESSING UTILITY
// Downscale large images (max 1800px, WebP) before saving
// ============================================================================

export async function processAndDownscaleImage(
  file: File | Blob
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number; size: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (PNG, JPG, WebP).'))
      return
    }

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { naturalWidth: width, naturalHeight: height } = img

      const MAX_DIM = 1800
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width)
          width = MAX_DIM
        } else {
          width = Math.round((width * MAX_DIM) / height)
          height = MAX_DIM
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Could not initialize canvas image context.'))
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      // Export as WebP with 0.88 quality, fallback to JPEG if WebP unsupported
      let dataUrl = canvas.toDataURL('image/webp', 0.88)
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.88)
      }

      // Also create JPEG Blob for backend API multipart upload
      canvas.toBlob(
        (blob) => {
          const finalBlob = blob || new Blob([], { type: 'image/jpeg' })
          const approxBytes = finalBlob.size || Math.round((dataUrl.length * 3) / 4)
          resolve({
            dataUrl,
            blob: finalBlob,
            width,
            height,
            size: approxBytes,
          })
        },
        'image/jpeg',
        0.9
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to read image data. The file might be corrupted.'))
    }

    img.src = objectUrl
  })
}

// Date formatting helper
function formatChartDateTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

// ============================================================================
// MAIN CHART LIBRARY COMPONENT
// ============================================================================

export default function ChartLibraryPage() {
  const { user } = useAuth()
  const userName = user?.name?.trim() || 'J'

  // Component state
  const [charts, setCharts] = useState<ChartRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedChart, setSelectedChart] = useState<ChartRecord | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Load charts on mount (queries backend /api/charts with local storage fallback)
  useEffect(() => {
    let active = true
    loadAllCharts()
      .then((data) => {
        if (active) {
          setCharts(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Toast dispatch
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3800)
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Handle successful upload
  const handleChartSaved = (newChart: ChartRecord) => {
    setCharts((prev) => [newChart, ...prev.filter((c) => c.id !== newChart.id)])
    setIsUploadOpen(false)
    showToast(`${newChart.stock} chart uploaded`, 'success')
  }

  // Handle chart deletion
  const handleDeleteChart = async (chart: ChartRecord) => {
    const confirmDelete = window.confirm(`Permanently delete the ${chart.stock} chart setup?`)
    if (!confirmDelete) return

    try {
      await deleteChartRecord(chart.id)
      setCharts((prev) => prev.filter((c) => c.id !== chart.id))
      setSelectedChart(null)
      setIsFullScreen(false)
      showToast(`${chart.stock} chart deleted`, 'info')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete chart.'
      showToast(msg, 'error')
    }
  }

  // Global ESC key handling for two-level step back:
  // full screen -> medium preview -> closed
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedChart) {
          e.preventDefault()
          if (isFullScreen) {
            setIsFullScreen(false) // Step 1: Full screen -> medium preview
          } else {
            setSelectedChart(null) // Step 2: Medium preview -> closed
          }
        } else if (isUploadOpen) {
          setIsUploadOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedChart, isFullScreen, isUploadOpen])

  return (
    <div className="chart-library-container">
      <style>{chartLibraryStyles}</style>

      {/* Top Header Row with Title, Subtitle, and Upload Chart button */}
      <header className="cl-header-row">
        <div className="cl-header-meta">
          <p className="cl-subtitle">
            Curated technical setups, Elliott Wave counts, and price action studies.
          </p>
        </div>
        <button
          className="cl-btn-gradient cl-upload-trigger"
          onClick={() => setIsUploadOpen(true)}
          aria-label="Upload chart"
        >
          <svg className="cl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Upload chart</span>
        </button>
      </header>

      {/* Chart Count */}
      <div className="cl-count-bar">
        <span className="cl-count-text">
          <strong className="cl-count-number">{charts.length}</strong> {charts.length === 1 ? 'chart' : 'charts'}
        </span>
      </div>

      {/* Grid or Empty State */}
      {loading ? (
        <div className="cl-loading-state" aria-live="polite">
          <div className="cl-spinner" />
          <p>Loading chart library...</p>
        </div>
      ) : charts.length === 0 ? (
        <div className="cl-empty-state">
          <div className="cl-empty-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h3>No charts uploaded yet</h3>
          <p>Upload stock setups and technical analyses to build your personal chart collection.</p>
          <button
            className="cl-btn-gradient"
            onClick={() => setIsUploadOpen(true)}
          >
            <svg className="cl-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload chart</span>
          </button>
        </div>
      ) : (
        <div className="cl-chart-grid" role="list">
          {charts.map((chart, idx) => (
            <div
              key={chart.id}
              className="cl-chart-card"
              role="listitem"
              tabIndex={0}
              onClick={() => {
                setSelectedChart(chart)
                setIsFullScreen(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedChart(chart)
                  setIsFullScreen(false)
                }
              }}
              style={{ animationDelay: `${Math.min(idx * 0.04, 0.4)}s` }}
            >
              <div className="cl-card-thumb-wrap">
                <img
                  src={chart.image}
                  alt={`${chart.stock} chart setup`}
                  className="cl-card-thumb"
                  loading="lazy"
                />
                <div className="cl-card-overlay">
                  <span className="cl-overlay-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    Preview
                  </span>
                </div>
              </div>

              <div className="cl-card-details">
                <h4 className="cl-card-stock">{chart.stock}</h4>
                <p className="cl-card-meta">
                  Uploaded by <span className="cl-card-author">{chart.uploadedBy}</span> · {formatChartDateTime(chart.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <UploadChartModal
          userName={userName}
          onClose={() => setIsUploadOpen(false)}
          onSaved={handleChartSaved}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Chart Viewer Modal */}
      {selectedChart && (
        <ChartViewerModal
          chart={selectedChart}
          isFullScreen={isFullScreen}
          onToggleFullScreen={() => setIsFullScreen((prev) => !prev)}
          onClose={() => {
            setSelectedChart(null)
            setIsFullScreen(false)
          }}
          onDelete={() => handleDeleteChart(selectedChart)}
        />
      )}

      {/* Floating Toast Alerts */}
      <aside className="cl-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`cl-toast cl-toast-${toast.type || 'success'}`}>
            <span className="cl-toast-indicator" />
            <span className="cl-toast-text">{toast.text}</span>
            <button
              className="cl-toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </aside>
    </div>
  )
}

// ============================================================================
// UPLOAD CHART MODAL COMPONENT
// ============================================================================

interface UploadModalProps {
  userName: string
  onClose: () => void
  onSaved: (chart: ChartRecord) => void
  onError: (message: string) => void
}

function UploadChartModal({ userName, onClose, onSaved, onError }: UploadModalProps) {
  const [stockName, setStockName] = useState('')
  const [selectedStockId, setSelectedStockId] = useState<number | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Catalog search suggestions
  const [catalogSuggestions, setCatalogSuggestions] = useState<StockSearchResult[]>([])
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false)
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)
  const searchTimeoutRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)

  // Focus trap / auto-focus & cleanup search timeout on unmount
  useEffect(() => {
    const firstInput = modalRef.current?.querySelector<HTMLInputElement>('input')
    firstInput?.focus()
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Stock search debounce against /api/catalog/stocks
  const handleStockNameChange = (val: string) => {
    const uppercase = val.toUpperCase()
    setStockName(uppercase)
    setSelectedStockId(null)

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }

    const trimmed = uppercase.trim()
    if (trimmed.length >= 2) {
      setIsSearchingCatalog(true)
      searchTimeoutRef.current = window.setTimeout(async () => {
        try {
          const results = await api.searchCatalog(trimmed)
          setCatalogSuggestions(results.slice(0, 6))
          setShowCatalogDropdown(results.length > 0)
        } catch {
          setCatalogSuggestions([])
          setShowCatalogDropdown(false)
        } finally {
          setIsSearchingCatalog(false)
        }
      }, 260)
    } else {
      setCatalogSuggestions([])
      setShowCatalogDropdown(false)
      setIsSearchingCatalog(false)
    }
  }

  const selectCatalogItem = (item: StockSearchResult) => {
    setStockName(item.symbol.toUpperCase())
    setSelectedStockId(item.id)
    setShowCatalogDropdown(false)
    setCatalogSuggestions([])
  }

  // Handle image file selection
  const handleFile = async (file: File | Blob) => {
    if (!file.type.startsWith('image/')) {
      onError('Please select an image file (PNG, JPG, or WebP).')
      return
    }

    setIsProcessing(true)
    try {
      const processed = await processAndDownscaleImage(file)
      setImagePreview(processed.dataUrl)
      setImageBlob(processed.blob)
      setFileSize(processed.size)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process image.'
      onError(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileRef = useRef(handleFile)
  handleFileRef.current = handleFile

  // Clipboard paste listener (Ctrl+V screenshot support)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile()
          if (blob) {
            e.preventDefault()
            await handleFileRef.current(blob)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  // Submit / save chart
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!stockName.trim() || !imagePreview) return

    setIsSaving(true)
    try {
      const saved = await saveChartRecord(
        {
          stock: stockName.trim().toUpperCase(),
          stockId: selectedStockId,
          image: imagePreview,
          uploadedBy: userName,
          fileSize: fileSize || undefined,
        },
        imageBlob
      )
      onSaved(saved)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save chart.'
      onError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = Boolean(stockName.trim()) && Boolean(imagePreview) && !isProcessing && !isSaving

  return (
    <div
      className="cl-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div
        className="cl-modal cl-upload-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        ref={modalRef}
      >
        <header className="cl-modal-header">
          <div>
            <h3 id="upload-modal-title" className="cl-modal-title">Upload chart</h3>
            <p className="cl-modal-sub">Add a new technical analysis setup to your library.</p>
          </div>
          <button
            className="cl-icon-btn cl-btn-close"
            onClick={onClose}
            aria-label="Close upload dialog"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="cl-upload-form">
          {/* Stock Name Field with live Catalog Autocomplete */}
          <div className="cl-field-group">
            <label htmlFor="cl-stock-input" className="cl-field-label">
              Stock name <span className="cl-required">*</span>
            </label>
            <div className="cl-stock-input-wrapper">
              <input
                id="cl-stock-input"
                type="text"
                className="cl-input"
                value={stockName}
                onChange={(e) => handleStockNameChange(e.target.value)}
                onFocus={() => {
                  if (catalogSuggestions.length > 0) setShowCatalogDropdown(true)
                }}
                onBlur={() => {
                  window.setTimeout(() => setShowCatalogDropdown(false), 220)
                }}
                placeholder="E.g. RELIANCE, TATAMOTORS, NIFTY"
                autoComplete="off"
                spellCheck={false}
                required
              />
              {isSearchingCatalog && (
                <span className="cl-input-spinner" aria-hidden="true" />
              )}
            </div>

            {/* Catalog Search Dropdown */}
            {showCatalogDropdown && catalogSuggestions.length > 0 && (
              <div className="cl-catalog-dropdown" role="listbox">
                <div className="cl-dropdown-header">Catalog suggestions</div>
                {catalogSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="cl-dropdown-item"
                    onClick={() => selectCatalogItem(item)}
                    role="option"
                    aria-selected={item.symbol.toUpperCase() === stockName}
                  >
                    <span className="cl-dropdown-symbol">{item.symbol}</span>
                    <span className="cl-dropdown-name">{item.company_name}</span>
                    <span className="cl-dropdown-exchange">{item.exchange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image Dropzone & Preview */}
          <div className="cl-field-group">
            <label className="cl-field-label">
              Chart image <span className="cl-required">*</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  void handleFile(e.target.files[0])
                }
              }}
            />

            {!imagePreview ? (
              <div
                className={`cl-dropzone ${isDragging ? 'cl-dropzone-active' : ''} ${isProcessing ? 'cl-dropzone-busy' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
                role="button"
                aria-label="Upload or drop chart image, or paste screenshot"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
              >
                {isProcessing ? (
                  <div className="cl-dropzone-content">
                    <div className="cl-spinner" />
                    <p className="cl-dropzone-prompt">Optimizing and downscaling image...</p>
                  </div>
                ) : (
                  <div className="cl-dropzone-content">
                    <div className="cl-dropzone-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <p className="cl-dropzone-primary">
                      Drag & drop chart here, or <span className="cl-link-span">browse</span>
                    </p>
                    <p className="cl-dropzone-hint">
                      Paste directly with <kbd className="cl-kbd">Ctrl+V</kbd> · Max 1800px WebP optimization
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="cl-preview-wrap">
                <div className="cl-preview-box">
                  <img
                    src={imagePreview}
                    alt="Chart preview"
                    className="cl-preview-img"
                  />
                </div>
                <div className="cl-preview-bar">
                  <span className="cl-preview-info">
                    {fileSize ? `${Math.round(fileSize / 1024)} KB · WebP optimized` : 'Image ready'}
                  </span>
                  <button
                    type="button"
                    className="cl-link-btn"
                    onClick={() => {
                      setImagePreview(null)
                      setFileSize(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    Choose a different image
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="cl-uploader-badge">
            <span className="cl-uploader-label">Uploaded by:</span>
            <span className="cl-uploader-value">{userName}</span>
          </div>

          {/* Modal Actions */}
          <footer className="cl-modal-footer">
            <button
              type="button"
              className="cl-btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cl-btn-gradient"
              disabled={!canSave}
            >
              {isSaving ? (
                <>
                  <span className="cl-btn-spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save chart</span>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// CHART VIEWER MODAL COMPONENT (MEDIUM & FULLSCREEN MODES)
// ============================================================================

interface ViewerModalProps {
  chart: ChartRecord
  isFullScreen: boolean
  onToggleFullScreen: () => void
  onClose: () => void
  onDelete: () => void
}

function ChartViewerModal({
  chart,
  isFullScreen,
  onToggleFullScreen,
  onClose,
  onDelete,
}: ViewerModalProps) {
  return (
    <div
      className={`cl-viewer-backdrop ${isFullScreen ? 'cl-viewer-fullscreen-backdrop' : ''}`}
      onMouseDown={(e) => {
        // Backdrop click closes preview in medium mode
        if (e.target === e.currentTarget && !isFullScreen) {
          onClose()
        }
      }}
      role="presentation"
    >
      <section
        className={`cl-viewer-dialog ${isFullScreen ? 'cl-viewer-fullscreen' : 'cl-viewer-medium'}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${chart.stock} chart viewer`}
      >
        {/* Header with Title and Three Icon Buttons (Delete, Full screen, Close) */}
        <header className="cl-viewer-header">
          <div className="cl-viewer-info">
            <div className="cl-viewer-stock-badge">{chart.stock}</div>
            <div className="cl-viewer-meta">
              Uploaded by <strong className="cl-viewer-author">{chart.uploadedBy}</strong> · {formatChartDateTime(chart.createdAt)}
            </div>
          </div>

          <div className="cl-viewer-actions">
            {/* 1. Delete Button */}
            <button
              className="cl-icon-btn cl-btn-delete"
              onClick={onDelete}
              title="Delete chart"
              aria-label="Delete chart"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>

            {/* 2. Full Screen Toggle Button */}
            <button
              className="cl-icon-btn cl-btn-fullscreen"
              onClick={onToggleFullScreen}
              title={isFullScreen ? 'Exit full screen (Esc)' : 'Full screen (Double click image)'}
              aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullScreen ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6m-6 5l6-6M9 21H3v-6m6 5l-6-6M21 9V3m0 0h-6m6 0l-6 6M3 15v6m0 0h6m-6 0l6-6" />
                </svg>
              )}
            </button>

            {/* 3. Close Button */}
            <button
              className="cl-icon-btn cl-btn-close"
              onClick={onClose}
              title="Close preview (Esc)"
              aria-label="Close preview"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Chart Image Canvas/Container */}
        <div
          className="cl-viewer-body"
          onDoubleClick={onToggleFullScreen}
          title="Double-click to toggle full screen"
        >
          <img
            src={chart.image}
            alt={`${chart.stock} chart`}
            className="cl-viewer-img"
          />
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// SELF-CONTAINED STYLES
// Matched to Greed & Fear dark theme:
// #000000 / #0a0a0f / #111118, purple/blue accent #7c5cff / #4f7cff
// ============================================================================

const chartLibraryStyles = `
/* Layout & Container */
.chart-library-container {
  width: 100%;
  color: var(--portal-text, #edf2f5);
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-sizing: border-box;
}

/* Header Row */
.cl-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.cl-header-meta {
  flex: 1;
  min-width: 240px;
}

.cl-subtitle {
  margin: 0;
  color: var(--portal-muted, #9ca3af);
  font-size: 0.88rem;
  line-height: 1.5;
}

/* Gradient Button */
.cl-btn-gradient {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #7c5cff 0%, #4f7cff 100%);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 14px rgba(124, 92, 255, 0.25);
  text-decoration: none;
  user-select: none;
}

.cl-btn-gradient:hover:not(:disabled) {
  transform: translateY(-1.5px);
  box-shadow: 0 6px 20px rgba(124, 92, 255, 0.42), 0 0 12px rgba(79, 124, 255, 0.3);
  filter: brightness(1.08);
}

.cl-btn-gradient:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(124, 92, 255, 0.3);
}

.cl-btn-gradient:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.cl-btn-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

/* Secondary Button */
.cl-btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--portal-surface-2, #111118);
  color: var(--portal-text, #edf2f5);
  border: 1px solid var(--portal-border, #23232e);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.84rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cl-btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Count Bar */
.cl-count-bar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.cl-count-text {
  font-size: 0.82rem;
  color: var(--portal-muted, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

.cl-count-number {
  color: #7c5cff;
  font-weight: 800;
}

/* Chart Grid */
.cl-chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

/* Chart Card */
.cl-chart-card {
  background: var(--portal-surface, #0a0a0f);
  border: 1px solid var(--portal-border, #23232e);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: all 0.26s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  animation: clCardFadeUp 0.36s cubic-bezier(0.16, 1, 0.3, 1) both;
  outline: none;
}

.cl-chart-card:hover {
  transform: translateY(-4px);
  border-color: rgba(124, 92, 255, 0.45);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.65), 0 0 20px rgba(124, 92, 255, 0.16);
}

.cl-chart-card:focus-visible {
  outline: 2px solid #7c5cff;
  outline-offset: 2px;
}

/* Card Thumbnail */
.cl-card-thumb-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #050508;
  overflow: hidden;
  border-bottom: 1px solid var(--portal-border, #23232e);
}

.cl-card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  display: block;
}

.cl-chart-card:hover .cl-card-thumb {
  transform: scale(1.04);
}

.cl-card-overlay {
  position: absolute;
  inset: 0;
  background: rgba(5, 5, 8, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.22s ease;
  backdrop-filter: blur(2px);
}

.cl-chart-card:hover .cl-card-overlay {
  opacity: 1;
}

.cl-overlay-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(10, 10, 15, 0.85);
  border: 1px solid rgba(124, 92, 255, 0.5);
  color: #edf2f5;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.cl-overlay-pill svg {
  width: 13px;
  height: 13px;
  color: #7c5cff;
}

/* Card Details */
.cl-card-details {
  padding: 12px 14px;
  background: var(--portal-surface, #0a0a0f);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cl-card-stock {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--portal-text, #edf2f5);
}

.cl-card-meta {
  margin: 0;
  font-size: 0.73rem;
  color: var(--portal-muted, #9ca3af);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cl-card-author {
  color: #c4b5fd;
  font-weight: 600;
}

/* Empty State */
.cl-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  background: var(--portal-surface, #0a0a0f);
  border: 1px dashed var(--portal-border, #23232e);
  border-radius: 14px;
  text-align: center;
  animation: clFadeIn 0.3s ease;
}

.cl-empty-icon-wrap {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.14), rgba(79, 124, 255, 0.14));
  border: 1px solid rgba(124, 92, 255, 0.28);
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  color: #7c5cff;
}

.cl-empty-icon-wrap svg {
  width: 28px;
  height: 28px;
}

.cl-empty-state h3 {
  margin: 0 0 8px;
  font-size: 1.18rem;
  color: var(--portal-text, #edf2f5);
  font-weight: 700;
}

.cl-empty-state p {
  margin: 0 0 24px;
  color: var(--portal-muted, #9ca3af);
  max-width: 420px;
  font-size: 0.86rem;
  line-height: 1.5;
}

/* Loading State */
.cl-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  color: var(--portal-muted, #9ca3af);
  gap: 16px;
}

.cl-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(124, 92, 255, 0.2);
  border-top-color: #7c5cff;
  border-radius: 50%;
  animation: clSpin 0.75s linear infinite;
}

/* Modal Backdrop */
.cl-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: clFadeIn 0.22s ease;
}

/* Upload Modal Container */
.cl-upload-modal {
  width: 100%;
  max-width: 540px;
  background: var(--portal-surface, #0a0a0f);
  border: 1px solid var(--portal-border, #23232e);
  border-radius: 14px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.75), 0 0 20px rgba(124, 92, 255, 0.12);
  animation: clScaleUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cl-modal-header {
  padding: 18px 20px;
  border-bottom: 1px solid var(--portal-border, #23232e);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.cl-modal-title {
  margin: 0 0 4px;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--portal-text, #edf2f5);
}

.cl-modal-sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--portal-muted, #9ca3af);
}

.cl-icon-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--portal-muted, #9ca3af);
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.18s ease;
}

.cl-icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--portal-text, #edf2f5);
}

.cl-icon-btn:focus-visible {
  outline: 2px solid #7c5cff;
}

.cl-icon-btn svg {
  width: 17px;
  height: 17px;
}

/* Upload Form */
.cl-upload-form {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cl-field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.cl-field-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--portal-text, #edf2f5);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cl-required {
  color: #ef4b55;
}

.cl-stock-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.cl-input {
  width: 100%;
  background: var(--portal-surface-2, #111118);
  border: 1px solid var(--portal-border, #23232e);
  border-radius: 8px;
  padding: 10px 14px;
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: all 0.18s ease;
  box-sizing: border-box;
}

.cl-input::placeholder {
  color: #555c69;
  text-transform: none;
  font-weight: normal;
  letter-spacing: normal;
}

.cl-input:focus {
  outline: none;
  border-color: #7c5cff;
  box-shadow: 0 0 0 3px rgba(124, 92, 255, 0.22);
  background: #151522;
}

.cl-input-spinner {
  position: absolute;
  right: 12px;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(124, 92, 255, 0.25);
  border-top-color: #7c5cff;
  border-radius: 50%;
  animation: clSpin 0.6s linear infinite;
}

/* Catalog Suggestions Dropdown */
.cl-catalog-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 40;
  margin-top: 4px;
  background: #111119;
  border: 1px solid rgba(124, 92, 255, 0.35);
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
  animation: clFadeIn 0.18s ease;
}

.cl-dropdown-header {
  padding: 6px 12px;
  font-size: 0.68rem;
  color: var(--portal-muted, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--portal-border, #23232e);
}

.cl-dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  color: var(--portal-text, #edf2f5);
  font-size: 0.82rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.cl-dropdown-item:last-child {
  border-bottom: none;
}

.cl-dropdown-item:hover, .cl-dropdown-item:focus {
  background: rgba(124, 92, 255, 0.18);
  outline: none;
}

.cl-dropdown-symbol {
  font-weight: 700;
  color: #c4b5fd;
  min-width: 90px;
}

.cl-dropdown-name {
  flex: 1;
  color: var(--portal-muted, #9ca3af);
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cl-dropdown-exchange {
  font-size: 0.68rem;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 4px;
  color: #9ca3af;
}

/* Dropzone */
.cl-dropzone {
  border: 2px dashed var(--portal-border, #23232e);
  border-radius: 10px;
  padding: 24px 16px;
  background: var(--portal-surface-2, #111118);
  cursor: pointer;
  text-align: center;
  transition: all 0.22s ease;
  outline: none;
}

.cl-dropzone:hover, .cl-dropzone:focus-visible {
  border-color: #7c5cff;
  background: rgba(124, 92, 255, 0.06);
}

.cl-dropzone-active {
  border-color: #4f7cff;
  background: rgba(79, 124, 255, 0.12);
  transform: scale(1.01);
}

.cl-dropzone-busy {
  cursor: wait;
}

.cl-dropzone-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(124, 92, 255, 0.12);
  color: #7c5cff;
  display: grid;
  place-items: center;
  margin: 0 auto 10px;
}

.cl-dropzone-icon svg {
  width: 22px;
  height: 22px;
}

.cl-dropzone-primary {
  margin: 0 0 6px;
  font-size: 0.86rem;
  color: var(--portal-text, #edf2f5);
  font-weight: 600;
}

.cl-link-span {
  color: #7c5cff;
  text-decoration: underline;
}

.cl-dropzone-hint {
  margin: 0;
  font-size: 0.74rem;
  color: var(--portal-muted, #9ca3af);
}

.cl-kbd {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.7rem;
  color: #edf2f5;
  font-family: inherit;
}

/* Image Preview */
.cl-preview-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cl-preview-box {
  width: 100%;
  max-height: 220px;
  border-radius: 10px;
  overflow: hidden;
  background: #050508;
  border: 1px solid var(--portal-border, #23232e);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cl-preview-img {
  max-width: 100%;
  max-height: 220px;
  object-fit: contain;
  display: block;
}

.cl-preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
}

.cl-preview-info {
  font-size: 0.74rem;
  color: var(--portal-muted, #9ca3af);
}

.cl-link-btn {
  background: transparent;
  border: none;
  color: #7c5cff;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.cl-link-btn:hover {
  color: #a855f7;
}

/* Uploader Badge */
.cl-uploader-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.76rem;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.cl-uploader-label {
  color: var(--portal-muted, #9ca3af);
}

.cl-uploader-value {
  color: #c4b5fd;
  font-weight: 700;
}

/* Modal Footer */
.cl-modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--portal-border, #23232e);
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cl-btn-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: clSpin 0.6s linear infinite;
}

/* Viewer Modal */
.cl-viewer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: clFadeIn 0.22s ease;
}

.cl-viewer-fullscreen-backdrop {
  padding: 0;
  background: #000000;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

/* Medium Preview Dialog (~900px wide, centered) */
.cl-viewer-dialog {
  display: flex;
  flex-direction: column;
  background: var(--portal-surface, #0a0a0f);
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
  transition: all 0.26s cubic-bezier(0.16, 1, 0.3, 1);
}

.cl-viewer-medium {
  width: 92vw;
  max-width: 900px;
  max-height: 92vh;
  border: 1px solid var(--portal-border, #23232e);
  border-radius: 14px;
  animation: clScaleUp 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Fullscreen Mode (100vw x 100vh, black background) */
.cl-viewer-fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: 100vw;
  max-height: 100vh;
  border: none;
  border-radius: 0;
  background: #000000;
  margin: 0;
  position: fixed;
  inset: 0;
}

/* Viewer Header */
.cl-viewer-header {
  height: 60px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(10, 10, 15, 0.95);
  border-bottom: 1px solid var(--portal-border, #23232e);
  z-index: 10;
  flex-shrink: 0;
}

.cl-viewer-fullscreen .cl-viewer-header {
  background: rgba(5, 5, 8, 0.98);
  border-bottom: 1px solid #1a1a24;
}

.cl-viewer-info {
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
}

.cl-viewer-stock-badge {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #ffffff;
  padding: 3px 10px;
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.2), rgba(79, 124, 255, 0.2));
  border: 1px solid rgba(124, 92, 255, 0.4);
  border-radius: 6px;
}

.cl-viewer-meta {
  font-size: 0.78rem;
  color: var(--portal-muted, #9ca3af);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cl-viewer-author {
  color: #c4b5fd;
}

.cl-viewer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cl-btn-delete:hover {
  background: rgba(239, 75, 85, 0.16);
  color: #ef4b55;
  border-color: rgba(239, 75, 85, 0.3);
}

.cl-btn-fullscreen:hover {
  background: rgba(124, 92, 255, 0.16);
  color: #7c5cff;
  border-color: rgba(124, 92, 255, 0.3);
}

/* Viewer Body & Image */
.cl-viewer-body {
  position: relative;
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000000;
  overflow: hidden;
  cursor: zoom-in;
  user-select: none;
}

.cl-viewer-fullscreen .cl-viewer-body {
  cursor: zoom-out;
  height: calc(100vh - 60px);
}

.cl-viewer-img {
  max-width: 100%;
  max-height: calc(92vh - 60px);
  object-fit: contain;
  display: block;
  transition: transform 0.2s ease;
}

.cl-viewer-fullscreen .cl-viewer-img {
  max-height: calc(100vh - 60px);
  width: 100%;
}

/* Floating Toast Notifications */
.cl-toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.cl-toast {
  pointer-events: auto;
  min-width: 260px;
  max-width: 380px;
  padding: 12px 14px;
  background: #101018;
  border: 1px solid var(--portal-border, #23232e);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  gap: 10px;
  animation: clToastSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.cl-toast-success {
  border-color: rgba(53, 185, 95, 0.35);
}

.cl-toast-error {
  border-color: rgba(239, 75, 85, 0.4);
}

.cl-toast-info {
  border-color: rgba(124, 92, 255, 0.4);
}

.cl-toast-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.cl-toast-success .cl-toast-indicator {
  background: #35b95f;
  box-shadow: 0 0 8px #35b95f;
}

.cl-toast-error .cl-toast-indicator {
  background: #ef4b55;
  box-shadow: 0 0 8px #ef4b55;
}

.cl-toast-info .cl-toast-indicator {
  background: #7c5cff;
  box-shadow: 0 0 8px #7c5cff;
}

.cl-toast-text {
  flex: 1;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--portal-text, #edf2f5);
}

.cl-toast-close {
  background: transparent;
  border: none;
  color: var(--portal-muted, #9ca3af);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.cl-toast-close:hover {
  color: #ffffff;
}

/* Keyframe Animations */
@keyframes clFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes clScaleUp {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes clCardFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes clToastSlide {
  from { opacity: 0; transform: translateY(16px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes clSpin {
  to { transform: rotate(360deg); }
}

/* Reduced Motion Preference */
@media (prefers-reduced-motion: reduce) {
  .cl-chart-card,
  .cl-btn-gradient,
  .cl-modal-backdrop,
  .cl-upload-modal,
  .cl-viewer-dialog,
  .cl-toast,
  .cl-empty-state {
    animation: none !important;
    transition: none !important;
  }
}

/* Mobile Responsiveness */
@media (max-width: 640px) {
  .cl-header-row {
    flex-direction: column;
    align-items: stretch;
  }

  .cl-upload-trigger {
    width: 100%;
  }

  .cl-viewer-header {
    height: auto;
    padding: 10px 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .cl-viewer-meta {
    font-size: 0.72rem;
  }

  .cl-viewer-medium {
    width: 96vw;
    max-height: 95vh;
  }
}
`
