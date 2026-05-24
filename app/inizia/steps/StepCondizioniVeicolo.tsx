'use client'

import { useState } from 'react'
import { DatiVeicolo, TipoMezzo } from '../../../types/pratica'

interface Props {
  dati: DatiVeicolo
  onUpdate: (d: Partial<DatiVeicolo>) => void
  onNext: () => void
}

type ToggleValue = 'si' | 'no' | null

interface Errors {
  incidentato?: string
  marciante?: string
  vaInMoto?: string
  partiMancanti?: string
}

function nomeCapitalizzato(tipo: TipoMezzo | null): string {
  if (!tipo) return 'Veicolo'
  const map: Record<TipoMezzo, string> = {
    autovettura: 'Autovettura',
    motoveicolo: 'Motoveicolo',
    ciclomotore: 'Ciclomotore',
    minicar: 'Minicar',
    imbarcazione: 'Imbarcazione',
    pullman: 'Pullman',
    camion: 'Camion',
    velivolo: 'Velivolo',
    altro: 'Mezzo',
  }
  return map[tipo]
}

function isFemminile(tipo: TipoMezzo | null): boolean {
  if (!tipo) return false
  return tipo === 'autovettura' || tipo === 'minicar' || tipo === 'imbarcazione'
}

export function StepCondizioniVeicolo({ dati, onUpdate, onNext }: Props) {
  const [errors, setErrors] = useState<Errors>({})
  const [showBanner, setShowBanner] = useState(false)

  function togUpdate(field: 'incidentato' | 'marciante' | 'vaInMoto' | 'partiMancanti', val: ToggleValue) {
    onUpdate({ [field]: val })
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setShowBanner(false)
  }

  function validate(): Errors {
    const e: Errors = {}
    if (!dati.incidentato) e.incidentato = 'Seleziona una risposta'
    if (!dati.marciante) e.marciante = 'Seleziona una risposta'
    if (!dati.vaInMoto) e.vaInMoto = 'Seleziona una risposta'
    if (!dati.partiMancanti) e.partiMancanti = 'Seleziona una risposta'
    return e
  }

  function handleContinua() {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      setShowBanner(true)
      const firstKey = Object.keys(e)[0]
      const el = document.getElementById(`field-${firstKey}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onNext()
  }

  function handleTextareaFocus(e: React.FocusEvent<HTMLTextAreaElement>) {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  const errCount = Object.keys(validate()).length
  const n = nomeCapitalizzato(dati.tipo)
  const fem = isFemminile(dati.tipo)

  return (
    <div className="flex flex-col gap-3">

      {showBanner && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
          <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
          <span>
            {errCount === 1
              ? 'Rispondi alla domanda mancante per continuare.'
              : `Rispondi alle ${errCount} domande per continuare.`}
          </span>
        </div>
      )}

      <ToggleRow
        id="field-incidentato"
        label={`${n} ${fem ? 'incidentata' : 'incidentato'}?`}
        value={dati.incidentato}
        siGood={false}
        error={errors.incidentato}
        onChange={v => togUpdate('incidentato', v)}
      />
      <ToggleRow
        id="field-marciante"
        label={`${n} marciante?`}
        value={dati.marciante}
        siGood={true}
        error={errors.marciante}
        onChange={v => togUpdate('marciante', v)}
      />
      <ToggleRow
        id="field-vaInMoto"
        label="Va in moto?"
        value={dati.vaInMoto}
        siGood={true}
        error={errors.vaInMoto}
        onChange={v => togUpdate('vaInMoto', v)}
      />
      <ToggleRow
        id="field-partiMancanti"
        label="Parti mancanti?"
        value={dati.partiMancanti}
        siGood={false}
        error={errors.partiMancanti}
        onChange={v => togUpdate('partiMancanti', v)}
      />

      <div className="h-px bg-gray-100 my-1" />

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Annotazioni (opzionale)</label>
        <textarea
          value={dati.note}
          onChange={e => onUpdate({ note: e.target.value })}
          onFocus={handleTextareaFocus}
          placeholder="Descrivi eventuali annotazioni..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base bg-gray-50 outline-none transition-all focus:border-blue-500 focus:bg-white resize-none placeholder:text-gray-400"
        />
      </div>

      <button
        onClick={handleContinua}
        className="w-full py-4 mt-2 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all"
      >
        Continua →
      </button>
    </div>
  )
}

// ============================================================
// TOGGLE COMPATTO
// ============================================================

interface ToggleRowProps {
  id: string
  label: string
  value: string | null
  siGood: boolean
  error?: string
  onChange: (v: ToggleValue) => void
}

function ToggleRow({ id, label, value, siGood, error, onChange }: ToggleRowProps) {
  const siSelectedClasses = siGood
    ? 'bg-green-100 border-green-300 text-green-800'
    : 'bg-red-100 border-red-300 text-red-800'
  const noSelectedClasses = siGood
    ? 'bg-red-100 border-red-300 text-red-800'
    : 'bg-green-100 border-green-300 text-green-800'

  const offClasses = error
    ? 'bg-white border-red-200 text-gray-500'
    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'

  const pillBase = 'flex items-center justify-center gap-1 px-4 py-2 rounded-full text-sm font-semibold border-[1.5px] transition-all min-w-[58px]'

  return (
    <div id={id} className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onChange('si')}
          className={`${pillBase} ${value === 'si' ? siSelectedClasses : offClasses}`}
        >
          {value === 'si' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
          Sì
        </button>
        <button
          type="button"
          onClick={() => onChange('no')}
          className={`${pillBase} ${value === 'no' ? noSelectedClasses : offClasses}`}
        >
          {value === 'no' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
          No
        </button>
      </div>
    </div>
  )
}