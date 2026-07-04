import { useState } from 'react'
import { DataLibProvider } from './context/DataLibContext'
import Sidebar, { type TabId } from './components/Sidebar'
import ConnectorsPanel from './components/ConnectorsPanel'
import Chat from './components/Chat'
import SettingsPanel from './components/SettingsPanel'

export default function App() {
  const [tab, setTab] = useState<TabId>('connectors')

  return (
    <DataLibProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <Sidebar active={tab} onSelect={setTab} />

        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: tab === 'chat'
            ? '#080a12'
            : 'radial-gradient(ellipse at top left,rgba(67,24,255,0.07) 0%,transparent 55%), var(--bg-primary)',
          transition: 'background 0.3s',
        }}>
          {tab === 'connectors' && <ConnectorsPanel />}
          {tab === 'chat'       && <Chat />}
          {tab === 'settings'   && <SettingsPanel />}
        </main>
      </div>
    </DataLibProvider>
  )
}
