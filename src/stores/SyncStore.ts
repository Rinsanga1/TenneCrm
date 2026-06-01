import { makeAutoObservable, runInAction } from 'mobx'

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export class SyncStore {
  status: SyncStatus = 'disconnected'
  pendingCount = 0
  lastSyncAt?: number
  error?: string

  constructor() {
    makeAutoObservable(this)
  }

  setStatus(status: SyncStatus, error?: string) {
    runInAction(() => {
      this.status = status
      this.error = error
      if (status === 'connected') this.lastSyncAt = Date.now()
    })
  }

  setPending(count: number) {
    runInAction(() => { this.pendingCount = count })
  }
}

export const syncStore = new SyncStore()
