import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { kpiApi, usersApi, areasApi } from '../../api'
import { Select } from '../../components/ui/Select'
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts'

function KpiCard({ label, value, color, sublabel }: { label: string; value: number | null; color: string; sublabel?: string }) {
  const display = value === null ? '—' : `${value.toFixed(1)}%`
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-2">
      <p className="text-sm text-gray-400 font-medium">{label}</p>
      <p className={`font-mono text-4xl font-bold tabular-nums ${color}`}>{display}</p>
      {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
    </div>
  )
}

function ApprendimentoCard({ value }: { value: number | null }) {
  const display = value === null ? '—' : `${value.toFixed(1)}`
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-2">
      <p className="text-sm text-gray-400 font-medium">Valutazione apprendimento</p>
      <p className="font-mono text-4xl font-bold tabular-nums text-violet-400">{display}{value !== null && <span className="text-xl text-gray-500">/100</span>}</p>
      <p className="text-xs text-gray-500">Media su attività senza richiesta nuova formazione</p>
    </div>
  )
}

const AREA_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function Dashboard() {
  const [userId, setUserId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [invertiComplessita, setInvertiComplessita] = useState(false)

  const { data: kpi, isLoading } = useQuery({
    queryKey: ['kpi', userId, areaId, invertiComplessita],
    queryFn: () => kpiApi.get({
      userId: userId ? Number(userId) : undefined,
      areaId: areaId ? Number(areaId) : undefined,
      invertiComplessita,
    }),
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: areasApi.list })

  const barData = kpi?.perArea
    .filter((a) => a.assegnate > 0)
    .map((a, i) => ({
      nome: a.area.nome.length > 18 ? a.area.nome.slice(0, 16) + '…' : a.area.nome,
      completamento: a.completamento !== null ? parseFloat(a.completamento.toFixed(1)) : 0,
      qualita: a.qualitaMedia !== null ? parseFloat(a.qualitaMedia.toFixed(1)) : 0,
      color: AREA_COLORS[i % AREA_COLORS.length],
      importanza: a.area.importanza,
      assegnate: a.assegnate,
      svolte: a.svolte,
    })) || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Dashboard KPI</h1>
          <p className="text-gray-500 text-sm mt-0.5">Aggiornata a ogni nuova risposta ricevuta</p>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            options={users.filter((u) => u.ruolo === 'USER').map((u) => ({ value: u.id, label: `${u.cognome} ${u.nome}` }))}
            placeholder="Tutti gli utenti"
          />
          <Select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            options={areas.map((a) => ({ value: a.id, label: a.nome }))}
            placeholder="Tutte le aree"
          />
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={invertiComplessita}
              onChange={(e) => setInvertiComplessita(e.target.checked)}
              className="accent-blue-500"
            />
            Inverti complessità
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Attività svolte / assegnate"
              value={kpi?.perSvolte ?? null}
              color="text-blue-400"
              sublabel="Percentuale completamento totale"
            />
            <KpiCard
              label="Svolte entro scadenza"
              value={kpi?.perEntroOggi ?? null}
              color="text-emerald-400"
              sublabel="Su attività con scadenza ≤ oggi"
            />
            <KpiCard
              label="Qualità media"
              value={kpi?.qualita ?? null}
              color="text-amber-400"
              sublabel={invertiComplessita ? 'Complessità invertita (11-x)' : 'Punteggio composito /40'}
            />
            <ApprendimentoCard value={kpi?.apprendimento ?? null} />
          </div>

          {/* Area breakdown */}
          {barData.length > 0 && (
            <div className="grid xl:grid-cols-2 gap-4">
              {/* Completion bar chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-medium text-gray-400 mb-4">Completamento per area</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="nome" tick={{ fill: '#9ca3af', fontSize: 11 }} width={120} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                      labelStyle={{ color: '#e5e7eb' }}
                      formatter={(v) => [`${v}%`, 'Completamento']}
                    />
                    <Bar dataKey="completamento" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Quality bar chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-medium text-gray-400 mb-4">Qualità media per area (%)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="nome" tick={{ fill: '#9ca3af', fontSize: 11 }} width={120} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                      formatter={(v) => [`${v}%`, 'Qualità']}
                    />
                    <Bar dataKey="qualita" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.75} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Area table */}
          {kpi && kpi.perArea.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h2 className="text-sm font-medium text-gray-300">Avanzamento per area (ordinato per importanza)</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-5 py-3 text-gray-400 font-medium">Area</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Importanza</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Svolte / Assegnate</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Completamento</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Qualità media</th>
                  </tr>
                </thead>
                <tbody>
                  {kpi.perArea.map((a) => (
                    <tr key={a.area.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40">
                      <td className="px-5 py-3 text-gray-200">{a.area.nome}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-amber-400">{'★'.repeat(a.area.importanza)}<span className="text-gray-700">{'★'.repeat(5 - a.area.importanza)}</span></span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-gray-300">{a.svolte} / {a.assegnate}</td>
                      <td className="px-4 py-3 text-center font-mono">
                        {a.completamento !== null ? (
                          <span className={a.completamento >= 80 ? 'text-emerald-400' : a.completamento >= 50 ? 'text-amber-400' : 'text-red-400'}>
                            {a.completamento.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {a.qualitaMedia !== null
                          ? <span className="text-amber-400">{a.qualitaMedia.toFixed(1)}%</span>
                          : <span className="text-gray-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
