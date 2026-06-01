import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { dealStore } from '../stores/DealStore'
import { contactStore } from '../stores/ContactStore'
import { noteStore } from '../stores/NoteStore'
import { taskStore } from '../stores/TaskStore'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import type { Deal, Note, Task, Contact, DealStatus } from '@tenne/shared'
import s from './DealDetailView.module.css'

const NOTE_TYPES = [
  { value: 'note', label: '📝 Note' },
  { value: 'email', label: '✉️ Email' },
  { value: 'call', label: '📞 Call' },
  { value: 'comment', label: '💬 Comment' },
]

const PRICE_TYPES = ['fixed', 'hour', 'month', 'year'] as const

const STATUS_ACCENT: Record<DealStatus, string> = {
  pending: 'var(--yellow-b)',
  won: 'var(--green-b)',
  lost: 'var(--red-b)',
}

function fmt(n: number) {
  return `$${n.toLocaleString()}`
}

export const DealDetailView = observer(() => {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const session = authStore.session!
  const deal = id ? dealStore.get(id) : undefined
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: '', value: '', status: 'pending' as DealStatus, priceType: 'fixed', contactId: '', category: '', notesText: '' })
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('note')
  const [addingNote, setAddingNote] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  useEffect(() => {
    if (!id) return
    dealStore.loadFromIDB(session.workspaceId)
    contactStore.loadFromIDB(session.workspaceId)
    noteStore.loadFromIDB(id)
    api.get<Deal[]>('/deals').then(ds => ds.forEach(d => dealStore.upsert(d))).catch(() => {})
    api.get<Contact[]>('/contacts').then(cs => cs.forEach(c => contactStore.upsert(c))).catch(() => {})
    api.get<Note[]>('/notes?contactId=' + id).then(ns => ns.forEach(n => noteStore.upsert(n))).catch(() => {})
    api.get<Task[]>('/tasks?contactId=' + id).then(ts => ts.forEach(t => taskStore.upsert(t))).catch(() => {})
  }, [id])

  if (!deal) return <div className={s.notFound}>Deal not found.</div>

  const d = deal
  const contact = d.contactId ? contactStore.get(d.contactId) : undefined
  const notes = noteStore.forContact(id!)
  const tasks = taskStore.forContact(id!)
  const contacts = contactStore.list

  function startEdit() {
    setForm({
      title: d.title, value: d.value?.toString() ?? '',
      status: d.status, priceType: d.priceType ?? 'fixed',
      contactId: d.contactId ?? '', category: d.category ?? '',
      notesText: d.notesText ?? '',
    })
    setEditing(true)
  }

  async function saveEdit() {
    const updated: Deal = {
      ...d,
      title: form.title,
      value: form.value ? parseFloat(form.value) : undefined,
      status: form.status,
      priceType: form.priceType as Deal['priceType'],
      contactId: form.contactId || undefined,
      category: form.category || undefined,
      notesText: form.notesText || undefined,
      updatedAt: Date.now(),
    }
    dealStore.upsert(updated)
    await api.patch('/deals/' + d.id, updated).catch(() => {})
    setEditing(false)
  }

  async function moveStatus(status: DealStatus) {
    const updated = { ...d, status, updatedAt: Date.now() }
    dealStore.upsert(updated)
    await api.patch('/deals/' + d.id, { status }).catch(() => {})
  }

  async function deleteDeal() {
    await api.delete('/deals/' + d.id).catch(() => {})
    dealStore.upsert({ ...d, deletedAt: Date.now() })
    nav('/deals')
  }

  async function saveNote() {
    if (!newNote.trim()) return
    const note: Note = {
      id: crypto.randomUUID(), workspaceId: session.workspaceId,
      contactId: d.id, body: newNote.trim(),
      authorId: session.userId, attachments: [],
      createdAt: Date.now(), updatedAt: Date.now(), syncId: 0,
    }
    noteStore.upsert(note)
    setNewNote(''); setAddingNote(false)
    await api.post('/notes', note).catch(() => {})
  }

  async function saveTask() {
    if (!newTask.trim()) return
    const task: Task = {
      id: crypto.randomUUID(), workspaceId: session.workspaceId,
      dealId: d.id, title: newTask.trim(),
      category: 'followup', status: 'open',
      dueAt: taskDue ? new Date(taskDue).getTime() : undefined,
      createdAt: Date.now(), updatedAt: Date.now(), syncId: 0,
    }
    taskStore.upsert(task)
    setNewTask(''); setTaskDue(''); setAddingTask(false)
    await api.post('/tasks', task).catch(() => {})
  }

  async function toggleTask(task: Task) {
    const updated = { ...task, status: task.status === 'done' ? 'open' : 'done' as Task['status'], updatedAt: Date.now() }
    taskStore.upsert(updated)
    await api.patch('/tasks/' + task.id, { status: updated.status }).catch(() => {})
  }

  const accent = STATUS_ACCENT[d.status]

  return (
    <div className={s.page}>
      <div className={s.topbar}>
        <button className={s.backBtn} onClick={() => nav('/deals')}>← Deals</button>
        <div className={s.topActions}>
          {editing ? (
            <>
              <button className={s.saveBtn} onClick={saveEdit}>Save</button>
              <button className={s.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button className={s.editBtn} onClick={startEdit}>Edit</button>
              <button className={s.deleteBtn} onClick={deleteDeal}>Delete</button>
            </>
          )}
        </div>
      </div>

      <div className={s.body}>
        {/* Left panel */}
        <div className={s.panel}>
          <div className={s.dealHeader}>
            <div className={s.dealIcon} style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)` }}>◈</div>
            <div>
              {editing ? (
                <input className={s.titleInput} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              ) : (
                <div className={s.dealTitle}>{d.title}</div>
              )}
              <span className={s.statusBadge} style={{ color: accent, background: `color-mix(in srgb, ${accent} 15%, transparent)` }}>
                {d.status}
              </span>
            </div>
          </div>

          {editing ? (
            <div className={s.editForm}>
              <div className={s.editRow}>
                <label className={s.editLabel}>Value</label>
                <input className={s.editInput} type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} />
              </div>
              <div className={s.editRow}>
                <label className={s.editLabel}>Per</label>
                <select className={s.editSelect} value={form.priceType} onChange={e => setForm(p => ({ ...p, priceType: e.target.value }))}>
                  {PRICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={s.editRow}>
                <label className={s.editLabel}>Status</label>
                <select className={s.editSelect} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as DealStatus }))}>
                  <option value="pending">Pending</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div className={s.editRow}>
                <label className={s.editLabel}>Contact</label>
                <select className={s.editSelect} value={form.contactId} onChange={e => setForm(p => ({ ...p, contactId: e.target.value }))}>
                  <option value="">None</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={s.editRow}>
                <label className={s.editLabel}>Category</label>
                <input className={s.editInput} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Consulting" />
              </div>
              <div className={s.editRow} style={{ alignItems: 'flex-start' }}>
                <label className={s.editLabel} style={{ paddingTop: 6 }}>Notes</label>
                <textarea className={s.editTextarea} value={form.notesText} onChange={e => setForm(p => ({ ...p, notesText: e.target.value }))} rows={4} />
              </div>
            </div>
          ) : (
            <div className={s.details}>
              {d.value != null && (
                <div className={s.detailRow}>
                  <span className={s.detailLabel}>Value</span>
                  <span className={s.detailVal} style={{ color: accent, fontWeight: 600 }}>
                    {fmt(d.value)}{d.priceType !== 'fixed' ? `/${d.priceType}` : ''}
                  </span>
                </div>
              )}
              {contact && (
                <div className={s.detailRow}>
                  <span className={s.detailLabel}>Contact</span>
                  <button className={s.linkBtn} onClick={() => nav('/contacts/' + contact.id)}>{contact.name}</button>
                </div>
              )}
              {d.category && (
                <div className={s.detailRow}>
                  <span className={s.detailLabel}>Category</span>
                  <span className={s.detailVal}>{d.category}</span>
                </div>
              )}
              {d.notesText && (
                <div className={s.notesBlock}>
                  <div className={s.detailLabel} style={{ marginBottom: 4 }}>Notes</div>
                  <div className={s.notesText}>{d.notesText}</div>
                </div>
              )}

              {/* Quick status change */}
              <div className={s.statusActions}>
                {d.status !== 'won' && <button className={s.wonBtn} onClick={() => moveStatus('won')}>Mark Won</button>}
                {d.status !== 'lost' && <button className={s.lostBtn} onClick={() => moveStatus('lost')}>Mark Lost</button>}
                {d.status !== 'pending' && <button className={s.reopenBtn} onClick={() => moveStatus('pending')}>Reopen</button>}
              </div>
            </div>
          )}
        </div>

        {/* Right panel — activity */}
        <div className={s.main}>
          {/* Tasks */}
          <div className={s.section}>
            <div className={s.sectionHead}>
              <span className={s.sectionTitle}>Tasks</span>
              <button className={s.addSmBtn} onClick={() => setAddingTask(true)}>+ Task</button>
            </div>
            {addingTask && (
              <div className={s.compose}>
                <input className={s.composeInput} placeholder="Task title" value={newTask} onChange={e => setNewTask(e.target.value)} autoFocus />
                <input className={s.composeInput} type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} style={{ width: 140 }} />
                <div className={s.composeActions}>
                  <button className={s.saveBtn} onClick={saveTask}>Add</button>
                  <button className={s.cancelBtn} onClick={() => setAddingTask(false)}>Cancel</button>
                </div>
              </div>
            )}
            {tasks.length === 0 && !addingTask && <div className={s.empty}>No tasks.</div>}
            {tasks.map(t => (
              <div key={t.id} className={s.taskRow} onClick={() => toggleTask(t)}>
                <span className={s.taskCheck}>{t.status === 'done' ? '✓' : '○'}</span>
                <span className={t.status === 'done' ? s.taskDone : s.taskTitle}>{t.title}</span>
                {t.dueAt && <span className={s.taskDue}>{new Date(t.dueAt).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className={s.section}>
            <div className={s.sectionHead}>
              <span className={s.sectionTitle}>Notes</span>
              <div className={s.sectionHeadRight}>
                {addingNote && (
                  <select className={s.noteTypeSelect} value={noteType} onChange={e => setNoteType(e.target.value)}>
                    {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                )}
                <button className={s.addSmBtn} onClick={() => setAddingNote(true)}>+ Note</button>
              </div>
            </div>
            {addingNote && (
              <div className={s.compose}>
                <div className={s.noteTypeBadge}>{NOTE_TYPES.find(t => t.value === noteType)?.label}</div>
                <textarea className={s.composeTextarea} placeholder="Write a note…" value={newNote} onChange={e => setNewNote(e.target.value)} autoFocus rows={3} />
                <div className={s.composeActions}>
                  <button className={s.saveBtn} onClick={saveNote}>Save</button>
                  <button className={s.cancelBtn} onClick={() => { setAddingNote(false); setNewNote('') }}>Cancel</button>
                </div>
              </div>
            )}
            {notes.length === 0 && !addingNote && <div className={s.empty}>No notes yet.</div>}
            {notes.map(n => (
              <div key={n.id} className={s.noteCard}>
                <div className={s.noteBody}>{n.body}</div>
                <div className={s.noteMeta}>{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})
