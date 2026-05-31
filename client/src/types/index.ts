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

export interface Assignment {
  id: number
  activityId: number
  userId: number
  sessionId: number
  dataScadenza: string
  stato: AssignmentStatus
  activity: Activity
  user: Pick<User, 'id' | 'nome' | 'cognome' | 'email'>
  session: Session
  report: Report | null
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

export interface MyAssignmentsResponse {
  assignments: Assignment[]
  sessionLocked: Record<number, boolean>
  sessions: Session[]
}
