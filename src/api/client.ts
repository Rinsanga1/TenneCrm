import type { ApiResponse } from '@tenne/shared'
import { authStore } from '../stores/AuthStore'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authStore.session ? { Authorization: `Bearer ${authStore.session.userId}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Request failed')
  return json.data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
