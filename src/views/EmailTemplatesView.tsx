import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import type { EmailTemplate } from '@tenne/shared'
import s from './EmailTemplatesView.module.css'

export const EmailTemplatesView = observer(() => {
  const session = authStore.session!
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  const [form, setForm] = useState({ name: '', subject: '', body: '' })
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    api.get<EmailTemplate[]>('/templates').then(setTemplates).catch(() => {})
  }, [session.workspaceId])

  async function save() {
    if (!form.name.trim()) return
    if (editing) {
      await api.patch('/templates/' + editing.id, form).catch(() => {})
      setTemplates(ts => ts.map(t => t.id === editing.id ? { ...t, ...form } : t))
    } else {
      const t: EmailTemplate = {
        id: crypto.randomUUID(), workspaceId: session.workspaceId,
        ...form, createdAt: Date.now(), updatedAt: Date.now(),
      }
      await api.post('/templates', t).catch(() => {})
      setTemplates(ts => [...ts, t])
    }
    setCreating(false); setEditing(null); setForm({ name: '', subject: '', body: '' })
  }

  function startEdit(t: EmailTemplate) {
    setEditing(t); setForm({ name: t.name, subject: t.subject, body: t.body }); setCreating(true)
  }

  async function remove(id: string) {
    await api.delete('/templates/' + id).catch(() => {})
    setTemplates(ts => ts.filter(t => t.id !== id))
  }

  function copy(t: EmailTemplate) {
    navigator.clipboard.writeText(`Subject: ${t.subject}\n\n${t.body}`)
    setCopied(t.id)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Email Templates</h1>
        <button className={s.addBtn} onClick={() => { setEditing(null); setForm({ name: '', subject: '', body: '' }); setCreating(true) }}>+ New Template</button>
      </div>

      {creating && (
        <div className={s.form}>
          <div className={s.formTitle}>{editing ? 'Edit Template' : 'New Template'}</div>
          <input className={s.input} placeholder="Template name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
          <input className={s.input} placeholder="Subject" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
          <textarea className={s.textarea} placeholder={`Body\n\nUse {{first_name}}, {{company}} as placeholders`} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={8} />
          <div className={s.formActions}>
            <button className={s.saveBtn} onClick={save}>{editing ? 'Update' : 'Create'}</button>
            <button className={s.cancelBtn} onClick={() => { setCreating(false); setEditing(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {templates.length === 0 && !creating ? (
        <div className={s.empty}>No templates yet. Create reusable email templates to save time on repetitive replies.</div>
      ) : (
        <div className={s.list}>
          {templates.map(t => (
            <div key={t.id} className={s.card}>
              <div className={s.cardHead}>
                <span className={s.cardName}>{t.name}</span>
                <div className={s.cardActions}>
                  <button className={`${s.actionBtn} ${copied === t.id ? s.copied : ''}`} onClick={() => copy(t)}>
                    {copied === t.id ? '✓ Copied' : '⎘ Copy'}
                  </button>
                  <button className={s.actionBtn} onClick={() => startEdit(t)}>Edit</button>
                  <button className={`${s.actionBtn} ${s.deleteBtn}`} onClick={() => remove(t.id)}>Delete</button>
                </div>
              </div>
              {t.subject && <div className={s.subject}>Subject: {t.subject}</div>}
              <div className={s.body}>{t.body || <span className={s.empty}>No body</span>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
