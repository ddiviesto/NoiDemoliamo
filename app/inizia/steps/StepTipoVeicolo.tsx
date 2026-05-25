'use client'

import { useState } from 'react'
import { DatiVeicolo, TipoMezzo } from '../../../types/pratica'

// ============================================================
// ICONE VEICOLI SVG
// ============================================================

function IconaAutovettura() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0m10 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
        <path d="M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6" />
      </g>
    </svg>
  )
}

function IconaMotociclo() {
  return (
    <svg width="32" height="26" viewBox="0 0 640 512">
      <path fill="currentColor" d="M280 32c-13.3 0-24 10.7-24 24s10.7 24 24 24h57.7l16.4 30.3L256 192l-45.3-45.3c-12-12-28.3-18.7-45.3-18.7H64c-17.7 0-32 14.3-32 32v32h96c88.4 0 160 71.6 160 160c0 11-1.1 21.7-3.2 32h70.4c-2.1-10.3-3.2-21-3.2-32c0-52.2 25-98.6 63.7-127.8l15.4 28.6C402.4 276.3 384 312 384 352c0 70.7 57.3 128 128 128s128-57.3 128-128s-57.3-128-128-128c-13.5 0-26.5 2.1-38.7 6l-55.1-102H480c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32h-20.4c-7.5 0-14.7 2.6-20.5 7.4l-47.4 39.5l-14-26c-7-12.9-20.5-21-35.2-21zm182.7 279.2l28.2 52.2c6.3 11.7 20.9 16 32.5 9.7s16-20.9 9.7-32.5l-28.2-52.2c2.3-.3 4.7-.4 7.1-.4c35.3 0 64 28.7 64 64s-28.7 64-64 64s-64-28.7-64-64c0-15.5 5.5-29.7 14.7-40.8M187.3 376c-9.5 23.5-32.5 40-59.3 40c-35.3 0-64-28.7-64-64s28.7-64 64-64c26.9 0 49.9 16.5 59.3 40h66.4c-11.2-59.2-63.2-104-125.7-104C57.3 224 0 281.3 0 352s57.3 128 128 128c62.5 0 114.5-44.8 125.8-104h-66.4zm-59.3 8a32 32 0 1 0 0-64a32 32 0 1 0 0 64" />
    </svg>
  )
}

function IconaCiclomotore() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5a3 3 0 1 0-6 0m6 0h3m-3 0c0 .903-.399 1.713-1.03 2.263M9 5H6m3 0c0 .903.399 1.713 1.03 2.263M14 20h2a2 2 0 0 0 2-2v-5c0-1.692-.859-4.816-4.03-5.737M14 20a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2v0m4 0v-5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5m0 0H8a2 2 0 0 1-2-2v-5c0-1.692.859-4.816 4.03-5.737m3.94 0A3 3 0 0 1 12 8a3 3 0 0 1-1.97-.737" />
    </svg>
  )
}

function IconaMinicar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      <path fill="currentColor" d="M18.5 11H17v-1c0-3.31-2.69-6-6-6s-6 2.69-6 6v1.05c-.75.11-1.44.43-1.98.97A3.52 3.52 0 0 0 2 14.5c0 1.42.83 2.63 2.04 3.18c-.01.11-.04.21-.04.32c0 1.65 1.35 3 3 3s3-1.35 3-3h4c0 1.65 1.35 3 3 3s3-1.35 3-3c0-.11-.03-.21-.04-.32c.38-.17.72-.41 1.02-.71A3.52 3.52 0 0 0 22 14.49c0-1.93-1.57-3.5-3.5-3.5ZM12 6.14c1.72.45 3 2 3 3.86v1h-3zM7 10c0-1.86 1.28-3.41 3-3.86V11H7zm0 9c-.55 0-1-.45-1-1c0-.15.04-.31.11-.45c.01-.02.02-.03.03-.05c.28-.47.91-.59 1.35-.35c.15.08.28.2.37.36c.09.15.13.32.13.49c0 .55-.45 1-1 1Zm10 0a1.003 1.003 0 0 1-.87-1.5c.36-.63 1.35-.64 1.73 0c.01.02.02.04.03.05c.07.14.11.29.11.45c0 .55-.45 1-1 1m2.56-3.44c-.13.13-.29.24-.45.31l-.03-.03c-.04-.04-.08-.06-.12-.1c-.14-.12-.28-.23-.43-.32c-.06-.04-.13-.07-.19-.1q-.225-.105-.45-.18l-.2-.06c-.22-.05-.45-.09-.69-.09s-.49.04-.72.09c-.07.02-.14.05-.21.07c-.16.05-.31.11-.45.19c-.07.04-.15.08-.22.13c-.14.09-.26.18-.38.29c-.06.05-.12.1-.18.16c-.02.03-.05.04-.08.07H9.23s-.05-.05-.08-.07c-.05-.06-.11-.1-.17-.16q-.18-.165-.39-.3c-.07-.04-.14-.09-.21-.12c-.15-.08-.3-.14-.46-.19c-.07-.02-.14-.05-.21-.07q-.345-.09-.72-.09c-.375 0-.47.04-.69.09l-.2.06q-.24.075-.45.18c-.07.03-.13.07-.19.1c-.15.09-.3.2-.43.32c-.04.03-.08.06-.11.09l-.03.03c-.53-.23-.89-.76-.89-1.37c0-.4.16-.79.44-1.06c.28-.28.67-.44 1.06-.44h13c.83 0 1.5.67 1.5 1.5c0 .4-.16.79-.44 1.06Z" />
    </svg>
  )
}

