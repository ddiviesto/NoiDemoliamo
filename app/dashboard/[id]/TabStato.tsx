'use client'

import { useState } from 'react'
import { Pratica } from './page'

interface Props {
  pratica: Pratica
}

// ============================================================
// ICONE SVG
// ============================================================

function IconaPin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function IconaAuto() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14"/>
      <path d="M3 17v-4l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5v4"/>
      <circle cx="7" cy="17" r="2" fill="#1d4ed8" stroke="none"/>
      <circle cx="17" cy="17" r="2" fill="#1d4ed8" stroke="none"/>
    </svg>
  )
}

function IconaSpuntaTimeline() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconaXAnnullata() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  )
}

function IconaChevron({ aperto }: { aperto: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-gray-400 transition-transform ${aperto ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

// ============================================================
// TIMELINE STEPS
// ============================================================

const TIMELINE_STEPS = [
  {
    key: 'richiesta_inviata',
    label: 'Richiesta inviata',
    descrizione: 'Pratica creata',
    statiAttiviPer: ['in_attesa_documenti', 'in_attesa_approvazione_admin', 'documenti_parzialmente_approvati'],
  },
  {
    key: 'documenti_verificati',
    label: 'Documenti verificati',
    descrizione: 'NoiDemoliamo ha approvato i documenti',
    statiAttiviPer: ['da_assegnare', 'in_attesa_assegnazione'],
  },
  {
    key: 'demolitore_assegnato',
    label: 'Demolitore assegnato',
    descrizione: 'Riceverai i contatti per il ritiro',
    statiAttiviPer: ['assegnata', 'in_attesa_conferma_cliente', 'ritiro_confermato'],
  },
  {
    key: 'veicolo_ritirato',
    label: 'Veicolo ritirato',
    descrizione: 'Certificato di rottamazione in arrivo',
    statiAttiviPer: ['ritirata', 'in_attesa_cert_rottamazione', 'in_attesa_cert_radiazione_pra'],
  },
  {
    key: 'pratica_completata',
    label: 'Pratica completata',
    descrizione: 'Radiazione PRA emessa',
    statiAttiviPer: ['completata'],
  },
]

function indiceStepAttuale(stato: string): number {
  if (stato === 'annullata') return -1
  for (let i = 0; i < TIMELINE_STEPS.length; i++) {
    if (TIMELINE_STEPS[i].statiAttiviPer.includes(stato)) return i
  }
  return 0
}

// ============================================================

export default function TabStato({ pratica }: Props) {
  const [datiAperti, setDatiAperti] = useState(false)
  const stepIdx = indiceStepAttuale(pratica.stato)
  const isAnnullata = pratica.stato === 'annullata'

  return (
    <div className="flex flex-col gap-3">

      {/* TIMELINE */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <IconaPin />
          <p className="text-sm font-bold text-gray-900">Il percorso della tua pratica</p>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Aperta il {new Date(pratica.creato_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>

        {isAnnullata ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center">
            <div className="mb-2">
              <IconaXAnnullata />
            </div>
            <div className="text-sm font-semibold text-gray-700">Pratica annullata</div>
            <div className="text-xs text-gray-500 mt-1">Questa pratica non è più attiva</div>
          </div>
        ) : (
          <div>
            {TIMELINE_STEPS.map((step, i) => {
              const completato = i < stepIdx
              const corrente = i === stepIdx
              const futuro = i > stepIdx
              const ultimo = i === TIMELINE_STEPS.length - 1

              return (
                <div key={step.key} className="flex gap-3.5">
                  {/* Cerchio + linea */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
                      completato
                        ? 'bg-green-500 text-white'
                        : corrente
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-300'
                          : 'bg-white border-2 border-gray-200 text-gray-400'
                    }`}>
                      {completato ? (
                        <IconaSpuntaTimeline />
                      ) : corrente ? (
                        <span className="w-2.5 h-2.5 bg-white rounded-full" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {!ultimo && (
                      <div className={`w-0.5 flex-1 mt-1 mb-1 ${completato ? 'bg-green-300' : 'bg-gray-200'}`} style={{ minHeight: 36 }} />
                    )}
                  </div>

                  {/* Etichetta */}
                  <div className={`flex-1 ${ultimo ? '' : 'pb-4'}`}>
                    {corrente ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 -mt-1">
                        <div className="text-sm font-semibold text-blue-900">{step.label}</div>
                        <div className="text-[11px] text-blue-700 mt-0.5 leading-snug">{step.descrizione}</div>
                      </div>
                    ) : (
                      <div className="pt-1.5">
                        <div className={`text-sm font-medium ${futuro ? 'text-gray-400' : 'text-gray-800'}`}>
                          {step.label}
                        </div>
                        <div className={`text-[11px] mt-0.5 leading-snug ${futuro ? 'text-gray-400' : 'text-gray-500'}`}>
                          {step.descrizione}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* DATI VEICOLO COLLAPSABILI */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setDatiAperti(!datiAperti)}
          className="w-full px-4 py-3.5 flex items-center justify-between"
        >
          <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <IconaAuto />
            Dati del veicolo
          </span>
          <IconaChevron aperto={datiAperti} />
        </button>

        {datiAperti && (
          <div className="px-4 pb-4 pt-1 flex flex-col gap-2 text-sm border-t border-gray-100">
            <DataRiga label="Targa" valore={pratica.targa} />
            <DataRiga label="Tipo" valore={pratica.tipo_mezzo} capitalize />
            <DataRiga label="Marca / modello" valore={[pratica.marca, pratica.modello].filter(Boolean).join(' ')} />
            <DataRiga label="Anno · km" valore={`${pratica.anno || '—'} · ${pratica.km?.toLocaleString('it-IT') || '—'}`} />
            <DataRiga label="Marciante" valore={pratica.marciante ? 'Sì' : 'No'} />
            <DataRiga label="Incidentato" valore={pratica.incidentato ? 'Sì' : 'No'} />
            <DataRiga
              label="Indirizzo ritiro"
              valore={
                [pratica.indirizzo_ritiro, pratica.comune_ritiro && `${pratica.comune_ritiro}${pratica.provincia_ritiro ? ` (${pratica.provincia_ritiro})` : ''}`]
                  .filter(Boolean)
                  .join(' · ')
              }
            />
            {pratica.note_veicolo && (
              <div className="mt-1 bg-gray-50 rounded-xl p-3">
                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Note</div>
                <div className="text-xs text-gray-700 italic">{pratica.note_veicolo}</div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

function DataRiga({ label, valore, capitalize }: { label: string; valore: string | number | null; capitalize?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className={`font-medium text-gray-800 text-right ${capitalize ? 'capitalize' : ''}`}>
        {valore || '—'}
      </span>
    </div>
  )
}