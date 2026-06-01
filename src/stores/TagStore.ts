import { makeAutoObservable, runInAction } from 'mobx'
import type { Tag } from '@tenne/shared'
import { getDB } from '../db/idb'

export class TagStore {
  tags = new Map<string, Tag>()

  constructor() { makeAutoObservable(this) }

  get list(): Tag[] {
    return Array.from(this.tags.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  async load(workspaceId: string) {
    const db = await getDB()
    const all = await db.getAllFromIndex('tags', 'by_workspace', workspaceId)
    runInAction(() => { for (const t of all) this.tags.set(t.id, t) })
  }

  upsert(tag: Tag) {
    runInAction(() => { this.tags.set(tag.id, tag) })
    getDB().then(db => db.put('tags', tag))
  }

  async remove(id: string) {
    runInAction(() => { this.tags.delete(id) })
    const db = await getDB()
    await db.delete('tags', id)
  }
}

export const tagStore = new TagStore()
