import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi } from '../../api'
import { Assignment } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { ScoreSlider } from '../../components/ui/ScoreSlider'
import { useGlobalToast } from '../../components/layout/Layout'

interface Props {
  assignment: Assignment
  onClose: () => void
  onSuccess: () => void
}

interface FormState {
  obiettivo: number
  complessita: number
  confrontoVecchioERP: number
  miglioramentoEfficienza: number
  haProblemi: boolean
  descrizioneProblema: string
  richiedeNuovaFormazione: boolean
  giudizioApprendimento: number
}

export default function ReportFormModal({ assignment, onClose, onSuccess }: Props) {
  const { addToast } = useGlobalToast()
  const [form, setForm] = useState<FormState>({
    obiettivo: 5, complessita: 5, confrontoVecchioERP: 5, miglioramentoEfficienza: 5,
    haProblemi: false, descrizioneProblema: '',
    richiedeNuovaFormazione: false, giudizioApprendimento: 70,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.haProblemi && !form.descrizioneProblema.trim()) e.descrizioneProblema = 'Descrizione obbligatoria'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = useMutation({
    mutationFn: () =>
      reportsApi.create({
        assignmentId: assignment.id,
        obiettivo: form.obiettivo,
        complessita: form.complessita,
        confrontoVecchioERP: form.confrontoVecchioERP,
        miglioramentoEfficienza: form.miglioramentoEfficienza,
        haProblemi: form.haProblemi,
        descrizioneProblema: form.haProblemi ? form.descrizioneProblema : undefined,
        richiedeNuovaFormazione: form.richiedeNuovaFormazione,
        giudizioApprendimento: form.richiedeNuovaFormazione ? null : form.giudizioApprendimento,
      }),
    onSuccess: () => {
      addToast('Report inviato! Attività completata.', 'success')
      onSuccess()
    },
    onError: (e: Error) => addToast(e.message, 'error'),
  })

  return (
    <Modal isOpen onClose={onClose} title={`Report: ${assignment.activity.nome}`} size="lg">
      <div className="flex flex-col gap-6">
        {/* Scores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-gray-800/40 rounded-lg p-4">
          <ScoreSlider
            label="Raggiungimento obiettivo"
            sublabel="Quanto è stato raggiunto l'obiettivo dell'attività?"
            value={form.obiettivo}
            onChange={(v) => set('obiettivo', v)}
            leftLabel="Non raggiunto"
            rightLabel="Pienamente"
          />
          <ScoreSlider
            label="Complessità"
            sublabel="Quanto è stata complessa questa attività?"
            value={form.complessita}
            onChange={(v) => set('complessita', v)}
            leftLabel="Molto semplice"
            rightLabel="Molto complessa"
          />
          <ScoreSlider
            label="Confronto con vecchio ERP"
            sublabel="1 = molto più complessa del vecchio · 10 = molto più facile"
            value={form.confrontoVecchioERP}
            onChange={(v) => set('confrontoVecchioERP', v)}
            leftLabel="Molto peggio"
            rightLabel="Molto meglio"
          />
          <ScoreSlider
            label="Miglioramento efficacia ed efficienza"
            sublabel="Quanto il nuovo sistema migliora il tuo lavoro?"
            value={form.miglioramentoEfficienza}
            onChange={(v) => set('miglioramentoEfficienza', v)}
            leftLabel="Nessun miglioramento"
            rightLabel="Grande miglioramento"
          />
        </div>

        {/* Problemi */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('haProblemi', !form.haProblemi)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.haProblemi ? 'bg-red-500' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${form.haProblemi ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-gray-300">Ho riscontrato problemi</span>
          </label>
          {form.haProblemi && (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">Descrivi il problema (per supporto risolutivo)</label>
              <textarea
                value={form.descrizioneProblema}
                onChange={(e) => set('descrizioneProblema', e.target.value)}
                rows={3}
                placeholder="Descrivi il problema riscontrato in modo chiaro e dettagliato..."
                className={`bg-gray-800 border rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${errors.descrizioneProblema ? 'border-red-500' : 'border-gray-700'}`}
              />
              {errors.descrizioneProblema && <p className="text-xs text-red-400">{errors.descrizioneProblema}</p>}
            </div>
          )}
        </div>

        {/* Formazione / Apprendimento */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('richiedeNuovaFormazione', !form.richiedeNuovaFormazione)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.richiedeNuovaFormazione ? 'bg-amber-500' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${form.richiedeNuovaFormazione ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-gray-300">Richiede nuova formazione</span>
          </label>

          {!form.richiedeNuovaFormazione && (
            <ScoreSlider
              label="Giudizio sull'apprendimento personale"
              sublabel="Quanto hai appreso da questa attività? (0 = niente, 100 = moltissimo)"
              value={form.giudizioApprendimento}
              min={0}
              max={100}
              onChange={(v) => set('giudizioApprendimento', v)}
              leftLabel="0 – Niente"
              rightLabel="100 – Moltissimo"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-800">
          <Button variant="secondary" onClick={onClose}>Annulla</Button>
          <Button isLoading={submit.isPending} onClick={() => { if (validate()) submit.mutate() }}>
            Invia report
          </Button>
        </div>
      </div>
    </Modal>
  )
}
