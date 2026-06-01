import { makeAutoObservable, runInAction } from 'mobx'
import type { Task } from '@tenne/shared'
import { getDB } from '../db/idb'

export class TaskStore {
  tasks = new Map<string, Task>()

  constructor() {
    makeAutoObservable(this)
  }

  get list(): Task[] {
    return Array.from(this.tasks.values()).filter(t => !t.deletedAt)
  }

  get today(): Task[] {
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    return this.list.filter(
      t => t.status === 'open' && t.dueAt != null && t.dueAt <= endOfDay.getTime()
    )
  }

  get upcoming(): Task[] {
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    return this.list.filter(
      t => t.status === 'open' && t.dueAt != null && t.dueAt > endOfDay.getTime()
    )
  }

  get overdue(): Task[] {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    return this.list.filter(
      t => t.status === 'open' && t.dueAt != null && t.dueAt < startOfDay.getTime()
    )
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id)
  }

  forContact(contactId: string): Task[] {
    return this.list.filter(t => t.contactId === contactId)
  }

  async loadFromIDB(workspaceId: string) {
    const db = await getDB()
    const all = await db.getAllFromIndex('tasks', 'by_workspace', workspaceId)
    runInAction(() => {
      for (const t of all) this.tasks.set(t.id, t)
    })
  }

  upsert(task: Task) {
    runInAction(() => { this.tasks.set(task.id, task) })
    getDB().then(db => db.put('tasks', task))
  }
}

export const taskStore = new TaskStore()
