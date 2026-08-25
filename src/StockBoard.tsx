import { DragEvent, FormEvent, useEffect, useState } from 'react'
import { api, getApiErrorMessage, type BoardPosition, type BoardPositionInput, type BoardStatus, type StockSearchResult, type User } from './api/client'

const stockStatuses: Array<{ id: BoardStatus; label: string }> = [
  { id: 'under_watch', label: 'Under watch' },
  { id: 'in_ban', label: 'In ban' },
  { id: 'ban_lifted', label: 'Ban lifted' },
  { id: 'in_trade', label: 'In trade' },
  { id: 'exited_profit', label: 'Exited with profit' },
  { id: 'exited_loss', label: 'Exited with loss' },
]

const emptyPosition = (): BoardPosition => ({
  id: 0, reference: 'New position', stock_id: 0, symbol: '', company_name: '', exchange: '', owner_user_id: getStoredUser()?.id ?? null,
  owner_name: getStoredUser()?.name ?? null, status: 'under_watch', buy_price: null, current_price: null, pnl_percent: null,
  quantity: null, target_price: null, stop_loss: null, notes: null, opened_at: null, closed_at: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
})

export default function StockBoard() {
  const [stocks, setStocks] = useState<BoardPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<BoardPosition | null>(null)
  const [originalStatus, setOriginalStatus] = useState<BoardStatus | null>(null)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogResults, setCatalogResults] = useState<StockSearchResult[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const user = getStoredUser()

  useEffect(() => { void api.board().then(setStocks).catch((reason) => setError(getApiErrorMessage(reason, 'Unable to load the stock board.'))).finally(() => setLoading(false)) }, [])

  const openCreate = () => { setDraft(emptyPosition()); setOriginalStatus(null); setCatalogQuery(''); setCatalogResults([]); setError('') }
  const openEdit = (stock: BoardPosition) => { setDraft(stock); setOriginalStatus(stock.status); setCatalogResults([]); setError('') }
  const moveStock = async (id: number, status: BoardStatus) => {
    const previous = stocks
    setStocks((current) => current.map((stock) => stock.id === id ? { ...stock, status } : stock))
    try {
      const updated = await api.moveBoardPosition(id, status, user?.id)
      setStocks((current) => current.map((stock) => stock.id === id ? updated : stock))
    } catch (reason) { setStocks(previous); setError(getApiErrorMessage(reason, 'Unable to move this stock.')) }
  }
  const onDrop = (event: DragEvent, status: BoardStatus) => {
    event.preventDefault()
    const id = Number(event.dataTransfer.getData('text/stock-id'))
    if (id) void moveStock(id, status)
  }
  const searchCatalog = async () => {
    if (!catalogQuery.trim()) return
    setCatalogLoading(true); setError('')
    try { setCatalogResults(await api.searchCatalog(catalogQuery)) } catch (reason) { setError(getApiErrorMessage(reason, 'Unable to search the stock catalog.')) } finally { setCatalogLoading(false) }
  }
  const selectCatalogStock = (stock: StockSearchResult) => {
    if (!draft) return
    setDraft({ ...draft, stock_id: stock.id, symbol: stock.symbol, company_name: stock.company_name, exchange: stock.exchange, current_price: stock.current_price })
    setCatalogResults([])
  }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft || (!draft.id && !draft.stock_id)) { setError('Select a stock from the catalog before saving.'); return }
    setSaving(true); setError('')
    const input: BoardPositionInput = {
      owner_user_id: user?.id ?? draft.owner_user_id,
      buy_price: nullableDecimal(draft.buy_price), quantity: nullableDecimal(draft.quantity),
      target_price: nullableDecimal(draft.target_price), stop_loss: nullableDecimal(draft.stop_loss), notes: draft.notes?.trim() || null,
    }
    try {
      if (draft.id) {
        let updated = await api.updateBoardPosition(draft.id, input)
        if (originalStatus && draft.status !== originalStatus) updated = await api.moveBoardPosition(draft.id, draft.status, user?.id)
        setStocks((current) => current.map((stock) => stock.id === draft.id ? updated : stock))
      } else {
        const created = await api.createBoardPosition(draft.stock_id, draft.status, input)
        setStocks((current) => [created, ...current])
      }
      setDraft(null)
    } catch (reason) { setError(getApiErrorMessage(reason, 'Unable to save this stock.')) } finally { setSaving(false) }
  }
  const remove = async () => {
    if (!draft?.id) return
    setSaving(true); setError('')
    try { await api.deleteBoardPosition(draft.id); setStocks((current) => current.filter((stock) => stock.id !== draft.id)); setDraft(null) } catch (reason) { setError(getApiErrorMessage(reason, 'Unable to delete this stock.')); setSaving(false) }
  }

  const filtered = stocks.filter((stock) => `${stock.reference} ${stock.symbol} ${stock.company_name} ${stock.owner_name ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  const activeTrades = stocks.filter((stock) => stock.status === 'in_trade')
  const trackedValue = activeTrades.reduce((sum, stock) => sum + Number(stock.current_price ?? 0) * Number(stock.quantity ?? 1), 0)
  const openPnl = activeTrades.reduce((sum, stock) => sum + (Number(stock.current_price ?? 0) - Number(stock.buy_price ?? 0)) * Number(stock.quantity ?? 1), 0)

  if (loading) return <div className="stocks-loading"><span /><p>Loading stock board...</p></div>
  return <>
    {error && !draft && <p className="portal-error" role="alert">{error}</p>}
    <section className="stock-board-toolbar">
      <div className="stock-board-summary"><div><span>Total stocks</span><strong>{stocks.length}</strong></div><div><span>Active trades</span><strong>{activeTrades.length}</strong></div><div><span>Tracked value</span><strong>₹{trackedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div><div><span>Open P&L</span><strong className={openPnl >= 0 ? 'positive' : 'negative'}>{openPnl >= 0 ? '+' : ''}₹{openPnl.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div></div>
      <div className="stock-board-actions"><label><span>Search board</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Reference, symbol, company..." /></label><button onClick={openCreate}>+ Add stock</button></div>
    </section>

    <section className="stock-kanban" aria-label="Stock workflow board">
      {stockStatuses.map((status) => {
        const statusStocks = filtered.filter((stock) => stock.status === status.id)
        return <div className={`stock-column status-${status.id.replaceAll('_', '-')}`} key={status.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, status.id)}><header><span className="status-dot" /><h2>{status.label}</h2><b>{statusStocks.length}</b></header><div className="stock-column-body">{statusStocks.map((stock) => <StockCard stock={stock} onEdit={() => openEdit(stock)} onMove={(next) => void moveStock(stock.id, next)} key={stock.id} />)}{statusStocks.length === 0 && <div className="empty-column"><span>Drop stock here</span></div>}</div></div>
      })}
    </section>

    {draft && <div className="stock-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDraft(null)}><section className="stock-modal" role="dialog" aria-modal="true" aria-labelledby="stock-modal-title"><header><div><span>{draft.reference}</span><h2 id="stock-modal-title">{draft.id ? 'Edit stock' : 'Add stock from catalog'}</h2></div><button onClick={() => setDraft(null)} aria-label="Close">×</button></header><form onSubmit={save}>
      {!draft.id && <div className="catalog-picker"><label>Find a stock in the catalog</label><div><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchCatalog() } }} placeholder="Symbol, company name, or ISIN" maxLength={100} /><button type="button" onClick={() => void searchCatalog()}>{catalogLoading ? 'Searching...' : 'Search catalog'}</button></div>{catalogResults.length > 0 && <div className="catalog-results">{catalogResults.map((stock) => <button type="button" onClick={() => selectCatalogStock(stock)} key={stock.id}><strong>{stock.symbol}</strong><span>{stock.company_name} · {stock.exchange}</span><em>₹{formatMoney(stock.current_price)}</em></button>)}</div>}</div>}
      {error && <p className="portal-error" role="alert">{error}</p>}
      <div className="selected-stock-summary"><strong>{draft.symbol || 'No stock selected'}</strong><span>{draft.company_name || 'Search and select a catalog result'}</span><em>{draft.exchange}</em></div>
      <div className="stock-form-grid"><label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as BoardStatus })}>{stockStatuses.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select></label><label>Assigned owner<input value={user?.name ?? draft.owner_name ?? 'Unassigned'} readOnly /></label><label>Buy price (₹)<input type="number" min="0.01" step="0.01" value={draft.buy_price ?? ''} onChange={(event) => setDraft({ ...draft, buy_price: event.target.value || null })} /></label><label>Current price (₹)<input value={draft.current_price ?? ''} readOnly /></label><label>Quantity<input type="number" min="0.01" step="0.01" value={draft.quantity ?? ''} onChange={(event) => setDraft({ ...draft, quantity: event.target.value || null })} /></label><label>Target price (₹)<input type="number" min="0.01" step="0.01" value={draft.target_price ?? ''} onChange={(event) => setDraft({ ...draft, target_price: event.target.value || null })} /></label><label>Stop-loss (₹)<input type="number" min="0.01" step="0.01" value={draft.stop_loss ?? ''} onChange={(event) => setDraft({ ...draft, stop_loss: event.target.value || null })} /></label><label>Added date<input value={new Date(draft.created_at).toLocaleString('en-IN')} readOnly /></label><label className="notes-field">Trade notes<textarea rows={4} value={draft.notes ?? ''} maxLength={5000} onChange={(event) => setDraft({ ...draft, notes: event.target.value || null })} placeholder="Setup, reason, risk, next action..." /></label></div>
      <footer>{draft.id > 0 && <button className="delete-stock" type="button" onClick={() => void remove()} disabled={saving}>Delete stock</button>}<div><button type="button" onClick={() => setDraft(null)}>Cancel</button><button className="save-stock" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save stock'}</button></div></footer>
    </form></section></div>}
  </>
}

function StockCard({ stock, onEdit, onMove }: { stock: BoardPosition; onEdit: () => void; onMove: (status: BoardStatus) => void }) {
  const pnlPercent = Number(stock.pnl_percent ?? 0)
  return <article className="stock-task" draggable onDragStart={(event) => { event.dataTransfer.setData('text/stock-id', String(stock.id)); event.dataTransfer.effectAllowed = 'move' }} onDoubleClick={onEdit}>
    <div className="stock-task-head"><span>{stock.reference}</span><button onClick={onEdit} aria-label={`Edit ${stock.symbol}`}>•••</button></div>
    <div className="stock-identity"><strong>{stock.symbol}</strong><span>{stock.company_name} · {stock.exchange}</span></div>
    <div className="stock-prices"><div><span>Buy</span><strong>₹{formatMoney(stock.buy_price)}</strong></div><div><span>Current</span><strong>₹{formatMoney(stock.current_price)}</strong></div><div><span>P&L</span><strong className={pnlPercent >= 0 ? 'positive' : 'negative'}>{pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%</strong></div></div>
    <div className="stock-levels"><span>Target <b>₹{formatMoney(stock.target_price)}</b></span><span>SL <b>₹{formatMoney(stock.stop_loss)}</b></span><span>Qty <b>{stock.quantity ?? '—'}</b></span></div>
    {stock.notes && <p>{stock.notes}</p>}
    <div className="stock-task-footer"><span title={`Added ${stock.created_at}`}>{new Date(stock.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span><b>{stock.owner_name ?? 'Unassigned'}</b><select aria-label={`Move ${stock.symbol} to status`} value={stock.status} onChange={(event) => onMove(event.target.value as BoardStatus)}>{stockStatuses.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select></div>
  </article>
}

function nullableDecimal(value: string | null) { return value?.trim() ? value : null }
function formatMoney(value: string | null) { return value === null ? '—' : Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 }) }
function getStoredUser(): User | null { try { return JSON.parse(localStorage.getItem('api-user') ?? 'null') as User | null } catch { return null } }
