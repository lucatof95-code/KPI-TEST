import { apiFetch } from './client'
import type {
  User, CompetencyArea, Session, Activity,
  Assignment, Report, KpiData, ProblemGroup, MyAssignmentsResponse,
} from '../types'

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiFetch<{ user: User }>('/auth/me'),
}

// Competency Areas
export const areasApi = {
  list: () => apiFetch<CompetencyArea[]>('/api/competency-areas'),
  create: (data: { nome: string; importanza: number }) =>
    apiFetch<CompetencyArea>('/api/competency-areas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ nome: string; importanza: number }>) =>
    apiFetch<CompetencyArea>(`/api/competency-areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/api/competency-areas/${id}`, { method: 'DELETE' }),
}

// Sessions
export const sessionsApi = {
  list: () => apiFetch<Session[]>('/api/sessions'),
  create: (data: { nome: string; ordine: number }) =>
    apiFetch<Session>('/api/sessions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ nome: string; ordine: number }>) =>
    apiFetch<Session>(`/api/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/api/sessions/${id}`, { method: 'DELETE' }),
}

// Activities
export const activitiesApi = {
  list: () => apiFetch<Activity[]>('/api/activities'),
  create: (data: { nome: string; descrizione: string; tipo: string; areaIds: number[] }) =>
    apiFetch<Activity>('/api/activities', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { nome: string; descrizione: string; tipo: string; areaIds: number[] }) =>
    apiFetch<Activity>(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/api/activities/${id}`, { method: 'DELETE' }),
}

// Users
export const usersApi = {
  list: () => apiFetch<User[]>('/api/users'),
  create: (data: { nome: string; cognome: string; email: string; password: string; ruolo: string }) =>
    apiFetch<User>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ nome: string; cognome: string; email: string; password: string; ruolo: string }>) =>
    apiFetch<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' }),
}

// Assignments
export const assignmentsApi = {
  list: (filters?: { userId?: number; sessionId?: number; areaId?: number; stato?: string }) => {
    const params = new URLSearchParams()
    if (filters?.userId) params.set('userId', String(filters.userId))
    if (filters?.sessionId) params.set('sessionId', String(filters.sessionId))
    if (filters?.areaId) params.set('areaId', String(filters.areaId))
    if (filters?.stato) params.set('stato', filters.stato)
    return apiFetch<Assignment[]>(`/api/assignments?${params}`)
  },
  create: (data: { activityId: number; userId: number; sessionId: number; dataScadenza: string }) =>
    apiFetch<Assignment>('/api/assignments', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/api/assignments/${id}`, { method: 'DELETE' }),
  myAssignments: () => apiFetch<MyAssignmentsResponse>('/api/assignments/my'),
  myPendingCount: () => apiFetch<{ pending: number }>('/api/assignments/my/count'),
  notify: (assignmentIds: number[]) =>
    apiFetch<{ sent: number; failed: number; total: number; message: string }>(
      '/api/assignments/notify',
      { method: 'POST', body: JSON.stringify({ assignmentIds }) },
    ),
}

// Reports
export const reportsApi = {
  list: (filters?: { userId?: number; areaId?: number; sessionId?: number }) => {
    const params = new URLSearchParams()
    if (filters?.userId) params.set('userId', String(filters.userId))
    if (filters?.areaId) params.set('areaId', String(filters.areaId))
    if (filters?.sessionId) params.set('sessionId', String(filters.sessionId))
    return apiFetch<Report[]>(`/api/reports?${params}`)
  },
  create: (data: {
    assignmentId: number
    obiettivo: number
    complessita: number
    confrontoVecchioERP: number
    miglioramentoEfficienza: number
    haProblemi: boolean
    descrizioneProblema?: string
    richiedeNuovaFormazione: boolean
    giudizioApprendimento?: number | null
  }) => apiFetch<Report>('/api/reports', { method: 'POST', body: JSON.stringify(data) }),
}

// KPI
export const kpiApi = {
  get: (filters?: { userId?: number; areaId?: number; invertiComplessita?: boolean }) => {
    const params = new URLSearchParams()
    if (filters?.userId) params.set('userId', String(filters.userId))
    if (filters?.areaId) params.set('areaId', String(filters.areaId))
    if (filters?.invertiComplessita) params.set('invertiComplessita', 'true')
    return apiFetch<KpiData>(`/api/kpi?${params}`)
  },
}

// Problems
export const problemsApi = {
  list: () => apiFetch<ProblemGroup[]>('/api/problems'),
  updateStato: (id: number, statoRisoluzione: string) =>
    apiFetch<Report>(`/api/problems/${id}/stato`, { method: 'PATCH', body: JSON.stringify({ statoRisoluzione }) }),
}
