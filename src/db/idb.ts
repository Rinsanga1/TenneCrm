import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Contact, Note, Task, Deal, Activity, Tag, Case } from '@tenne/shared'

interface TenneDB extends DBSchema {
  contacts: { key: string; value: Contact; indexes: { by_workspace: string; by_sync_id: number } }
  notes: { key: string; value: Note; indexes: { by_contact: string; by_sync_id: number } }
  tasks: { key: string; value: Task; indexes: { by_workspace: string; by_due: number; by_sync_id: number } }
  deals: { key: string; value: Deal; indexes: { by_workspace: string; by_sync_id: number } }
  activities: { key: string; value: Activity; indexes: { by_contact: string; by_sync_id: number } }
  tags: { key: string; value: Tag; indexes: { by_workspace: string } }
  cases: { key: string; value: Case; indexes: { by_workspace: string } }
  pending_deltas: { key: string; value: { id: string; payload: string; createdAt: number } }
}

let _db: IDBPDatabase<TenneDB> | null = null

export async function getDB(): Promise<IDBPDatabase<TenneDB>> {
  if (_db) return _db
  _db = await openDB<TenneDB>('tenne', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
      const contacts = db.createObjectStore('contacts', { keyPath: 'id' })
      contacts.createIndex('by_workspace', 'workspaceId')
      contacts.createIndex('by_sync_id', 'syncId')

      const notes = db.createObjectStore('notes', { keyPath: 'id' })
      notes.createIndex('by_contact', 'contactId')
      notes.createIndex('by_sync_id', 'syncId')

      const tasks = db.createObjectStore('tasks', { keyPath: 'id' })
      tasks.createIndex('by_workspace', 'workspaceId')
      tasks.createIndex('by_due', 'dueAt')
      tasks.createIndex('by_sync_id', 'syncId')

      const deals = db.createObjectStore('deals', { keyPath: 'id' })
      deals.createIndex('by_workspace', 'workspaceId')
      deals.createIndex('by_sync_id', 'syncId')

      const activities = db.createObjectStore('activities', { keyPath: 'id' })
      activities.createIndex('by_contact', 'contactId')
      activities.createIndex('by_sync_id', 'syncId')

        db.createObjectStore('pending_deltas', { keyPath: 'id' })
      }
      if (oldVersion < 2) {
        const tags = db.createObjectStore('tags', { keyPath: 'id' })
        tags.createIndex('by_workspace', 'workspaceId')
        const cases = db.createObjectStore('cases', { keyPath: 'id' })
        cases.createIndex('by_workspace', 'workspaceId')
      }
    },
  })
  return _db
}
