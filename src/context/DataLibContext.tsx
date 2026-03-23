import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { API } from '../config/constants'

export interface Connector {
  id: string; name: string; type: string
  connection_string: string; readonly: boolean
  status: 'untested' | 'connecting' | 'connected' | 'error'
  schema?: { tables: TableInfo[] }
}

export interface TableInfo {
  name: string
  columns: { name: string; type: string }[]
  rows?: number
}

interface Ctx {
  connectors: Connector[]
  fetchConnectors: () => Promise<void>
}

const Ctx = createContext<Ctx | null>(null)

export function DataLibProvider({ children }: { children: ReactNode }) {
  const [connectors, setConnectors] = useState<Connector[]>([])
  const fetchConnectors = useCallback(async () => {
    const r = await fetch(`${API}/connectors`)
    if (r.ok) setConnectors(await r.json())
  }, [])
  return <Ctx.Provider value={{ connectors, fetchConnectors }}>{children}</Ctx.Provider>
}

export function useDataLib() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDataLib must be inside DataLibProvider')
  return ctx
}
