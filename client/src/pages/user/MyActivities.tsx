import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { assignmentsApi } from '../../api'
import { Assignment } from '../../types'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import ReportFormModal from './ReportFormModal'

export default function MyActivities() {
  const qc = useQueryClient()
  const [reportAssignment, setReportAssignment] = useState<Assignment | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: assignmentsApi.myAssignments,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { assignments = [], sessionLocked = {}, sessions = [] } = data || {}

  const bySession = sessions.map((sess) => ({
    session: sess,
    assignments: assignments.filter((a) => a.sessionId === sess.id),
    locked: sessionLocked[sess.id] || false,
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Le mie attività</h1>
        <p className="text-gray-500 text-sm mt-0.5">Completa le sessioni in ordine per sbloccare le successive</p>
      </div>

      {bySession.length === 0 && (
        <div className="text-center py-20 text-gray-500">Nessuna attività assegnata</div>
      )}

      {bySession.map(({ session, assignments: sessAssignments, locked }) => (
        <div key={session.id} className={`bg-gray-900 border rounded-xl overflow-hidden transition-opacity ${locked ? 'border-gray-700 opacity-70' : 'border-gray-800'}`}>
          {/* Session header */}
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
                <span>🔒</span> Sessione bloccata
              </div>
            )}
          </div>

          {/* Assignments */}
          <div className="divide-y divide-gray-800">
            {sessAssignments.map((a) => (
              <div key={a.id} className={`px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 ${a.isLate ? 'bg-red-950/10' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StatusBadge stato={a.activity.tipo} />
                    <span className={`font-medium ${locked ? 'text-gray-500' : 'text-gray-100'}`}>{a.activity.nome}</span>
                    {a.processStepUser && (
                      <span className="text-xs bg-indigo-900/50 text-indigo-400 border border-indigo-700/40 px-2 py-0.5 rounded-full">
                        🔄 {a.processStepUser.processStep.process.nome}
                      </span>
                    )}
                    {a.stato === 'SVOLTA' && <span className="text-emerald-400 text-xs">✓ Completata</span>}
                  </div>
                  <p className={`text-sm ${locked ? 'text-gray-600' : 'text-gray-500'} line-clamp-2`}>{a.activity.descrizione}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {a.activity.areas.map((area) => (
                      <span key={area.competencyAreaId} className="bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full">{area.competencyArea.nome}</span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <span className={`text-xs ${a.isLate ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                    Scadenza: {new Date(a.dataScadenza).toLocaleDateString('it-IT')}
                  </span>
                  {a.stato === 'DA_SVOLGERE' && !locked && (
                    <Button size="sm" onClick={() => setReportAssignment(a)}>
                      Completa e invia report
                    </Button>
                  )}
                  {a.stato === 'DA_SVOLGERE' && locked && (
                    <span className="text-xs text-gray-600">Sessione precedente non completata</span>
                  )}
                  {a.stato === 'SVOLTA' && (
                    <StatusBadge stato="SVOLTA" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {reportAssignment && (
        <ReportFormModal
          assignment={reportAssignment}
          onClose={() => setReportAssignment(null)}
          onSuccess={() => {
            setReportAssignment(null)
            qc.invalidateQueries({ queryKey: ['my-assignments'] })
          }}
        />
      )}
    </div>
  )
}
