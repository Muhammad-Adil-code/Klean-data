import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KdLogo from './KdLogo'
import ProModal from './ProModal'
import { getUser, logout } from '../auth'

export type TabId = 'connectors' | 'chat' | 'settings'

interface NavItem {
  id: TabId | 'templates' | 'projects' | 'statistics'
  icon: React.ReactNode
  label: string
  pro?: boolean
  tab?: TabId
}

interface Props {
  active: TabId
  onSelect: (id: TabId) => void
}

const NAV: NavItem[] = [
  {
    id: 'chat',
    label: 'AI Chat',
    tab: 'chat',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'connectors',
    label: 'Connectors',
    tab: 'connectors',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'AI Config',
    tab: 'settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    id: 'templates',
    label: 'Templates',
    pro: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'projects',
    label: 'My Projects',
    pro: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7a2 2 0 0 1 2-2h4l2 3h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    id: 'statistics',
    label: 'Statistics',
    pro: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
]

export default function Sidebar({ active, onSelect }: Props) {
  const [showProModal, setShowProModal] = useState(false)
  const navigate = useNavigate()
  const user = getUser()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  function handleClick(item: NavItem) {
    if (item.pro) { setShowProModal(true); return }
    if (item.tab) onSelect(item.tab)
  }

  return (
    <>
      <aside style={{
        width: 250, minWidth: 250, flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--sidebar-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <KdLogo size={42} dark />
            <span style={{ fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.5px' }}>
              Klean<span style={{ color: 'var(--orange)' }}>Data</span>
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
          {NAV.map(item => {
            const isActive = item.tab === active && !item.pro
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 14px', borderRadius: 11, marginBottom: 4,
                  background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                  color: isActive ? 'var(--nav-active-text)' : 'var(--nav-text)',
                  borderLeft: isActive ? `3px solid var(--nav-active-border)` : '3px solid transparent',
                  fontSize: 14, fontWeight: isActive ? 600 : 400,
                  textAlign: 'left', border: 'none',
                  cursor: 'pointer', transition: 'all 0.13s',
                  paddingLeft: isActive ? 11 : 14,
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--nav-hover-bg)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.pro && <span className="pro-badge">PRO</span>}
              </button>
            )
          })}
        </nav>

        {/* Profile section */}
        {user && (
          <div style={{ padding: '10px 12px 0', flexShrink: 0, borderTop: '1px solid var(--sidebar-border)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 10px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '0.5px',
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                style={{
                  flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.4)', padding: 4, borderRadius: 6,
                  display: 'flex', alignItems: 'center', transition: 'color 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F97316')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Pro Plan Card */}
        <div style={{ padding: '10px 12px 18px', flexShrink: 0 }}>
          <div
            onClick={() => setShowProModal(true)}
            style={{
              borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              boxShadow: '0 4px 18px rgba(249,115,22,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 22px rgba(249,115,22,0.45)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 18px rgba(249,115,22,0.35)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Upgrade to Pro</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, lineHeight: 1.5 }}>
              Unlock templates, projects, advanced statistics and more.
            </div>
            <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
              Get Pro Plan →
            </div>
          </div>
        </div>
      </aside>

      {showProModal && <ProModal onClose={() => setShowProModal(false)} />}
    </>
  )
}
