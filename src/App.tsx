import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataLibProvider } from './context/DataLibContext'
import Sidebar, { type TabId } from './components/Sidebar'
import ConnectorsPanel from './components/ConnectorsPanel'
import Chat from './components/Chat'
import SettingsPanel from './components/SettingsPanel'
import HistoryPanel from './components/HistoryPanel'
import Login from './pages/Login'
import Signup from './pages/Signup'

function AppShell() {
  const [tab, setTab] = useState<TabId>('chat')

  return (
    <DataLibProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--sidebar-bg)' }}>
        <Sidebar active={tab} onSelect={setTab} />

        {/* White rounded card wrapping main + history */}
        <div style={{
          flex: 1, display: 'flex', overflow: 'hidden',
          margin: '12px 12px 12px 0',
          borderRadius: 18,
          border: '1.5px solid rgba(255,255,255,0.10)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.18), 0 8px 40px rgba(0,0,0,0.28)',
          background: '#fff',
        }}>
          <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderRadius: tab === 'chat' ? '18px 0 0 18px' : 18 }}>
            {tab === 'connectors' && <ConnectorsPanel />}
            {tab === 'chat'       && <Chat />}
            {tab === 'settings'   && <SettingsPanel />}
          </main>

          {tab === 'chat' && <HistoryPanel />}
        </div>
      </div>
    </DataLibProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/app"    element={<AppShell />} />
        <Route path="*"       element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
