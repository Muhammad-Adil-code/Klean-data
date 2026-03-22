import { useState } from 'react'

type Tab = 'connectors' | 'chat'

export default function App() {
  const [tab, setTab] = useState<Tab>('connectors')
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0b1437', color: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <h1>Klean Data — coming soon</h1>
    </div>
  )
}
