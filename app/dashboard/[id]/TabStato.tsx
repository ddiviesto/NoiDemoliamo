'use client'

import { useState } from 'react'
import { Pratica } from './page'

interface Props {
  pratica: Pratica
}

// Definizione dei 5 step della timeline
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

// Restituisce l'indice dello step attivo (-1 se annullata)
function indiceStepAttuale(stato: string): number {
  if (stato === 'annullata') return -1
  for (let i = 0; i < TIMELINE_STEPS.length; i++) {
    if (TIMELINE_STEPS[i].statiAttiviPer.includes(stato)) return i
  }
  return 0
}

export default function TabStato({ pratica }: Props) {
  const [datiAperti, setDatiAperti] = useState(false)
  const stepIdx = indiceStepAttuale(pratica.stato)
  const isAnnullata = pratica.stato === 'annullata'

  return (
    <div className="flex flex-col gap-3">

      {/* TIMELINE */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-gray-900 mb-1">📍 Il percorso della tua pratica</p>
        <p className="text-xs text-gray-500 mb-5">
          Aperta il {new Date(pratica.creato_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>

        {isAnnullata ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-3xl mb-2">❌</div>
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
                      {completato ? '✓' : corrente ? '●' : i + 1}
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
          <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            🚗 Dati del veicolo
          </span>
          <span className={`text-gray-400 transition-transform ${datiAperti ? 'rotate-180' : ''}`}>▼</span>
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