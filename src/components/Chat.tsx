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

  function handleRegenerate() {
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (lastUser) { clearMessages(); sendMessage(lastUser.content) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>

      {/* Top bar */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: '#fff',
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-dark)' }}>AI Chat</span>

        {connectors.length === 0 ? (
          <span style={{ color: 'var(--text-gray)', fontSize: 12 }}>← Connect a data source first</span>
        ) : (
          <select
            value={activeConnectorId ?? ''}
            onChange={e => setActiveConnector(e.target.value || null)}
            style={{ padding: '6px 12px', fontSize: 12, border: '1px solid var(--border-light)', borderRadius: 8, background: '#fff', color: 'var(--text-dark)', outline: 'none' }}
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
          <span style={{ fontSize: 11, color: 'var(--text-gray)', background: 'var(--bg-code)', padding: '3px 9px', borderRadius: 99 }}>
            {activeConn.schema.tables.length} {activeConn.type === 'mongodb' ? 'collections' : 'tables'}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {messages.length > 1 && (
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={handleRegenerate}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
              Regenerate
            </button>
          )}
          {messages.length > 0 && (
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={clearMessages}>Clear</button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {messages.length === 0 && activeConnectorId && <EmptyState connName={activeConn?.name ?? ''} onSend={sendMessage} />}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} onApprove={approveAndExecute} />)}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', flexShrink: 0, background: '#fff' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', border: '1.5px solid var(--border-light)', borderRadius: 14, padding: '8px 8px 8px 16px', background: '#fff', transition: 'border-color 0.2s' }}
            onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--orange)'}
            onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-light)'}
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={activeConnectorId ? 'Ask anything about your data…' : 'Select a data source above'}
              disabled={!activeConnectorId || loading}
              rows={1}
              style={{
                flex: 1, border: 'none', outline: 'none', boxShadow: 'none',
                fontSize: 14, resize: 'none', lineHeight: 1.5,
                minHeight: 28, maxHeight: 130,
                color: 'var(--text-dark)', background: 'transparent',
                fontFamily: 'Inter, sans-serif', padding: 0,
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || !activeConnectorId || loading}
              style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0, alignSelf: 'flex-end',
                background: (!input.trim() || !activeConnectorId || loading) ? '#E5E7EB' : 'var(--orange)',
                color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
          </div>
        </form>
        <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 6 }}>
          Enter to send · Shift+Enter for new line · AI plans first, you approve before anything runs
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg, onApprove }: { msg: ChatMessage; onApprove: (id: string, ids: number[]) => void }) {
  const [liked, setLiked]     = useState<boolean | null>(null)
  const [copied, setCopied]   = useState(false)

  function copyText() {
    navigator.clipboard.writeText(msg.content ?? '').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '72%', background: 'var(--orange)', color: '#fff',
          borderRadius: '14px 14px 3px 14px',
          padding: '10px 16px', fontSize: 14, lineHeight: 1.6,
          boxShadow: '0 2px 12px rgba(249,115,22,0.25)',
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
      <div style={{ flex: 1, maxWidth: '82%' }}>
        <div style={{
          background: '#F9FAFB', border: '1px solid var(--border-light)',
          borderRadius: '3px 14px 14px 14px', padding: '12px 16px',
          fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-dark)',
        }}>
          {msg.content}
        </div>
        {/* Action row */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6, paddingLeft: 2 }}>
          <button
            className={`btn-icon${liked === true ? ' like' : ''}`}
            onClick={() => setLiked(liked === true ? null : true)}
            title="Good response"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={liked === true ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          </button>
          <button
            className={`btn-icon${liked === false ? ' dislike' : ''}`}
            onClick={() => setLiked(liked === false ? null : false)}
            title="Bad response"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={liked === false ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
          </button>
          <button
            className="btn-icon"
            onClick={copyText}
            title="Copy answer"
          >
            {copied
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            }
          </button>
        </div>
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
        background: '#F9FAFB', border: '1.5px solid rgba(249,115,22,0.25)',
        borderRadius: '3px 14px 14px 14px', padding: '16px 20px',
        flex: 1, maxWidth: '90%',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)', marginBottom: 8 }}>
          📋 Action Plan
        </div>
        <div style={{ fontSize: 13, marginBottom: 4, color: 'var(--text-dark)' }}>
          <strong>Analysis:</strong> {plan.diagnosis}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-gray)', marginBottom: 16, lineHeight: 1.5 }}>
          {plan.understanding}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {plan.steps.map(step => (
            <label key={step.id} style={{
              display: 'flex', gap: 12, cursor: executed ? 'default' : 'pointer',
              opacity: executed ? 0.6 : 1,
              background: '#fff', borderRadius: 10, padding: '10px 14px',
              border: '1px solid var(--border-light)',
            }}>
              <input type="checkbox" checked={approved.has(step.id)} onChange={() => !executed && toggle(step.id)} disabled={executed} style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--orange)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-dark)' }}>{step.description}</div>
                <code style={{
                  fontSize: 11, color: '#374151',
                  background: 'var(--bg-code)', padding: '3px 8px',
                  borderRadius: 6, display: 'block', marginTop: 6,
                  overflowX: 'auto', fontFamily: 'var(--font-mono)',
                }}>
                  {step.code.slice(0, 140)}{step.code.length > 140 ? '…' : ''}
                </code>
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: step.safe ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: step.safe ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                    {step.safe ? 'Read-only' : '⚠ Writes data'}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>

        {!executed ? (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-orange" onClick={() => { setExecuted(true); onApprove(msgId, Array.from(approved)) }} disabled={approved.size === 0} style={{ padding: '8px 18px' }}>
              ▶ Run {approved.size} step{approved.size !== 1 ? 's' : ''}
            </button>
            {plan.requires_write && (
              <span style={{ fontSize: 11, color: '#D97706', background: 'rgba(217,119,6,0.1)', padding: '3px 10px', borderRadius: 6 }}>
                ⚠ Modifies data
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--text-gray)' }}>✓ Running…</span>
        )}
      </div>
    </div>
  )
}