function IconaFurgone() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M13 6v5a1 1 0 0 0 1 1h6.102a1 1 0 0 1 .712.298l.898.91a1 1 0 0 1 .288.702V17a1 1 0 0 1-1 1h-3" />
        <path d="M5 18H3a1 1 0 0 1-1-1V8a2 2 0 0 1 2-2h12c1.1 0 2.1.8 2.4 1.8l1.176 4.2M9 18h5" />
        <circle cx="16" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </g>
    </svg>
  )
}

function IconaImbarcazione() {
  return (
    <svg width="24" height="24" viewBox="0 0 36 36">
      <path fill="currentColor" d="M29.1 27.1c-1.1-.1-2.2.3-3.1 1.1c-1.1 1.1-2.9 1.1-4.1 0c-1-.7-2.1-1.1-3.3-1.1c-1.2-.1-2.4.3-3.3 1.1c-.6.5-1.3.8-2.1.8s-1.5-.3-2.1-.8c-1-.8-2.2-1.2-3.4-1.2s-2.4.4-3.4 1.2c-.6.5-1.5.8-2.3.8v2c1.3.1 2.6-.3 3.6-1.2c.6-.5 1.5-.8 2.3-.8c.7 0 1.5.3 2.1.8c1.8 1.6 4.6 1.6 6.5 0c.6-.5 1.3-.8 2.1-.8c.7 0 1.4.3 2 .8c1.9 1.6 4.6 1.6 6.5 0c.5-.5 1.3-.8 2-.8s1.4.3 1.9.8q1.35 1.05 3 1.2v-2c-1 0-1.2-.4-1.7-.8c-.9-.7-2-1.1-3.2-1.1" />
      <path fill="currentColor" d="M6 23c0-.6.5-1 1.1-1H32l-3.5 3.1h.2c.8 0 1.6.2 2.2.5l2.5-2.2l.2-.2c.7-.8.6-2.1-.2-2.8c-.4-.2-.8-.4-1.3-.4h-25c-1.7 0-3 1.3-3 3v3.2c.5-.5 1.2-.8 1.9-1.1z" />
      <path fill="currentColor" d="M8.9 19H15v-7.8c0-.6-.3-1.2-.8-1.6c-.9-.7-2.2-.5-2.8.4l-4.1 5.9c-.4.6-.4 1.4-.1 2.1c.3.6 1 1 1.7 1m4.2-7.8L13 17H8.9z" />
      <path fill="currentColor" d="M26 18c.4-.6.4-1.4 0-2L19.7 5.6c-.4-.6-1-1-1.7-1c-1.1 0-2 .9-2 2V19h8.3c.7 0 1.4-.4 1.7-1M17.9 6.6l6.4 10.5h-6.4z" />
    </svg>
  )
}

function IconaPullman() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M12 2C8.229 2 6.343 2 5.172 3.172C4.108 4.235 4.01 5.886 4 9H3a1 1 0 0 0-1 1v1a1 1 0 0 0 .4.8L4 13c.01 3.114.108 4.765 1.172 5.828c.242.243.514.435.828.587V21a1 1 0 0 0 1 1h1.5a1 1 0 0 0 1-1v-1.018C10.227 20 11.054 20 12 20s1.773 0 2.5-.018V21a1 1 0 0 0 1 1H17a1 1 0 0 0 1-1v-1.585a3 3 0 0 0 .828-.587C19.892 17.765 19.991 16.114 20 13l1.6-1.2a1 1 0 0 0 .4-.8v-1a1 1 0 0 0-1-1h-1c-.01-3.114-.108-4.765-1.172-5.828C17.657 2 15.771 2 12 2M5.5 9.5c0 1.414 0 2.121.44 2.56c.439.44 1.146.44 2.56.44h7c1.414 0 2.121 0 2.56-.44c.44-.439.44-1.146.44-2.56V7c0-1.414 0-2.121-.44-2.56C17.622 4 16.915 4 15.5 4h-7c-1.414 0-2.121 0-2.56.44C5.5 4.878 5.5 5.585 5.5 7zm.75 6.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H7a.75.75 0 0 1-.75-.75m11.5 0a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0 0 1.5H17a.75.75 0 0 0 .75-.75" clipRule="evenodd" />
    </svg>
  )
}

