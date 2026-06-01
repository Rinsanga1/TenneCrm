import type { SyncMessage, Delta } from '@tenne/shared'
import { getDB } from '../db/idb'
import { contactStore } from '../stores/ContactStore'
import { noteStore } from '../stores/NoteStore'
import { taskStore } from '../stores/TaskStore'
import { dealStore } from '../stores/DealStore'
import { syncStore } from '../stores/SyncStore'
import type { Contact, Note, Task, Deal } from '@tenne/shared'

const CURSOR_KEY = (workspaceId: string, deviceId: string) =>
  `tenne_cursor_${workspaceId}_${deviceId}`

export class SyncEngine {
  private ws: WebSocket | null = null
  private workspaceId: string
  private deviceId: string
  private token: string
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private reconnectDelay = 1000

  constructor(workspaceId: string, deviceId: string, token: string) {
    this.workspaceId = workspaceId
    this.deviceId = deviceId
    this.token = token
  }

  get cursor(): number {
    return parseInt(localStorage.getItem(CURSOR_KEY(this.workspaceId, this.deviceId)) ?? '0')
  }

  setCursor(val: number) {
    localStorage.setItem(CURSOR_KEY(this.workspaceId, this.deviceId), String(val))
  }

  connect() {
    syncStore.setStatus('connecting')
    const url = `${import.meta.env.VITE_WS_URL ?? 'ws://localhost:8787'}/sync/${this.workspaceId}?token=${this.token}&device=${this.deviceId}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      syncStore.setStatus('connected')
      this.reconnectDelay = 1000
      this.send({ type: 'pull', cursor: this.cursor })
      this.flushPending()
    }

    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string) as SyncMessage
      this.handleMessage(msg)
    }

    this.ws.onerror = () => {
      syncStore.setStatus('error', 'WebSocket error')
    }

    this.ws.onclose = () => {
      syncStore.setStatus('disconnected')
      this.scheduleReconnect()
    }
  }

  disconnect() {
    clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  private scheduleReconnect() {
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
      this.connect()
    }, this.reconnectDelay)
  }

  private send(msg: SyncMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private handleMessage(msg: SyncMessage) {
    if (msg.type === 'broadcast') {
      for (const delta of msg.deltas) this.applyDelta(delta)
    } else if (msg.type === 'ack') {
      this.setCursor(msg.upTo)
    }
  }

  private applyDelta(delta: Delta) {
    const data = delta.data as Record<string, unknown>
    if (delta.table === 'contacts') contactStore.applyDelta(data as unknown as Contact)
    else if (delta.table === 'notes') noteStore.upsert(data as unknown as Note)
    else if (delta.table === 'tasks') taskStore.upsert(data as unknown as Task)
    else if (delta.table === 'deals') dealStore.upsert(data as unknown as Deal)
    if (delta.id) this.setCursor(parseInt(delta.id))
  }

  async pushDelta(delta: Omit<Delta, 'id' | 'workspaceId' | 'deviceId' | 'timestamp'>) {
    const db = await getDB()
    const full: Delta = {
      ...delta,
      id: crypto.randomUUID(),
      workspaceId: this.workspaceId,
      deviceId: this.deviceId,
      timestamp: Date.now(),
    }
    await db.put('pending_deltas', { id: full.id, payload: JSON.stringify(full), createdAt: full.timestamp })
    syncStore.setPending(await db.count('pending_deltas'))
    this.send({ type: 'push', deltas: [full] })
  }

  private async flushPending() {
    const db = await getDB()
    const all = await db.getAll('pending_deltas')
    if (all.length === 0) return
    const deltas = all.map(r => JSON.parse(r.payload) as Delta)
    this.send({ type: 'push', deltas })
  }
}

let _engine: SyncEngine | null = null

export function initSyncEngine(workspaceId: string, deviceId: string, token: string) {
  _engine?.disconnect()
  _engine = new SyncEngine(workspaceId, deviceId, token)
  _engine.connect()
  return _engine
}

export function getSyncEngine(): SyncEngine | null {
  return _engine
}
