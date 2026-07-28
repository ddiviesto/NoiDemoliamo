'use client'

import { useState } from 'react'
import { Pratica } from './page'
import IconaVeicolo from '../../components/IconaVeicolo'

interface Props {
  pratica: Pratica
}

// ============================================================
// ⭐ TAB STATO RIFATTA IN FAMIGLIA (28/07/2026, mockup approvato):
// card con testata standard (quadratino azzurro, titolo 14, sotto-
// titolo grigio), percorso con SPUNTE AZZURRE (via il verde forte:
// il verde resta solo alle pillole delle cose fatte), righe dati
// come nel CRM (etichetta scura a sinistra, valore grigio a destra).
// ============================================================

// ⭐ 28/07 (variante B su mockup): 7 tappe con "Ritiro programmato" (gemella
// della fase del CRM) e nomi allineati alle pillole di stato — la terza
// tappa dice "In attesa assegnazione" come la pillola. Percorso e pillola
// raccontano la stessa cosa nello stesso momento.
const TIMELINE_STEPS = [
  {
    key: 'richiesta_inviata',
    label: 'Richiesta inviata',
    descrizione: 'Pratica creata',
    statiAttiviPer: [] as string[],
  },
  {
    key: 'attesa_documenti',
    label: 'In attesa dei tuoi documenti',
    descrizione: 'Carica e invia i documenti richiesti',
    statiAttiviPer: ['in_attesa_documenti', 'in_attesa_approvazione_admin', 'documenti_parzialmente_approvati'],
  },
  {
    key: 'attesa_assegnazione',
    label: 'In attesa assegnazione',
    descrizione: 'Documenti approvati: stiamo scegliendo il demolitore',
    statiAttiviPer: ['da_assegnare', 'in_attesa_assegnazione', 'in_assegnazione_manuale'],
  },
  {
    key: 'demolitore_assegnato',
    label: 'Demolitore assegnato',
    descrizione: 'Ti contatta per fissare il ritiro',
    statiAttiviPer: ['assegnata', 'in_attesa_conferma_cliente'],
  },
  {
    key: 'ritiro_programmato',
    label: 'Ritiro programmato',
    descrizione: 'Data fissata: tieni pronti gli originali',
    statiAttiviPer: ['ritiro_confermato'],
  },
  {
    key: 'veicolo_ritirato',
    label: 'Veicolo ritirato',
    descrizione: 'Certificato di rottamazione in arrivo',
    statiAttiviPer: ['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione', 'in_attesa_cert_radiazione_pra'],
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
// PILLOLE CONDIZIONE VEICOLO
// ============================================================

type TonoPillola = 'verde' | 'rosso'

function PillolaCondizione({ label, tono }: { label: string; tono: TonoPillola }) {
  const s = tono === 'verde' ? { bg: '#EAF3DE', color: '#27500A' } : { bg: '#FBE2E2', color: '#9B1C1C' }
  return (
    <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

// Costruisce le pillole solo per i valori effettivamente noti (non null)
function pilloleCondizioni(p: Pratica): { label: string; tono: TonoPillola }[] {
  const out: { label: string; tono: TonoPillola }[] = []
  if (p.incidentato !== null) out.push({ label: p.incidentato ? 'Incidentata' : 'Non incidentata', tono: p.incidentato ? 'rosso' : 'verde' })
  if (p.marciante !== null) out.push({ label: p.marciante ? 'Marciante' : 'Non marciante', tono: p.marciante ? 'verde' : 'rosso' })
  if (p.va_in_moto !== null) out.push({ label: p.va_in_moto ? 'Va in moto' : 'Non va in moto', tono: p.va_in_moto ? 'verde' : 'rosso' })
  if (p.parti_mancanti !== null) out.push({ label: p.parti_mancanti ? 'Parti mancanti' : 'Nessuna parte mancante', tono: p.parti_mancanti ? 'rosso' : 'verde' })
  return out
}

const SPAZIO_LABEL: Record<string, string> = {
  libero: 'Accesso libero',
  stretto: 'Spazio stretto',
  no: 'Non passa',
}

// ============================================================

export default function TabStato({ pratica }: Props) {
  const [datiAperti, setDatiAperti] = useState(false)
  const stepIdx = indiceStepAttuale(pratica.stato)
  const isAnnullata = pratica.stato === 'annullata'
  const pillole = pilloleCondizioni(pratica)
  const delegaAmmessa = !(pratica.casistica === 'non_intestatario' || pratica.casistica === 'targhe_straniere')

  const indirizzoCompleto = [
    pratica.indirizzo_ritiro,
    // L'indirizzo di Google contiene già il comune: si aggiunge solo se manca
    pratica.comune_ritiro && !(pratica.indirizzo_ritiro || '').toLowerCase().includes(pratica.comune_ritiro.toLowerCase())
      ? `${pratica.comune_ritiro}${pratica.provincia_ritiro ? ` (${pratica.provincia_ritiro})` : ''}`
      : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col gap-3">

      {/* ====== CARD PERCORSO ====== */}
      <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px' }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2563eb' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.25 }}>Il percorso della tua pratica</span>
            <span style={{ display: 'block', fontSize: 11, color: '#6B7280', marginTop: 1 }}>
              Aperta il {new Date(pratica.creato_il).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </span>
        </div>

        <div style={{ padding: '14px 14px 12px', borderTop: '1px solid #F1F3F6' }}>
          {isAnnullata ? (
            <div style={{ background: '#F8FAFC', border: '1px solid #EDEFF3', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ width: 34, height: 34, borderRadius: 999, background: '#F3D9D9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A94444" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>Pratica annullata</span>
              <span style={{ fontSize: 10.5, color: '#8B95A5', marginTop: 2 }}>Questa pratica non è più attiva</span>
            </div>
          ) : (
            <div>
              {TIMELINE_STEPS.map((step, i) => {
                const completato = i < stepIdx
                const corrente = i === stepIdx
                const futuro = i > stepIdx
                const ultimo = i === TIMELINE_STEPS.length - 1

                return (
                  <div key={step.key} style={{ display: 'flex', gap: 11, position: 'relative', paddingBottom: ultimo ? 2 : 16 }}>
                    {/* Filo tra le tappe: celeste per il tratto già percorso */}
                    {!ultimo && (
                      <span style={{ position: 'absolute', left: 12.5, top: 27, bottom: 0, width: 2, background: completato ? '#BFDBFE' : '#E5E7EB' }} />
                    )}
                    {/* Cerchio: fatte celesti con spunta blu, attuale blu pieno */}
                    <span style={{
                      width: 26, height: 26, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, zIndex: 1,
                      background: completato ? '#DBEAFE' : corrente ? '#2563EB' : '#EDF0F5',
                      color: completato ? '#1D4ED8' : corrente ? '#fff' : '#8B95A5',
                    }}>
                      {completato ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : corrente ? (
                        <span style={{ width: 9, height: 9, background: '#fff', borderRadius: 999 }} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    {/* Testi: la tappa attuale ha il riquadro azzurro */}
                    {corrente ? (
                      <span style={{ minWidth: 0, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '7px 11px', marginTop: -3 }}>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#1D4ED8', lineHeight: 1.3 }}>{step.label}</span>
                        <span style={{ display: 'block', fontSize: 10.5, color: '#3B82C4', marginTop: 1, lineHeight: 1.45 }}>{step.descrizione}</span>
                      </span>
                    ) : (
                      <span style={{ minWidth: 0, paddingTop: 3 }}>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: futuro ? '#9AA7B5' : '#111827', lineHeight: 1.3 }}>{step.label}</span>
                        <span style={{ display: 'block', fontSize: 10.5, color: '#8B95A5', marginTop: 1, lineHeight: 1.45 }}>{step.descrizione}</span>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ====== CARD DATI DEL VEICOLO ====== */}
      <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
        <button
          onClick={() => setDatiAperti(!datiAperti)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ width: 38, height: 38, borderRadius: 11, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <IconaVeicolo tipo={pratica.tipo_mezzo} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.25 }}>Dati del veicolo</span>
            <span style={{ display: 'block', fontSize: 11, color: '#6B7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[pratica.tipo_mezzo && (pratica.tipo_mezzo.charAt(0).toUpperCase() + pratica.tipo_mezzo.slice(1)), [pratica.marca, pratica.modello].filter(Boolean).join(' ')].filter(Boolean).join(' · ') || 'Il tuo mezzo'}
            </span>
          </span>
          <span style={{ color: '#9AA7B5', fontSize: 13, flexShrink: 0, transform: datiAperti ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </span>
        </button>

        {/* ⭐ Apertura MORBIDA (grid 0fr→1fr, regola di famiglia): il
            contenuto resta montato e scivola, niente sobbalzi di pagina */}
        <div style={{ display: 'grid', gridTemplateRows: datiAperti ? '1fr' : '0fr', transition: 'grid-template-rows .28s ease' }}>
          <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '2px 14px 12px', borderTop: '1px solid #F1F3F6' }}>
            <Riga k="Targa" v={pratica.targa} />
            <Riga k="Marca e modello" v={[pratica.marca, pratica.modello].filter(Boolean).join(' ')} />
            <Riga k="Anno · km" v={`${pratica.anno || '—'} · ${pratica.km?.toLocaleString('it-IT') || '—'}`} />
            <Riga k="Indirizzo ritiro" v={indirizzoCompleto} />
            <Riga k="Spazio carro attrezzi" v={pratica.spazio_carro_attrezzi ? (SPAZIO_LABEL[pratica.spazio_carro_attrezzi] || pratica.spazio_carro_attrezzi) : null} />
            {delegaAmmessa && <Riga k="Delegato" v={pratica.delegato_nome || 'Consegna in prima persona'} />}
            {delegaAmmessa && pratica.delegato_nome && pratica.delegato_telefono && <Riga k="Tel. delegato" v={pratica.delegato_telefono} />}

            {pillole.length > 0 && (
              <>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9AA7B5', letterSpacing: 0.5, textTransform: 'uppercase', margin: '10px 0 7px' }}>Condizioni dichiarate</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {pillole.map((p, i) => (
                    <PillolaCondizione key={i} label={p.label} tono={p.tono} />
                  ))}
                </div>
              </>
            )}

            {pratica.note_veicolo && (
              <div style={{ marginTop: 10, background: '#F8FAFC', border: '1px solid #F1F3F6', borderRadius: 10, padding: '8px 11px' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: '#9AA7B5', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>Note del cliente</div>
                <div style={{ fontSize: 11.5, color: '#4B5563', fontStyle: 'italic', lineHeight: 1.5 }}>{pratica.note_veicolo}</div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

    </div>
  )
}

// Riga dati in famiglia: etichetta scura in evidenza, valore grigio leggero
function Riga({ k, v }: { k: string; v: string | number | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid #F5F7FA', fontSize: 12 }}>
      <span style={{ fontWeight: 600, color: '#1E293B', flexShrink: 0 }}>{k}</span>
      <span style={{ color: '#6B7280', textAlign: 'right' }}>{v || '—'}</span>
    </div>
  )
}
