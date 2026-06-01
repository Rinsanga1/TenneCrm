import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { contactStore } from '../stores/ContactStore'
import { noteStore } from '../stores/NoteStore'
import { taskStore } from '../stores/TaskStore'
import { tagStore } from '../stores/TagStore'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import type { Contact, Note, Task, Tag } from '@tenne/shared'
import s from './ContactDetailView.module.css'

const NOTE_TYPES = [
  { value: 'note', label: '📝 Note' },
  { value: 'email', label: '✉️ Email' },
  { value: 'call', label: '📞 Call' },
  { value: 'comment', label: '💬 Comment' },
]

function avatarColor(name: string) {
  const colors = ['var(--blue-b)', 'var(--green-b)', 'var(--yellow-b)', 'var(--purple-b)', 'var(--aqua-b)', 'var(--orange-b)']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return colors[h % colors.length]
}

function InlineField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  function commit() { setEditing(false); if (draft !== value) onChange(draft) }
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      {editing ? (
        <input className={s.fieldInput} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }} autoFocus />
      ) : (
        <span className={s.fieldValue} onClick={() => { setDraft(value); setEditing(true) }}>
          {value || <span className={s.emptyVal}>—</span>}
        </span>
      )}
    </div>
  )
}

export const ContactDetailView = observer(() => {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const session = authStore.session!
  const contact = id ? contactStore.get(id) : undefined
  const notes = id ? noteStore.forContact(id) : []
  const tasks = id ? taskStore.forContact(id) : []
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('note')
  const [addingNote, setAddingNote] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [newFieldKey, setNewFieldKey] = useState('')
  const [addingField, setAddingField] = useState(false)

  useEffect(() => {
    if (!id) return
    noteStore.loadFromIDB(id)
    tagStore.load(session.workspaceId)
    api.get<Note[]>('/notes?contactId=' + id).then(ns => ns.forEach(n => noteStore.upsert(n))).catch(() => {})
    api.get<Task[]>('/tasks?contactId=' + id).then(ts => ts.forEach(t => taskStore.upsert(t))).catch(() => {})
    api.get<Tag[]>('/tags').then(ts => ts.forEach(t => tagStore.upsert(t))).catch(() => {})
  }, [id])

  if (!contact) return <div className={s.notFound}>Contact not found.</div>

  function updateField(field: keyof Contact, value: string) {
    const updated = { ...contact!, [field]: value, updatedAt: Date.now() }
    contactStore.upsert(updated)
  }

  function updateCustomField(key: string, value: string) {
    const updated = { ...contact!, fields: { ...contact!.fields, [key]: value }, updatedAt: Date.now() }
    contactStore.upsert(updated)
  }

  function removeCustomField(key: string) {
    const fields = { ...contact!.fields }
    delete fields[key]
    contactStore.upsert({ ...contact!, fields, updatedAt: Date.now() })
  }

  function addCustomField() {
    if (!newFieldKey.trim()) return
    updateCustomField(newFieldKey.trim(), '')
    setNewFieldKey('')
    setAddingField(false)
  }

  function toggleTag(tagId: string) {
    const tags = contact!.tags.includes(tagId)
      ? contact!.tags.filter(t => t !== tagId)
      : [...contact!.tags, tagId]
    contactStore.upsert({ ...contact!, tags, updatedAt: Date.now() })
  }

  async function saveContact() {
    if (!contact) return
    setSaving(true); setSaveStatus('idle')
    try {
      await api.patch('/contacts/' + contact.id, contact).catch(async (e) => {
        if (e.message === 'Not found') await api.post('/contacts', contact)
        else throw e
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch { setSaveStatus('error') }
    finally { setSaving(false) }
  }

  function commitName() {
    setEditingName(false)
    if (nameDraft.trim() && nameDraft !== contact!.name) updateField('name', nameDraft.trim())
  }

  async function saveNote() {
    if (!newNote.trim()) return
    const note: Note = {
      id: crypto.randomUUID(), workspaceId: session.workspaceId,
      contactId: contact!.id, body: newNote.trim(),
      authorId: session.userId, attachments: [],
      createdAt: Date.now(), updatedAt: Date.now(), syncId: 0,
    }
    noteStore.upsert(note)
    setNewNote(''); setAddingNote(false)
    await api.post('/notes', note).catch(() => {})
  }

  async function deleteContact() {
    await api.delete('/contacts/' + contact!.id).catch(() => {})
    await contactStore.hardDelete(contact!.id)
    nav('/contacts')
  }

  async function toggleTaskStatus(task: Task) {
    const updated = { ...task, status: task.status === 'done' ? 'open' : 'done' as Task['status'], updatedAt: Date.now() }
    taskStore.upsert(updated)
    await api.patch('/tasks/' + task.id, { status: updated.status }).catch(() => {})
  }

  const allTags = tagStore.list
  const color = avatarColor(contact.name)
  const initials = contact.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const customFields = Object.entries(contact.fields ?? {})

  return (
    <div className={s.page}>
      <div className={s.topbar}>
        <button className={s.backBtn} onClick={() => nav('/contacts')}>← Contacts</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={s.saveBtn} onClick={saveContact} disabled={saving}>
            {saving ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : saveStatus === 'error' ? 'Error' : 'Save'}
          </button>
          <button className={s.deleteBtn} onClick={deleteContact}>Delete</button>
        </div>
      </div>

      <div className={s.body}>
        <div className={s.main}>
          <div className={s.nameRow}>
            <div className={s.avatar} style={{ background: color }}>{initials}</div>
            <div className={s.nameBlock}>
              {editingName ? (
                <input className={s.nameInput} value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                  onBlur={commitName} onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false) }} autoFocus />
              ) : (
                <span className={s.nameLarge} onClick={() => { setNameDraft(contact.name); setEditingName(true) }}>{contact.name}</span>
              )}
              <span className={s.typePill}>{contact.type}</span>
            </div>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className={s.section}>
              <div className={s.sectionTitle}>Tags</div>
              <div className={s.tagRow}>
                {allTags.map(tag => (
                  <button key={tag.id} className={`${s.tagChip} ${contact.tags.includes(tag.id) ? s.tagActive : ''}`}
                    style={{ '--tc': tag.color } as React.CSSProperties} onClick={() => toggleTag(tag.id)}>
                    <span className={s.tagDot} style={{ background: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div className={s.section}>
            <div className={s.sectionTitle}>Details</div>
            <InlineField label="Email" value={contact.email ?? ''} onChange={v => updateField('email', v)} />
            <InlineField label="Phone" value={contact.phone ?? ''} onChange={v => updateField('phone', v)} />
            <InlineField label="Website" value={contact.website ?? ''} onChange={v => updateField('website', v)} />
            <InlineField label="Address" value={contact.address ?? ''} onChange={v => updateField('address', v)} />
          </div>

          {/* Custom Fields */}
          <div className={s.section}>
            <div className={s.sectionTitle}>
              Custom Fields
              <button className={s.addFieldBtn} onClick={() => setAddingField(true)}>+</button>
            </div>
            {customFields.map(([key, val]) => (
              <div key={key} className={s.field}>
                <span className={s.fieldLabel}>{key}</span>
                <input className={s.fieldInput} defaultValue={String(val)}
                  onBlur={e => updateCustomField(key, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                <button className={s.removeFieldBtn} onClick={() => removeCustomField(key)}>×</button>
              </div>
            ))}
            {addingField && (
              <div className={s.addFieldRow}>
                <input className={s.fieldInput} placeholder="Field name" value={newFieldKey}
                  onChange={e => setNewFieldKey(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') addCustomField(); if (e.key === 'Escape') setAddingField(false) }} />
                <button className={s.saveBtn} onClick={addCustomField}>Add</button>
                <button className={s.cancelBtn} onClick={() => setAddingField(false)}>×</button>
              </div>
            )}
            {customFields.length === 0 && !addingField && (
              <span className={s.emptyVal} style={{ fontSize: 12, padding: '4px 0', display: 'block' }}>No custom fields. Click + to add one.</span>
            )}
          </div>

          {/* Tasks */}
          <div className={s.section}>
            <div className={s.sectionTitle}>Tasks <span className={s.count}>{tasks.length}</span></div>
            {tasks.map(t => (
              <div key={t.id} className={s.taskRow} onClick={() => toggleTaskStatus(t)}>
                <span className={s.taskStatus}>{t.status === 'done' ? '✓' : '○'}</span>
                <span className={t.status === 'done' ? s.taskDone : s.taskTitle}>{t.title}</span>
                {t.dueAt && <span className={s.due}>{new Date(t.dueAt).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className={s.feed}>
          <div className={s.feedHeader}>
            <span>Activity</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {addingNote && (
                <select className={s.noteTypeSelect} value={noteType} onChange={e => setNoteType(e.target.value)}>
                  {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              )}
              <button className={s.addNoteBtn} onClick={() => setAddingNote(true)}>+ Note</button>
            </div>
          </div>
          <div className={s.feedScroll}>
            {addingNote && (
              <div className={s.noteCompose}>
                <div className={s.noteTypeBadge}>{NOTE_TYPES.find(t => t.value === noteType)?.label}</div>
                <textarea className={s.noteInput} placeholder="Write a note…" value={newNote}
                  onChange={e => setNewNote(e.target.value)} autoFocus rows={4} />
                <div className={s.noteActions}>
                  <button className={s.saveBtn} onClick={saveNote}>Save</button>
                  <button className={s.cancelBtn} onClick={() => { setAddingNote(false); setNewNote('') }}>Cancel</button>
                </div>
              </div>
            )}
            {notes.map(n => (
              <div key={n.id} className={s.noteCard}>
                <div className={s.noteBody}>{n.body}</div>
                <div className={s.noteMeta}>{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {notes.length === 0 && !addingNote && <div className={s.feedEmpty}>No notes yet.</div>}
          </div>
        </div>
      </div>
    </div>
  )
})
