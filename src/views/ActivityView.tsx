import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import s from './ActivityView.module.css'

interface ActivityRow {
  id: string
  workspace_id: string
  contact_id: string
  type: string
  data: string
  created_at: number
}

const typeLabel: Record<string, string> = {
  note: '📝 Note',
  task: '✓ Task',
  deal: '◈ Deal',
  email: '✉ Email',
  call: '☎ Call',
}

export const ActivityView = observer(() => {
  const session = authStore.session!
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ActivityRow[]>('/activity')
      .then(setActivities)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session.workspaceId])

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Activity</h1>
      </div>

      {loading ? (
        <div className={s.empty}>Loading…</div>
      ) : activities.length === 0 ? (
        <div className={s.empty}>No activity yet. Activity is logged as you use the CRM.</div>
      ) : (
        <div className={s.feed}>
          {activities.map(a => {
            let data: Record<string, unknown> = {}
            try { data = JSON.parse(a.data) } catch {}
            return (
              <div key={a.id} className={s.item}>
                <div className={s.icon}>{typeLabel[a.type]?.charAt(0) ?? '•'}</div>
                <div className={s.body}>
                  <span className={s.label}>{typeLabel[a.type] ?? a.type}</span>
                  {data.title != null && <span className={s.detail}> · {String(data.title)}</span>}
                  {data.body != null && <span className={s.detail}> · {String(data.body).slice(0, 60)}</span>}
                </div>
                <div className={s.time}>{new Date(a.created_at).toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
