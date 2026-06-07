import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { processesApi } from '../../api'
import { Process } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useGlobalToast } from '../../components/layout/Layout'

const statoBadge: Record<string, { label: string; cls: string }> = {
  BOZZA:      { label: 'Bozza',     cls: 'bg-gray-700 text-gray-300' },
  IN_CORSO:   { label: 'In corso',  cls: 'bg-blue-900/60 text-blue-400 border border-blue-700/50' },
  COMPLETATO: { label: 'Completato',cls: 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50' },
}

function stepProgress(p: Process) {
  const total = p.steps.length
  const done  = p.steps.filter((s) => s.stato === 'COMPLETATO').length
  const inCorso = p.steps.filter((s) => s.stato === 'IN_CORSO').length
  return { total, done, inCorso }
}

export default function Processes() {
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()
  const navigate = useNavigate()
  const { data: processes = [], isLoading } = useQuery({ queryKey: ['processes'], queryFn: processesApi.list })

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', descrizione: '' })
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const create = useMutation({
    mutationFn: () => processesApi.create(form),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['processes'] })
      setModalOpen(false)
      addToast('Processo creato')
      navigate(`/master/processes/${p.id}`)
    },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => processesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processes'] }); setDeleteId(null); addToast('Processo eliminato') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Processi</h1>
          <p className="text-gray-500 text-sm mt-0.5">Sequenze di attività con avanzamento automatico tra step</p>
        </div>
        <Button onClick={() => { setForm({ nome: '', descrizione: '' }); setModalOpen(true) }}>
          + Nuovo processo
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {processes.map((p) => {
            const { total, done, inCorso } = stepProgress(p)
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const badge = statoBadge[p.stato] || statoBadge.BOZZA
            return (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                      <h2 className="font-semibold text-gray-100">{p.nome}</h2>
                    </div>
                    {p.descrizione && <p className="text-sm text-gray-500 mb-3">{p.descrizione}</p>}
                    {/* Step progress */}
                    {total > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
                          <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                          {done}/{total} step{inCorso > 0 ? ` · ${inCorso} in corso` : ''}
                        </span>
                      </div>
                    )}
                    {total === 0 && <p className="text-xs text-gray-600">Nessuno step configurato</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/master/processes/${p.id}`)}>
                      {p.stato === 'BOZZA' ? 'Configura' : 'Visualizza'}
                    </Button>
                    {p.stato === 'BOZZA' && (
                      <Button variant="danger" size="sm" onClick={() => setDeleteId(p.id)}>Elimina</Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {processes.length === 0 && (
            <div className="text-center py-16 text-gray-500">Nessun processo configurato</div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo processo" size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Es. Gestione ordine cliente" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Descrizione (opzionale)</label>
            <textarea value={form.descrizione} onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
              rows={2} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button isLoading={create.isPending} onClick={() => { if (form.nome.trim()) create.mutate() }}>Crea e configura</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} title="Elimina processo" size="sm">
        <p className="text-gray-300 mb-6">Sei sicuro? Verranno eliminati anche tutti gli step e le assegnazioni collegate.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Annulla</Button>
          <Button variant="danger" isLoading={remove.isPending} onClick={() => deleteId && remove.mutate(deleteId)}>Elimina</Button>
        </div>
      </Modal>
    </div>
  )
}
