import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import KdLogo from '../components/KdLogo'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]  = useState(false)
  const [err, setErr]          = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setErr('Please fill in all fields'); return }
    setLoading(true)
    setTimeout(() => { setLoading(false); navigate('/app') }, 800)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420, boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <KdLogo size={40} />
          <span style={{ fontWeight: 800, fontSize: 20, color: '#111827', letterSpacing: '-0.5px' }}>
            Klean<span style={{ color: '#F97316' }}>Data</span>
          </span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Welcome back</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 28 }}>Sign in to your account to continue</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email</label>
            <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Password</label>
            <input className="input-field" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          {err && <div style={{ fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 8 }}>{err}</div>}

          <button type="submit" className="btn-orange" disabled={loading} style={{ marginTop: 4, padding: '12px', fontSize: 15 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#6B7280' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#F97316', fontWeight: 600, textDecoration: 'none' }}>Sign up</Link>
        </div>
      </div>
    </div>
  )
}
