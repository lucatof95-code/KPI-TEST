import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { areasApi } from '../../api'
import { CompetencyArea } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { StarRating } from '../../components/ui/StarRating'
import { useGlobalToast } from '../../components/layout/Layout'

interface AreaForm { nome: string; importanza: number }
const empty: AreaForm = { nome: '', importanza: 3 }

export default function CompetencyAreas() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()
  const { data: areas = [], isLoading } = useQuery({ queryKey: ['areas'], queryFn: areasApi.list })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CompetencyArea | null>(null)
  const [form, setForm] = useState<AreaForm>(empty)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true) }
  const openEdit = (a: CompetencyArea) => { setEditing(a); setForm({ nome: a.nome, importanza: a.importanza }); setModalOpen(true) }

  const save = useMutation({
    mutationFn: () => editing ? areasApi.update(editing.id, form) : areasApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setModalOpen(false); addToast(editing ? 'Area aggiornata' : 'Area creata') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => areasApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setDeleteId(null); addToast('Area eliminata') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Aree di competenza</h1>
          <p className="text-gray-500 text-sm mt-0.5">{areas.length} aree configurate</p>
        </div>
        <Button onClick={openCreate}>+ Nuova area</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {areas.map((area) => (
            <div key={area.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-100">{area.nome}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">Importanza:</span>
                  <StarRating value={area.importanza} readOnly />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(area)}>Modifica</Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteId(area.id)}>Elimina</Button>
              </div>
            </div>
          ))}
          {areas.length === 0 && (
            <div className="text-center py-16 text-gray-500">Nessuna area configurata</div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifica area' : 'Nuova area'} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Importanza</label>
            <StarRating value={form.importanza} onChange={(v) => setForm((f) => ({ ...f, importanza: v }))} />
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button isLoading={save.isPending} onClick={() => save.mutate()}>Salva</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Conferma eliminazione" size="sm">
        <p className="text-gray-300 mb-6">Sei sicuro di voler eliminare questa area? L'operazione non è reversibile.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Annulla</Button>
          <Button variant="danger" isLoading={remove.isPending} onClick={() => deleteId && remove.mutate(deleteId)}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
