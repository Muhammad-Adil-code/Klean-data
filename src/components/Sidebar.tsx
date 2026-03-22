export type TabId = 'connectors' | 'chat'

interface Props {
  active: TabId
  onSelect: (id: TabId) => void
}

export default function Sidebar({ active, onSelect }: Props) {
  return (
    <aside style={{ width: 60, background: 'rgba(6,11,38,0.97)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 8 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#4318FF,#868cff)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>KD</span>
      </div>
      {(['connectors', 'chat'] as TabId[]).map(id => (
        <button key={id} onClick={() => onSelect(id)} style={{ background: active === id ? 'rgba(67,24,255,0.2)' : 'none', border: 'none', color: active === id ? '#868cff' : 'rgba(255,255,255,0.4)', fontSize: 20, width: 44, height: 44, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {id === 'connectors' ? '🔌' : '💬'}
        </button>
      ))}
    </aside>
  )
}
