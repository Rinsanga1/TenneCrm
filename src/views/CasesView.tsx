import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { caseStore } from '../stores/CaseStore'
import { contactStore } from '../stores/ContactStore'
import { dealStore } from '../stores/DealStore'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import type { Case, Contact, Deal } from '@tenne/shared'
import s from './CasesView.module.css'

export const CasesView = observer(() => {
  const session = authStore.session!
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    caseStore.load(session.workspaceId)
    contactStore.loadFromIDB(session.workspaceId)
    dealStore.loadFromIDB(session.workspaceId)
    api.get<Case[]>('/cases').then(cs => cs.forEach(c => caseStore.upsert(c))).catch(() => {})
    api.get<Contact[]>('/contacts').then(cs => cs.forEach(c => contactStore.upsert(c))).catch(() => {})
    api.get<Deal[]>('/deals').then(ds => ds.forEach(d => dealStore.upsert(d))).catch(() => {})
  }, [session.workspaceId])

  async function createCase() {
    if (!form.name.trim()) return
    const c: Case = {
      id: crypto.randomUUID(),
      workspaceId: session.workspaceId,
      name: form.name.trim(),
      description: form.description || undefined,
      status: 'open',
      contactIds: [],
      dealIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    caseStore.upsert(c)
    setCreating(false)
    setForm({ name: '', description: '' })
    await api.post('/cases', c).catch(() => {})
  }

  async function toggleStatus(c: Case) {
    const updated = { ...c, status: c.status === 'open' ? 'closed' : 'open' as Case['status'], updatedAt: Date.now() }
    caseStore.upsert(updated)
    await api.patch('/cases/' + c.id, { status: updated.status }).catch(() => {})
  }

  async function deleteCase(c: Case) {
    await api.delete('/cases/' + c.id).catch(() => {})
    caseStore.remove(c.id)
  }

  async function addContact(c: Case, contactId: string) {
    if (c.contactIds.includes(contactId)) return
    const updated = { ...c, contactIds: [...c.contactIds, contactId], updatedAt: Date.now() }
    caseStore.upsert(updated)
    await api.patch('/cases/' + c.id, { contactIds: updated.contactIds }).catch(() => {})
  }

  async function removeContact(c: Case, contactId: string) {
    const updated = { ...c, contactIds: c.contactIds.filter(id => id !== contactId), updatedAt: Date.now() }
    caseStore.upsert(updated)
    await api.patch('/cases/' + c.id, { contactIds: updated.contactIds }).catch(() => {})
  }

  const cases = caseStore.list
  const contacts = contactStore.list
  const deals = dealStore.list

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Cases</h1>
        <button className={s.addBtn} onClick={() => setCreating(true)}>+ New Case</button>
      </div>

      {creating && (
        <div className={s.createCard}>
          <input className={s.input} placeholder="Case name *" value={form.name} autoFocus onChange={e => setForm(p => ({ ...p, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') createCase(); if (e.key === 'Escape') setCreating(false) }} />
          <textarea className={s.textarea} placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
          <div className={s.createActions}>
            <button className={s.saveBtn} onClick={createCase}>Create</button>
            <button className={s.cancelBtn} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      {cases.length === 0 ? (
        <div className={s.empty}>No cases yet. Cases group related contacts and deals.</div>
      ) : (
        <div className={s.list}>
          {cases.map(c => {
            const expanded = expandedId === c.id
            const caseContacts = c.contactIds.map(id => contactStore.get(id)).filter(Boolean) as Contact[]
            const caseDeals = c.dealIds.map(id => dealStore.get(id)).filter(Boolean) as Deal[]
            const available = contacts.filter(ct => !c.contactIds.includes(ct.id))
            return (
              <div key={c.id} className={s.case}>
                <div className={s.caseHead} onClick={() => setExpandedId(expanded ? null : c.id)}>
                  <span className={s.caseIcon}>◫</span>
                  <div className={s.caseMeta}>
                    <span className={s.caseName}>{c.name}</span>
                    {c.description && <span className={s.caseDesc}>{c.description}</span>}
                  </div>
                  <span className={s.caseStatus} data-status={c.status}>{c.status}</span>
                  <span className={s.caseChevron}>{expanded ? '▲' : '▼'}</span>
                </div>
                {expanded && (
                  <div className={s.caseBody}>
                    <div className={s.caseSection}>
                      <div className={s.caseSectionTitle}>Contacts ({caseContacts.length})</div>
                      {caseContacts.map(ct => (
                        <div key={ct.id} className={s.member}>
                          <span className={s.memberName}>{ct.name}</span>
                          <button className={s.removeBtn} onClick={() => removeContact(c, ct.id)}>×</button>
                        </div>
                      ))}
                      {available.length > 0 && (
                        <select className={s.addSelect} defaultValue="" onChange={e => { if (e.target.value) addContact(c, e.target.value); e.target.value = '' }}>
                          <option value="">+ Add contact…</option>
                          {available.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                        </select>
                      )}
                    </div>
                    {caseDeals.length > 0 && (
                      <div className={s.caseSection}>
                        <div className={s.caseSectionTitle}>Deals ({caseDeals.length})</div>
                        {caseDeals.map(d => <div key={d.id} className={s.member}><span className={s.memberName}>{d.title}</span></div>)}
                      </div>
                    )}
                    <div className={s.caseFooter}>
                      <button className={s.toggleBtn} onClick={() => toggleStatus(c)}>{c.status === 'open' ? 'Close case' : 'Reopen'}</button>
                      <button className={s.deleteBtn} onClick={() => deleteCase(c)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
