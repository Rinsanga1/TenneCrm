import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { taskStore } from '../stores/TaskStore'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import type { Task, TaskCategory } from '@tenne/shared'
import s from './TasksView.module.css'

type Tab = 'today' | 'upcoming' | 'overdue'
const CATEGORIES: TaskCategory[] = ['call', 'email', 'followup', 'meeting']

export const TasksView = observer(() => {
  const [tab, setTab] = useState<Tab>('today')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<TaskCategory>('followup')
  const [newDue, setNewDue] = useState('')
  const session = authStore.session!

  useEffect(() => {
    taskStore.loadFromIDB(session.workspaceId)
    api.get<Task[]>('/tasks').then(ts => ts.forEach(t => taskStore.upsert(t))).catch(() => {})
  }, [session.workspaceId])

  const tasks = tab === 'today' ? taskStore.today : tab === 'upcoming' ? taskStore.upcoming : taskStore.overdue

  async function createTask() {
    if (!newTitle.trim()) return
    const task: Task = {
      id: crypto.randomUUID(), workspaceId: session.workspaceId, title: newTitle.trim(),
      category: newCategory, dueAt: newDue ? new Date(newDue).getTime() : undefined,
      status: 'open', createdAt: Date.now(), updatedAt: Date.now(), syncId: 0,
    }
    taskStore.upsert(task)
    setCreating(false); setNewTitle(''); setNewDue('')
    await api.post('/tasks', task).catch(() => {})
  }

  async function toggleTask(task: Task) {
    const updated = { ...task, status: task.status === 'open' ? ('done' as const) : ('open' as const), updatedAt: Date.now() }
    taskStore.upsert(updated)
    await api.patch('/tasks/' + task.id, { status: updated.status }).catch(() => {})
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h2 className={s.title}>Tasks</h2>
        <button className={s.addBtn} onClick={() => setCreating(true)}>+ New</button>
      </div>
      <div className={s.tabs}>
        {(['today', 'upcoming', 'overdue'] as Tab[]).map(t => (
          <button key={t} className={[s.tab, tab === t ? s.active : ''].join(' ')} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className={s.tabCount}>
              {t === 'today' ? taskStore.today.length : t === 'upcoming' ? taskStore.upcoming.length : taskStore.overdue.length}
            </span>
          </button>
        ))}
      </div>
      {creating && (
        <div className={s.createRow}>
          <input className={s.createInput} placeholder="Task title" value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createTask(); if (e.key === 'Escape') setCreating(false) }} autoFocus />
          <select className={s.select} value={newCategory} onChange={e => setNewCategory(e.target.value as TaskCategory)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className={s.dateInput} type="date" value={newDue} onChange={e => setNewDue(e.target.value)} />
          <button className={s.saveBtn} onClick={createTask}>Save</button>
          <button className={s.cancelBtn} onClick={() => setCreating(false)}>Cancel</button>
        </div>
      )}
      <div className={s.list}>
        {tasks.length === 0 ? (
          <div className={s.empty}>No tasks here.</div>
        ) : tasks.map(t => (
          <div key={t.id} className={s.row}>
            <button className={[s.check, t.status === 'done' ? s.checked : ''].join(' ')} onClick={() => toggleTask(t)}>
              {t.status === 'done' ? '✓' : ''}
            </button>
            <span className={[s.taskTitle, t.status === 'done' ? s.done : ''].join(' ')}>{t.title}</span>
            <span className={s.cat}>{t.category}</span>
            {t.dueAt && <span className={s.due}>{new Date(t.dueAt).toLocaleDateString()}</span>}
          </div>
        ))}
      </div>
    </div>
  )
})
