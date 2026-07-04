import { useState } from 'react'

interface HistoryItem {
  id: string
  title: string
  time: string
  checked: boolean
}

const SAMPLE: HistoryItem[] = [
  { id: '1', title: 'Show top 10 customers by revenue', time: '2m ago',   checked: false },
  { id: '2', title: 'Find null values in orders table',  time: '15m ago',  checked: false },
  { id: '3', title: 'Count rows per month',               time: '1h ago',   checked: false },
  { id: '4', title: 'Average order value by region',      time: '3h ago',   checked: false },
  { id: '5', title: 'Schema overview for user database',  time: 'Yesterday', checked: false },
  { id: '6', title: 'List all tables and row counts',     time: 'Yesterday', checked: false },
  { id: '7', title: 'Duplicate email check',              time: '2d ago',   checked: false },
]

export default function HistoryPanel() {
  const [items, setItems]   = useState<HistoryItem[]>(SAMPLE)
  const [search, setSearch] = useState('')

  function toggle(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  function clearHistory() {
    setItems([])
  }

  const filtered = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
  const checked  = items.filter(i => i.checked).length

  return (
    <aside style={{
      width: 280, minWidth: 280, flexShrink: 0,
      background: '#F9FAFB',
      borderLeft: '1px solid #E5E7EB',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 16px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>History</span>
          {checked > 0 && (
            <button
              onClick={() => setItems(prev => prev.filter(i => !i.checked))}
              style={{ fontSize: 11, color: '#EF4444', background: 'rgba(239,68,68,0.08)', padding: '3px 10px', borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Delete {checked}
            </button>
          )}
        </div>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search history…"
            style={{ width: '100%', padding: '8px 10px 8px 30px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, background: '#fff', color: '#111827', outline: 'none' }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '32px 16px' }}>
            {search ? 'No results found' : 'No history yet'}
          </div>
        ) : (
          filtered.map(item => (
            <label key={item.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 8px',
              borderRadius: 8, cursor: 'pointer',
              background: item.checked ? 'rgba(249,115,22,0.06)' : 'transparent',
              marginBottom: 2, transition: 'background 0.12s',
            }}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggle(item.id)}
                style={{ marginTop: 2, accentColor: '#F97316', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{item.time}</div>
              </div>
            </label>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #E5E7EB', flexShrink: 0 }}>
        <button
          onClick={clearHistory}
          style={{ width: '100%', padding: '8px', border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', color: '#6B7280', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#FEF2F2'; (e.target as HTMLButtonElement).style.color = '#EF4444'; (e.target as HTMLButtonElement).style.borderColor = '#FCA5A5' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = '#fff'; (e.target as HTMLButtonElement).style.color = '#6B7280'; (e.target as HTMLButtonElement).style.borderColor = '#E5E7EB' }}
        >
          Clear all history
        </button>
      </div>
    </aside>
  )
}