function ResultCard({ results }: { results: StepResult[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1.5px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✓</div>
      <div style={{
        background: '#F9FAFB', border: '1px solid var(--border-light)',
        borderRadius: '3px 14px 14px 14px', padding: '16px 20px',
        flex: 1, maxWidth: '95%',
      }}>
        {results.map(r => (
          <div key={r.step_id} style={{ marginBottom: 14 }}>
            {r.error   && <div style={{ color: '#DC2626', fontSize: 13 }}>Step {r.step_id}: {r.error}</div>}
            {r.skipped && <div style={{ color: 'var(--text-gray)', fontSize: 13 }}>Step {r.step_id}: skipped</div>}
            {r.rows_affected != null && (
              <div style={{ fontSize: 13, color: '#16A34A' }}>✓ {r.rows_affected.toLocaleString()} row(s) affected</div>
            )}
            {r.rows && r.rows.length > 0 && <DataTable rows={r.rows} />}
            {r.rows && r.rows.length === 0 && <div style={{ color: 'var(--text-gray)', fontSize: 13 }}>No rows returned</div>}
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
      <div style={{ fontSize: 11, color: 'var(--text-gray)', marginBottom: 6 }}>
        {rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''}
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c} style={{
                padding: '6px 12px', background: 'var(--bg-code)',
                borderBottom: '1px solid var(--border-light)', textAlign: 'left',
                color: 'var(--text-mid)', whiteSpace: 'nowrap', fontWeight: 600,
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
              {cols.map(c => (
                <td key={c} style={{
                  padding: '6px 12px', maxWidth: 200,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  color: 'var(--text-dark)',
                }}>
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && (
        <div style={{ fontSize: 11, color: 'var(--text-gray)', marginTop: 6 }}>
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
    <div style={{ textAlign: 'center', color: 'var(--text-gray)', marginTop: 60 }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>💬</div>
      <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-dark)' }}>
        Ask anything about <span style={{ color: 'var(--orange)' }}>{connName}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-gray)', marginTop: 8, lineHeight: 1.6 }}>
        I'll read the schema, show a plan, and ask for your approval before running anything.
      </div>
      <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {examples.map(ex => (
          <button
            key={ex}
            onClick={() => onSend(ex)}
            style={{ padding: '8px 14px', border: '1px solid var(--border-light)', borderRadius: 99, background: '#fff', color: 'var(--text-mid)', fontSize: 12, cursor: 'pointer', transition: 'all 0.13s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--orange)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--orange)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-mid)' }}
          >
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
      background: 'rgba(249,115,22,0.12)',
      border: '1.5px solid rgba(249,115,22,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, flexShrink: 0,
    }}>🤖</div>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <AiAvatar />
      <div style={{ display: 'flex', gap: 5, background: '#F9FAFB', padding: '10px 16px', borderRadius: '3px 14px 14px 14px', border: '1px solid var(--border-light)' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--orange)',
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
