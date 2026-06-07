import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { processesApi, activitiesApi, usersApi } from '../../api'
import { ProcessStep } from '../../types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { useGlobalToast } from '../../components/layout/Layout'

const stepColors: Record<string, string> = {
  BLOCCATO:   'bg-gray-700 text-gray-400',
  IN_CORSO:   'bg-blue-600 text-white',
  COMPLETATO: 'bg-emerald-600 text-white',
}
const stepLabels: Record<string, string> = {
  BLOCCATO: 'Bloccato', IN_CORSO: 'In corso', COMPLETATO: 'Completato',
}

export default function ProcessDetail() {
  const { id } = useParams<{ id: string }>()
  const processId = parseInt(id!)
  const qc = useQueryClient()
  const { addToast } = useGlobalToast()
  const navigate = useNavigate()

  const { data: process, isLoading } = useQuery({
    queryKey: ['process', processId],
    queryFn: () => processesApi.get(processId),
  })
  const { data: activities = [] } = useQuery({ queryKey: ['activities'], queryFn: activitiesApi.list })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  const [addStepOpen, setAddStepOpen] = useState(false)
  const [editStepId, setEditStepId] = useState<number | null>(null)
  const [stepForm, setStepForm] = useState({ activityId: '', ordine: '', dataScadenza: '' })
  const [addUserStepId, setAddUserStepId] = useState<number | null>(null)
  const [addUserId, setAddUserId] = useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['process', processId] })

  const addStep = useMutation({
    mutationFn: () => processesApi.addStep(processId, {
      activityId: Number(stepForm.activityId),
      ordine: Number(stepForm.ordine),
      dataScadenza: stepForm.dataScadenza || null,
    }),
    onSuccess: () => { invalidate(); setAddStepOpen(false); addToast('Step aggiunto') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const updateStep = useMutation({
    mutationFn: () => processesApi.updateStep(processId, editStepId!, {
      activityId: Number(stepForm.activityId),
      ordine: Number(stepForm.ordine),
      dataScadenza: stepForm.dataScadenza || null,
    }),
    onSuccess: () => { invalidate(); setEditStepId(null); addToast('Step aggiornato') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const deleteStep = useMutation({
    mutationFn: (stepId: number) => processesApi.deleteStep(processId, stepId),
    onSuccess: () => { invalidate(); addToast('Step eliminato') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const addUser = useMutation({
    mutationFn: () => processesApi.addUserToStep(processId, addUserStepId!, Number(addUserId)),
    onSuccess: () => { invalidate(); setAddUserStepId(null); setAddUserId(''); addToast('Utente aggiunto') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const removeUser = useMutation({
    mutationFn: ({ stepId, userId }: { stepId: number; userId: number }) =>
      processesApi.removeUserFromStep(processId, stepId, userId),
    onSuccess: () => { invalidate(); addToast('Utente rimosso') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const startProcess = useMutation({
    mutationFn: () => processesApi.start(processId),
    onSuccess: () => { invalidate(); addToast('Processo avviato!', 'success') },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  const openAddStep = () => {
    const nextOrdine = (process?.steps.length ?? 0) + 1
    setStepForm({ activityId: '', ordine: String(nextOrdine), dataScadenza: '' })
    setAddStepOpen(true)
  }

  const openEditStep = (step: ProcessStep) => {
    setEditStepId(step.id)
    setStepForm({
      activityId: String(step.activityId),
      ordine: String(step.ordine),
      dataScadenza: step.dataScadenza ? step.dataScadenza.split('T')[0] : '',
    })
  }

  if (isLoading || !process) {
    return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  }

  const isBozza = process.stato === 'BOZZA'
  const hasSteps = process.steps.length > 0
  const firstStepHasUsers = (process.steps[0]?.users.length ?? 0) > 0
  const canStart = isBozza && hasSteps && firstStepHasUsers

  const startBlockReason = !isBozza
    ? null // già avviato, non mostrare il bottone
    : !hasSteps
    ? 'Aggiungi almeno uno step per avviare'
    : !firstStepHasUsers
    ? 'Il primo step deve avere almeno un utente assegnato'
    : null

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <button onClick={() => navigate('/master/processes')} className="text-xs text-gray-500 hover:text-gray-300 mb-1">← Processi</button>
          <h1 className="text-2xl font-bold text-gray-100">{process.nome}</h1>
          {process.descrizione && <p className="text-gray-500 text-sm mt-0.5">{process.descrizione}</p>}
          <span className={`inline-block mt-2 text-xs px-2.5 py-1 rounded-full font-medium ${
            process.stato === 'BOZZA' ? 'bg-gray-700 text-gray-300' :
            process.stato === 'IN_CORSO' ? 'bg-blue-900/60 text-blue-400 border border-blue-700/50' :
            'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50'
          }`}>
            {process.stato === 'BOZZA' ? 'Bozza' : process.stato === 'IN_CORSO' ? 'In corso' : 'Completato'}
          </span>
        </div>
        {/* Mostra il bottone finché il processo è in BOZZA, anche se disabilitato */}
        {isBozza && (
          <div className="flex flex-col items-end gap-1.5">
            <Button
              isLoading={startProcess.isPending}
              disabled={!canStart}
              onClick={() => canStart && startProcess.mutate()}
            >
              ▶ Avvia processo
            </Button>
            {startBlockReason && (
              <p className="text-xs text-amber-400 text-right max-w-48">{startBlockReason}</p>
            )}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Vertical line */}
        {process.steps.length > 1 && (
          <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gray-800" />
        )}

        <div className="flex flex-col gap-4">
          {process.steps.map((step, idx) => {
            const usersInStep = step.users ?? []
            const assignedUserIds = usersInStep.map((u) => u.userId)
            return (
              <div key={step.id} className="relative flex gap-4">
                {/* Step number bubble */}
                <div className={`z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${stepColors[step.stato]}`}>
                  {step.stato === 'COMPLETATO' ? '✓' : idx + 1}
                </div>

                {/* Step card */}
                <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stepColors[step.stato]}`}>
                          {stepLabels[step.stato]}
                        </span>
                        <span className="font-medium text-gray-100">{step.activity.nome}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {step.activity.areas.map((a) => (
                          <span key={a.competencyAreaId} className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                            {a.competencyArea.nome}
                          </span>
                        ))}
                        {step.dataScadenza && (
                          <span className="text-xs text-gray-500">
                            · scad. {new Date(step.dataScadenza).toLocaleDateString('it-IT')}
                          </span>
                        )}
                      </div>
                    </div>
                    {isBozza && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => openEditStep(step)}>✎</Button>
                        <Button variant="danger" size="sm" onClick={() => deleteStep.mutate(step.id)}>✕</Button>
                      </div>
                    )}
                  </div>

                  {/* Users */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {usersInStep.map((psu) => (
                      <div key={psu.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        psu.assignment?.stato === 'SVOLTA'
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                          : psu.assignment
                          ? 'bg-blue-900/40 text-blue-400 border border-blue-700/40'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        <span>{psu.user.cognome} {psu.user.nome}</span>
                        {psu.assignment?.stato === 'SVOLTA' && <span>✓</span>}
                        {isBozza && (
                          <button onClick={() => removeUser.mutate({ stepId: step.id, userId: psu.userId })}
                            className="ml-1 text-gray-600 hover:text-red-400 transition-colors">✕</button>
                        )}
                      </div>
                    ))}
                    {isBozza && (
                      <button
                        onClick={() => { setAddUserStepId(step.id); setAddUserId('') }}
                        className="text-xs text-gray-500 hover:text-blue-400 border border-dashed border-gray-700 hover:border-blue-600 px-2.5 py-1 rounded-full transition-colors"
                      >
                        + utente
                      </button>
                    )}
                    {usersInStep.length === 0 && !isBozza && (
                      <span className="text-xs text-gray-600 italic">Nessun utente assegnato</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add step button */}
        {isBozza && (
          <div className="flex justify-center mt-4">
            <Button variant="secondary" onClick={openAddStep}>+ Aggiungi step</Button>
          </div>
        )}

        {process.steps.length === 0 && !isBozza && (
          <div className="text-center py-10 text-gray-500">Nessuno step configurato</div>
        )}
      </div>

      {/* Add/Edit step modal */}
      <Modal
        isOpen={addStepOpen || editStepId !== null}
        onClose={() => { setAddStepOpen(false); setEditStepId(null) }}
        title={editStepId ? 'Modifica step' : 'Aggiungi step'}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Select label="Attività" value={stepForm.activityId}
            onChange={(e) => setStepForm((f) => ({ ...f, activityId: e.target.value }))}
            options={activities.map((a) => ({ value: a.id, label: `${a.tipo === 'TEST' ? '📝 ' : '📚 '}${a.nome}` }))}
            placeholder="Seleziona attività" />
          <Input label="Ordine (posizione nella sequenza)" type="number" min="1"
            value={stepForm.ordine}
            onChange={(e) => setStepForm((f) => ({ ...f, ordine: e.target.value }))} />
          <Input label="Data scadenza (opzionale)" type="date"
            value={stepForm.dataScadenza}
            onChange={(e) => setStepForm((f) => ({ ...f, dataScadenza: e.target.value }))} />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => { setAddStepOpen(false); setEditStepId(null) }}>Annulla</Button>
            <Button
              isLoading={addStep.isPending || updateStep.isPending}
              onClick={() => {
                if (!stepForm.activityId || !stepForm.ordine) return
                editStepId ? updateStep.mutate() : addStep.mutate()
              }}
            >
              {editStepId ? 'Salva' : 'Aggiungi'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add user to step modal */}
      <Modal isOpen={addUserStepId !== null} onClose={() => setAddUserStepId(null)} title="Aggiungi utente allo step" size="sm">
        <div className="flex flex-col gap-4">
          <Select label="Utente" value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
            options={users
              .filter((u) => u.ruolo === 'USER')
              .filter((u) => {
                const step = process.steps.find((s) => s.id === addUserStepId)
                return !step?.users.some((su) => su.userId === u.id)
              })
              .map((u) => ({ value: u.id, label: `${u.cognome} ${u.nome}` }))}
            placeholder="Seleziona utente" />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setAddUserStepId(null)}>Annulla</Button>
            <Button isLoading={addUser.isPending} onClick={() => { if (addUserId) addUser.mutate() }}>Aggiungi</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
