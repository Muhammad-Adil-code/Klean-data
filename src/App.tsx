import { useState } from 'react'
import { DataLibProvider } from './context/DataLibContext'
import Sidebar, { type TabId } from './components/Sidebar'
import ConnectorsPanel from './components/ConnectorsPanel'
import Chat from './components/Chat'

export default function App() {
  const [tab, setTab] = useState<TabId>('connectors')

  return (
    <DataLibProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <Sidebar active={tab} onSelect={setTab} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {tab === 'connectors' && <ConnectorsPanel />}
          {tab === 'chat'       && <Chat />}
        </main>
      </div>
    </DataLibProvider>
  )
}
