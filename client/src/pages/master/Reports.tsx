import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, usersApi, areasApi, sessionsApi } from '../../api'
import { Report } from '../../types'
import { Select } from '../../components/ui/Select'
import { StatusBadge, Badge } from '../../components/ui/Badge'

function calcQualita(r: Report, inverti = false) {
  const comp = inverti ? 11 - r.complessita : r.complessita
  return ((r.obiettivo + comp + r.confrontoVecchioERP + r.miglioramentoEfficienza) / 40) * 100
}

export default function Reports() {
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Report ricevuti</h1>
          <p className="text-gray-500 text-sm mt-0.5">{reports.length} report</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Select placeholder="Tutti gli utenti" value={userId} onChange={(e) => setUserId(e.target.value)}
          options={users.filter((u) => u.ruolo === 'USER').map((u) => ({ value: u.id, label: `${u.cognome} ${u.nome}` }))} />
        <Select placeholder="Tutte le aree" value={areaId} onChange={(e) => setAreaId(e.target.value)}
          options={areas.map((a) => ({ value: a.id, label: a.nome }))} />
        <Select placeholder="Tutte le sessioni" value={sessionId} onChange={(e) => setSessionId(e.target.value)}
          options={sessions.map((s) => ({ value: s.id, label: s.nome }))} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
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
              {reports.map((r) => (
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
                    {r.haProblemi ? (
                      <span title={r.descrizioneProblema || ''}>
                        <StatusBadge stato={r.statoRisoluzione} />
                      </span>
                    ) : <span className="text-gray-700">—</span>}
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
    </div>
  )
}
