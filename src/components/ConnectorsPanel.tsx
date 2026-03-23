import { useEffect } from 'react'
import { useDataLib } from '../context/DataLibContext'

export default function ConnectorsPanel() {
  const { connectors, fetchConnectors } = useDataLib()
  useEffect(() => { fetchConnectors() }, [fetchConnectors])
  return (
    <div style={{ padding: 32, color: 'var(--text-primary)' }}>
      <h2>Data Sources</h2>
      <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
        {connectors.length === 0 ? 'No connectors yet.' : `${connectors.length} connector(s)`}
      </p>
    </div>
  )
}
