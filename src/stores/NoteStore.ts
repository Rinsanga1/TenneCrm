import { makeAutoObservable, runInAction } from 'mobx'
import type { Note } from '@tenne/shared'
import { getDB } from '../db/idb'

export class NoteStore {
  notes = new Map<string, Note>()

  constructor() {
    makeAutoObservable(this)
  }

  forContact(contactId: string): Note[] {
    return Array.from(this.notes.values())
      .filter(n => n.contactId === contactId && !n.deletedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  get(id: string): Note | undefined {
    return this.notes.get(id)
  }

  async loadFromIDB(contactId: string) {
    const db = await getDB()
    const all = await db.getAllFromIndex('notes', 'by_contact', contactId)
    runInAction(() => {
      for (const n of all) this.notes.set(n.id, n)
    })
  }

  upsert(note: Note) {
    runInAction(() => { this.notes.set(note.id, note) })
    getDB().then(db => db.put('notes', note))
  }
}

export const noteStore = new NoteStore()
