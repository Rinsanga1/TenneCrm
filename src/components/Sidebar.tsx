import { NavLink, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { useState, useEffect } from 'react'
import { syncStore } from '../stores/SyncStore'
import { authStore } from '../stores/AuthStore'
import { logout } from '../api/auth'
import s from './Sidebar.module.css'

const ALL_NAV = [
  { to: '/contacts', label: 'Contacts', icon: '◉', feature: null },
  { to: '/tasks', label: 'Tasks', icon: '✓', feature: null },
  { to: '/deals', label: 'Deals', icon: '◈', feature: null },
  { to: '/cases', label: 'Cases', icon: '▫', feature: 'showCases' },
  { to: '/tags', label: 'Tags', icon: '●', feature: 'showTags' },
  { to: '/templates', label: 'Templates', icon: '✉', feature: 'showTemplates' },
  { to: '/activity', label: 'Activity', icon: '≡', feature: 'showActivity' },
  { to: '/dashboard', label: 'Analytics', icon: '⊞', feature: null },
]

function getFeatureEnabled(key: string | null): boolean {
  if (!key) return true
  try { const f = JSON.parse(localStorage.getItem('tenne_features') ?? '{}'); return f[key] !== false } catch { return true }
}

export const Sidebar = observer(() => {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1)
    window.addEventListener('tenne_features_changed', handler)
    return () => window.removeEventListener('tenne_features_changed', handler)
  }, [])
  const NAV = ALL_NAV.filter(n => getFeatureEnabled(n.feature))
  const statusColor =
    syncStore.status === 'connected' ? 'var(--green-b)'
    : syncStore.status === 'connecting' ? 'var(--yellow-b)'
    : 'var(--red-b)'

  return (
    <aside className={s.sidebar}>
      <div className={s.top}>
        <div className={s.logo}>Tenne</div>
        <nav className={s.nav}>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}
            >
              <span className={s.icon}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className={s.bottom}>
        <div className={s.syncStatus}>
          <span className={s.dot} style={{ background: statusColor }} />
          {syncStore.status}
          {syncStore.pendingCount > 0 && (
            <span className={s.pending}>{syncStore.pendingCount}</span>
          )}
        </div>
        <NavLink to="/settings" className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`} style={{ marginBottom: 4 }}>
          <span className={s.icon}>⚙</span>Settings
        </NavLink>
        <button className={s.userBtn} onClick={logout}>
          <span className={s.userEmail}>{authStore.session?.email}</span>
          <span className={s.signout}>Sign out</span>
        </button>
      </div>
    </aside>
  )
})
