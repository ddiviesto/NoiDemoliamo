'use client'

import { useState } from 'react'
import { DatiVeicolo } from '../../../types/pratica'

interface Props {
  dati: DatiVeicolo
  onUpdate: (d: Partial<DatiVeicolo>) => void
  onNext: () => void
}

interface Errors {
  anno?: string
  km?: string
  marca?: string
  modello?: string
}

// ============================================================
// ICONE CAMPI (stroke currentColor, colorate in blu dal parent)
// ============================================================

function IconaAnno() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconaKm() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19l4-14" />
      <path d="M16 5l4 14" />
      <path d="M12 8v-2" />
      <path d="M12 13v-2" />
      <path d="M12 18v-2" />
    </svg>
  )
}

function IconaMarca() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6" />
    </svg>
  )
}

function IconaModello() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

// ============================================================
// CAMPO A TESSERA
// Stessa famiglia visiva delle tessere di selezione degli altri step:
// bordo 1.5px, sfondo grigino, icona blu; a fuoco si accende di blu
// con l'alone, in errore diventa rossa.
// ============================================================

function CampoTessera({ id, label, icona, err, classe, children }: {
  id: string
  label: string
  icona: React.ReactNode
  err?: string
  classe?: string
  children: React.ReactNode
}) {
  return (
    <div id={id} className={classe}>
      <label
        className={`group flex flex-col gap-1 rounded-xl border-[1.5px] px-3 py-2.5 cursor-text transition-all ${
          err
            ? 'border-red-300 bg-red-50'
            : 'border-gray-200 bg-gray-50 focus-within:border-blue-600 focus-within:bg-blue-50 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]'
        }`}
      >
        <span className={`flex items-center gap-1.5 text-[13px] font-semibold leading-tight ${err ? 'text-red-600' : 'text-gray-800 group-focus-within:text-blue-700'}`}>
          <span className={`flex-shrink-0 ${err ? 'text-red-500' : 'text-blue-600'}`}>{icona}</span>
          {label}
        </span>
        {children}
      </label>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  )
}

export function StepIdentificaVeicolo({ dati, onUpdate, onNext }: Props) {
  const [errors, setErrors] = useState<Errors>({})

  function update(field: keyof DatiVeicolo, value: string) {
    onUpdate({ [field]: value })
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  // Formatta numero con separatore migliaia: 180000 → "180.000"
  function formatKm(value: string): string {
    const onlyDigits = value.replace(/\D/g, '')
    if (!onlyDigits) return ''
    return onlyDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  function handleKmChange(value: string) {
    const onlyDigits = value.replace(/\D/g, '')
    update('km', onlyDigits)
  }

  function validate(): Errors {
    const e: Errors = {}
    if (!dati.anno.trim()) e.anno = "Inserisci l'anno"
    if (!dati.km.trim()) e.km = 'Inserisci i km'
    if (!dati.marca.trim()) e.marca = 'Inserisci la marca'
    if (!dati.modello.trim()) e.modello = 'Inserisci il modello'
    return e
  }

  function handleContinua() {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      const firstKey = Object.keys(e)[0]
      const el = document.getElementById(`field-${firstKey}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onNext()
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  const inputClass = 'w-full bg-transparent outline-none text-[15px] text-gray-900 placeholder:text-gray-400'

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <CampoTessera id="field-anno" label="Anno di immatricolazione" icona={<IconaAnno />} err={errors.anno} classe="col-span-2">
          <input
            type="number"
            inputMode="numeric"
            value={dati.anno}
            onChange={e => update('anno', e.target.value)}
            onFocus={handleFocus}
            placeholder="Es. 2008"
            min={1950} max={2026}
            className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
        </CampoTessera>
        <CampoTessera id="field-km" label="Chilometri percorsi" icona={<IconaKm />} err={errors.km} classe="col-span-2">
          <input
            type="text"
            inputMode="numeric"
            value={formatKm(dati.km)}
            onChange={e => handleKmChange(e.target.value)}
            onFocus={handleFocus}
            placeholder="Es. 85.000"
            className={inputClass}
          />
        </CampoTessera>
        <CampoTessera id="field-marca" label="Marca" icona={<IconaMarca />} err={errors.marca}>
          <input
            type="text"
            value={dati.marca}
            onChange={e => update('marca', e.target.value)}
            onFocus={handleFocus}
            placeholder="Es. Fiat"
            className={inputClass}
          />
        </CampoTessera>
        <CampoTessera id="field-modello" label="Modello" icona={<IconaModello />} err={errors.modello}>
          <input
            type="text"
            value={dati.modello}
            onChange={e => update('modello', e.target.value)}
            onFocus={handleFocus}
            placeholder="Es. Panda"
            className={inputClass}
          />
        </CampoTessera>
      </div>

      <button
        onClick={handleContinua}
        className="w-full py-4 mt-2 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all"
      >
        Continua
      </button>
    </div>
  )
}
