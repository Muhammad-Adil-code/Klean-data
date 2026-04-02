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

      {/* Connector cards */}
      <div style={{ padding: '0 32px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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

  const statusColor = c.status === 'connected' ? 'var(--green)' : c.status === 'error' ? 'var(--red)' : c.status === 'connecting' ? 'var(--yellow)' : 'var(--text-dim)'
  const statusLabel = c.status === 'connected' ? 'Connected' : c.status === 'error' ? 'Error' : c.status === 'connecting' ? 'Testing…' : 'Untested'
  const totalRows   = c.schema?.tables.reduce((s, t) => s + (t.rows ?? 0), 0) ?? 0

  return (
    <div className="card animate-fadein" style={{
      padding: 0, overflow: 'hidden',
      borderColor: active ? 'rgba(134,140,255,0.4)' : 'var(--border)',
      background: active ? 'linear-gradient(127.09deg,rgba(67,24,255,0.1) 0%,rgba(10,14,35,0.5) 100%)' : undefined,
    }}>
      <div
        style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
        onClick={onSelect}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {dbIcon(c.type)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: statusColor }}>● {statusLabel}</span>
            <span style={{ color: 'var(--text-dim)' }}>
              {c.type.toUpperCase()}
            </span>
            {c.schema && (
              <span style={{ color: 'var(--text-dim)' }}>
                {c.schema.tables.length} {c.type === 'mongodb' ? 'collections' : 'tables'} · {totalRows.toLocaleString()} rows
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={e => { e.stopPropagation(); onTest() }}>
            Test
          </button>
          {c.schema && (
            <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}>
              {expanded ? '▲' : '▼'}
            </button>
          )}
          <button className="btn danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={e => { e.stopPropagation(); onRemove() }}>
            ✕
          </button>
        </div>
      </div>

      {expanded && c.schema && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.schema.tables.map(t => (
            <div key={t.name} style={{ fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--accent-2)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{t.name}</span>
                {t.rows != null && <span className="badge badge-blue">{t.rows.toLocaleString()}</span>}
              </div>
              <div style={{ color: 'var(--text-dim)', marginTop: 3, paddingLeft: 12, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {t.columns.slice(0, 8).map(c => c.name).join(' · ')}
                {t.columns.length > 8 && <span style={{ color: 'var(--accent-dim)' }}> +{t.columns.length - 8} more</span>}
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
