import { makeAutoObservable, runInAction } from 'mobx'
import type { AuthSession } from '@tenne/shared'

const SESSION_KEY = 'tenne_session'

export class AuthStore {
  session: AuthSession | null = null

  constructor() {
    makeAutoObservable(this)
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        const s = JSON.parse(raw) as AuthSession
        if (s.expiresAt > Date.now()) this.session = s
        else localStorage.removeItem(SESSION_KEY)
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    }
  }

  get isAuthenticated(): boolean {
    return this.session !== null
  }

  setSession(session: AuthSession) {
    runInAction(() => { this.session = session })
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }

  clearSession() {
    runInAction(() => { this.session = null })
    localStorage.removeItem(SESSION_KEY)
  }
}

export const authStore = new AuthStore()
