import { useState } from 'react'

export type TabId = 'connectors' | 'chat'

interface Props {
  active: TabId
  onSelect: (id: TabId) => void
}

const NAV: { id: TabId; icon: string; label: string }[] = [
  { id: 'connectors', icon: '🔌', label: 'Connectors' },
  { id: 'chat',       icon: '💬', label: 'Chat'       },
]

export default function Sidebar({ active, onSelect }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <aside style={{
      width: open ? 220 : 60,
      minWidth: open ? 220 : 60,
      background: 'linear-gradient(111.84deg,rgba(6,11,38,0.97) 59.3%,rgba(26,31,55,0.9) 100%)',
      borderRight: '1.5px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease, min-width 0.25s ease',
      overflow: 'hidden', flexShrink: 0,
    }}>

      {/* Logo */}
      <div style={{
        padding: open ? '18px 18px' : '18px 0',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: open ? 'flex-start' : 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
      }} onClick={() => setOpen(v => !v)}>
        <KdLogo />
        {open && (
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: '#fff', whiteSpace: 'nowrap' }}>
            Klean<span className="gradient-text">Data</span>
          </span>
        )}
        {open && (
          <button
            onClick={e => { e.stopPropagation(); setOpen(false) }}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', fontSize: 12, width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >✕</button>
        )}
      </div>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{ background: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 18, padding: '8px 0', width: '100%' }}
        >›</button>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 10, padding: open ? '11px 18px' : '11px 0',
                justifyContent: open ? 'flex-start' : 'center',
                background: isActive
                  ? 'linear-gradient(90deg,rgba(67,24,255,0.22) 0%,rgba(67,24,255,0.05) 100%)'
                  : 'none',
                color: isActive ? '#868cff' : 'rgba(255,255,255,0.45)',
                borderLeft: isActive ? '3px solid #4318FF' : '3px solid transparent',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {open && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: open ? '12px 18px' : '12px 0',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', justifyContent: open ? 'flex-start' : 'center',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
          {open ? 'Klean Data v1.0' : 'KD'}
        </span>
      </div>
    </aside>
  )
}

function KdLogo() {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9,
      background: 'linear-gradient(135deg,#4318FF 0%,#868cff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, boxShadow: '0 4px 14px rgba(67,24,255,0.45)',
    }}>
      <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '-0.5px', fontFamily: 'DM Sans, sans-serif' }}>KD</span>
    </div>
  )
}
