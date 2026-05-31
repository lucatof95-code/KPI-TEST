import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionsApi } from '../../api'
import { Session } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useGlobalToast } from '../../components/layout/Layout'

interface SessionForm { nome: string; ordine: string }
const empty: SessionForm = { nome: '', ordine: '' }

export default function Sessions() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()
  const { data: sessions = [], isLoading } = useQuery({ queryKey: ['sessions'], queryFn: sessionsApi.list })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)
  const [form, setForm] = useState<SessionForm>(empty)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const openCreate = () => { setEditing(null); setForm({ nome: '', ordine: String((sessions.length || 0) + 1) }); setErrors({}); setModalOpen(true) }
  const openEdit = (s: Session) => { setEditing(s); setForm({ nome: s.nome, ordine: String(s.ordine) }); setErrors({}); setModalOpen(true) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.nome.trim()) e.nome = 'Nome obbligatorio'
    if (!form.ordine || isNaN(Number(form.ordine))) e.ordine = 'Ordine deve essere un numero'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = useMutation({
    mutationFn: () => {
      const data = { nome: form.nome.trim(), ordine: Number(form.ordine) }
      return editing ? sessionsApi.update(editing.id, data) : sessionsApi.create(data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); setModalOpen(false); addToast(editing ? 'Sessione aggiornata' : 'Sessione creata') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => sessionsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); setDeleteId(null); addToast('Sessione eliminata') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const handleSave = () => { if (validate()) save.mutate() }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Sessioni</h1>
          <p className="text-gray-500 text-sm mt-0.5">{sessions.length} sessioni, ordinate per sequenza</p>
        </div>
        <Button onClick={openCreate}>+ Nuova sessione</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {sessions.map((sess) => (
            <div key={sess.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center font-mono font-bold text-sm">
                  {sess.ordine}
                </div>
                <p className="font-medium text-gray-100">{sess.nome}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(sess)}>Modifica</Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteId(sess.id)}>Elimina</Button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <div className="text-center py-16 text-gray-500">Nessuna sessione configurata</div>}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifica sessione' : 'Nuova sessione'} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} error={errors.nome} />
          <Input label="Ordine" type="number" min="1" value={form.ordine} onChange={(e) => setForm((f) => ({ ...f, ordine: e.target.value }))} error={errors.ordine} hint="Determina la sequenza di sblocco" />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button isLoading={save.isPending} onClick={handleSave}>Salva</Button>
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
