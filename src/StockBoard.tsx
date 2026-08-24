import { DragEvent, FormEvent, useState } from 'react'

const stockStatuses = [
  { id: 'under-watch', label: 'Under watch' },
  { id: 'in-ban', label: 'In ban' },
  { id: 'ban-lifted', label: 'Ban lifted' },
  { id: 'in-trade', label: 'In trade' },
  { id: 'exited-profit', label: 'Exited with profit' },
  { id: 'exited-loss', label: 'Exited with loss' },
] as const

type StockStatus = typeof stockStatuses[number]['id']

interface StockTask {
  id: string
  symbol: string
  company: string
  status: StockStatus
  buyPrice: number
  currentPrice: number
  targetPrice: number
  stopLoss: number
  addedDate: string
  owner: string
  notes: string
}

const initialStocks: StockTask[] = [
  { id: 'GF-101', symbol: 'BHEL', company: 'Bharat Heavy Electricals', status: 'under-watch', buyPrice: 258.4, currentPrice: 263.1, targetPrice: 285, stopLoss: 246, addedDate: '2026-08-22', owner: 'Sujay', notes: 'Volume expansion near weekly resistance.' },
  { id: 'GF-102', symbol: 'PNB', company: 'Punjab National Bank', status: 'in-ban', buyPrice: 112.8, currentPrice: 109.4, targetPrice: 124, stopLoss: 105, addedDate: '2026-08-21', owner: 'Johnson', notes: 'MWPL above 88%. Wait for ban status confirmation.' },
  { id: 'GF-103', symbol: 'SAIL', company: 'Steel Authority of India', status: 'ban-lifted', buyPrice: 126.25, currentPrice: 129.8, targetPrice: 142, stopLoss: 120, addedDate: '2026-08-19', owner: 'Sujay', notes: 'Ban lifted; monitor OI normalization before entry.' },
  { id: 'GF-104', symbol: 'TATACOMM', company: 'Tata Communications', status: 'in-trade', buyPrice: 1842, currentPrice: 1916.5, targetPrice: 1995, stopLoss: 1805, addedDate: '2026-08-17', owner: 'Johnson', notes: 'Trail stop below the previous day low.' },
  { id: 'GF-105', symbol: 'COFORGE', company: 'Coforge Limited', status: 'exited-profit', buyPrice: 6120, currentPrice: 6543, targetPrice: 6500, stopLoss: 5970, addedDate: '2026-08-12', owner: 'Sujay', notes: 'Target achieved. Closed complete position.' },
  { id: 'GF-106', symbol: 'ZEEL', company: 'Zee Entertainment', status: 'exited-loss', buyPrice: 138.6, currentPrice: 132.2, targetPrice: 151, stopLoss: 133, addedDate: '2026-08-10', owner: 'Johnson', notes: 'Stop-loss triggered after failed breakout.' },
]

const emptyStock = (): StockTask => ({
  id: `GF-${Date.now().toString().slice(-6)}`,
  symbol: '',
  company: '',
  status: 'under-watch',
  buyPrice: 0,
  currentPrice: 0,
  targetPrice: 0,
  stopLoss: 0,
  addedDate: new Date().toISOString().slice(0, 10),
  owner: '',
  notes: '',
})

