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
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#fff' }}>
        <Sidebar active={tab} onSelect={setTab} />

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
          {tab === 'connectors' && <ConnectorsPanel />}
          {tab === 'chat'       && <Chat />}
          {tab === 'settings'   && <SettingsPanel />}
        </main>

        {tab === 'chat' && <HistoryPanel />}
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
