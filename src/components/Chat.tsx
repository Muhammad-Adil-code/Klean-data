import { useDataLib } from '../context/DataLibContext'

export default function Chat() {
  const { connectors } = useDataLib()
  return (
    <div style={{ padding: 32, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>AI Chat</h2>
      {connectors.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Add a data source first to start chatting.</p>
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>Select a connector and ask a question.</p>
      )}
    </div>
  )
}
