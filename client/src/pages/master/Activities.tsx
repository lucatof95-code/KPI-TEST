import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activitiesApi, areasApi } from '../../api'
import { Activity } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import { useGlobalToast } from '../../components/layout/Layout'

interface ActivityForm { nome: string; descrizione: string; tipo: string; areaIds: number[] }
const empty: ActivityForm = { nome: '', descrizione: '', tipo: 'FORMAZIONE', areaIds: [] }

export default function Activities() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()
  const { data: activities = [], isLoading } = useQuery({ queryKey: ['activities'], queryFn: activitiesApi.list })
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: areasApi.list })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [form, setForm] = useState<ActivityForm>(empty)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const openCreate = () => { setEditing(null); setForm(empty); setErrors({}); setModalOpen(true) }
  const openEdit = (a: Activity) => {
    setEditing(a)
    setForm({ nome: a.nome, descrizione: a.descrizione, tipo: a.tipo, areaIds: a.areas.map((x) => x.competencyAreaId) })
    setErrors({})
    setModalOpen(true)
  }

  const toggleArea = (id: number) => {
    setForm((f) => ({ ...f, areaIds: f.areaIds.includes(id) ? f.areaIds.filter((x) => x !== id) : [...f.areaIds, id] }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.nome.trim()) e.nome = 'Nome obbligatorio'
    if (!form.descrizione.trim()) e.descrizione = 'Descrizione obbligatoria'
    if (form.areaIds.length === 0) e.areaIds = 'Seleziona almeno un\'area'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = useMutation({
    mutationFn: () => {
      const data = { nome: form.nome.trim(), descrizione: form.descrizione.trim(), tipo: form.tipo, areaIds: form.areaIds }
      return editing ? activitiesApi.update(editing.id, data) : activitiesApi.create(data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); setModalOpen(false); addToast(editing ? 'Attività aggiornata' : 'Attività creata') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => activitiesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); setDeleteId(null); addToast('Attività eliminata') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Attività</h1>
          <p className="text-gray-500 text-sm mt-0.5">{activities.length} attività configurate</p>
        </div>
        <Button onClick={openCreate}>+ Nuova attività</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {activities.map((act) => (
            <div key={act.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge stato={act.tipo} />
                    <p className="font-medium text-gray-100">{act.nome}</p>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{act.descrizione}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {act.areas.map((a) => (
                      <span key={a.competencyAreaId} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">{a.competencyArea.nome}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(act)}>Modifica</Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteId(act.id)}>Elimina</Button>
                </div>
              </div>
            </div>
          ))}
          {activities.length === 0 && <div className="text-center py-16 text-gray-500">Nessuna attività configurata</div>}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifica attività' : 'Nuova attività'} size="lg">
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} error={errors.nome} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
              rows={3}
              className={`bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.descrizione ? 'border-red-500' : 'border-gray-700'}`}
            />
            {errors.descrizione && <p className="text-xs text-red-400">{errors.descrizione}</p>}
          </div>
          <Select
            label="Tipo"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
            options={[{ value: 'FORMAZIONE', label: 'Formazione' }, { value: 'TEST', label: 'Test' }]}
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Aree di competenza</label>
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => toggleArea(area.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.areaIds.includes(area.id)
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {area.nome}
                </button>
              ))}
            </div>
            {errors.areaIds && <p className="text-xs text-red-400">{errors.areaIds}</p>}
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button isLoading={save.isPending} onClick={() => { if (validate()) save.mutate() }}>Salva</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Conferma eliminazione" size="sm">
        <p className="text-gray-300 mb-6">Sei sicuro? Questa operazione non è reversibile.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Annulla</Button>
          <Button variant="danger" isLoading={remove.isPending} onClick={() => deleteId && remove.mutate(deleteId)}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
