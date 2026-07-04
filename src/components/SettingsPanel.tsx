import { useState, useEffect } from 'react'
import { API } from '../config/constants'

interface Provider {
  id: string
  name: string
  base_url: string
  api_key: string
  model: string
  enabled: boolean
  builtin?: boolean
  placeholder?: string
  description?: string
}

interface Settings {
  providers: Provider[]
  custom_providers: Provider[]
  use_free_fallback: boolean
}

const PROVIDER_ICONS: Record<string, string> = {
  openai:     '🤖',
  gemini:     '✨',
  deepseek:   '🔍',
  openrouter: '🔀',
}

export default function SettingsPanel() {
  const [settings, setSettings]   = useState<Settings | null>(null)
  const [saved,    setSaved]       = useState(false)
  const [saving,   setSaving]      = useState(false)
  const [testing,  setTesting]     = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; detail: string }>>({})
  const [showKey,   setShowKey]    = useState<Record<string, boolean>>({})
  const [newCustom, setNewCustom]  = useState({ name: '', base_url: '', api_key: '', model: '' })
  const [activeSource, setActiveSource] = useState<string>('')

  useEffect(() => {
    fetch(`${API}/settings`).then(r => r.json()).then(setSettings)
    fetch(`${API}/health`).then(r => r.json()).then(d => {
      setActiveSource(d.keys?.active_source ?? '')
    })
  }, [])

  if (!settings) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
      Loading…
    </div>
  )

  function updateProvider(id: string, patch: Partial<Provider>, custom = false) {
    setSettings(prev => {
      if (!prev) return prev
      const key = custom ? 'custom_providers' : 'providers'
      return { ...prev, [key]: prev[key].map(p => p.id === id ? { ...p, ...patch } : p) }
    })
  }

  function removeCustom(id: string) {
    setSettings(prev => prev ? { ...prev, custom_providers: prev.custom_providers.filter(p => p.id !== id) } : prev)
  }

  function addCustom() {
    if (!newCustom.name.trim() || !newCustom.base_url.trim()) return
    const id = `custom_${Date.now()}`
    setSettings(prev => prev ? { ...prev, custom_providers: [...prev.custom_providers, { id, ...newCustom, enabled: true, builtin: false }] } : prev)
    setNewCustom({ name: '', base_url: '', api_key: '', model: '' })
  }

  async function testKey(p: Provider) {
    const tid = p.id
    setTesting(tid)
    setTestResult(prev => ({ ...prev, [tid]: { ok: false, detail: 'Testing…' } }))
    try {
      const r = await fetch(`${API}/settings/test-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: p.api_key, base_url: p.base_url, model: p.model }),
      })
      const d = await r.json()
      setTestResult(prev => ({ ...prev, [tid]: { ok: d.ok, detail: d.ok ? 'Key works ✓' : d.detail } }))
    } catch {
      setTestResult(prev => ({ ...prev, [tid]: { ok: false, detail: 'Network error' } }))
    } finally {
      setTesting(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await fetch(`${API}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    // Re-fetch active source
    fetch(`${API}/health`).then(r => r.json()).then(d => setActiveSource(d.keys?.active_source ?? ''))
  }

  const allProviders = [...settings.providers, ...settings.custom_providers]
  const activeUserProvider = allProviders.find(p => p.enabled && p.api_key?.trim())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ padding: '28px 32px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>AI Configuration</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              Add your own API keys. Your key is used first; free auto-rotating keys are the fallback.
            </p>
          </div>
          <button className="btn primary" onClick={handleSave} disabled={saving} style={{ padding: '9px 22px' }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : '💾 Save'}
          </button>
        </div>

        {/* Active key banner */}
        <div style={{ marginTop: 14, padding: '10px 16px', borderRadius: 10, background: activeUserProvider ? 'var(--green-dim)' : 'var(--bg-hover)', border: `1px solid ${activeUserProvider ? 'var(--green)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span style={{ fontSize: 16 }}>{activeUserProvider ? '✅' : '🔄'}</span>
          <span style={{ color: activeUserProvider ? 'var(--green)' : 'var(--text-secondary)' }}>
            {activeUserProvider
              ? `Using your ${activeUserProvider.name} key (${activeUserProvider.model})`
              : `Using free auto-rotating keys (${activeSource || 'pekpik'})`}
          </span>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
      </div>

      {/* Preset providers */}
      <div style={{ padding: '0 32px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Preset Providers
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {settings.providers.map(p => (
            <ProviderCard
              key={p.id}
              provider={p}
              icon={PROVIDER_ICONS[p.id] ?? '🔑'}
              testResult={testResult[p.id]}
              testing={testing === p.id}
              showKey={!!showKey[p.id]}
              onToggleShowKey={() => setShowKey(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
              onChange={patch => updateProvider(p.id, patch)}
              onTest={() => testKey(p)}
            />
          ))}
        </div>
      </div>

      {/* Custom providers */}
      <div style={{ padding: '24px 32px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Custom / OpenAI-Compatible
        </div>

        {settings.custom_providers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {settings.custom_providers.map(p => (
              <ProviderCard
                key={p.id}
                provider={p}
                icon="🔧"
                testResult={testResult[p.id]}
                testing={testing === p.id}
                showKey={!!showKey[p.id]}
                onToggleShowKey={() => setShowKey(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                onChange={patch => updateProvider(p.id, patch, true)}
                onTest={() => testKey(p)}
                onRemove={() => removeCustom(p.id)}
              />
            ))}
          </div>
        )}

        {/* Add custom form */}
        <div className="card animate-fadein" style={{ padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
            + Add Custom Provider
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input placeholder="Provider name (e.g. Ollama)" value={newCustom.name} onChange={e => setNewCustom(p => ({ ...p, name: e.target.value }))} />
            <input placeholder="Model (e.g. llama3)" value={newCustom.model} onChange={e => setNewCustom(p => ({ ...p, model: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
            <input placeholder="Base URL (e.g. http://localhost:11434/v1)" value={newCustom.base_url} onChange={e => setNewCustom(p => ({ ...p, base_url: e.target.value }))} />
            <input placeholder="API Key (or 'ollama')" value={newCustom.api_key} onChange={e => setNewCustom(p => ({ ...p, api_key: e.target.value }))} />
          </div>
          <button className="btn" onClick={addCustom} style={{ fontSize: 12 }}>
            + Add Provider
          </button>
        </div>
      </div>

      {/* Free fallback toggle */}
      <div style={{ padding: '0 32px 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 12, background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
            <input
              type="checkbox"
              checked={settings.use_free_fallback}
              onChange={e => setSettings(prev => prev ? { ...prev, use_free_fallback: e.target.checked } : prev)}
              style={{ width: 16, height: 16 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Use free rotating keys as fallback</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                When no user key is active, automatically use community-shared keys from pekpik.com
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

function ProviderCard({
  provider: p, icon, testResult, testing, showKey, onToggleShowKey, onChange, onTest, onRemove,
}: {
  provider: Provider
  icon: string
  testResult?: { ok: boolean; detail: string }
  testing: boolean
  showKey: boolean
  onToggleShowKey: () => void
  onChange: (patch: Partial<Provider>) => void
  onTest: () => void
  onRemove?: () => void
}) {
  const hasKey = !!p.api_key?.trim()

  return (
    <div className="card animate-fadein" style={{
      padding: 0, overflow: 'hidden',
      borderColor: p.enabled && hasKey ? 'rgba(134,140,255,0.35)' : 'var(--border)',
    }}>
      {/* Top row */}
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{p.name}</div>
          {p.description && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{p.description}</div>}
        </div>

        {/* Status */}
        <span className={`badge ${hasKey ? (p.enabled ? 'badge-green' : 'badge-gray') : 'badge-gray'}`} style={{ fontSize: 10 }}>
          {hasKey ? (p.enabled ? 'Active' : 'Disabled') : 'No key'}
        </span>

        {/* Enable toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', userSelect: 'none' }}>
          <input type="checkbox" checked={p.enabled} onChange={e => onChange({ enabled: e.target.checked })} style={{ width: 14, height: 14 }} />
          Enable
        </label>

        {onRemove && (
          <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onRemove}>✕</button>
        )}
      </div>

      {/* Key + model row */}
      <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={p.api_key}
              onChange={e => onChange({ api_key: e.target.value })}
              placeholder={p.placeholder ?? 'API Key'}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12, paddingRight: 36 }}
            />
            <button
              onClick={onToggleShowKey}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-dim)', fontSize: 13, padding: '2px 4px' }}
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
          <input
            value={p.model}
            onChange={e => onChange({ model: e.target.value })}
            placeholder="Model"
            style={{ width: 180, fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
          <button className="btn" style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0, whiteSpace: 'nowrap' }}
            onClick={onTest} disabled={!hasKey || testing}>
            {testing ? '…' : 'Test'}
          </button>
        </div>

        {/* Custom base URL */}
        {!p.builtin && (
          <input
            value={p.base_url}
            onChange={e => onChange({ base_url: e.target.value })}
            placeholder="Base URL (https://...)"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
        )}

        {testResult && (
          <div style={{ fontSize: 11, color: testResult.ok ? 'var(--green)' : 'var(--red)', background: testResult.ok ? 'var(--green-dim)' : 'var(--red-dim)', padding: '4px 10px', borderRadius: 6 }}>
            {testResult.detail}
          </div>
        )}
      </div>
    </div>
  )
}
