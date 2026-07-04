import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { API } from '../config/constants'

export interface Connector {
  id: string
  name: string
  type: string
  connection_string: string
  readonly: boolean
  status: 'untested' | 'connecting' | 'connected' | 'error'
  schema?: { tables: TableInfo[] }
}

export interface TableInfo {
  name: string
  columns: { name: string; type: string }[]
  rows?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'plan' | 'result'
  content: string
  plan?: PlanData
  results?: StepResult[]
  connector_id?: string
  ts: number
}

export interface PlanData {
  diagnosis: string
  understanding: string
  steps: PlanStep[]
  requires_write: boolean
  estimated_rows: number
  can_parallel: boolean
  message: string
}

export interface PlanStep {
  id: number
  description: string
  code: string
  code_type: string
  table: string
  safe: boolean
  approved?: boolean
}

export interface StepResult {
  step_id: number
  rows?: Record<string, unknown>[]
  count?: number
  rows_affected?: number
  error?: string
  skipped?: boolean
}

interface Ctx {
  connectors: Connector[]
  activeConnectorId: string | null
  messages: ChatMessage[]
  loading: boolean
  fetchConnectors: () => Promise<void>
  addConnector: (name: string, type: string, conn_str: string) => Promise<void>
  uploadFile: (name: string, file: File) => Promise<void>
  removeConnector: (id: string) => Promise<void>
  testConnector: (id: string) => Promise<void>
  setActiveConnector: (id: string | null) => void
  sendMessage: (text: string) => Promise<void>
  approveAndExecute: (msgId: string, approvedIds: number[]) => Promise<void>
  clearMessages: () => void
}

const Ctx = createContext<Ctx | null>(null)

export function DataLibProvider({ children }: { children: ReactNode }) {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [activeConnectorId, setActiveConnectorId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  const push = (msg: Omit<ChatMessage, 'id' | 'ts'>) =>
    setMessages(prev => [...prev, { ...msg, id: Math.random().toString(36).slice(2), ts: Date.now() }])

  const fetchConnectors = useCallback(async () => {
    const r = await fetch(`${API}/connectors`)
    if (r.ok) setConnectors(await r.json())
  }, [])

  // Fetch connectors on mount so Chat tab shows them without visiting Connectors tab first
  useEffect(() => { fetchConnectors() }, [fetchConnectors])

  const addConnector = useCallback(async (name: string, type: string, conn_str: string) => {
    const r = await fetch(`${API}/connectors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, connection_string: conn_str, readonly: true }),
    })
    if (!r.ok) throw new Error((await r.json()).detail ?? 'Failed to add connector')
    await fetchConnectors()
  }, [fetchConnectors])

  const uploadFile = useCallback(async (name: string, file: File) => {
    const fd = new FormData()
    fd.append('name', name || file.name)
    fd.append('file', file)
    const r = await fetch(`${API}/connectors/upload`, { method: 'POST', body: fd })
    if (!r.ok) throw new Error((await r.json()).detail ?? 'Upload failed')
    await fetchConnectors()
  }, [fetchConnectors])

  const removeConnector = useCallback(async (id: string) => {
    await fetch(`${API}/connectors/${id}`, { method: 'DELETE' })
    setConnectors(prev => prev.filter(c => c.id !== id))
    if (activeConnectorId === id) setActiveConnectorId(null)
  }, [activeConnectorId])

  const testConnector = useCallback(async (id: string) => {
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, status: 'connecting' } : c))
    const r = await fetch(`${API}/connectors/${id}/test`, { method: 'POST' })
    const data = await r.json()
    setConnectors(prev => prev.map(c =>
      c.id === id ? { ...c, status: r.ok ? 'connected' : 'error', schema: data.schema } : c
    ))
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    const connId = activeConnectorId
    if (!connId) return

    push({ role: 'user', content: text, connector_id: connId })
    setLoading(true)

    try {
      const r = await fetch(`${API}/chat/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connector_id: connId, question: text }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => ({}))
        push({ role: 'assistant', content: `Error: ${err.detail ?? 'Something went wrong'}` })
        return
      }
      const data = await r.json()
      // Direct chat reply (greeting / general question — no DB plan needed)
      if (data.type === 'chat') {
        push({ role: 'assistant', content: data.reply || "Hello! How can I help you with your data?" })
        return
      }
      const plan: PlanData = data
      // Mark all steps approved by default (user can uncheck)
      plan.steps = plan.steps.map(s => ({ ...s, approved: true }))
      push({ role: 'plan', content: plan.message, plan, connector_id: connId })
    } catch (e) {
      push({ role: 'assistant', content: `Network error: ${e instanceof Error ? e.message : 'Unknown'}` })
    } finally {
      setLoading(false)
    }
  }, [activeConnectorId])

  const approveAndExecute = useCallback(async (msgId: string, approvedIds: number[]) => {
    const planMsg = messages.find(m => m.id === msgId)
    if (!planMsg?.plan || !planMsg.connector_id) return

    setLoading(true)
    try {
      const r = await fetch(`${API}/chat/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector_id: planMsg.connector_id,
          steps: planMsg.plan.steps,
          approved_step_ids: approvedIds,
        }),
      })
      const data = await r.json()
      push({ role: 'result', content: '', results: data.results, connector_id: planMsg.connector_id })
    } finally {
      setLoading(false)
    }
  }, [messages])

  return (
    <Ctx.Provider value={{
      connectors, activeConnectorId, messages, loading,
      fetchConnectors, addConnector, uploadFile, removeConnector,
      testConnector, setActiveConnector: setActiveConnectorId,
      sendMessage, approveAndExecute, clearMessages: () => setMessages([]),
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDataLib() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDataLib must be inside DataLibProvider')
  return ctx
}
