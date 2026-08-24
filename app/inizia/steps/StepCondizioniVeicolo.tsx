'use client'

import { useState } from 'react'
import { DatiVeicolo, TipoMezzo } from '../../../types/pratica'
import { CampoModulo, classeCampo } from './PezziFlusso'

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
    if (!dati.vaInMoto) e.vaInMoto = 'Seleziona una risposta'
    if (!dati.marciante) e.marciante = 'Seleziona una risposta'
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

  const errCount = Object.keys(validate()).length
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
        label={`È incidentat${fem ? 'a' : 'o'}?`}
        sub="Ha subito un incidente"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        }
        value={dati.incidentato}
        error={errors.incidentato}
        onChange={v => togUpdate('incidentato', v)}
      />
      <ToggleRow
        id="field-vaInMoto"
        label="Va in moto?"
        sub="Il motore si avvia"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.5" cy="15.5" r="5.5"/>
            <path d="m21 2-9.6 9.6"/>
            <path d="m15.5 7.5 3 3L22 7l-3-3"/>
          </svg>
        }
        value={dati.vaInMoto}
        error={errors.vaInMoto}
        onChange={v => togUpdate('vaInMoto', v)}
      />
      <ToggleRow
        id="field-marciante"
        label="Cammina?"
        sub="Il mezzo è marciante e si sposta"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>
            <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9"/>
          </svg>
        }
        value={dati.marciante}
        error={errors.marciante}
        onChange={v => togUpdate('marciante', v)}
      />
      <ToggleRow
        id="field-partiMancanti"
        label="Mancano delle parti?"
        sub="Es. motore, ruote, portiere, catalizzatore, batteria"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 7h-3V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            <path d="M10 7V5h4v2"/>
          </svg>
        }
        value={dati.partiMancanti}
        error={errors.partiMancanti}
        onChange={v => togUpdate('partiMancanti', v)}
      />

      <CampoModulo label="Annotazioni (opzionale)">
        <textarea
          value={dati.note}
          onChange={e => onUpdate({ note: e.target.value })}
          placeholder="Descrivi eventuali annotazioni..."
          rows={3}
          className={classeCampo(false, 'campo-lungo')}
        />
      </CampoModulo>

      <button
        onClick={handleContinua}
        className="btn-pagina mt-2"
      >
        Continua
      </button>
    </div>
  )
}

// ============================================================
// CARD-RIGA CON TOGGLE
// ============================================================

interface ToggleRowProps {
  id: string
  label: string
  sub: string
  icon: React.ReactNode
  value: string | null
  error?: string
  onChange: (v: ToggleValue) => void
}

function ToggleRow({ id, label, sub, icon, value, error, onChange }: ToggleRowProps) {
  // ⭐ 24/08: la risposta presa si accende di BLU, come tutte le altre scelte
  // dei flussi. Prima il Sì e il No erano verdi o rossi a seconda che la
  // risposta fosse "buona": quel giudizio serve a noi, non al cliente.
  const selectedClasses = 'bg-blue-50 border-blue-600 text-blue-700 shadow-[0_0_0_3px_rgba(37,99,235,0.15)]'
  const offClasses = 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'

  const pillBase = 'flex items-center justify-center gap-1 px-3 py-2 rounded-full text-sm font-semibold border-[1.5px] transition-all min-w-[52px]'

  // ⭐ 24/08 (Davide): la striscia della domanda è BIANCA come le pillole,
  // non più grigia: sulla scena lilla le due famiglie si assomigliano.
  const cardClasses = error
    ? 'border-red-300 bg-red-50/40'
    : 'border-[#E2E8F0] bg-white shadow-[0_2px_6px_rgba(15,27,51,0.04)]'

  return (
    <div id={id} className={`flex items-center justify-between gap-3 p-3 rounded-2xl border-[1.5px] transition-all ${cardClasses}`}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">{label}</div>
          <div className="text-xs text-gray-500 mt-0.5 leading-snug">{sub}</div>
        </div>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onChange('si')}
          className={`${pillBase} ${value === 'si' ? selectedClasses : offClasses}`}
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
          className={`${pillBase} ${value === 'no' ? selectedClasses : offClasses}`}
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