function IconaCamion() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      <path fill="currentColor" d="M1 12.5v5a1 1 0 0 0 1 1h1a3 3 0 0 0 6 0h6a3 3 0 0 0 6 0h1a1 1 0 0 0 1-1v-12a3 3 0 0 0-3-3h-9a3 3 0 0 0-3 3v2H6a3 3 0 0 0-2.4 1.2l-2.4 3.2a.6.6 0 0 0-.07.14l-.06.11a1 1 0 0 0-.07.35m16 6a1 1 0 1 1 1 1a1 1 0 0 1-1-1m-7-13a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v11h-.78a3 3 0 0 0-4.44 0H10Zm-2 6H4l1.2-1.6a1 1 0 0 1 .8-.4h2Zm-3 7a1 1 0 1 1 1 1a1 1 0 0 1-1-1m-2-5h5v2.78a3 3 0 0 0-4.22.22H3Z" />
    </svg>
  )
}

function IconaVelivolo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24">
      <g fill="none">
        <path fill="currentColor" fillOpacity=".16" d="M10.292 7.043c0-3.478.424-5.043 1.698-5.043c1.273 0 1.708 1.565 1.708 5.043V8.74l6.238 3.957c.425.304.57.804.552 1.304v2l-6.532-2.62a.4.4 0 0 0-.548.345l-.304 4.753l2.376 1.348c.212.13.34.391.34.652L15.507 22l-3.517-1.174L8.483 22l-.313-1.522c0-.26.127-.522.34-.652l2.376-1.348l-.304-4.753a.4.4 0 0 0-.548-.345L3.502 16v-2c-.019-.5.127-1 .551-1.304l6.239-3.957z" />
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" d="M10.292 7.043c0-3.478.424-5.043 1.698-5.043c1.273 0 1.708 1.565 1.708 5.043V8.74l6.238 3.957c.425.304.57.804.552 1.304v2l-6.532-2.62a.4.4 0 0 0-.548.345l-.304 4.753l2.376 1.348c.212.13.34.391.34.652L15.507 22l-3.517-1.174L8.483 22l-.313-1.522c0-.26.127-.522.34-.652l2.376-1.348l-.304-4.753a.4.4 0 0 0-.548-.345L3.502 16v-2c-.019-.5.127-1 .551-1.304l6.239-3.957z" />
      </g>
    </svg>
  )
}

// ============================================================
// CONFIGURAZIONE
// ============================================================

interface Props {
  dati: DatiVeicolo
  onUpdate: (d: Partial<DatiVeicolo>) => void
  onNext: () => void
}

// Griglia principale 4+4
const TIPI_MEZZO_BASE: { value: TipoMezzo; icon: () => React.ReactNode; label: string }[] = [
  { value: 'autovettura', icon: IconaAutovettura, label: 'Autovettura' },
  { value: 'motoveicolo', icon: IconaMotociclo, label: 'Motoveicolo' },
  { value: 'ciclomotore', icon: IconaCiclomotore, label: 'Ciclomotore' },
  { value: 'minicar', icon: IconaMinicar, label: 'Minicar' },
  { value: 'furgone', icon: IconaFurgone, label: 'Furgone' },
  { value: 'pullman', icon: IconaPullman, label: 'Pullman' },
  { value: 'camion', icon: IconaCamion, label: 'Camion' },
]

const TIPI_MEZZO_ALTRO: { value: TipoMezzo; icon: () => React.ReactNode; label: string }[] = [
  { value: 'imbarcazione', icon: IconaImbarcazione, label: 'Imbarcazione' },
  { value: 'velivolo', icon: IconaVelivolo, label: 'Velivolo' },
  { value: 'altro', icon: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  ), label: 'Altro mezzo' },
]

const TIPI_DENTRO_ALTRO: TipoMezzo[] = ['imbarcazione', 'velivolo', 'altro']

// ============================================================
// COMPONENTE
// ============================================================

