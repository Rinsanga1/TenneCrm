import { makeAutoObservable, runInAction } from 'mobx'
import type { Contact } from '@tenne/shared'
import { getDB } from '../db/idb'

export class ContactStore {
  contacts = new Map<string, Contact>()
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  get list(): Contact[] {
    return Array.from(this.contacts.values())
      .filter(c => !c.deletedAt)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  get(id: string): Contact | undefined {
    return this.contacts.get(id)
  }

  async loadFromIDB(workspaceId: string) {
    const db = await getDB()
    const all = await db.getAllFromIndex('contacts', 'by_workspace', workspaceId)
    runInAction(() => {
      for (const c of all) this.contacts.set(c.id, c)
    })
  }

  applyDelta(contact: Contact) {
    runInAction(() => { this.contacts.set(contact.id, contact) })
    getDB().then(db => db.put('contacts', contact))
  }

  upsert(contact: Contact) {
    runInAction(() => { this.contacts.set(contact.id, contact) })
    getDB().then(db => db.put('contacts', contact))
  }

  async hardDelete(id: string) {
    runInAction(() => { this.contacts.delete(id) })
    const db = await getDB()
    await db.delete('contacts', id)
  }

  search(query: string): Contact[] {
    const q = query.toLowerCase()
    return this.list.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    )
  }
}

export const contactStore = new ContactStore()
