import { useState, useRef, useEffect } from 'react'
import { useDataLib, type ChatMessage, type PlanData, type StepResult } from '../context/DataLibContext'

export default function Chat() {
  const { messages, loading, sendMessage, approveAndExecute, connectors, activeConnectorId, setActiveConnector, clearMessages } = useDataLib()
  const [input, setInput]           = useState('')
  const [showInfo, setShowInfo]     = useState(false)
  const [showBell, setShowBell]     = useState(false)
  const [bellRead, setBellRead]     = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceErr, setVoiceErr]       = useState('')
  const recognitionRef = useRef<any>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const infoRef    = useRef<HTMLDivElement>(null)
  const bellRef    = useRef<HTMLDivElement>(null)
  const activeConn = connectors.find(c => c.id === activeConnectorId)

  function toggleVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setVoiceErr('Voice not supported in this browser. Try Chrome.'); setTimeout(() => setVoiceErr(''), 3000); return }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const rec: any = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    recognitionRef.current = rec

    rec.onstart  = () => setIsListening(true)
    rec.onend    = () => setIsListening(false)
    rec.onerror  = (e: any) => { setIsListening(false); setVoiceErr(`Mic error: ${e.error}`); setTimeout(() => setVoiceErr(''), 3000) }
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('')
      setInput(transcript)
    }
    rec.start()
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setShowInfo(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false)
    }
    if (showInfo || showBell) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showInfo, showBell])

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
        padding: '14px 20px', borderBottom: '1px solid var(--border-light)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: '#fff',
      }}>
        {/* Title */}
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>
          AI Chat Helper
        </span>

        {/* Search — pill */}
        <div style={{ flex: 1, maxWidth: 280, marginLeft: 'auto', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            placeholder="Search"
            style={{
              width: '100%', padding: '9px 16px 9px 36px',
              border: '1px solid var(--border-light)', borderRadius: 99,
              background: '#F9FAFB', fontSize: 13, color: 'var(--text-dark)',
              outline: 'none', boxShadow: 'none',
            }}
          />
        </div>

        {/* Bell */}
        <div ref={bellRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowBell(v => !v); setBellRead(true) }}
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: showBell ? '#F3F4F6' : '#fff', border: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: showBell ? 'var(--orange)' : '#6B7280', cursor: 'pointer', transition: 'all 0.13s',
              position: 'relative',
            }}
            onMouseEnter={e => { if (!showBell) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
            onMouseLeave={e => { if (!showBell) (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {/* Unread dot */}
            {!bellRead && (
              <span style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: 'var(--orange)', border: '1.5px solid #fff' }} />
            )}
          </button>

          {showBell && (
            <div style={{
              position: 'absolute', top: 46, right: 0, width: 300, zIndex: 999,
              background: '#fff', borderRadius: 14, border: '1px solid var(--border-light)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out',
            }}>
              {/* Header */}
              <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Notifications</span>
                <span style={{ fontSize: 11, color: 'var(--orange)', cursor: 'pointer', fontWeight: 600 }}>Mark all read</span>
              </div>

              {/* Notification items */}
              {[
                { icon: '🗄️', title: 'Connector ready', desc: activeConn ? `"${activeConn.name}" is connected and ready to query.` : 'No data source connected yet.', time: 'Just now', color: '#16A34A' },
                { icon: '🤖', title: 'AI Config tip', desc: 'Add your own API key in AI Config for faster, unlimited responses.', time: '2m ago', color: 'var(--orange)' },
                { icon: '⭐', title: 'Pro Plan available', desc: 'Unlock templates, projects & statistics with the Pro Plan.', time: '5m ago', color: '#7C3AED' },
              ].map((n, i) => (
                <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', borderBottom: i < 2 ? '1px solid var(--border-light)' : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#fff'}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {n.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.45 }}>{n.desc}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info — opens popover */}
        <div ref={infoRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowInfo(v => !v)}
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: showInfo ? '#F3F4F6' : '#fff', border: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: showInfo ? 'var(--orange)' : '#6B7280', cursor: 'pointer', transition: 'all 0.13s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </button>

          {/* Info popover */}
          {showInfo && (
            <div style={{
              position: 'absolute', top: 46, right: 0, width: 280, zIndex: 999,
              background: '#fff', borderRadius: 14, border: '1px solid var(--border-light)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden',
              animation: 'fadeIn 0.15s ease-out',
            }}>
              {/* Connection */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Active Connection</div>
                {activeConn ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.8" strokeLinecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{activeConn.name}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: activeConn.status === 'connected' ? '#16A34A' : '#DC2626' }}>●</span>
                        {activeConn.status === 'connected' ? 'Connected' : activeConn.status}
                        {activeConn.schema && (
                          <span>· {activeConn.schema.tables.length} {activeConn.type === 'mongodb' ? 'collections' : 'tables'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#9CA3AF' }}>No data source selected</div>
                )}
              </div>

              {/* Chat stats */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 16 }}>
                {[
                  { label: 'Messages', value: messages.length },
                  { label: 'Queries', value: messages.filter(m => m.role === 'user').length },
                  { label: 'Results',  value: messages.filter(m => m.role === 'result').length },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Shortcuts */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Shortcuts</div>
                {[
                  { key: 'Enter',       desc: 'Send message' },
                  { key: 'Shift+Enter', desc: 'New line' },
                ].map(s => (
                  <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#374151' }}>{s.desc}</span>
                    <kbd style={{ fontSize: 11, background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 5, padding: '2px 7px', color: '#374151', fontFamily: 'Inter, sans-serif' }}>{s.key}</kbd>
                  </div>
                ))}
                {messages.length > 1 && (
                  <button
                    onClick={() => { handleRegenerate(); setShowInfo(false) }}
                    style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border-light)', background: '#F9FAFB', fontSize: 12, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                    Regenerate last response
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {messages.length === 0 && !activeConnectorId && <NoSourceState />}
        {messages.length === 0 && activeConnectorId && <EmptyState connName={activeConn?.name ?? ''} onSend={sendMessage} />}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} onApprove={approveAndExecute} />)}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 24px 24px', borderTop: '1px solid var(--border-light)', flexShrink: 0, background: '#fff' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

            {/* Upload icon */}
            <button type="button" style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: '#F3F4F6', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280',
              transition: 'background 0.13s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#E5E7EB'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v8M8 12l4-4 4 4"/>
              </svg>
            </button>

            {/* Mic icon */}
            <button
              type="button"
              onClick={toggleVoice}
              title={isListening ? 'Stop recording' : 'Voice input'}
              style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0, border: 'none', cursor: 'pointer',
                background: isListening ? 'rgba(239,68,68,0.12)' : '#F3F4F6',
                color: isListening ? '#EF4444' : '#6B7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.13s',
                boxShadow: isListening ? '0 0 0 3px rgba(239,68,68,0.2)' : 'none',
                animation: isListening ? 'micPulse 1s ease-in-out infinite' : 'none',
              }}
            >
              {isListening ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>

            {/* Data source — database icon with hidden select */}
            <div style={{ position: 'relative', flexShrink: 0 }}
              title={activeConn ? `Source: ${activeConn.name}` : 'Select data source'}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: activeConnectorId ? 'rgba(249,115,22,0.1)' : '#F3F4F6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: activeConnectorId ? 'var(--orange)' : '#6B7280',
                pointerEvents: 'none',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
              </div>
              <select
                value={activeConnectorId ?? ''}
                onChange={e => setActiveConnector(e.target.value || null)}
                style={{
                  position: 'absolute', inset: 0, opacity: 0,
                  width: '100%', height: '100%', cursor: 'pointer',
                  border: 'none', background: 'transparent',
                }}
              >
                <option value="">No source selected</option>
                {connectors.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.status === 'connected' ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Text input — pill */}
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Start typing"
                disabled={!activeConnectorId || loading}
                rows={1}
                style={{
                  width: '100%', padding: '12px 20px',
                  border: 'none', outline: 'none', boxShadow: 'none',
                  borderRadius: 99, background: '#F3F4F6',
                  fontSize: 14, resize: 'none', lineHeight: 1.5,
                  minHeight: 44, maxHeight: 130,
                  color: 'var(--text-dark)', fontFamily: 'Inter, sans-serif',
                  display: 'block',
                }}
              />
            </div>

            {/* Send button — orange rounded square */}
            <button
              type="submit"
              disabled={!input.trim() || !activeConnectorId || loading}
              style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: (!input.trim() || !activeConnectorId || loading) ? '#E5E7EB' : 'var(--orange)',
                color: '#fff', border: 'none', cursor: (!input.trim() || !activeConnectorId || loading) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s', boxShadow: (!input.trim() || !activeConnectorId || loading) ? 'none' : '0 4px 14px rgba(249,115,22,0.35)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </form>

        {/* Voice error toast */}
        {voiceErr && (
          <div style={{ fontSize: 12, color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 14px', marginTop: 8, textAlign: 'center', animation: 'fadeIn 0.2s ease-out' }}>
            {voiceErr}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
          AI responses are based on your data. Always verify before making decisions.{' '}
          <span style={{ color: 'var(--orange)', cursor: 'pointer' }}>Learn more</span>
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

function NoSourceState() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 32px' }}>
      {/* Animated rings */}
      <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 28px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.15)', animation: 'ping 2s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.2)', animation: 'ping 2s ease-out infinite 0.4s' }} />
        <div style={{ position: 'absolute', inset: 20, borderRadius: '50%', background: 'rgba(249,115,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 20, color: '#111827', marginBottom: 10 }}>
        Connect a data source first
      </div>
      <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, maxWidth: 340, marginBottom: 28 }}>
        Select a database from the <span style={{ color: 'var(--orange)', fontWeight: 600 }}>🗄 icon</span> in the input bar below,<br />
        or go to <span style={{ color: 'var(--orange)', fontWeight: 600 }}>Connectors</span> to add a new one.
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['PostgreSQL', 'MongoDB', 'MySQL', 'CSV / Excel'].map(db => (
          <div key={db} style={{ padding: '8px 16px', border: '1px solid var(--border-light)', borderRadius: 99, background: '#F9FAFB', fontSize: 12, color: '#374151', fontWeight: 500 }}>
            {db}
          </div>
        ))}
      </div>
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 32px' }}>
      {/* Animated icon */}
      <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 28px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.12)', animation: 'ping 2.5s ease-out infinite' }} />
        <div style={{ position: 'absolute', inset: 12, borderRadius: '50%', background: 'rgba(249,115,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'float 3s ease-in-out infinite' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <circle cx="9" cy="10" r="1" fill="var(--orange)"/><circle cx="12" cy="10" r="1" fill="var(--orange)"/><circle cx="15" cy="10" r="1" fill="var(--orange)"/>
          </svg>
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 20, color: '#111827', marginBottom: 10 }}>
        Ask anything about <span style={{ color: 'var(--orange)' }}>{connName}</span>
      </div>
      <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, maxWidth: 360, marginBottom: 28 }}>
        I'll read the schema, generate a plan, and ask for your approval before running anything.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        {examples.map(ex => (
          <button
            key={ex}
            onClick={() => onSend(ex)}
            style={{ padding: '9px 16px', border: '1px solid var(--border-light)', borderRadius: 99, background: '#fff', color: 'var(--text-mid)', fontSize: 13, cursor: 'pointer', transition: 'all 0.13s' }}
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
