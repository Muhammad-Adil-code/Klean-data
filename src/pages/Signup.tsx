import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import KdLogo from '../components/KdLogo'
import { saveUser, getUser } from '../auth'

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [err, setErr]           = useState('')

  // Already logged in
  if (getUser()) { navigate('/app', { replace: true }); return null }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!name.trim() || !email.trim() || !password) { setErr('Please fill in all fields'); return }
    if (!email.includes('@')) { setErr('Enter a valid email'); return }
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return }
    setLoading(true)
    setTimeout(() => {
      saveUser({ name: name.trim(), email: email.trim().toLowerCase() })
      navigate('/app', { replace: true })
    }, 700)
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

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Create an account</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 28 }}>Start querying your data with AI</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Full name</label>
            <input className="input-field" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email</label>
            <input className="input-field" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Password</label>
            <input className="input-field" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          {err && <div style={{ fontSize: 13, color: '#EF4444', background: 'rgba(239,68,68,0.08)', padding: '8px 12px', borderRadius: 8 }}>{err}</div>}

          <button type="submit" className="btn-orange" disabled={loading} style={{ marginTop: 4, padding: '12px', fontSize: 15 }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#6B7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#F97316', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
