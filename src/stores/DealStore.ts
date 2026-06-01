import { makeAutoObservable, runInAction } from 'mobx'
import type { Deal } from '@tenne/shared'
import { getDB } from '../db/idb'

export class DealStore {
  deals = new Map<string, Deal>()

  constructor() {
    makeAutoObservable(this)
  }

  get list(): Deal[] {
    return Array.from(this.deals.values()).filter(d => !d.deletedAt)
  }

  byStatus(status: string): Deal[] {
    return this.list.filter(d => d.status === status)
  }

  get(id: string): Deal | undefined {
    return this.deals.get(id)
  }

  async loadFromIDB(workspaceId: string) {
    const db = await getDB()
    const all = await db.getAllFromIndex('deals', 'by_workspace', workspaceId)
    runInAction(() => {
      for (const d of all) this.deals.set(d.id, d)
    })
  }

  upsert(deal: Deal) {
    runInAction(() => { this.deals.set(deal.id, deal) })
    getDB().then(db => db.put('deals', deal))
  }
}

export const dealStore = new DealStore()
