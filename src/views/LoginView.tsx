import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/auth'
import s from './AuthView.module.css'

export function LoginView() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      nav('/contacts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <h1 className={s.title}>Tenne CRM</h1>
        <p className={s.sub}>Sign in to your account</p>
        <form onSubmit={submit} className={s.form}>
          <label className={s.label}>
            Email
            <input className={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className={s.label}>
            Password
            <input className={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          {error && <p className={s.error}>{error}</p>}
          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className={s.foot}>
          No account? <Link to="/signup" className={s.footLink}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
