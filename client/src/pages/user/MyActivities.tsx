import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { assignmentsApi, processesApi } from '../../api'
import { Assignment, UserProcessStep } from '../../types'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import ReportFormModal from './ReportFormModal'

// ── Shared assignment row ─────────────────────────────────────────────────

function AssignmentRow({
  a, locked = false, onReport,
}: {
  a: Assignment
  locked?: boolean
  onReport: (a: Assignment) => void
}) {
  return (
    <div className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 ${a.isLate ? 'bg-red-950/10' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <StatusBadge stato={a.activity.tipo} />
          <span className={`font-medium ${locked ? 'text-gray-500' : 'text-gray-100'}`}>{a.activity.nome}</span>
          {a.stato === 'SVOLTA' && <span className="text-emerald-400 text-xs">✓ Completata</span>}
        </div>
        <p className={`text-sm ${locked ? 'text-gray-600' : 'text-gray-500'} line-clamp-2`}>
          {a.activity.descrizione}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {a.activity.areas.map((area) => (
            <span key={area.competencyAreaId} className="bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full">
              {area.competencyArea.nome}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <span className={`text-xs ${a.isLate ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
          Scadenza: {new Date(a.dataScadenza).toLocaleDateString('it-IT')}
        </span>
        {a.stato === 'DA_SVOLGERE' && !locked && (
          <Button size="sm" onClick={() => onReport(a)}>Completa e invia report</Button>
        )}
        {a.stato === 'DA_SVOLGERE' && locked && (
          <span className="text-xs text-gray-600 italic">In attesa dello step precedente</span>
        )}
        {a.stato === 'SVOLTA' && <StatusBadge stato="SVOLTA" />}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────

// Fake assignment object for process steps that have an assignmentId
function stepToFakeAssignment(step: UserProcessStep, assignmentsById: Map<number, Assignment>): Assignment | null {
  if (!step.assignmentId) return null
  return assignmentsById.get(step.assignmentId) ?? null
}

export default function MyActivities() {
  const qc = useQueryClient()
  const [reportAssignment, setReportAssignment] = useState<Assignment | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: assignmentsApi.myAssignments,
  })
  const { data: myProcesses = [], isLoading: loadingProcesses } = useQuery({
    queryKey: ['my-processes'],
    queryFn: processesApi.my,
  })

  if (isLoading || loadingProcesses) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { assignments = [], sessionLocked = {}, sessions = [] } = data || {}

  // Map assignments by id for quick lookup
  const assignmentsById = new Map(assignments.map((a) => [a.id, a]))

  // Session-based assignments
  const withSession = assignments.filter((a) => a.sessionId !== null)
  const bySession = sessions.map((sess) => ({
    session: sess,
    assignments: withSession.filter((a) => a.sessionId === sess.id),
    locked: sessionLocked[sess.id] || false,
  })).filter((g) => g.assignments.length > 0)

  // Standalone (no session, no process)
  const processAssignmentIds = new Set(
    myProcesses.flatMap((p) => p.mySteps.map((s) => s.assignmentId)).filter(Boolean)
  )
  const standalone = assignments.filter(
    (a) => a.sessionId === null && !processAssignmentIds.has(a.id)
  )

  const totalVisible = assignments.length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Le mie attività</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {totalVisible === 0
            ? 'Nessuna attività assegnata'
            : `${assignments.filter((a) => a.stato === 'SVOLTA').length} / ${totalVisible} completate`}
        </p>
      </div>

      {totalVisible === 0 && (
        <div className="text-center py-20 text-gray-500">Nessuna attività assegnata</div>
      )}

      {/* ── Sessioni ─────────────────────────────────────────────────── */}
      {bySession.map(({ session, assignments: sessAssignments, locked }) => (
        <div
          key={session.id}
          className={`bg-gray-900 border rounded-xl overflow-hidden transition-opacity ${locked ? 'border-gray-700 opacity-70' : 'border-gray-800'}`}
        >
          <div className={`px-5 py-4 border-b flex items-center justify-between ${locked ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-800/60 border-gray-700'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm ${locked ? 'bg-gray-700 text-gray-500' : 'bg-blue-600/20 text-blue-400'}`}>
                {session.ordine}
              </div>
              <div>
                <h2 className={`font-semibold ${locked ? 'text-gray-500' : 'text-gray-100'}`}>{session.nome}</h2>
                <p className="text-xs text-gray-500">
                  {sessAssignments.filter((a) => a.stato === 'SVOLTA').length} / {sessAssignments.length} completate
                </p>
              </div>
            </div>
            {locked && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
                🔒 Sessione bloccata
              </div>
            )}
          </div>
          <div className="divide-y divide-gray-800">
            {sessAssignments.map((a) => (
              <AssignmentRow key={a.id} a={a} locked={locked} onReport={setReportAssignment} />
            ))}
          </div>
        </div>
      ))}

      {/* ── Processi ─────────────────────────────────────────────────── */}
      {myProcesses.map(({ process: proc, mySteps }) => {
        const done = mySteps.filter((s) => s.assignmentStato === 'SVOLTA').length
        const total = mySteps.length
        return (
          <div key={proc.id} className="bg-gray-900 border border-indigo-800/50 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-indigo-800/30 bg-indigo-950/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-sm">
                  🔄
                </div>
                <div>
                  <h2 className="font-semibold text-gray-100">{proc.nome}</h2>
                  <p className="text-xs text-gray-500">{done} / {total} step completati</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 w-32">
                <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-gray-500 font-mono">{done}/{total}</span>
              </div>
            </div>

            {/* Steps */}
            <div className="divide-y divide-gray-800">
              {mySteps.map((step) => {
                const assignment = step.assignmentId ? stepToFakeAssignment(step, assignmentsById) : null
                const isBlocked  = step.statoStep === 'BLOCCATO'
                const isCompleted = step.assignmentStato === 'SVOLTA'

                return (
                  <div key={step.stepId} className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 ${step.isLate ? 'bg-red-950/10' : ''} ${isBlocked ? 'opacity-60' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Step indicator */}
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCompleted ? 'bg-emerald-600 text-white' :
                          isBlocked   ? 'bg-gray-700 text-gray-500' :
                                        'bg-blue-600 text-white'
                        }`}>
                          {isCompleted ? '✓' : step.ordine}
                        </span>
                        <StatusBadge stato={step.activity.tipo} />
                        <span className={`font-medium ${isBlocked ? 'text-gray-500' : 'text-gray-100'}`}>
                          {step.activity.nome}
                        </span>
                        {isCompleted && <span className="text-emerald-400 text-xs">✓ Completata</span>}
                      </div>
                      <p className={`text-sm ${isBlocked ? 'text-gray-600' : 'text-gray-500'} line-clamp-2`}>
                        {step.activity.descrizione}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {step.activity.areas.map((area: { competencyAreaId: number; competencyArea: { nome: string } }) => (
                          <span key={area.competencyAreaId} className="bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                            {area.competencyArea.nome}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {step.dataScadenza && (
                        <span className={`text-xs ${step.isLate ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                          Scadenza: {new Date(step.dataScadenza).toLocaleDateString('it-IT')}
                        </span>
                      )}
                      {isBlocked && (
                        <span className="text-xs text-gray-600 italic">In attesa dello step precedente</span>
                      )}
                      {!isBlocked && !isCompleted && assignment && (
                        <Button size="sm" onClick={() => setReportAssignment(assignment)}>
                          Completa e invia report
                        </Button>
                      )}
                      {isCompleted && <StatusBadge stato="SVOLTA" />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* ── Attività standalone (no sessione, no processo) ────────────── */}
      {standalone.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700 bg-gray-800/60">
            <h2 className="font-semibold text-gray-100">Altre attività</h2>
            <p className="text-xs text-gray-500 mt-0.5">{standalone.filter((a) => a.stato === 'SVOLTA').length} / {standalone.length} completate</p>
          </div>
          <div className="divide-y divide-gray-800">
            {standalone.map((a) => (
              <AssignmentRow key={a.id} a={a} onReport={setReportAssignment} />
            ))}
          </div>
        </div>
      )}

      {reportAssignment && (
        <ReportFormModal
          assignment={reportAssignment}
          onClose={() => setReportAssignment(null)}
          onSuccess={() => {
            setReportAssignment(null)
            qc.invalidateQueries({ queryKey: ['my-assignments'] })
            qc.invalidateQueries({ queryKey: ['my-pending-count'] })
            qc.invalidateQueries({ queryKey: ['my-processes'] })
          }}
        />
      )}
    </div>
  )
}