export default function StockBoard() {
  const [stocks, setStocks] = useState<StockTask[]>(() => {
    const stored = localStorage.getItem('stock-status-board')
    return stored ? JSON.parse(stored) as StockTask[] : initialStocks
  })
  const [draft, setDraft] = useState<StockTask | null>(null)
  const [query, setQuery] = useState('')

  const updateStocks = (next: StockTask[]) => {
    setStocks(next)
    localStorage.setItem('stock-status-board', JSON.stringify(next))
  }

  const moveStock = (id: string, status: StockStatus) => updateStocks(stocks.map((stock) => stock.id === id ? { ...stock, status } : stock))
  const onDrop = (event: DragEvent, status: StockStatus) => {
    event.preventDefault()
    const id = event.dataTransfer.getData('text/stock-id')
    if (id) moveStock(id, status)
  }
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft) return
    const exists = stocks.some((stock) => stock.id === draft.id)
    updateStocks(exists ? stocks.map((stock) => stock.id === draft.id ? draft : stock) : [...stocks, draft])
    setDraft(null)
  }
  const remove = () => {
    if (!draft) return
    updateStocks(stocks.filter((stock) => stock.id !== draft.id))
    setDraft(null)
  }
  const filtered = stocks.filter((stock) => `${stock.symbol} ${stock.company} ${stock.owner}`.toLowerCase().includes(query.toLowerCase()))
  const totalValue = stocks.filter((stock) => stock.status === 'in-trade').reduce((sum, stock) => sum + stock.currentPrice, 0)
  const openPnl = stocks.filter((stock) => stock.status === 'in-trade').reduce((sum, stock) => sum + stock.currentPrice - stock.buyPrice, 0)

  return <>
    <section className="stock-board-toolbar">
      <div className="stock-board-summary"><div><span>Total stocks</span><strong>{stocks.length}</strong></div><div><span>Active trades</span><strong>{stocks.filter((stock) => stock.status === 'in-trade').length}</strong></div><div><span>Tracked value</span><strong>₹{totalValue.toLocaleString('en-IN')}</strong></div><div><span>Open P&L</span><strong className={openPnl >= 0 ? 'positive' : 'negative'}>{openPnl >= 0 ? '+' : ''}₹{openPnl.toLocaleString('en-IN')}</strong></div></div>
      <div className="stock-board-actions"><label><span>Search stocks</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Symbol, company, owner..." /></label><button onClick={() => setDraft(emptyStock())}>+ Add stock</button></div>
    </section>

    <section className="stock-kanban" aria-label="Stock workflow board">
      {stockStatuses.map((status) => {
        const statusStocks = filtered.filter((stock) => stock.status === status.id)
        return <div className={`stock-column status-${status.id}`} key={status.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, status.id)}>
          <header><span className="status-dot" /><h2>{status.label}</h2><b>{statusStocks.length}</b></header>
          <div className="stock-column-body">{statusStocks.map((stock) => <StockCard stock={stock} onEdit={() => setDraft(stock)} onMove={(next) => moveStock(stock.id, next)} key={stock.id} />)}{statusStocks.length === 0 && <div className="empty-column"><span>Drop stock here</span></div>}</div>
        </div>
      })}
    </section>

    {draft && <div className="stock-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDraft(null)}><section className="stock-modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title"><header><div><span>{draft.id}</span><h2 id="stock-modal-title">{stocks.some((stock) => stock.id === draft.id) ? 'Edit stock' : 'Add stock'}</h2></div><button onClick={() => setDraft(null)} aria-label="Close">×</button></header><form onSubmit={save}>
      <div className="stock-form-grid"><label>Stock symbol<input value={draft.symbol} onChange={(event) => setDraft({ ...draft, symbol: event.target.value.toUpperCase() })} placeholder="e.g. RELIANCE" required /></label><label>Company name<input value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} required /></label><label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as StockStatus })}>{stockStatuses.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select></label><label>Owner<input value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value })} placeholder="Analyst name" required /></label><label>Buy price (₹)<input type="number" min="0" step="0.01" value={draft.buyPrice} onChange={(event) => setDraft({ ...draft, buyPrice: Number(event.target.value) })} required /></label><label>Current / exit price (₹)<input type="number" min="0" step="0.01" value={draft.currentPrice} onChange={(event) => setDraft({ ...draft, currentPrice: Number(event.target.value) })} required /></label><label>Target price (₹)<input type="number" min="0" step="0.01" value={draft.targetPrice} onChange={(event) => setDraft({ ...draft, targetPrice: Number(event.target.value) })} /></label><label>Stop-loss (₹)<input type="number" min="0" step="0.01" value={draft.stopLoss} onChange={(event) => setDraft({ ...draft, stopLoss: Number(event.target.value) })} /></label><label>Added date<input type="date" value={draft.addedDate} onChange={(event) => setDraft({ ...draft, addedDate: event.target.value })} required /></label><label className="notes-field">Trade notes<textarea rows={4} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Setup, reason, risk, next action..." /></label></div>
      <footer>{stocks.some((stock) => stock.id === draft.id) && <button className="delete-stock" type="button" onClick={remove}>Delete stock</button>}<div><button type="button" onClick={() => setDraft(null)}>Cancel</button><button className="save-stock" type="submit">Save stock</button></div></footer>
    </form></section></div>}
  </>
}

function StockCard({ stock, onEdit, onMove }: { stock: StockTask; onEdit: () => void; onMove: (status: StockStatus) => void }) {
  const pnl = stock.currentPrice - stock.buyPrice
  const pnlPercent = stock.buyPrice ? pnl / stock.buyPrice * 100 : 0
  return <article className="stock-task" draggable onDragStart={(event) => { event.dataTransfer.setData('text/stock-id', stock.id); event.dataTransfer.effectAllowed = 'move' }} onDoubleClick={onEdit}>
    <div className="stock-task-head"><span>{stock.id}</span><button onClick={onEdit} aria-label={`Edit ${stock.symbol}`}>•••</button></div>
    <div className="stock-identity"><strong>{stock.symbol}</strong><span>{stock.company}</span></div>
    <div className="stock-prices"><div><span>Buy</span><strong>₹{stock.buyPrice.toLocaleString('en-IN')}</strong></div><div><span>Current</span><strong>₹{stock.currentPrice.toLocaleString('en-IN')}</strong></div><div><span>P&L</span><strong className={pnl >= 0 ? 'positive' : 'negative'}>{pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%</strong></div></div>
    <div className="stock-levels"><span>Target <b>₹{stock.targetPrice.toLocaleString('en-IN')}</b></span><span>SL <b>₹{stock.stopLoss.toLocaleString('en-IN')}</b></span></div>
    {stock.notes && <p>{stock.notes}</p>}
    <div className="stock-task-footer"><span title={`Added ${stock.addedDate}`}>{new Date(`${stock.addedDate}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span><b>{stock.owner}</b><select aria-label={`Move ${stock.symbol} to status`} value={stock.status} onChange={(event) => onMove(event.target.value as StockStatus)}>{stockStatuses.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select></div>
  </article>
}
