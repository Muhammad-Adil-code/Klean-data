import { useState } from 'react'

interface HistoryItem {
  id: string
  category: string
  query: string
  checked: boolean
}

const SAMPLE: HistoryItem[] = [
  { id: '1', category: 'Create welcome form',  query: 'Write code (HTML, CSS and JS) for a simple…', checked: false },
  { id: '2', category: 'Instructions',         query: 'How to set up a Wi-Fi wireless network?',     checked: false },
  { id: '3', category: 'Career',               query: 'How to organise your working day effectively?', checked: false },
  { id: '4', category: 'Career',               query: 'Tips to improve productivity at work',        checked: false },
  { id: '5', category: 'Data Analysis',        query: 'Show me the top 10 rows from orders table',   checked: false },
  { id: '6', category: 'Data Analysis',        query: 'Count records grouped by month',              checked: false },
  { id: '7', category: 'Schema',               query: 'List all tables and column types',            checked: false },
]

export default function HistoryPanel() {
  const [items, setItems]   = useState<HistoryItem[]>(SAMPLE)
  const [search, setSearch] = useState('')

  function toggle(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }

  function clearChecked() {
    const hasChecked = items.some(i => i.checked)
    if (hasChecked) setItems(prev => prev.filter(i => !i.checked))
    else setItems([])
  }

  const filtered   = items.filter(i =>
    i.category.toLowerCase().includes(search.toLowerCase()) ||
    i.query.toLowerCase().includes(search.toLowerCase())
  )
  const checkedCount = items.filter(i => i.checked).length

  return (
    <aside style={{
      width: 280, minWidth: 280, flexShrink: 0,
      background: '#F0F0F0',
      borderLeft: '1px solid #E0E0E0',
      borderRadius: '0 16px 16px 0',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Search */}
      <div style={{ padding: '14px 14px 10px', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search history…"
            style={{
              width: '100%', padding: '8px 10px 8px 32px',
              border: '1px solid #E0E0E0', borderRadius: 10,
              fontSize: 12, background: '#fff', color: '#111827',
              outline: 'none', boxShadow: 'none',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, padding: '32px 16px' }}>
            {search ? 'No results' : 'No history yet'}
          </div>
        ) : (
          filtered.map((item, idx) => (
            <label
              key={item.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '11px 12px', borderRadius: 12, cursor: 'pointer',
                background: idx === 0 && !search ? '#fff' : 'transparent',
                marginBottom: 2, transition: 'background 0.12s',
                boxShadow: idx === 0 && !search ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
              }}
              onMouseEnter={e => {
                if (!(idx === 0 && !search)) (e.currentTarget as HTMLLabelElement).style.background = '#fff'
              }}
              onMouseLeave={e => {
                if (!(idx === 0 && !search)) (e.currentTarget as HTMLLabelElement).style.background = 'transparent'
              }}
            >
              {/* Checkbox */}
              <div
                onClick={e => { e.preventDefault(); toggle(item.id) }}
                style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                  border: item.checked ? '2px solid #F97316' : '2px solid #D1D5DB',
                  background: item.checked ? '#F97316' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.13s',
                }}
              >
                {item.checked && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.35, marginBottom: 3 }}>
                  {item.category}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                  {item.query}
                </div>
              </div>
            </label>
          ))
        )}
      </div>

      {/* Clear button */}
      <div style={{ padding: '10px 14px 14px', flexShrink: 0 }}>
        <button
          onClick={clearChecked}
          style={{
            width: '100%', padding: '10px', borderRadius: 12,
            border: '1px solid #E0E0E0', background: '#fff',
            color: '#6B7280', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 7, transition: 'all 0.13s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2'; (e.currentTarget as HTMLButtonElement).style.color = '#EF4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#FECACA' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E0E0E0' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          {checkedCount > 0 ? `Delete ${checkedCount} selected` : 'Clear history'}
        </button>
      </div>
    </aside>
  )
}
