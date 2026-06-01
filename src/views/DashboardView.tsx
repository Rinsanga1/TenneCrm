import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Link } from 'react-router-dom'
import { contactStore } from '../stores/ContactStore'
import { taskStore } from '../stores/TaskStore'
import { dealStore } from '../stores/DealStore'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import type { Contact, Task, Deal } from '@tenne/shared'
import s from './DashboardView.module.css'

export const DashboardView = observer(() => {
  const session = authStore.session!
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      contactStore.loadFromIDB(session.workspaceId),
      taskStore.loadFromIDB(session.workspaceId),
      dealStore.loadFromIDB(session.workspaceId),
    ]).then(() => setLoaded(true))

    api.get<Contact[]>('/contacts').then(cs => cs.forEach(c => contactStore.upsert(c))).catch(() => {})
    api.get<Task[]>('/tasks').then(ts => ts.forEach(t => taskStore.upsert(t))).catch(() => {})
    api.get<Deal[]>('/deals').then(ds => ds.forEach(d => dealStore.upsert(d))).catch(() => {})
  }, [session.workspaceId])

  const contacts = contactStore.list
  const tasks = taskStore.list
  const deals = dealStore.list

  const openDeals = deals.filter(d => !d.deletedAt && d.status === 'pending')
  const wonDeals = deals.filter(d => d.status === 'won')
  const pendingTasks = tasks.filter(t => !t.deletedAt && t.status !== 'done')
  const overdueTasks = pendingTasks.filter(t => t.dueAt && t.dueAt < Date.now())
  const upcomingTasks = pendingTasks.filter(t => t.dueAt && t.dueAt >= Date.now()).slice(0, 5)
  const recentContacts = [...contacts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)

  const pipeline = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const won = wonDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const closed = wonDeals.length + deals.filter(d => d.status === 'lost').length
  const winRate = closed > 0 ? Math.round((wonDeals.length / closed) * 100) : 0

  const fmt = (n: number) =>
    n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `$${(n / 1000).toFixed(1)}K`
    : `$${n.toLocaleString()}`

  const stats = [
    { label: 'Contacts', value: contacts.length, to: '/contacts', accent: 'var(--blue-b)' },
    { label: 'Open Deals', value: openDeals.length, to: '/deals', accent: 'var(--yellow-b)' },
    { label: 'Pipeline', value: fmt(pipeline), to: '/deals', accent: 'var(--green-b)' },
    { label: 'Pending Tasks', value: pendingTasks.length, to: '/tasks', accent: overdueTasks.length > 0 ? 'var(--red-b)' : 'var(--aqua-b)' },
  ]

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Dashboard</h1>
        <span className={s.greeting}>Welcome back, {session.name}</span>
      </div>

      <div className={s.stats}>
        {stats.map(st => (
          <Link key={st.label} to={st.to} className={s.statCard} style={{ '--accent': st.accent } as React.CSSProperties}>
            <div className={s.statValue}>{st.value}</div>
            <div className={s.statLabel}>{st.label}</div>
          </Link>
        ))}
      </div>

      <div className={s.body}>
        <div className={s.col}>
          <div className={s.section}>
            <div className={s.sectionHead}>
              <span className={s.sectionTitle}>Revenue Forecast</span>
            </div>
            <div className={s.forecastGrid}>
              <div className={s.forecastItem}>
                <div className={s.forecastVal} style={{ color: 'var(--yellow-b)' }}>{fmt(pipeline)}</div>
                <div className={s.forecastLbl}>Open Pipeline</div>
              </div>
              <div className={s.forecastItem}>
                <div className={s.forecastVal} style={{ color: 'var(--green-b)' }}>{fmt(won)}</div>
                <div className={s.forecastLbl}>Won</div>
              </div>
              <div className={s.forecastItem}>
                <div className={s.forecastVal} style={{ color: 'var(--blue-b)' }}>{winRate}%</div>
                <div className={s.forecastLbl}>Win Rate</div>
              </div>
              <div className={s.forecastItem}>
                <div className={s.forecastVal} style={{ color: 'var(--aqua-b)' }}>{fmt(pipeline * winRate / 100)}</div>
                <div className={s.forecastLbl}>Weighted</div>
              </div>
            </div>
          </div>

          <div className={s.section}>
            <div className={s.sectionHead}>
              <span className={s.sectionTitle}>Recent Contacts</span>
              <Link to="/contacts" className={s.seeAll}>See all</Link>
            </div>
            {recentContacts.length === 0 ? (
              <div className={s.empty}>{loaded ? 'No contacts yet' : 'Loading…'}</div>
            ) : recentContacts.map(c => (
              <Link key={c.id} to={`/contacts/${c.id}`} className={s.row}>
                <div className={s.avatar}>{c.name.charAt(0).toUpperCase()}</div>
                <div className={s.rowBody}>
                  <div className={s.rowName}>{c.name}</div>
                  <div className={s.rowSub}>{c.email || c.phone || c.type}</div>
                </div>
                <div className={s.rowMeta}>{new Date(c.createdAt).toLocaleDateString()}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className={s.col}>
          {overdueTasks.length > 0 && (
            <div className={s.section}>
              <div className={s.sectionHead}>
                <span className={s.sectionTitle} style={{ color: 'var(--red-b)' }}>Overdue Tasks ({overdueTasks.length})</span>
                <Link to="/tasks" className={s.seeAll}>See all</Link>
              </div>
              {overdueTasks.slice(0, 3).map(t => (
                <div key={t.id} className={s.taskRow}>
                  <span className={s.taskDot} style={{ background: 'var(--red-b)' }} />
                  <span className={s.taskTitle}>{t.title}</span>
                  <span className={s.taskDue} style={{ color: 'var(--red-b)' }}>{new Date(t.dueAt!).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className={s.section}>
            <div className={s.sectionHead}>
              <span className={s.sectionTitle}>Upcoming Tasks</span>
              <Link to="/tasks" className={s.seeAll}>See all</Link>
            </div>
            {upcomingTasks.length === 0 ? (
              <div className={s.empty}>{loaded ? 'No upcoming tasks' : 'Loading…'}</div>
            ) : upcomingTasks.map(t => (
              <div key={t.id} className={s.taskRow}>
                <span className={s.taskDot} style={{ background: 'var(--aqua-b)' }} />
                <span className={s.taskTitle}>{t.title}</span>
                {t.dueAt && <span className={s.taskDue}>{new Date(t.dueAt).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>

          <div className={s.section}>
            <div className={s.sectionHead}>
              <span className={s.sectionTitle}>Open Deals</span>
              <Link to="/deals" className={s.seeAll}>See all</Link>
            </div>
            {openDeals.length === 0 ? (
              <div className={s.empty}>{loaded ? 'No open deals' : 'Loading…'}</div>
            ) : openDeals.slice(0, 5).map(d => (
              <div key={d.id} className={s.row}>
                <div className={s.rowBody}>
                  <div className={s.rowName}>{d.title}</div>
                  <div className={s.rowSub}>{d.status}</div>
                </div>
                {d.value != null && <div className={s.rowMeta} style={{ color: 'var(--green-b)' }}>{fmt(d.value)}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})
