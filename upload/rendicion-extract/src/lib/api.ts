/**
 * Shared API fetch helper that always includes credentials.
 * This is essential for sending cookies (like the session token)
 * through the Caddy reverse proxy.
 */
export function apiFetch(url: string, options?: RequestInit) {
  return fetch(url, { ...options, credentials: 'include' })
}
