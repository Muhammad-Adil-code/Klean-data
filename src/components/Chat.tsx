import { useState, useRef, useEffect } from 'react'
import { useDataLib, type ChatMessage, type PlanData, type StepResult } from '../context/DataLibContext'

export default function Chat() {
  const { messages, loading, sendMessage, approveAndExecute, connectors, activeConnectorId, setActiveConnector, clearMessages } = useDataLib()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeConn = connectors.find(c => c.id === activeConnectorId)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading || !activeConnectorId) return
    setInput('')
    sendMessage(text)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Top bar */}
      <div style={{
        padding: '14px 28px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
        background: 'rgba(6,11,38,0.6)', backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>AI Chat</span>

        {connectors.length === 0 ? (
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>← Connect a data source first</span>
        ) : (
          <select
            value={activeConnectorId ?? ''}
            onChange={e => setActiveConnector(e.target.value || null)}
            style={{ padding: '6px 12px', width: 'auto', fontSize: 12 }}
          >
            <option value="">Select data source…</option>
            {connectors.map(c => (
              <option key={c.id} value={c.id}>
                {dbIcon(c.type)} {c.name}{c.status === 'connected' ? ' ✓' : ''}
              </option>
            ))}
          </select>
        )}

        {activeConn?.schema && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--bg-hover)', padding: '3px 8px', borderRadius: 6 }}>
            {activeConn.schema.tables.length} {activeConn.type === 'mongodb' ? 'collections' : 'tables'}
          </span>
        )}

        {messages.length > 0 && (
          <button className="btn" style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12 }} onClick={clearMessages}>
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {messages.length === 0 && activeConnectorId && <EmptyState connName={activeConn?.name ?? ''} onSend={sendMessage} />}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} onApprove={approveAndExecute} />)}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'rgba(6,11,38,0.5)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={activeConnectorId ? 'Ask anything about your data…' : 'Select a data source above'}
            disabled={!activeConnectorId || loading}
            rows={1}
            style={{
              flex: 1, padding: '11px 16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1.5px solid var(--border)',
              borderRadius: 14,
              color: 'var(--text-primary)', fontSize: 14,
              resize: 'none', lineHeight: 1.5,
              minHeight: 44, maxHeight: 140,
              transition: 'border-color 0.2s',
            }}
          />
          <button
            type="submit"
            className="btn primary"
            disabled={!input.trim() || !activeConnectorId || loading}
            style={{ padding: '10px 20px', borderRadius: 12, alignSelf: 'flex-end' }}
          >
            ↑
          </button>
        </form>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          Enter to send · Shift+Enter for new line · AI plans first, you approve before anything runs
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg, onApprove }: { msg: ChatMessage; onApprove: (id: string, ids: number[]) => void }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '72%', background: 'var(--gradient)',
          color: '#fff', borderRadius: '14px 14px 3px 14px',
          padding: '10px 16px', fontSize: 14, lineHeight: 1.6,
          boxShadow: '0 4px 16px rgba(67,24,255,0.3)',
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  if (msg.role === 'plan' && msg.plan) {
    return <PlanCard msgId={msg.id} plan={msg.plan} onApprove={onApprove} />
  }

  if (msg.role === 'result' && msg.results) {
    return <ResultCard results={msg.results} />
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <AiAvatar />
      <div style={{
        background: 'var(--bg-glass)', border: '1.5px solid var(--border)',
        borderRadius: '3px 14px 14px 14px', padding: '12px 16px',
        fontSize: 14, lineHeight: 1.7, maxWidth: '82%',
        whiteSpace: 'pre-wrap', backdropFilter: 'blur(12px)',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

function PlanCard({ msgId, plan, onApprove }: { msgId: string; plan: PlanData; onApprove: (id: string, ids: number[]) => void }) {
  const [approved, setApproved] = useState<Set<number>>(new Set(plan.steps.map(s => s.id)))
  const [executed, setExecuted] = useState(false)

  function toggle(id: number) {
    setApproved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <AiAvatar />
      <div style={{
        background: 'var(--bg-glass)',
        border: '1.5px solid rgba(134,140,255,0.3)',
        borderRadius: '3px 14px 14px 14px',
        padding: '16px 20px', flex: 1, maxWidth: '90%',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          📋 Action Plan
        </div>
        <div style={{ fontSize: 13, marginBottom: 4, color: 'var(--text-primary)' }}>
          <strong>Analysis:</strong> {plan.diagnosis}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          {plan.understanding}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {plan.steps.map(step => (
            <label key={step.id} style={{
              display: 'flex', gap: 12, cursor: executed ? 'default' : 'pointer',
              opacity: executed ? 0.6 : 1,
              background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px',
              border: '1px solid var(--border)',
            }}>
              <input type="checkbox" checked={approved.has(step.id)} onChange={() => !executed && toggle(step.id)} disabled={executed} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{step.description}</div>
                <code style={{
                  fontSize: 11, color: 'var(--accent-2)',
                  background: 'rgba(0,0,0,0.3)', padding: '3px 8px',
                  borderRadius: 6, display: 'block', marginTop: 6,
                  overflowX: 'auto', fontFamily: 'var(--font-mono)',
                }}>
                  {step.code.slice(0, 140)}{step.code.length > 140 ? '…' : ''}
                </code>
                <div style={{ marginTop: 6 }}>
                  <span className={`badge ${step.safe ? 'badge-green' : 'badge-red'}`}>
                    {step.safe ? 'Read-only' : '⚠ Writes data'}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>

        {!executed ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={() => { setExecuted(true); onApprove(msgId, Array.from(approved)) }} disabled={approved.size === 0}>
              ▶ Run {approved.size} step{approved.size !== 1 ? 's' : ''}
            </button>
            {plan.requires_write && (
              <span style={{ fontSize: 11, color: 'var(--yellow)', background: 'var(--yellow-dim)', padding: '3px 10px', borderRadius: 6 }}>
                ⚠ Modifies data
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>✓ Running…</span>
        )}
      </div>
    </div>
  )
}

function ResultCard({ results }: { results: StepResult[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--green-dim)', border: '1.5px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✓</div>
      <div style={{
        background: 'var(--bg-glass)', border: '1.5px solid var(--border)',
        borderRadius: '3px 14px 14px 14px', padding: '16px 20px',
        flex: 1, maxWidth: '95%', backdropFilter: 'blur(12px)',
      }}>
        {results.map(r => (
          <div key={r.step_id} style={{ marginBottom: 14 }}>
            {r.error  && <div style={{ color: 'var(--red)', fontSize: 13 }}>Step {r.step_id}: {r.error}</div>}
            {r.skipped && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Step {r.step_id}: skipped</div>}
            {r.rows_affected != null && (
              <div style={{ fontSize: 13, color: 'var(--green)' }}>✓ {r.rows_affected.toLocaleString()} row(s) affected</div>
            )}
            {r.rows && r.rows.length > 0 && <DataTable rows={r.rows} />}
            {r.rows && r.rows.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No rows returned</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  const cols = Object.keys(rows[0] ?? {})
  return (
    <div style={{ overflowX: 'auto', marginTop: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
        {rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{
                padding: '6px 12px', background: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid var(--border)', textAlign: 'left',
                color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: 600,
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              {cols.map(c => (
                <td key={c} style={{
                  padding: '6px 12px', maxWidth: 200,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: 'var(--text-primary)',
                }}>
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          Showing first 50 of {rows.length.toLocaleString()} rows
        </div>
      )}
    </div>
  )
}

function EmptyState({ connName, onSend }: { connName: string; onSend: (q: string) => void }) {
  const examples = [
    'Show me the first 10 rows',
    'How many records are in each table?',
    'Find all rows where a field is null',
    'What are the column names and types?',
  ]
  return (
    <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 48 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
        Ask anything about <span className="gradient-text">{connName}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
        I'll read the schema, show a plan, and ask for your approval before running anything.
      </div>
      <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {examples.map(ex => (
          <button key={ex} className="btn" style={{ fontSize: 12 }} onClick={() => onSend(ex)}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}

function AiAvatar() {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: 'var(--accent-dim)',
      border: '1.5px solid rgba(134,140,255,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, flexShrink: 0,
    }}>🤖</div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <AiAvatar />
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent-2)',
            animation: 'dotBounce 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }} />
        ))}
      </div>
    </div>
  )
}

function dbIcon(type: string) {
  const map: Record<string, string> = { mongodb: '🍃', csv: '📄', excel: '📊', mysql: '🐬', sqlite: '📦' }
  return map[type] ?? '🐘'
}
