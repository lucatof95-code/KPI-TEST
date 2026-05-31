import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../../api'
import { User } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { useGlobalToast } from '../../components/layout/Layout'

interface UserForm { nome: string; cognome: string; email: string; password: string; ruolo: string }
const empty: UserForm = { nome: '', cognome: '', email: '', password: '', ruolo: 'USER' }

export default function Users() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(empty)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const openCreate = () => { setEditing(null); setForm(empty); setErrors({}); setModalOpen(true) }
  const openEdit = (u: User) => { setEditing(u); setForm({ nome: u.nome, cognome: u.cognome, email: u.email, password: '', ruolo: u.ruolo }); setErrors({}); setModalOpen(true) }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.nome.trim()) e.nome = 'Nome obbligatorio'
    if (!form.cognome.trim()) e.cognome = 'Cognome obbligatorio'
    if (!form.email.includes('@')) e.email = 'Email non valida'
    if (!editing && !form.password) e.password = 'Password obbligatoria'
    if (form.password && form.password.length < 6) e.password = 'Minimo 6 caratteri'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = useMutation({
    mutationFn: () => {
      const data: Record<string, string> = { nome: form.nome, cognome: form.cognome, email: form.email, ruolo: form.ruolo }
      if (form.password) data.password = form.password
      return editing ? usersApi.update(editing.id, data) : usersApi.create({ ...data, password: form.password } as Parameters<typeof usersApi.create>[0])
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModalOpen(false); addToast(editing ? 'Utente aggiornato' : 'Utente creato') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteId(null); addToast('Utente eliminato') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Utenti</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} utenti registrati</p>
        </div>
        <Button onClick={openCreate}>+ Nuovo utente</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900/80 border-b border-gray-800">
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Ruolo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-gray-100">{u.cognome} {u.nome}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge label={u.ruolo} variant={u.ruolo === 'MASTER' ? 'warning' : 'info'} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Modifica</Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteId(u.id)}>Elimina</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-gray-500">Nessun utente</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifica utente' : 'Nuovo utente'}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} error={errors.nome} />
          <Input label="Cognome" value={form.cognome} onChange={(e) => setForm((f) => ({ ...f, cognome: e.target.value }))} error={errors.cognome} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} error={errors.email} className="col-span-2" />
          <Input
            label={editing ? 'Nuova password (lascia vuoto per non modificare)' : 'Password'}
            type="password" value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={errors.password} className="col-span-2"
          />
          <Select
            label="Ruolo"
            value={form.ruolo}
            onChange={(e) => setForm((f) => ({ ...f, ruolo: e.target.value }))}
            options={[{ value: 'USER', label: 'Utente' }, { value: 'MASTER', label: 'Master' }]}
            className="col-span-2"
          />
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
          <Button isLoading={save.isPending} onClick={() => { if (validate()) save.mutate() }}>Salva</Button>
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
