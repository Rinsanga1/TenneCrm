import { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router-dom'
import { contactStore } from '../stores/ContactStore'
import { tagStore } from '../stores/TagStore'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import type { Contact, Tag } from '@tenne/shared'
import s from './ContactsView.module.css'

function avatarColor(name: string) {
  const colors = ['var(--blue-b)', 'var(--green-b)', 'var(--yellow-b)', 'var(--purple-b)', 'var(--aqua-b)', 'var(--orange-b)']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return colors[h % colors.length]
}

export const ContactsView = observer(() => {
  const nav = useNavigate()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'person' | 'company'>('all')
  const [filterTag, setFilterTag] = useState('')
  const [filterHas, setFilterHas] = useState<'all' | 'email' | 'phone'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const session = authStore.session!

  useEffect(() => {
    contactStore.loadFromIDB(session.workspaceId)
    tagStore.load(session.workspaceId)
    api.get<Contact[]>('/contacts').then(cs => { for (const c of cs) contactStore.upsert(c) }).catch(() => {})
    api.get<Tag[]>('/tags').then(ts => ts.forEach(t => tagStore.upsert(t))).catch(() => {})
  }, [session.workspaceId])

  let contacts = query ? contactStore.search(query) : contactStore.list
  if (filterType !== 'all') contacts = contacts.filter(c => c.type === filterType)
  if (filterTag) contacts = contacts.filter(c => c.tags.includes(filterTag))
  if (filterHas === 'email') contacts = contacts.filter(c => !!c.email)
  if (filterHas === 'phone') contacts = contacts.filter(c => !!c.phone)

  const hasFilter = filterType !== 'all' || filterTag !== '' || filterHas !== 'all'

  async function createContact() {
    if (!newName.trim()) return
    const c: Contact = {
      id: crypto.randomUUID(), workspaceId: session.workspaceId,
      type: 'person', name: newName.trim(),
      fields: {}, tags: [], ownerId: session.userId,
      createdAt: Date.now(), updatedAt: Date.now(), syncId: 0,
    }
    contactStore.upsert(c)
    setCreating(false); setNewName('')
    await api.post('/contacts', c).catch(() => {})
    nav('/contacts/' + c.id)
  }

  function exportCSV() {
    const rows = [['Name', 'Email', 'Phone', 'Type', 'Website', 'Address']]
    contacts.forEach(c => rows.push([c.name, c.email ?? '', c.phone ?? '', c.type, c.website ?? '', c.address ?? '']))
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'contacts.csv'
    a.click()
  }

  const tags = tagStore.list

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h2 className={s.title}>Contacts <span className={s.countBadge}>{contacts.length}</span></h2>
        <div className={s.actions}>
          <input className={s.search} placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />
          <button className={`${s.filterBtn} ${hasFilter ? s.filterActive : ''}`} onClick={() => setShowFilters(v => !v)}>⊟ Filter</button>
          <button className={s.exportBtn} onClick={exportCSV}>↓ CSV</button>
          <button className={s.addBtn} onClick={() => setCreating(true)}>+ New</button>
        </div>
      </div>

      {showFilters && (
        <div className={s.filterBar}>
          <select className={s.filterSelect} value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}>
            <option value="all">All types</option>
            <option value="person">People</option>
            <option value="company">Companies</option>
          </select>
          <select className={s.filterSelect} value={filterHas} onChange={e => setFilterHas(e.target.value as typeof filterHas)}>
            <option value="all">Any</option>
            <option value="email">Has email</option>
            <option value="phone">Has phone</option>
          </select>
          {tags.length > 0 && (
            <select className={s.filterSelect} value={filterTag} onChange={e => setFilterTag(e.target.value)}>
              <option value="">All tags</option>
              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          {hasFilter && (
            <button className={s.clearFilter} onClick={() => { setFilterType('all'); setFilterTag(''); setFilterHas('all') }}>
              × Clear
            </button>
          )}
        </div>
      )}

      {creating && (
        <div className={s.createRow}>
          <input className={s.createInput} placeholder="Contact name" value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createContact(); if (e.key === 'Escape') setCreating(false) }} autoFocus />
          <button className={s.saveBtn} onClick={createContact}>Save</button>
          <button className={s.cancelBtn} onClick={() => setCreating(false)}>Cancel</button>
        </div>
      )}

      <div className={s.listWrap}>
        <div className={s.listHeader}>
          <span>Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Tags</span>
          <span>Type</span>
        </div>
        {contacts.length === 0 ? (
          <div className={s.empty}>{hasFilter || query ? 'No contacts match.' : 'No contacts yet. Click "+ New" to add one.'}</div>
        ) : (
          <div className={s.scrollList}>
            {contacts.map(c => {
              const color = avatarColor(c.name)
              const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              const contactTags = tags.filter(t => c.tags.includes(t.id))
              return (
                <div key={c.id} className={s.row} onClick={() => nav('/contacts/' + c.id)}>
                  <span className={s.nameCell}>
                    <span className={s.avatarSm} style={{ background: color }}>{initials}</span>
                    <span className={s.name}>{c.name}</span>
                  </span>
                  <span className={s.cell}>{c.email ?? '—'}</span>
                  <span className={s.cell}>{c.phone ?? '—'}</span>
                  <span className={s.tagsCell}>
                    {contactTags.slice(0, 2).map(t => (
                      <span key={t.id} className={s.tagPill} style={{ '--tc': t.color } as React.CSSProperties}>{t.name}</span>
                    ))}
                    {contactTags.length > 2 && <span className={s.tagMore}>+{contactTags.length - 2}</span>}
                  </span>
                  <span className={s.badge}>{c.type}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})
