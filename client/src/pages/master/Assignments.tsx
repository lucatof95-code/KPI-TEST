import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assignmentsApi, usersApi, sessionsApi, activitiesApi, areasApi } from '../../api'
import { Assignment } from '../../types'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import { useGlobalToast } from '../../components/layout/Layout'

const today = new Date().toISOString().split('T')[0]

function isLate(a: Assignment) {
  return a.stato === 'DA_SVOLGERE' && new Date(a.dataScadenza) < new Date(new Date().setHours(0,0,0,0))
}

export default function Assignments() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()

  const [filters, setFilters] = useState<{ userId: string; sessionId: string; areaId: string; stato: string }>({
    userId: '', sessionId: '', areaId: '', stato: '',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ activityId: '', userId: '', sessionId: '', dataScadenza: today })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', filters],
    queryFn: () => assignmentsApi.list({
      userId: filters.userId ? Number(filters.userId) : undefined,
      sessionId: filters.sessionId ? Number(filters.sessionId) : undefined,
      areaId: filters.areaId ? Number(filters.areaId) : undefined,
      stato: filters.stato || undefined,
    }),
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions'], queryFn: sessionsApi.list })
  const { data: activities = [] } = useQuery({ queryKey: ['activities'], queryFn: activitiesApi.list })
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: areasApi.list })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.activityId) e.activityId = 'Seleziona attività'
    if (!form.userId) e.userId = 'Seleziona utente'
    if (!form.sessionId) e.sessionId = 'Seleziona sessione'
    if (!form.dataScadenza) e.dataScadenza = 'Data obbligatoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const create = useMutation({
    mutationFn: () => assignmentsApi.create({
      activityId: Number(form.activityId),
      userId: Number(form.userId),
      sessionId: Number(form.sessionId),
      dataScadenza: form.dataScadenza,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); setModalOpen(false); addToast('Assegnazione creata') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => assignmentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); setDeleteId(null); addToast('Assegnazione eliminata') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const lateCount = assignments.filter(isLate).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Assegnazioni</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {assignments.length} assegnazioni {lateCount > 0 && <span className="text-red-400 ml-1">· {lateCount} in ritardo</span>}
          </p>
        </div>
        <Button onClick={() => { setForm({ activityId: '', userId: '', sessionId: '', dataScadenza: today }); setErrors({}); setModalOpen(true) }}>
          + Nuova assegnazione
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Select placeholder="Tutti gli utenti" value={filters.userId} onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
          options={users.map((u) => ({ value: u.id, label: `${u.cognome} ${u.nome}` }))} />
        <Select placeholder="Tutte le sessioni" value={filters.sessionId} onChange={(e) => setFilters((f) => ({ ...f, sessionId: e.target.value }))}
          options={sessions.map((s) => ({ value: s.id, label: s.nome }))} />
        <Select placeholder="Tutte le aree" value={filters.areaId} onChange={(e) => setFilters((f) => ({ ...f, areaId: e.target.value }))}
          options={areas.map((a) => ({ value: a.id, label: a.nome }))} />
        <Select placeholder="Tutti gli stati" value={filters.stato} onChange={(e) => setFilters((f) => ({ ...f, stato: e.target.value }))}
          options={[{ value: 'DA_SVOLGERE', label: 'Da svolgere' }, { value: 'SVOLTA', label: 'Svolta' }]} />
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
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Sessione</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Scadenza</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Stato</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className={`border-b border-gray-800 last:border-0 transition-colors ${isLate(a) ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-gray-800/40'}`}>
                  <td className="px-4 py-3 text-gray-100">{a.user.cognome} {a.user.nome}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge stato={a.activity.tipo} />
                      <span className="text-gray-200">{a.activity.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{a.session.nome}</td>
                  <td className="px-4 py-3">
                    <span className={isLate(a) ? 'text-red-400 font-medium' : 'text-gray-400'}>
                      {new Date(a.dataScadenza).toLocaleDateString('it-IT')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge stato={isLate(a) ? 'IN_RITARDO' : a.stato} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.stato === 'DA_SVOLGERE' && !a.report && (
                      <Button variant="danger" size="sm" onClick={() => setDeleteId(a.id)}>Elimina</Button>
                    )}
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">Nessuna assegnazione trovata</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuova assegnazione">
        <div className="flex flex-col gap-4">
          <Select label="Utente" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
            options={users.map((u) => ({ value: u.id, label: `${u.cognome} ${u.nome}` }))}
            placeholder="Seleziona utente" error={errors.userId} />
          <Select label="Attività" value={form.activityId} onChange={(e) => setForm((f) => ({ ...f, activityId: e.target.value }))}
            options={activities.map((a) => ({ value: a.id, label: a.nome }))}
            placeholder="Seleziona attività" error={errors.activityId} />
          <Select label="Sessione" value={form.sessionId} onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}
            options={sessions.map((s) => ({ value: s.id, label: s.nome }))}
            placeholder="Seleziona sessione" error={errors.sessionId} />
          <Input label="Data scadenza" type="date" value={form.dataScadenza}
            onChange={(e) => setForm((f) => ({ ...f, dataScadenza: e.target.value }))} error={errors.dataScadenza} />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button isLoading={create.isPending} onClick={() => { if (validate()) create.mutate() }}>Crea</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Conferma eliminazione" size="sm">
        <p className="text-gray-300 mb-6">Sei sicuro di voler eliminare questa assegnazione?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Annulla</Button>
          <Button variant="danger" isLoading={remove.isPending} onClick={() => deleteId && remove.mutate(deleteId)}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
