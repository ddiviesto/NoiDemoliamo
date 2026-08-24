'use client'

import { useState } from 'react'
import { DatiVeicolo, TipoCambio, TipoMezzo } from '../../../types/pratica'
import { CampoModulo, SceltaPillola, classeCampo } from './PezziFlusso'

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
  cambio?: string
}

// Mezzi per cui ha senso chiedere il tipo di cambio (per gli altri —
// moto, ciclomotori, imbarcazioni, velivoli — la scelta non appare).
const MEZZI_CON_CAMBIO: TipoMezzo[] = ['autovettura', 'minicar', 'furgone', 'pullman', 'camion', 'altro']

export function StepIdentificaVeicolo({ dati, onUpdate, onNext }: Props) {
  const [errors, setErrors] = useState<Errors>({})

  function update(field: keyof DatiVeicolo, value: string) {
    onUpdate({ [field]: value })
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  // La scelta del cambio appare solo per i mezzi che ce l'hanno
  const haCambio = dati.tipo == null || MEZZI_CON_CAMBIO.includes(dati.tipo)

  function setCambio(v: TipoCambio) {
    onUpdate({ tipoCambio: v })
    setErrors(prev => ({ ...prev, cambio: undefined }))
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
    if (haCambio && !dati.tipoCambio) e.cambio = 'Scegli il tipo di cambio'
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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <CampoModulo id="field-anno" label="Anno di immatricolazione" errore={errors.anno} classe="col-span-2">
          <input
            type="number"
            inputMode="numeric"
            value={dati.anno}
            onChange={e => update('anno', e.target.value)}
            placeholder="Es. 2008"
            min={1950} max={2026}
            className={classeCampo(!!errors.anno, '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none')}
          />
        </CampoModulo>
        <CampoModulo id="field-km" label="Chilometri percorsi" errore={errors.km} classe="col-span-2">
          <input
            type="text"
            inputMode="numeric"
            value={formatKm(dati.km)}
            onChange={e => handleKmChange(e.target.value)}
            placeholder="Es. 85.000"
            className={classeCampo(!!errors.km)}
          />
        </CampoModulo>
        <CampoModulo id="field-marca" label="Marca" errore={errors.marca}>
          <input
            type="text"
            value={dati.marca}
            onChange={e => update('marca', e.target.value)}
            placeholder="Es. Fiat"
            className={classeCampo(!!errors.marca)}
          />
        </CampoModulo>
        <CampoModulo id="field-modello" label="Modello" errore={errors.modello}>
          <input
            type="text"
            value={dati.modello}
            onChange={e => update('modello', e.target.value)}
            placeholder="Es. Panda"
            className={classeCampo(!!errors.modello)}
          />
        </CampoModulo>

        {/* Tipo di cambio: due pilloline di scelta (solo mezzi che ce l'hanno) */}
        {haCambio && (
          <CampoModulo id="field-cambio" label="Tipo di cambio" errore={errors.cambio} classe="col-span-2">
            <div className="scelte-fila scelte-fila--sempre">
              {(['manuale', 'automatico'] as const).map(v => (
                <SceltaPillola
                  key={v}
                  label={v === 'manuale' ? 'Manuale' : 'Automatico'}
                  presa={dati.tipoCambio === v}
                  errore={!!errors.cambio}
                  larga
                  onClick={() => setCambio(v)}
                />
              ))}
            </div>
          </CampoModulo>
        )}
      </div>

      <button
        onClick={handleContinua}
        className="btn-pagina mt-2"
      >
        Continua
      </button>
    </div>
  )
}
