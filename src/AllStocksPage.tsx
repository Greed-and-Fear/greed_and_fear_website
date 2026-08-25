import { useEffect, useState } from 'react'

interface StocksResponse {
  count: number
  next: string | null
  previous: string | null
  results: Array<Record<string, unknown>>
}

const PAGE_SIZE = 100

export default function AllStocksPage() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<StocksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/tradebrains-api/?ascending=true&by=company&format=json&page=${page}&per_page=${PAGE_SIZE}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
        return response.json() as Promise<StocksResponse>
      })
      .then((response) => { setData(response); setError(''); setLoading(false) })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setError(reason instanceof Error ? reason.message : 'Unable to load stock data.')
        setLoading(false)
      })
    return () => controller.abort()
  }, [page, retry])

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1
  const columns = data?.results[0] ? Object.keys(data.results[0]) : []
  const goToPage = (nextPage: number) => {
    setLoading(true)
    setPage(Math.max(1, Math.min(nextPage, totalPages)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return <section className="all-stocks-page">
    <div className="all-stocks-toolbar">
      <div><span>Source records</span><strong>{data?.count.toLocaleString('en-IN') ?? '—'}</strong></div>
      <div><span>Rows per page</span><strong>{PAGE_SIZE}</strong></div>
      <div><span>Current page</span><strong>{page} / {totalPages}</strong></div>
      <a href="https://portal.tradebrains.in/api/company/sector-data/all-stocks/?ascending=true&by=company&format=json&page=1&per_page=100" target="_blank" rel="noreferrer">Open source API ↗</a>
    </div>

    {loading && <div className="stocks-loading" aria-live="polite"><span /><p>Loading page {page} with {PAGE_SIZE} records...</p></div>}
    {!loading && error && <div className="stocks-error" role="alert"><strong>Stock data could not be loaded</strong><p>{error}</p><button onClick={() => { setLoading(true); setRetry((value) => value + 1) }}>Try again</button></div>}
    {!loading && data && <>
      <div className="raw-stock-table-wrap">
        <table className="raw-stock-table">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{data.results.map((row, index) => <tr key={String(row.id ?? `${page}-${index}`)}>{columns.map((column) => <td className={column === 'change' || column === 'per_change' ? Number(row[column]) >= 0 ? 'positive' : 'negative' : undefined} key={column}>{renderValue(row[column])}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <footer className="stocks-pagination">
        <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.count)} of {data.count.toLocaleString('en-IN')}</span>
        <div><button onClick={() => goToPage(1)} disabled={!data.previous}>First</button><button onClick={() => goToPage(page - 1)} disabled={!data.previous}>← Previous</button><strong>Page {page} of {totalPages}</strong><button onClick={() => goToPage(page + 1)} disabled={!data.next}>Next →</button><button onClick={() => goToPage(totalPages)} disabled={!data.next}>Last</button></div>
      </footer>
    </>}
  </section>
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