export function StepTipoVeicolo({ dati, onUpdate, onNext }: Props) {
  const [errore, setErrore] = useState(false)
  const [erroreAltro, setErroreAltro] = useState(false)
  const [altroAperto, setAltroAperto] = useState<boolean>(
    dati.tipo !== null && TIPI_DENTRO_ALTRO.includes(dati.tipo)
  )

  function selezionaTipo(tipo: TipoMezzo) {
    onUpdate({ tipo })
    setErrore(false)
    setErroreAltro(false)
    if (!TIPI_DENTRO_ALTRO.includes(tipo)) {
      setAltroAperto(false)
    }
  }

  function toggleAltro() {
    setAltroAperto(prev => !prev)
    setErrore(false)
  }

  function handleContinua() {
    if (!dati.tipo) {
      setErrore(true)
      return
    }
    if (dati.tipo === 'altro' && !dati.tipoAltro.trim()) {
      setErroreAltro(true)
      return
    }
    onNext()
  }

  const isAltroSelezionato = dati.tipo !== null && TIPI_DENTRO_ALTRO.includes(dati.tipo)
  const continueDisabled = !dati.tipo || (dati.tipo === 'altro' && !dati.tipoAltro.trim())

  return (
    <div className="flex flex-col gap-4">

      {/* Errore */}
      {errore && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
          <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
          <span>Seleziona un tipo di veicolo per continuare.</span>
        </div>
      )}

      {/* TIPO MEZZO — griglia 4+4 (7 base + bottone Altro) */}
      <div>
        <div className={`grid grid-cols-4 gap-2 ${errore ? 'p-1 rounded-xl ring-1 ring-red-300 bg-red-50/30' : ''}`}>
          {TIPI_MEZZO_BASE.map(t => {
            const Icona = t.icon
            const isSelected = dati.tipo === t.value
            return (
              <button
                key={t.value}
                onClick={() => selezionaTipo(t.value)}
                className={`relative aspect-square flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-[1.5px] text-center transition-all
                  ${isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.15)] text-blue-700'
                    : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 text-gray-500'
                  }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
                <Icona />
                <span className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-blue-700 font-semibold' : ''}`}>
                  {t.label}
                </span>
              </button>
            )
          })}

          {/* Bottone "Altro" — ottava cella della griglia 4+4 */}
          <button
            onClick={toggleAltro}
            className={`relative aspect-square flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-[1.5px] text-center transition-all
              ${isAltroSelezionato
                ? 'border-blue-600 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.15)] text-blue-700'
                : altroAperto
                  ? 'border-blue-400 bg-blue-50/60 text-blue-600'
                  : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 text-gray-500'
              }`}
          >
            {isAltroSelezionato && (
              <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${altroAperto ? 'rotate-45' : ''}`}>
              <circle cx="12" cy="12" r="9" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="12" y1="6" x2="12" y2="18" />
            </svg>
            <span className={`text-[10px] font-medium leading-tight ${isAltroSelezionato || altroAperto ? 'font-semibold' : ''}`}>
              Altro
            </span>
          </button>
        </div>
      </div>

      {/* ESPANSIONE "Altro" — animata */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${altroAperto ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3">
          <p className="text-[11px] font-medium text-blue-700 mb-2 px-1">Altri tipi di mezzo:</p>
          <div className="grid grid-cols-3 gap-2">
            {TIPI_MEZZO_ALTRO.map(t => {
              const Icona = t.icon
              const isSelected = dati.tipo === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => selezionaTipo(t.value)}
                  className={`relative h-[78px] flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-[1.5px] text-center transition-all
                    ${isSelected
                      ? 'border-blue-600 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.15)] text-blue-700'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 text-gray-500'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                  <Icona />
                  <span className={`text-[10px] font-medium leading-tight ${isSelected ? 'text-blue-700 font-semibold' : ''}`}>
                    {t.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Campo input "Altro mezzo" */}
      {dati.tipo === 'altro' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Specifica il tipo di mezzo</label>
          <input
            type="text"
            value={dati.tipoAltro}
            onChange={e => { onUpdate({ tipoAltro: e.target.value }); setErroreAltro(false) }}
            placeholder="Es. Trattore, quad, elicottero, rimorchio..."
            className={`w-full border rounded-xl px-3 py-2.5 text-base text-gray-900 bg-gray-50 outline-none transition-all
              focus:border-blue-500 focus:bg-white placeholder:text-gray-400
              ${erroreAltro ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
          />
          {erroreAltro && <p className="text-xs text-red-600 mt-1">Specifica il tipo di mezzo</p>}
        </div>
      )}

      <button
        onClick={handleContinua}
        disabled={continueDisabled}
        className={`w-full py-4 rounded-xl font-semibold text-base transition-all
          ${continueDisabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99]'
          }`}
      >
        Continua →
      </button>
    </div>
  )
}