import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup } from '../api/auth'
import s from './AuthView.module.css'

export function SignupView() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(name, email, password)
      nav('/contacts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <h1 className={s.title}>Tenne CRM</h1>
        <p className={s.sub}>Create your account</p>
        <form onSubmit={submit} className={s.form}>
          <label className={s.label}>
            Name
            <input className={s.input} type="text" value={name} onChange={e => setName(e.target.value)} required autoFocus />
          </label>
          <label className={s.label}>
            Email
            <input className={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label className={s.label}>
            Password
            <input className={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </label>
          {error && <p className={s.error}>{error}</p>}
          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className={s.foot}>
          Have an account? <Link to="/login" className={s.footLink}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
