'use client'

import { useState } from 'react'
import { DatiVeicolo, TipoCambio } from '../../../types/pratica'

interface Props {
  dati: DatiVeicolo
  onUpdate: (d: Partial<DatiVeicolo>) => void
  onNext: () => void
}

export function StepCambioVeicolo({ dati, onUpdate, onNext }: Props) {
  const [errore, setErrore] = useState(false)

  function setCambio(c: TipoCambio) {
    onUpdate({ tipoCambio: c })
    setErrore(false)
  }

  function handleContinua() {
    if (!dati.tipoCambio) {
      setErrore(true)
      return
    }
    onNext()
  }

  const opzioni: { value: TipoCambio; label: string; descr: string; icon: React.ReactNode }[] = [
    {
      value: 'manuale',
      label: 'Manuale',
      descr: 'Con frizione e leva del cambio',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="6" r="2"/>
          <path d="M12 8v8"/>
          <circle cx="8" cy="16" r="1"/>
          <circle cx="16" cy="16" r="1"/>
          <path d="M8 16h8"/>
        </svg>
      ),
    },
    {
      value: 'automatico',
      label: 'Automatico',
      descr: 'Senza frizione, cambio automatico',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20"/>
          <path d="M8 6h8"/>
          <path d="M8 10h8"/>
          <path d="M8 14h8"/>
          <path d="M8 18h8"/>
        </svg>
      ),
    },
    {
      value: 'non_so',
      label: 'Non lo so',
      descr: 'Non sono sicuro',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <path d="M12 17h.01"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">

      {errore && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
          <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
          <span>Seleziona un tipo di cambio per continuare.</span>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {opzioni.map(o => {
          const selected = dati.tipoCambio === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setCambio(o.value)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-[1.5px] text-left transition-all ${
                selected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                selected ? 'bg-blue-200 text-blue-700' : 'bg-blue-100 text-blue-600'
              }`}>
                {o.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${selected ? 'text-blue-900' : 'text-gray-900'}`}>{o.label}</div>
                <div className={`text-xs mt-0.5 ${selected ? 'text-blue-700' : 'text-gray-500'}`}>{o.descr}</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
                selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
              }`}>
                {selected && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            </button>
          )
        })}
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