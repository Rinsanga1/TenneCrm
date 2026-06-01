import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router-dom'
import { dealStore } from '../stores/DealStore'
import { contactStore } from '../stores/ContactStore'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import type { Deal, Contact, DealStatus } from '@tenne/shared'
import s from './DealsView.module.css'

const PRICE_TYPES = ['fixed', 'hour', 'month', 'year'] as const

function fmt(n: number) {
  return n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M`
    : n >= 1000 ? `$${(n / 1000).toFixed(1)}K`
    : `$${n.toLocaleString()}`
}

const COL_ACCENT: Record<DealStatus, string> = {
  pending: 'var(--yellow-b)',
  won: 'var(--green-b)',
  lost: 'var(--red-b)',
}

export const DealsView = observer(() => {
  const session = authStore.session!
  const nav = useNavigate()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', value: '', status: 'pending' as DealStatus, priceType: 'fixed', contactId: '', category: '' })

  useEffect(() => {
    dealStore.loadFromIDB(session.workspaceId)
    contactStore.loadFromIDB(session.workspaceId)
    api.get<Deal[]>('/deals').then(ds => ds.forEach(d => dealStore.upsert(d))).catch(() => {})
    api.get<Contact[]>('/contacts').then(cs => cs.forEach(c => contactStore.upsert(c))).catch(() => {})
  }, [session.workspaceId])

  async function createDeal() {
    if (!form.title.trim()) return
    const deal: Deal = {
      id: crypto.randomUUID(), workspaceId: session.workspaceId,
      title: form.title.trim(),
      value: form.value ? parseFloat(form.value) : undefined,
      status: form.status, priceType: form.priceType as Deal['priceType'],
      contactId: form.contactId || undefined,
      category: form.category || undefined,
      createdAt: Date.now(), updatedAt: Date.now(), syncId: 0,
    }
    dealStore.upsert(deal)
    setCreating(false)
    setForm({ title: '', value: '', status: 'pending', priceType: 'fixed', contactId: '', category: '' })
    await api.post('/deals', deal).catch(() => {})
    nav('/deals/' + deal.id)
  }

  async function moveStatus(deal: Deal, status: DealStatus) {
    const updated = { ...deal, status, updatedAt: Date.now() }
    dealStore.upsert(updated)
    await api.patch('/deals/' + deal.id, { status }).catch(() => {})
  }

  async function deleteDeal(deal: Deal) {
    dealStore.upsert({ ...deal, deletedAt: Date.now() })
    await api.delete('/deals/' + deal.id).catch(() => {})
  }

  const deals = dealStore.list
  const contacts = contactStore.list

  const cols: DealStatus[] = ['pending', 'won', 'lost']
  const totalPipeline = deals.filter(d => d.status === 'pending').reduce((s, d) => s + (d.value ?? 0), 0)

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Deals</h1>
          {totalPipeline > 0 && <span className={s.sub}>Pipeline: {fmt(totalPipeline)}</span>}
        </div>
        <button className={s.addBtn} onClick={() => setCreating(true)}>+ New Deal</button>
      </div>

      {creating && (
        <div className={s.createCard}>
          <input className={s.input} placeholder="Deal title *" value={form.title} autoFocus onChange={e => setForm(p => ({ ...p, title: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') createDeal(); if (e.key === 'Escape') setCreating(false) }} />
          <div className={s.createRow}>
            <input className={s.input} placeholder="Value" type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} style={{ flex: 1 }} />
            <select className={s.select} value={form.priceType} onChange={e => setForm(p => ({ ...p, priceType: e.target.value }))}>
              {PRICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className={s.createRow}>
            <select className={s.select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as DealStatus }))}>
              <option value="pending">Pending</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <select className={s.select} value={form.contactId} onChange={e => setForm(p => ({ ...p, contactId: e.target.value }))}>
              <option value="">No contact</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <input className={s.input} placeholder="Category (e.g. Consulting, Software)" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
          <div className={s.createActions}>
            <button className={s.saveBtn} onClick={createDeal}>Create</button>
            <button className={s.cancelBtn} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className={s.board}>
        {cols.map(status => {
          const col = deals.filter(d => d.status === status)
          const total = col.reduce((s, d) => s + (d.value ?? 0), 0)
          return (
            <div key={status} className={s.column}>
              <div className={s.colHead}>
                <span className={s.colLabel} style={{ color: COL_ACCENT[status] }}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                <span className={s.colCount}>{col.length}</span>
                {total > 0 && <span className={s.colTotal}>{fmt(total)}</span>}
              </div>
              <div className={s.cards}>
                {col.map(deal => {
                  const contact = deal.contactId ? contactStore.get(deal.contactId) : undefined
                  return (
                    <div key={deal.id} className={s.card} onClick={() => nav('/deals/' + deal.id)}>
                      <div className={s.cardTop}>
                        <span className={s.cardTitle}>{deal.title}</span>
                        <button className={s.cardDelete} onClick={e => { e.stopPropagation(); deleteDeal(deal) }}>×</button>
                      </div>
                      {deal.value != null && (
                        <div className={s.cardValue} style={{ color: COL_ACCENT[status] }}>
                          {fmt(deal.value)}{deal.priceType !== 'fixed' ? `/${deal.priceType}` : ''}
                        </div>
                      )}
                      {contact && <div className={s.cardContact}>{contact.name}</div>}
                      {deal.category && <div className={s.cardCategory}>{deal.category}</div>}
                      <div className={s.cardActions} onClick={e => e.stopPropagation()}>
                        {status !== 'won' && <button className={s.wonBtn} onClick={() => moveStatus(deal, 'won')}>Won</button>}
                        {status !== 'lost' && <button className={s.lostBtn} onClick={() => moveStatus(deal, 'lost')}>Lost</button>}
                        {status !== 'pending' && <button className={s.reopenBtn} onClick={() => moveStatus(deal, 'pending')}>Reopen</button>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})
