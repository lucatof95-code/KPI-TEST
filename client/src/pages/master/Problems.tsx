import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { problemsApi } from '../../api'
import { StatoRisoluzione, Report } from '../../types'
import { Select } from '../../components/ui/Select'
import { StatusBadge } from '../../components/ui/Badge'
import { useGlobalToast } from '../../components/layout/Layout'

const statoOptions = [
  { value: 'APERTO', label: 'Aperto' },
  { value: 'IN_LAVORAZIONE', label: 'In lavorazione' },
  { value: 'RISOLTO', label: 'Risolto' },
]

const STARS = [1, 2, 3, 4, 5]

function ImportanzaStars({
  report,
  onUpdate,
}: {
  report: Report
  onUpdate: (id: number, v: number | null) => void
}) {
  const current = report.importanzaProblema

  return (
    <div className="flex items-center gap-0.5" title="Importanza problematica">
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onUpdate(report.id, current === star ? null : star)}
          className={`text-lg leading-none transition-colors ${
            current !== null && star <= current
              ? 'text-amber-400 hover:text-amber-300'
              : 'text-gray-700 hover:text-amber-500'
          }`}
          title={current === star ? 'Rimuovi importanza' : `Importanza ${star}`}
        >
          ★
        </button>
      ))}
      {current !== null && (
        <span className="ml-1 text-xs font-mono text-amber-400 font-semibold">{current}</span>
      )}
    </div>
  )
}

export default function Problems() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()
  const { data: groups = [], isLoading } = useQuery({ queryKey: ['problems'], queryFn: problemsApi.list })

  const updateStato = useMutation({
    mutationFn: ({ id, stato }: { id: number; stato: string }) => problemsApi.updateStato(id, stato),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['problems'] }); qc.invalidateQueries({ queryKey: ['master-badges'] }) },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const updateImportanza = useMutation({
    mutationFn: ({ id, importanza }: { id: number; importanza: number | null }) =>
      problemsApi.updateImportanza(id, importanza),
    onMutate: async ({ id, importanza }) => {
      // Optimistic update: aggiorna subito le stelle senza aspettare il server
      await qc.cancelQueries({ queryKey: ['problems'] })
      const previous = qc.getQueryData(['problems'])
      qc.setQueryData(['problems'], (old: typeof groups) =>
        old.map((g) => ({
          ...g,
          problems: g.problems
            .map((p) => (p.id === id ? { ...p, importanzaProblema: importanza } : p))
            .sort((a, b) => (b.importanzaProblema ?? 0) - (a.importanzaProblema ?? 0)),
        })),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(['problems'], ctx.previous)
      addToast('Errore aggiornamento importanza', 'error')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['problems'] }),
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
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
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
                  <span className="text-xs text-gray-500">Importanza area:</span>
                  <span className="text-amber-400 text-sm">
                    {'★'.repeat(group.area.importanza)}
                    <span className="text-gray-700">{'★'.repeat(5 - group.area.importanza)}</span>
                  </span>
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
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-200">
                        {report.user.cognome} {report.user.nome}
                      </span>
                      <span className="text-gray-600">·</span>
                      <span className="text-sm text-gray-400">{report.activity.nome}</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-xs text-gray-500">
                        {new Date(report.dataInvio).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    {/* Problem description */}
                    <p className="text-sm text-gray-300 leading-relaxed mb-3">
                      {report.descrizioneProblema}
                    </p>
                    {/* Importance stars */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Importanza:</span>
                      <ImportanzaStars
                        report={report}
                        onUpdate={(id, v) => updateImportanza.mutate({ id, importanza: v })}
                      />
                    </div>
                  </div>

                  {/* Status selector */}
                  <div className="flex-shrink-0 min-w-[180px] flex flex-col gap-1.5">
                    <Select
                      value={report.statoRisoluzione as StatoRisoluzione}
                      onChange={(e) => updateStato.mutate({ id: report.id, stato: e.target.value })}
                      options={statoOptions}
                    />
                    <StatusBadge stato={report.statoRisoluzione} />
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
