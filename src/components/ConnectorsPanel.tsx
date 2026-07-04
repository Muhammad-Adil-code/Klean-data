import { useState, useEffect, useRef } from 'react'
import { useDataLib, type Connector } from '../context/DataLibContext'

const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', placeholder: 'postgresql://user:pass@host:5432/dbname' },
  { value: 'mysql',      label: 'MySQL',      placeholder: 'mysql://user:pass@host:3306/dbname'     },
  { value: 'sqlite',     label: 'SQLite',     placeholder: '/absolute/path/to/database.db'          },
  { value: 'mongodb',    label: 'MongoDB',    placeholder: 'mongodb+srv://user:pass@cluster/dbname'  },
]

export default function ConnectorsPanel() {
  const { connectors, fetchConnectors, addConnector, uploadFile, removeConnector, testConnector, setActiveConnector, activeConnectorId } = useDataLib()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]     = useState({ name: '', type: 'postgresql', conn_str: '' })
  const [err,  setErr]      = useState('')
  const [busy, setBusy]     = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchConnectors() }, [fetchConnectors])

  async function handleAdd() {
    setErr('')
    if (!form.conn_str.trim()) { setErr('Connection string is required'); return }
    setBusy(true)
    try {
      await addConnector(form.name || form.type, form.type, form.conn_str)
      setForm({ name: '', type: 'postgresql', conn_str: '' })
      setShowAdd(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add connector')
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      await uploadFile(file.name, file)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const placeholder = DB_TYPES.find(t => t.value === form.type)?.placeholder ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Page header */}
      <div style={{ padding: '28px 32px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Data Sources</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              Connect databases or upload files to start chatting with your data
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              ↑ Upload File
            </button>
            <button className="btn primary" onClick={() => setShowAdd(v => !v)}>
              {showAdd ? 'Cancel' : '+ Add Database'}
            </button>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
      </div>

      {/* Add connector form */}
      {showAdd && (
        <div style={{ padding: '0 32px 24px', flexShrink: 0 }}>
          <div className="card animate-fadein" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>New Database Connection</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', fontWeight: 500 }}>
                  Database Type
                </label>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  {DB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', fontWeight: 500 }}>
                  Display Name (optional)
                </label>
                <input
                  placeholder={`My ${DB_TYPES.find(t => t.value === form.type)?.label ?? 'DB'}`}
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block', fontWeight: 500 }}>
                Connection String
              </label>
              <input
                placeholder={placeholder}
                value={form.conn_str}
                onChange={e => setForm(p => ({ ...p, conn_str: e.target.value }))}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
            </div>

            {err && (
              <div style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-dim)', padding: '8px 12px', borderRadius: 8 }}>
                {err}
              </div>
            )}

            <button className="btn primary" onClick={handleAdd} disabled={busy} style={{ alignSelf: 'flex-start', padding: '9px 22px' }}>
              {busy ? 'Connecting…' : 'Add & Test Connection'}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {connectors.length === 0 && !showAdd && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', gap: 12, padding: 40 }}>
          <div style={{ fontSize: 48, opacity: 0.4 }}>🗄️</div>
          <div style={{ fontSize: 15, color: 'var(--text-secondary)', fontWeight: 500 }}>No data sources yet</div>
          <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
            Add a database connection or upload a CSV/Excel file to get started
          </div>
          <button className="btn primary" onClick={() => setShowAdd(true)} style={{ marginTop: 8 }}>
            + Add your first database
          </button>
        </div>
      )}

      {/* Connector grid */}
      <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {connectors.map(c => (
          <ConnectorCard
            key={c.id}
            connector={c}
            active={c.id === activeConnectorId}
            onSelect={() => setActiveConnector(c.id)}
            onTest={() => testConnector(c.id)}
            onRemove={() => removeConnector(c.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ConnectorCard({ connector: c, active, onSelect, onTest, onRemove }: {
  connector: Connector; active: boolean; onSelect: () => void; onTest: () => void; onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const statusColor = c.status === 'connected' ? '#16A34A' : c.status === 'error' ? '#DC2626' : c.status === 'connecting' ? '#D97706' : '#9CA3AF'
  const statusLabel = c.status === 'connected' ? 'Connected' : c.status === 'error' ? 'Error' : c.status === 'connecting' ? 'Testing…' : 'Untested'
  const totalRows   = c.schema?.tables.reduce((s, t) => s + (t.rows ?? 0), 0) ?? 0
  const tableCount  = c.schema?.tables.length ?? 0
  const unitLabel   = c.type === 'mongodb' ? 'collections' : 'tables'

  return (
    <div className="animate-fadein" style={{
      background: '#fff',
      border: `1.5px solid ${active ? 'var(--orange)' : 'var(--border-light)'}`,
      borderRadius: 16,
      boxShadow: active ? '0 0 0 3px rgba(249,115,22,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.15s',
      display: 'flex', flexDirection: 'column',
    }}
      onClick={onSelect}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Card top */}
      <div style={{ padding: '20px 18px 14px' }}>
        {/* Icon + remove */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, fontSize: 24,
            background: active ? 'rgba(249,115,22,0.1)' : '#F9FAFB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${active ? 'rgba(249,115,22,0.2)' : 'var(--border-light)'}`,
          }}>
            {dbIcon(c.type)}
          </div>
          <button
            className="btn danger"
            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 8 }}
            onClick={e => { e.stopPropagation(); onRemove() }}
          >✕</button>
        </div>

        {/* Name */}
        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {c.name}
        </div>

        {/* Type + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, background: '#F3F4F6', color: '#374151', padding: '2px 8px', borderRadius: 99 }}>
            {c.type.toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: statusColor, display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Stats row */}
      {c.schema && (
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-light)', background: '#FAFAFA', display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{tableCount}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'capitalize' }}>{unitLabel}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{totalRows.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF' }}>rows</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 8 }}>
        <button
          className="btn"
          style={{ flex: 1, fontSize: 12, justifyContent: 'center', borderRadius: 9 }}
          onClick={e => { e.stopPropagation(); onTest() }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Test
        </button>
        {c.schema && (
          <button
            className="btn"
            style={{ fontSize: 12, padding: '7px 10px', borderRadius: 9 }}
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Schema expand */}
      {expanded && c.schema && (
        <div style={{ borderTop: '1px solid var(--border-light)', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8, background: '#FAFAFA' }}>
          {c.schema.tables.map(t => (
            <div key={t.name} style={{ fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--orange)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{t.name}</span>
                {t.rows != null && <span className="badge badge-blue">{t.rows.toLocaleString()}</span>}
              </div>
              <div style={{ color: '#9CA3AF', marginTop: 3, paddingLeft: 12, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {t.columns.slice(0, 8).map(col => col.name).join(' · ')}
                {t.columns.length > 8 && <span style={{ color: 'var(--orange)' }}> +{t.columns.length - 8} more</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function dbIcon(type: string) {
  if (type === 'mongodb') return '🍃'
  if (type === 'csv')     return '📄'
  if (type === 'excel')   return '📊'
  if (type === 'mysql')   return '🐬'
  if (type === 'sqlite')  return '📦'
  return '🐘'
}
