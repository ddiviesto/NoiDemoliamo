'use client'

import { useState } from 'react'
import { DatiVeicolo, TipoMezzo } from '../../../types/pratica'

interface Props {
  dati: DatiVeicolo
  onUpdate: (d: Partial<DatiVeicolo>) => void
  onNext: () => void
}

const TIPI_MEZZO: { value: TipoMezzo; emoji: string; label: string }[] = [
  { value: 'autovettura', emoji: '🚗', label: 'Autovettura' },
  { value: 'motociclo', emoji: '🏍️', label: 'Motociclo' },
  { value: 'ciclomotore', emoji: '🛵', label: 'Ciclomotore' },
  { value: 'minicar', emoji: '🚘', label: 'Minicar' },
  { value: 'imbarcazione', emoji: '⛵', label: 'Imbarcazione' },
  { value: 'pullman', emoji: '🚌', label: 'Pullman' },
  { value: 'camion', emoji: '🚛', label: 'Camion' },
  { value: 'velivolo', emoji: '✈️', label: 'Velivolo' },
  { value: 'altro', emoji: '🔧', label: 'Altro' },
]

type ToggleValue = 'si' | 'no' | null

interface Errors {
  tipo?: string
  tipoAltro?: string
  anno?: string
  km?: string
  marca?: string
  modello?: string
  incidentato?: string
  marciante?: string
  vaInMoto?: string
  partiMancanti?: string
}

function nomeCapitalizzato(tipo: TipoMezzo | null): string {
  if (!tipo) return 'veicolo'
  const map: Record<TipoMezzo, string> = {
    autovettura: 'Autovettura', motociclo: 'Motociclo', ciclomotore: 'Ciclomotore',
    minicar: 'Minicar', imbarcazione: 'Imbarcazione', pullman: 'Pullman',
    camion: 'Camion', velivolo: 'Velivolo', altro: 'Mezzo',
  }
  return map[tipo]
}

function labelVaInMoto(tipo: TipoMezzo | null): string {
  if (tipo === 'imbarcazione') return 'Naviga?'
  if (tipo === 'velivolo') return 'Vola?'
  return 'Va in moto?'
}

