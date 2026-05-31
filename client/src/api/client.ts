const BASE_URL = import.meta.env.VITE_API_URL || ''

function getToken(): string | null {
  return localStorage.getItem('token')
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Non autenticato')
  }

  if (!res.ok) {
    let message = `Errore ${res.status}`
    try {
      const body = await res.json()
      message = body.error || JSON.stringify(body) || message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
