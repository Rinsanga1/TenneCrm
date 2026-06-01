import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { tagStore } from '../stores/TagStore'
import { authStore } from '../stores/AuthStore'
import { api } from '../api/client'
import type { Tag } from '@tenne/shared'
import s from './TagsView.module.css'

const COLORS = ['#98971a', '#458588', '#d65d0e', '#b16286', '#689d6a', '#cc241d', '#d79921', '#a89984']

export const TagsView = observer(() => {
  const session = authStore.session!
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])

  useEffect(() => {
    tagStore.load(session.workspaceId)
    api.get<Tag[]>('/tags').then(ts => ts.forEach(t => tagStore.upsert(t))).catch(() => {})
  }, [session.workspaceId])

  async function createTag() {
    if (!name.trim()) return
    const tag: Tag = {
      id: crypto.randomUUID(),
      workspaceId: session.workspaceId,
      name: name.trim(),
      color,
      createdAt: Date.now(),
    }
    tagStore.upsert(tag)
    setCreating(false)
    setName('')
    setColor(COLORS[0])
    await api.post('/tags', tag).catch(() => {})
  }

  async function deleteTag(tag: Tag) {
    await api.delete('/tags/' + tag.id).catch(() => {})
    tagStore.remove(tag.id)
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Tags</h1>
        <button className={s.addBtn} onClick={() => setCreating(true)}>+ New Tag</button>
      </div>

      {creating && (
        <div className={s.createCard}>
          <input className={s.input} placeholder="Tag name *" value={name} autoFocus onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createTag(); if (e.key === 'Escape') setCreating(false) }} />
          <div className={s.palette}>
            {COLORS.map(c => (
              <button key={c} className={`${s.swatch} ${color === c ? s.swatchActive : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
          <div className={s.createActions}>
            <button className={s.saveBtn} onClick={createTag}>Create</button>
            <button className={s.cancelBtn} onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      {tagStore.list.length === 0 ? (
        <div className={s.empty}>No tags yet. Tags help categorise contacts and deals.</div>
      ) : (
        <div className={s.tags}>
          {tagStore.list.map(tag => (
            <div key={tag.id} className={s.tag} style={{ '--c': tag.color } as React.CSSProperties}>
              <span className={s.tagDot} style={{ background: tag.color }} />
              <span className={s.tagName}>{tag.name}</span>
              <button className={s.tagDelete} onClick={() => deleteTag(tag)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
