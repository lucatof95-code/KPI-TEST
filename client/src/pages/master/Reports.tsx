import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, usersApi, areasApi, sessionsApi } from '../../api'
import { Report, ProcessReportData } from '../../types'
import { Select } from '../../components/ui/Select'
import { StatusBadge, Badge } from '../../components/ui/Badge'

function calcQualita(r: { obiettivo: number; complessita: number; confrontoVecchioERP: number; miglioramentoEfficienza: number }, inverti = false) {
  const comp = inverti ? 11 - r.complessita : r.complessita
  return ((r.obiettivo + comp + r.confrontoVecchioERP + r.miglioramentoEfficienza) / 40) * 100
}

// ── Tab Attività ──────────────────────────────────────────────────────────────

function AttivitaTab() {
  const [userId, setUserId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [sessionId, setSessionId] = useState('')

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', userId, areaId, sessionId],
    queryFn: () => reportsApi.list({
      userId: userId ? Number(userId) : undefined,
      areaId: areaId ? Number(areaId) : undefined,
      sessionId: sessionId ? Number(sessionId) : undefined,
    }),
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: areasApi.list })
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: sessionsApi.list })

  return (
    <>
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Select placeholder="Tutti gli utenti" value={userId} onChange={(e) => setUserId(e.target.value)}
          options={users.filter((u) => u.ruolo === 'USER').map((u) => ({ value: u.id, label: `${u.cognome} ${u.nome}` }))} />
        <Select placeholder="Tutte le aree" value={areaId} onChange={(e) => setAreaId(e.target.value)}
          options={areas.map((a) => ({ value: a.id, label: a.nome }))} />
        <Select placeholder="Tutte le sessioni" value={sessionId} onChange={(e) => setSessionId(e.target.value)}
          options={sessions.map((s) => ({ value: s.id, label: s.nome }))} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900/80 border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Utente</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Attività</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Data</th>
                <th className="text-center px-3 py-3 text-gray-400 font-medium" title="Obiettivo">Ob.</th>
                <th className="text-center px-3 py-3 text-gray-400 font-medium" title="Complessità">Cx.</th>
                <th className="text-center px-3 py-3 text-gray-400 font-medium" title="Confronto ERP">ERP</th>
                <th className="text-center px-3 py-3 text-gray-400 font-medium" title="Miglioramento">Eff.</th>
                <th className="text-center px-3 py-3 text-gray-400 font-medium">Qualità</th>
                <th className="text-center px-3 py-3 text-gray-400 font-medium">Appr.</th>
                <th className="text-center px-3 py-3 text-gray-400 font-medium">Problema</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r: Report) => (
                <tr key={r.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-gray-200">{r.user.cognome} {r.user.nome}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge stato={r.activity.tipo} />
                      <span className="text-gray-300">{r.activity.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(r.dataInvio).toLocaleDateString('it-IT')}</td>
                  <td className="px-3 py-3 text-center font-mono text-gray-300">{r.obiettivo}</td>
                  <td className="px-3 py-3 text-center font-mono text-gray-300">{r.complessita}</td>
                  <td className="px-3 py-3 text-center font-mono text-gray-300">{r.confrontoVecchioERP}</td>
                  <td className="px-3 py-3 text-center font-mono text-gray-300">{r.miglioramentoEfficienza}</td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-amber-400">{calcQualita(r).toFixed(0)}%</td>
                  <td className="px-3 py-3 text-center font-mono">
                    {r.richiedeNuovaFormazione
                      ? <Badge label="Form." variant="warning" />
                      : <span className="text-violet-400">{r.giudizioApprendimento}</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {r.haProblemi
                      ? <span title={r.descrizioneProblema || ''}><StatusBadge stato={r.statoRisoluzione} /></span>
                      : <span className="text-gray-700">—</span>}
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-500">Nessun report trovato</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ── Tab Processi ──────────────────────────────────────────────────────────────

function ProcessiTab() {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ['reports-processes'],
    queryFn: () => reportsApi.processes(),
  })

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      {processes.map((proc: ProcessReportData) => {
        const isExpanded = expandedId === proc.process.id
        return (
          <div key={proc.process.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Process header row — clickable to expand */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : proc.process.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  proc.process.stato === 'COMPLETATO' ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50' :
                  proc.process.stato === 'IN_CORSO'   ? 'bg-blue-900/60 text-blue-400 border border-blue-700/50' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {proc.process.stato === 'COMPLETATO' ? 'Completato' : proc.process.stato === 'IN_CORSO' ? 'In corso' : 'Bozza'}
                </span>
                <span className="font-semibold text-gray-100">{proc.process.nome}</span>
                <span className="text-xs text-gray-500">{proc.completedSteps}/{proc.totalSteps} step</span>
              </div>
              <div className="flex items-center gap-6">
                {/* Qualità media processo */}
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500">Qualità media</p>
                  <p className="font-mono font-bold text-amber-400 text-lg">
                    {proc.qualitaMediaProcesso !== null ? `${proc.qualitaMediaProcesso}%` : '—'}
                  </p>
                </div>
                {/* Completamento */}
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-500">Completamento</p>
                  <p className="font-mono font-bold text-blue-400 text-lg">
                    {proc.completamento !== null ? `${proc.completamento}%` : '—'}
                  </p>
                </div>
                <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
              </div>
            </button>

            {/* Expanded: step detail */}
            {isExpanded && (
              <div className="border-t border-gray-800">
                {proc.steps.map((stepData) => (
                  <div key={stepData.step.id} className="border-b border-gray-800 last:border-0">
                    {/* Step header */}
                    <div className="px-5 py-3 bg-gray-800/30 flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        stepData.step.stato === 'COMPLETATO' ? 'bg-emerald-600 text-white' :
                        stepData.step.stato === 'IN_CORSO'   ? 'bg-blue-600 text-white' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {stepData.step.stato === 'COMPLETATO' ? '✓' : stepData.step.ordine}
                      </span>
                      <span className="font-medium text-gray-200">{stepData.step.activity.nome}</span>
                      <StatusBadge stato={stepData.step.activity.tipo} />
                      <span className="text-xs text-gray-500 ml-auto">
                        Qualità media step:{' '}
                        <span className="font-mono text-amber-400 font-medium">
                          {stepData.qualitaMedia !== null ? `${stepData.qualitaMedia}%` : '—'}
                        </span>
                      </span>
                    </div>

                    {/* Reports for this step */}
                    {stepData.reports.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-800 bg-gray-900/40">
                            <th className="text-left px-5 py-2 text-gray-500 font-medium text-xs">Utente</th>
                            <th className="text-center px-3 py-2 text-gray-500 font-medium text-xs">Ob.</th>
                            <th className="text-center px-3 py-2 text-gray-500 font-medium text-xs">Cx.</th>
                            <th className="text-center px-3 py-2 text-gray-500 font-medium text-xs">ERP</th>
                            <th className="text-center px-3 py-2 text-gray-500 font-medium text-xs">Eff.</th>
                            <th className="text-center px-3 py-2 text-gray-500 font-medium text-xs">Qualità</th>
                            <th className="text-center px-3 py-2 text-gray-500 font-medium text-xs">Appr.</th>
                            <th className="text-center px-3 py-2 text-gray-500 font-medium text-xs">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stepData.reports.map((r) => (
                            <tr key={r.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/20">
                              <td className="px-5 py-2.5 text-gray-300">{r.user.cognome} {r.user.nome}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-gray-400">{r.obiettivo}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-gray-400">{r.complessita}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-gray-400">{r.confrontoVecchioERP}</td>
                              <td className="px-3 py-2.5 text-center font-mono text-gray-400">{r.miglioramentoEfficienza}</td>
                              <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-400">{r.quality}%</td>
                              <td className="px-3 py-2.5 text-center font-mono">
                                {r.richiedeNuovaFormazione
                                  ? <Badge label="Form." variant="warning" />
                                  : <span className="text-violet-400">{r.giudizioApprendimento ?? '—'}</span>}
                              </td>
                              <td className="px-3 py-2.5 text-center text-gray-500 text-xs">
                                {new Date(r.dataInvio).toLocaleDateString('it-IT')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="px-5 py-3 text-xs text-gray-600 italic">Nessun report per questo step</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
      {processes.length === 0 && (
        <div className="text-center py-16 text-gray-500">Nessun processo configurato</div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [tab, setTab] = useState<'attivita' | 'processi'>('attivita')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Report</h1>
        {/* Tab switcher */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {([['attivita', 'Attività'], ['processi', 'Processi']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === key ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'attivita' ? <AttivitaTab /> : <ProcessiTab />}
    </div>
  )
}