export function Step3Veicolo({ dati, onUpdate, onNext }: Props) {
  const [errors, setErrors] = useState<Errors>({})
  const [showBanner, setShowBanner] = useState(false)

  function update(field: keyof DatiVeicolo, value: string | TipoMezzo | null) {
    onUpdate({ [field]: value })
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setShowBanner(false)
  }

  function togUpdate(field: 'incidentato' | 'marciante' | 'vaInMoto' | 'partiMancanti', val: ToggleValue) {
    onUpdate({ [field]: val })
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setShowBanner(false)
  }

  function validate(): Errors {
    const e: Errors = {}
    if (!dati.tipo) e.tipo = 'Seleziona il tipo di mezzo'
    if (dati.tipo === 'altro' && !dati.tipoAltro.trim()) e.tipoAltro = 'Specifica il tipo di mezzo'
    if (!dati.anno.trim()) e.anno = "Inserisci l'anno di immatricolazione"
    if (!dati.km.trim()) e.km = 'Inserisci i chilometri'
    if (!dati.marca.trim()) e.marca = 'Inserisci la marca'
    if (!dati.modello.trim()) e.modello = 'Inserisci il modello'
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
      // Scrolla al primo errore
      const firstKey = Object.keys(e)[0]
      const el = document.getElementById(`field-${firstKey}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    onNext()
  }

  const errCount = Object.keys(validate()).length
  const n = nomeCapitalizzato(dati.tipo)

  return (
    <div className="flex flex-col gap-3">

      {/* Banner errori */}
      {showBanner && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
          <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
          <span>
            {errCount === 1
              ? 'Completa il campo mancante per continuare.'
              : `Completa ${errCount} campi mancanti per continuare.`}
          </span>
        </div>
      )}

      {/* TIPO MEZZO */}
      <div id="field-tipo">
        <div
          className={`grid grid-cols-4 gap-2 p-1 rounded-xl ${errors.tipo ? 'ring-1 ring-red-300 bg-red-50/30' : ''}`}
        >
          {TIPI_MEZZO.map(t => (
            <button
              key={t.value}
              onClick={() => update('tipo', t.value)}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border-[1.5px] text-center transition-all
                ${dati.tipo === t.value
                  ? 'border-blue-600 bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.15)]'
                  : errors.tipo
                    ? 'border-red-200 bg-red-50/50 hover:border-blue-300 hover:bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
                }`}
            >
              {dati.tipo === t.value && (
                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-[8px]">✓</span>
                </div>
              )}
              <span className="text-2xl leading-none">{t.emoji}</span>
              <span className={`text-[10px] font-medium leading-tight ${dati.tipo === t.value ? 'text-blue-700' : 'text-gray-500'}`}>
                {t.label}
              </span>
            </button>
          ))}
        </div>
        {errors.tipo && <p className="text-xs text-red-600 mt-1 ml-1">{errors.tipo}</p>}
      </div>

      {/* Campo altro */}
      {dati.tipo === 'altro' && (
        <div id="field-tipoAltro">
          <label className="block text-xs font-medium text-gray-500 mb-1">Specifica il tipo di mezzo</label>
          <input
            type="text"
            value={dati.tipoAltro}
            onChange={e => update('tipoAltro', e.target.value)}
            placeholder="Es. Trattore, quad, elicottero, rimorchio..."
            className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none transition-all
              focus:border-blue-500 focus:bg-white
              ${errors.tipoAltro ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
          />
          {errors.tipoAltro && <p className="text-xs text-red-600 mt-1">{errors.tipoAltro}</p>}
        </div>
      )}

      <div className="h-px bg-gray-100" />

      {/* Anno + KM */}
      <div className="grid grid-cols-2 gap-3">
        <div id="field-anno">
          <label className="block text-xs font-medium text-gray-500 mb-1">Anno di immatricolazione</label>
          <input
            type="number"
            value={dati.anno}
            onChange={e => update('anno', e.target.value)}
            placeholder="Es. 2008"
            min={1950} max={2026}
            className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none transition-all
              focus:border-blue-500 focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
              ${errors.anno ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
          />
          {errors.anno && <p className="text-xs text-red-600 mt-1">{errors.anno}</p>}
        </div>
        <div id="field-km">
          <label className="block text-xs font-medium text-gray-500 mb-1">Chilometri percorsi</label>
          <input
            type="number"
            value={dati.km}
            onChange={e => update('km', e.target.value)}
            placeholder="Es. 85000"
            className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none transition-all
              focus:border-blue-500 focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
              ${errors.km ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
          />
          {errors.km && <p className="text-xs text-red-600 mt-1">{errors.km}</p>}
        </div>
      </div>

      {/* Marca + Modello */}
      <div className="grid grid-cols-2 gap-3">
        <div id="field-marca">
          <label className="block text-xs font-medium text-gray-500 mb-1">Marca</label>
          <input
            type="text"
            value={dati.marca}
            onChange={e => update('marca', e.target.value)}
            placeholder="Es. Fiat"
            className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none transition-all
              focus:border-blue-500 focus:bg-white
              ${errors.marca ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
          />
          {errors.marca && <p className="text-xs text-red-600 mt-1">{errors.marca}</p>}
        </div>
        <div id="field-modello">
          <label className="block text-xs font-medium text-gray-500 mb-1">Modello</label>
          <input
            type="text"
            value={dati.modello}
            onChange={e => update('modello', e.target.value)}
            placeholder="Es. Panda"
            className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none transition-all
              focus:border-blue-500 focus:bg-white
              ${errors.modello ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
          />
          {errors.modello && <p className="text-xs text-red-600 mt-1">{errors.modello}</p>}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Toggle incidentato */}
      <ToggleField
        id="field-incidentato"
        label={`${n} incidentato?`}
        value={dati.incidentato}
        leftLabel="Non incidentato"
        rightLabel="Sì, incidentato"
        leftValue="no"
        rightValue="si"
        leftIsPositive={true}
        error={errors.incidentato}
        onChange={v => togUpdate('incidentato', v as ToggleValue)}
      />

      {/* Toggle marciante */}
      <ToggleField
        id="field-marciante"
        label={`${n} marciante?`}
        value={dati.marciante}
        leftLabel="Sì, marciante"
        rightLabel="Non marciante"
        leftValue="si"
        rightValue="no"
        leftIsPositive={true}
        error={errors.marciante}
        onChange={v => togUpdate('marciante', v as ToggleValue)}
      />

      {/* Toggle va in moto */}
      <ToggleField
        id="field-vaInMoto"
        label={labelVaInMoto(dati.tipo)}
        value={dati.vaInMoto}
        leftLabel="Sì, va in moto"
        rightLabel="Non va in moto"
        leftValue="si"
        rightValue="no"
        leftIsPositive={true}
        error={errors.vaInMoto}
        onChange={v => togUpdate('vaInMoto', v as ToggleValue)}
      />

      {/* Toggle parti mancanti */}
      <ToggleField
        id="field-partiMancanti"
        label="Parti mancanti?"
        value={dati.partiMancanti}
        leftLabel="Completo"
        rightLabel="Mancano parti"
        leftValue="no"
        rightValue="si"
        leftIsPositive={true}
        error={errors.partiMancanti}
        onChange={v => togUpdate('partiMancanti', v as ToggleValue)}
      />

      <div className="h-px bg-gray-100" />

      {/* Annotazioni */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Annotazioni (opzionale)</label>
        <textarea
          value={dati.note}
          onChange={e => onUpdate({ note: e.target.value })}
          placeholder="Descrivi eventuali particolarità del veicolo..."
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none transition-all focus:border-blue-500 focus:bg-white resize-none"
        />
      </div>

      <button
        onClick={handleContinua}
        className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] transition-all"
      >
        Continua →
      </button>
    </div>
  )
}

// Componente Toggle riutilizzabile
interface ToggleFieldProps {
  id: string
  label: string
  value: string | null
  leftLabel: string
  rightLabel: string
  leftValue: string
  rightValue: string
  leftIsPositive: boolean
  error?: string
  onChange: (v: string) => void
}

function ToggleField({ id, label, value, leftLabel, rightLabel, leftValue, rightValue, leftIsPositive, error, onChange }: ToggleFieldProps) {
  function btnClass(btnValue: string, isPositive: boolean): string {
    const base = 'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-medium transition-all'
    if (value === btnValue) {
      return isPositive
        ? `${base} bg-[#bbdec9] text-[#1a5c35]`
        : `${base} bg-[#f0b8b8] text-[#7a1f1f]`
    }
    return error
      ? `${base} bg-red-50 border border-red-200 text-gray-400 hover:bg-gray-100`
      : `${base} bg-gray-100 text-gray-500 hover:bg-gray-200`
  }

  return (
    <div id={id}>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <button className={btnClass(leftValue, leftIsPositive)} onClick={() => onChange(leftValue)}>
          <span className="text-sm">{leftIsPositive ? '✓' : '✗'}</span>
          {leftLabel}
        </button>
        <button className={btnClass(rightValue, !leftIsPositive)} onClick={() => onChange(rightValue)}>
          <span className="text-sm">{!leftIsPositive ? '✓' : '✗'}</span>
          {rightLabel}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
