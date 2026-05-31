import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { problemsApi } from '../../api'
import { StatoRisoluzione } from '../../types'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/Badge'
import { useGlobalToast } from '../../components/layout/Layout'

const statoOptions = [
  { value: 'APERTO', label: 'Aperto' },
  { value: 'IN_LAVORAZIONE', label: 'In lavorazione' },
  { value: 'RISOLTO', label: 'Risolto' },
]

export default function Problems() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()
  const { data: groups = [], isLoading } = useQuery({ queryKey: ['problems'], queryFn: problemsApi.list })

  const updateStato = useMutation({
    mutationFn: ({ id, stato }: { id: number; stato: string }) => problemsApi.updateStato(id, stato),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['problems'] }); addToast('Stato aggiornato') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const totalProblems = groups.reduce((sum, g) => sum + g.problems.length, 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Mappatura problematiche</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {totalProblems} problematiche segnalate · raggruppate per area, ordinate per importanza
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-gray-500">Nessuna problematica segnalata</div>
      ) : (
        groups.map((group) => (
          <div key={group.area.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Area header */}
            <div className="px-5 py-4 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-100">{group.area.nome}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">Importanza:</span>
                  <span className="text-amber-400 text-sm">{'★'.repeat(group.area.importanza)}<span className="text-gray-700">{'★'.repeat(5 - group.area.importanza)}</span></span>
                </div>
              </div>
              <span className="bg-red-900/40 text-red-400 border border-red-700/40 text-xs px-2.5 py-1 rounded-full font-medium">
                {group.problems.length} {group.problems.length === 1 ? 'problema' : 'problemi'}
              </span>
            </div>

            {/* Problems list */}
            <div className="divide-y divide-gray-800">
              {group.problems.map((report) => (
                <div key={report.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-200">
                        {report.user.cognome} {report.user.nome}
                      </span>
                      <span className="text-gray-600">·</span>
                      <span className="text-sm text-gray-400">{report.activity.nome}</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-xs text-gray-500">{new Date(report.dataInvio).toLocaleDateString('it-IT')}</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{report.descrizioneProblema}</p>
                  </div>
                  <div className="flex-shrink-0 min-w-[180px]">
                    <Select
                      value={report.statoRisoluzione as StatoRisoluzione}
                      onChange={(e) => updateStato.mutate({ id: report.id, stato: e.target.value })}
                      options={statoOptions}
                    />
                    <div className="mt-1.5">
                      <StatusBadge stato={report.statoRisoluzione} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
