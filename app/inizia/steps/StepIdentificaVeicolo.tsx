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

  const inputClass = (err?: string) =>
    `w-full border rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50 outline-none transition-all focus:border-blue-500 focus:bg-white placeholder:text-gray-400 ${
      err ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div id="field-anno">
          <label className="block text-xs font-medium text-gray-600 mb-1">Anno di immatricolazione</label>
          <input
            type="number"
            inputMode="numeric"
            value={dati.anno}
            onChange={e => update('anno', e.target.value)}
            
            placeholder="Es. 2008"
            min={1950} max={2026}
            className={`${inputClass(errors.anno)} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
          {errors.anno && <p className="text-xs text-red-600 mt-1">{errors.anno}</p>}
        </div>
        <div id="field-km">
          <label className="block text-xs font-medium text-gray-600 mb-1">Chilometri percorsi</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatKm(dati.km)}
            onChange={e => handleKmChange(e.target.value)}
            
            placeholder="Es. 85.000"
            className={inputClass(errors.km)}
          />
          {errors.km && <p className="text-xs text-red-600 mt-1">{errors.km}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div id="field-marca">
          <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
          <input
            type="text"
            value={dati.marca}
            onChange={e => update('marca', e.target.value)}
            
            placeholder="Es. Fiat"
            className={inputClass(errors.marca)}
          />
          {errors.marca && <p className="text-xs text-red-600 mt-1">{errors.marca}</p>}
        </div>
        <div id="field-modello">
          <label className="block text-xs font-medium text-gray-600 mb-1">Modello</label>
          <input
            type="text"
            value={dati.modello}
            onChange={e => update('modello', e.target.value)}
            
            placeholder="Es. Panda"
            className={inputClass(errors.modello)}
          />
          {errors.modello && <p className="text-xs text-red-600 mt-1">{errors.modello}</p>}
        </div>
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