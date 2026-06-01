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
import { CalendarEventInput } from '../../types'

// Default date for the new-assignment form (browser local date, display only — no logic)
const today = new Date().toISOString().split('T')[0]

export default function Assignments() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()

  const [filters, setFilters] = useState({ userId: '', sessionId: '', areaId: '', stato: '' })
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmNotify, setConfirmNotify] = useState(false)
  const [withCalendar, setWithCalendar] = useState(false)
  const [calEvent, setCalEvent] = useState<CalendarEventInput>({
    title: 'Sessione formazione ERP',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: '',
  })
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

  const lateCount = assignments.filter((a) => a.isLate).length

  // Selection helpers
  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (selected.size === assignments.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(assignments.map((a) => a.id)))
    }
  }
  const isAllSelected = assignments.length > 0 && selected.size === assignments.length
  const isIndeterminate = selected.size > 0 && selected.size < assignments.length

  // Preview grouping for confirm modal
  const selectedAssignments = assignments.filter((a) => selected.has(a.id))
  const byUser = Object.values(
    selectedAssignments.reduce<Record<number, { user: Assignment['user']; items: Assignment[] }>>(
      (acc, a) => {
        if (!acc[a.userId]) acc[a.userId] = { user: a.user, items: [] }
        acc[a.userId].items.push(a)
        return acc
      },
      {},
    ),
  )

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      setModalOpen(false)
      addToast('Assegnazione creata')
    },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => assignmentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] })
      setDeleteId(null)
      addToast('Assegnazione eliminata')
    },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const notify = useMutation({
    mutationFn: () => assignmentsApi.notify(
      Array.from(selected),
      withCalendar ? calEvent : undefined,
    ),
    onSuccess: (res) => {
      setConfirmNotify(false)
      setSelected(new Set())
      addToast(res.message, res.failed > 0 ? 'error' : 'success')
    },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Assegnazioni</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {assignments.length} assegnazioni
            {lateCount > 0 && <span className="text-red-400 ml-1">· {lateCount} in ritardo</span>}
            {selected.size > 0 && (
              <span className="text-blue-400 ml-2">· {selected.size} selezionat{selected.size === 1 ? 'a' : 'e'}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button
              variant="secondary"
              onClick={() => setConfirmNotify(true)}
            >
              📧 Invia notifica ({selected.size})
            </Button>
          )}
          <Button onClick={() => {
            setForm({ activityId: '', userId: '', sessionId: '', dataScadenza: today })
            setErrors({})
            setModalOpen(true)
          }}>
            + Nuova assegnazione
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Select placeholder="Tutti gli utenti" value={filters.userId}
          onChange={(e) => { setFilters((f) => ({ ...f, userId: e.target.value })); setSelected(new Set()) }}
          options={users.map((u) => ({ value: u.id, label: `${u.cognome} ${u.nome}` }))} />
        <Select placeholder="Tutte le sessioni" value={filters.sessionId}
          onChange={(e) => { setFilters((f) => ({ ...f, sessionId: e.target.value })); setSelected(new Set()) }}
          options={sessions.map((s) => ({ value: s.id, label: s.nome }))} />
        <Select placeholder="Tutte le aree" value={filters.areaId}
          onChange={(e) => { setFilters((f) => ({ ...f, areaId: e.target.value })); setSelected(new Set()) }}
          options={areas.map((a) => ({ value: a.id, label: a.nome }))} />
        <Select placeholder="Tutti gli stati" value={filters.stato}
          onChange={(e) => { setFilters((f) => ({ ...f, stato: e.target.value })); setSelected(new Set()) }}
          options={[{ value: 'DA_SVOLGERE', label: 'Da svolgere' }, { value: 'SVOLTA', label: 'Svolta' }]} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900/80 border-b border-gray-800">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => { if (el) el.indeterminate = isIndeterminate }}
                    onChange={toggleAll}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Utente</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Attività</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Sessione</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Scadenza</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Stato</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const late = a.isLate
                const isChecked = selected.has(a.id)
                return (
                  <tr
                    key={a.id}
                    onClick={() => toggleOne(a.id)}
                    className={`border-b border-gray-800 last:border-0 cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-blue-950/30'
                        : late
                        ? 'bg-red-950/20 hover:bg-red-950/30'
                        : 'hover:bg-gray-800/40'
                    }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(a.id)}
                        className="accent-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-100">{a.user.cognome} {a.user.nome}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge stato={a.activity.tipo} />
                        <span className="text-gray-200">{a.activity.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{a.session.nome}</td>
                    <td className="px-4 py-3">
                      <span className={late ? 'text-red-400 font-medium' : 'text-gray-400'}>
                        {new Date(a.dataScadenza).toLocaleDateString('it-IT')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge stato={late ? 'IN_RITARDO' : a.stato} />
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {a.stato === 'DA_SVOLGERE' && !a.report && (
                        <Button variant="danger" size="sm" onClick={() => setDeleteId(a.id)}>
                          Elimina
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    Nessuna assegnazione trovata
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm notify modal */}
      <Modal
        isOpen={confirmNotify}
        onClose={() => setConfirmNotify(false)}
        title="Invia notifica attività"
        size="lg"
      >
        {/* Recipients preview */}
        <p className="text-gray-400 text-sm mb-3">
          Verrà inviata <strong className="text-gray-200">una email per ogni utente</strong> con il riepilogo delle sue attività assegnate.
        </p>
        <div className="flex flex-col gap-2 mb-5">
          {byUser.map(({ user, items }) => (
            <div key={user.id} className="bg-gray-800 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-gray-200 mb-1">
                📧 {user.email}
                <span className="text-gray-500 ml-2 font-normal">({user.cognome} {user.nome})</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {items.map((a) => (
                  <span key={a.id} className="flex items-center gap-1 text-xs text-gray-400">
                    <StatusBadge stato={a.activity.tipo} />
                    {a.activity.nome}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar option */}
        <div className="border border-gray-800 rounded-xl overflow-hidden mb-5">
          <button
            type="button"
            onClick={() => setWithCalendar((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/60 hover:bg-gray-800 transition-colors text-sm"
          >
            <span className="flex items-center gap-2 font-medium text-gray-200">
              📅 Aggiungi appuntamento calendario (Outlook)
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${withCalendar ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
              {withCalendar ? 'Attivo' : 'Facoltativo'}
            </span>
          </button>
          {withCalendar && (
            <div className="px-4 py-4 grid grid-cols-2 gap-3 bg-gray-900">
              <Input
                label="Titolo evento"
                value={calEvent.title}
                onChange={(e) => setCalEvent((c) => ({ ...c, title: e.target.value }))}
                className="col-span-2"
              />
              <Input
                label="Data"
                type="date"
                value={calEvent.date}
                onChange={(e) => setCalEvent((c) => ({ ...c, date: e.target.value }))}
              />
              <Input
                label="Luogo (opzionale)"
                placeholder="Sala riunioni / Teams link…"
                value={calEvent.location || ''}
                onChange={(e) => setCalEvent((c) => ({ ...c, location: e.target.value }))}
              />
              <Input
                label="Ora inizio"
                type="time"
                value={calEvent.startTime}
                onChange={(e) => setCalEvent((c) => ({ ...c, startTime: e.target.value }))}
              />
              <Input
                label="Ora fine"
                type="time"
                value={calEvent.endTime}
                onChange={(e) => setCalEvent((c) => ({ ...c, endTime: e.target.value }))}
              />
              <p className="col-span-2 text-xs text-gray-500">
                L'utente riceverà un file .ics nell'email: aprendo l'allegato Outlook aggiungerà l'appuntamento al calendario.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setConfirmNotify(false)}>Annulla</Button>
          <Button isLoading={notify.isPending} onClick={() => notify.mutate()}>
            Invia {byUser.length} email{withCalendar ? ' + calendario' : ''}
          </Button>
        </div>
      </Modal>

      {/* New assignment modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuova assegnazione">
        <div className="flex flex-col gap-4">
          <Select label="Utente" value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
            options={users.map((u) => ({ value: u.id, label: `${u.cognome} ${u.nome}` }))}
            placeholder="Seleziona utente" error={errors.userId} />
          <Select label="Attività" value={form.activityId}
            onChange={(e) => setForm((f) => ({ ...f, activityId: e.target.value }))}
            options={activities.map((a) => ({ value: a.id, label: a.nome }))}
            placeholder="Seleziona attività" error={errors.activityId} />
          <Select label="Sessione" value={form.sessionId}
            onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}
            options={sessions.map((s) => ({ value: s.id, label: s.nome }))}
            placeholder="Seleziona sessione" error={errors.sessionId} />
          <Input label="Data scadenza" type="date" value={form.dataScadenza}
            onChange={(e) => setForm((f) => ({ ...f, dataScadenza: e.target.value }))}
            error={errors.dataScadenza} />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button isLoading={create.isPending} onClick={() => { if (validate()) create.mutate() }}>Crea</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Conferma eliminazione" size="sm">
        <p className="text-gray-300 mb-6">Sei sicuro di voler eliminare questa assegnazione?</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Annulla</Button>
          <Button variant="danger" isLoading={remove.isPending}
            onClick={() => deleteId && remove.mutate(deleteId)}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
