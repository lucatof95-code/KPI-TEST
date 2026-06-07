export type Ruolo = 'MASTER' | 'USER'
export type ActivityType = 'FORMAZIONE' | 'TEST'
export type AssignmentStatus = 'DA_SVOLGERE' | 'SVOLTA'
export type StatoRisoluzione = 'APERTO' | 'IN_LAVORAZIONE' | 'RISOLTO'

export interface User {
  id: number
  nome: string
  cognome: string
  email: string
  ruolo: Ruolo
  createdAt: string
}

export interface CompetencyArea {
  id: number
  nome: string
  importanza: number
  createdAt: string
}

export interface Session {
  id: number
  nome: string
  ordine: number
  createdAt: string
}

export interface Activity {
  id: number
  nome: string
  descrizione: string
  tipo: ActivityType
  areas: { activityId: number; competencyAreaId: number; competencyArea: CompetencyArea }[]
  createdAt: string
}

export interface ProcessStepUser {
  id: number
  processStepId: number
  userId: number
  assignmentId: number | null
  user: Pick<User, 'id' | 'nome' | 'cognome'>
  assignment: Assignment | null
}

export interface ProcessStep {
  id: number
  processId: number
  activityId: number
  ordine: number
  stato: 'BLOCCATO' | 'IN_CORSO' | 'COMPLETATO'
  dataScadenza: string | null
  activity: Activity
  users: ProcessStepUser[]
}

export interface Process {
  id: number
  nome: string
  descrizione: string
  stato: 'BOZZA' | 'IN_CORSO' | 'COMPLETATO'
  steps: ProcessStep[]
  createdAt: string
}

export interface Assignment {
  id: number
  activityId: number
  userId: number
  sessionId: number | null
  dataScadenza: string
  stato: AssignmentStatus
  /** Computed server-side: DA_SVOLGERE and due date < today (UTC). */
  isLate: boolean
  activity: Activity
  user: Pick<User, 'id' | 'nome' | 'cognome' | 'email'>
  session: Session | null
  report: Report | null
  processStepUser: { processStep: { ordine: number; process: Pick<Process, 'id' | 'nome'> } } | null
  createdAt: string
}

export interface Report {
  id: number
  assignmentId: number
  userId: number
  activityId: number
  dataInvio: string
  obiettivo: number
  complessita: number
  confrontoVecchioERP: number
  miglioramentoEfficienza: number
  haProblemi: boolean
  descrizioneProblema: string | null
  richiedeNuovaFormazione: boolean
  giudizioApprendimento: number | null
  statoRisoluzione: StatoRisoluzione
  importanzaProblema: number | null
  user: Pick<User, 'id' | 'nome' | 'cognome'>
  activity: Activity
  assignment: Assignment & { session: Session }
  createdAt: string
}

export interface KpiData {
  perSvolte: number | null
  perEntroOggi: number | null
  qualita: number | null
  apprendimento: number | null
  perArea: {
    area: CompetencyArea
    assegnate: number
    svolte: number
    qualitaMedia: number | null
    completamento: number | null
  }[]
}

export interface ProblemGroup {
  area: CompetencyArea
  problems: Report[]
}

export interface AppSettings {
  smtp_host: string
  smtp_port: string
  smtp_secure: string
  smtp_user: string
  smtp_pass: string
  smtp_from_name: string
  smtp_from_email: string
  app_url: string
}

export interface CalendarEventInput {
  title: string
  date: string
  startTime: string
  endTime: string
  location?: string
}

export interface ProcessKpiData {
  totalProcesses: number
  completedProcesses: number
  inCorsoProcesses: number
  perCompletati: number | null
  totalSteps: number
  completedSteps: number
  perStepsCompletati: number | null
  qualitaMedia: number | null
  apprendimentoMedio: number | null
  perProcess: {
    process: { id: number; nome: string; stato: string }
    totalSteps: number
    completedSteps: number
    completamento: number | null
    qualitaMedia: number | null
  }[]
}

export interface ProcessReportEntry {
  step: { id: number; ordine: number; stato: string; activity: Activity }
  reports: {
    id: number
    user: Pick<User, 'id' | 'nome' | 'cognome'>
    obiettivo: number
    complessita: number
    confrontoVecchioERP: number
    miglioramentoEfficienza: number
    haProblemi: boolean
    richiedeNuovaFormazione: boolean
    giudizioApprendimento: number | null
    statoRisoluzione: StatoRisoluzione
    dataInvio: string
    quality: number
  }[]
  qualitaMedia: number | null
}

export interface ProcessReportData {
  process: { id: number; nome: string; stato: string; descrizione: string }
  steps: ProcessReportEntry[]
  qualitaMediaProcesso: number | null
  completamento: number | null
  totalSteps: number
  completedSteps: number
}

export interface UserProcessStep {
  stepId: number
  ordine: number
  statoStep: 'BLOCCATO' | 'IN_CORSO' | 'COMPLETATO'
  dataScadenza: string | null
  activity: Activity
  assignmentId: number | null
  assignmentStato: AssignmentStatus | null
  isLate: boolean
}

export interface UserProcess {
  process: { id: number; nome: string; descrizione: string; stato: string }
  mySteps: UserProcessStep[]
}

export interface MyAssignmentsResponse {
  assignments: Assignment[]
  sessionLocked: Record<number, boolean>
  sessions: Session[]
}
