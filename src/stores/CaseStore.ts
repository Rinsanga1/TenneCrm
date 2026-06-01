import { makeAutoObservable, runInAction } from 'mobx'
import type { Case } from '@tenne/shared'
import { getDB } from '../db/idb'

export class CaseStore {
  cases = new Map<string, Case>()

  constructor() { makeAutoObservable(this) }

  get list(): Case[] {
    return Array.from(this.cases.values())
      .filter(c => !c.deletedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  get(id: string) { return this.cases.get(id) }

  async load(workspaceId: string) {
    const db = await getDB()
    const all = await db.getAllFromIndex('cases', 'by_workspace', workspaceId)
    runInAction(() => { for (const c of all) this.cases.set(c.id, c) })
  }

  upsert(c: Case) {
    runInAction(() => { this.cases.set(c.id, c) })
    getDB().then(db => db.put('cases', c))
  }

  async remove(id: string) {
    runInAction(() => { this.cases.delete(id) })
    const db = await getDB()
    await db.delete('cases', id)
  }
}

export const caseStore = new CaseStore()
