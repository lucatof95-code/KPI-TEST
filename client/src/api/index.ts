import { apiFetch } from './client'
import type {
  User, CompetencyArea, Session, Activity,
  Assignment, Report, KpiData, ProblemGroup, MyAssignmentsResponse,
  AppSettings, CalendarEventInput, Process, ProcessStep,
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
  bulk: (data: { activityId: number; userIds: number[]; sessionId?: number | null; dataScadenza: string }) =>
    apiFetch<{ created: number; skipped: number }>('/api/assignments/bulk', { method: 'POST', body: JSON.stringify(data) }),
  notify: (assignmentIds: number[], calendarEvent?: CalendarEventInput) =>
    apiFetch<{ sent: number; failed: number; total: number; message: string }>(
      '/api/assignments/notify',
      { method: 'POST', body: JSON.stringify({ assignmentIds, calendarEvent }) },
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

// Processes
export const processesApi = {
  my: () => apiFetch<import('../types').UserProcess[]>('/api/processes/my'),
  list: () => apiFetch<Process[]>('/api/processes'),
  get: (id: number) => apiFetch<Process>(`/api/processes/${id}`),
  create: (data: { nome: string; descrizione: string }) =>
    apiFetch<Process>('/api/processes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { nome?: string; descrizione?: string }) =>
    apiFetch<Process>(`/api/processes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/api/processes/${id}`, { method: 'DELETE' }),
  start: (id: number) =>
    apiFetch<Process>(`/api/processes/${id}/start`, { method: 'POST' }),
  addStep: (processId: number, data: { activityId: number; ordine: number; dataScadenza?: string | null }) =>
    apiFetch<ProcessStep>(`/api/processes/${processId}/steps`, { method: 'POST', body: JSON.stringify(data) }),
  updateStep: (processId: number, stepId: number, data: { activityId?: number; ordine?: number; dataScadenza?: string | null }) =>
    apiFetch<ProcessStep>(`/api/processes/${processId}/steps/${stepId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStep: (processId: number, stepId: number) =>
    apiFetch<void>(`/api/processes/${processId}/steps/${stepId}`, { method: 'DELETE' }),
  addUserToStep: (processId: number, stepId: number, userId: number) =>
    apiFetch(`/api/processes/${processId}/steps/${stepId}/users`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeUserFromStep: (processId: number, stepId: number, userId: number) =>
    apiFetch<void>(`/api/processes/${processId}/steps/${stepId}/users/${userId}`, { method: 'DELETE' }),
}

// Badges (master sidebar)
export const badgesApi = {
  get: () => apiFetch<{ openProblems: number; todayReports: number }>('/api/badges'),
}

// Settings
export const settingsApi = {
  get: () => apiFetch<AppSettings>('/api/settings'),
  update: (data: Partial<AppSettings>) =>
    apiFetch<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  testConnection: (to: string) =>
    apiFetch<{ ok: boolean; message?: string; error?: string }>('/api/settings/test', {
      method: 'POST', body: JSON.stringify({ to }),
    }),
}

// Problems
export const problemsApi = {
  list: () => apiFetch<ProblemGroup[]>('/api/problems'),
  updateStato: (id: number, statoRisoluzione: string) =>
    apiFetch<Report>(`/api/problems/${id}/stato`, { method: 'PATCH', body: JSON.stringify({ statoRisoluzione }) }),
  updateImportanza: (id: number, importanzaProblema: number | null) =>
    apiFetch<Report>(`/api/problems/${id}/importanza`, { method: 'PATCH', body: JSON.stringify({ importanzaProblema }) }),
}
