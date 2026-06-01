import { api } from './client'
import type { AuthSession } from '@tenne/shared'
import { authStore } from '../stores/AuthStore'

export async function login(email: string, password: string): Promise<void> {
  const session = await api.post<AuthSession>('/auth/login', { email, password })
  authStore.setSession(session)
}

export async function signup(name: string, email: string, password: string): Promise<void> {
  const session = await api.post<AuthSession>('/auth/signup', { name, email, password })
  authStore.setSession(session)
}

export async function logout(): Promise<void> {
  try { await api.post('/auth/logout', {}) } catch { /* ignore */ }
  authStore.clearSession()
}
