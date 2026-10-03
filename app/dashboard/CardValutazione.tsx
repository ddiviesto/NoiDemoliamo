'use client'

// ============================================================
// LA CARD DELLA RICHIESTA DI VALUTAZIONE nell'area personale
// ⭐ 03/10 (mockup A approvato da Davide): una card come le pratiche
// (barretta blu, quadratino col cartellino, pillola dello stato) che
// cambia faccia coi momenti della richiesta:
//   in valutazione → proposta arrivata (demolizione gratuita o cifra,
//   con "No, grazie" / "Accetto") → accettata ("Completa la pratica")
//   oppure rifiutata (spenta, con "Cambia idea").
// Tutto sta NELLA card: niente pagina da aprire.
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export interface RichiestaValutazione {
  id: string
  stato: string
  targa: string | null
  tipo_mezzo: string | null
  marca: string | null
  modello: string | null
  anno: number | null
  offerta_tipo: string | null
  offerta_importo: number | null
  offerta_messaggio: string | null
  offerta_inviata_il: string | null
  risposta_cliente: string | null
  risposta_il: string | null
  creato_il: string
}

function IconaCartellino() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <path d="M7 7h.01" />
    </svg>
  )
}

function dataBreve(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : ''
}

export default function CardValutazione({ r, onCambiata }: { r: RichiestaValutazione; onCambiata: () => void }) {
  const router = useRouter()
  const [lavoro, setLavoro] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [confermaNo, setConfermaNo] = useState(false)

  const proposta = r.stato === 'risposta_inviata' && !r.risposta_cliente
  const accettata = r.stato === 'risposta_inviata' && r.risposta_cliente === 'accettata'
  const rifiutata = r.stato === 'rifiutata'
  const cifra = r.offerta_tipo === 'acquisto' && r.offerta_importo != null ? `${r.offerta_importo.toLocaleString('it-IT')} €` : 'Demolizione gratuita'

  async function rispondi(azione: 'accetta' | 'rifiuta' | 'riapri') {
    setLavoro(true); setErrore(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/valutazione-risposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ id: r.id, azione }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Errore')
      setConfermaNo(false)
      onCambiata()
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non siamo riusciti a salvare. Riprova.')
    } finally {
      setLavoro(false)
    }
  }

  // La pillola dello stato (stessa famiglia di lib/statiCliente.ts)
  const pillola = rifiutata
    ? { label: 'Rifiutata', bg: '#E8ECF3', text: '#5B6779' }
    : accettata
      ? { label: 'Accettata', bg: '#DCF3E4', text: '#1F7A43' }
      : proposta
        ? { label: 'Proposta arrivata', bg: '#EFF6FF', text: '#1D4ED8' }
        : { label: 'In valutazione', bg: '#EFF6FF', text: '#1D4ED8' }

  const bottone = (testo: string, onClick: () => void, blu?: boolean) => (
    <button
      type="button"
      onClick={onClick}
      disabled={lavoro}
      className="disabled:opacity-60 active:scale-[0.99] transition-all"
      style={{ flex: 1, textAlign: 'center', borderRadius: 999, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        background: blu ? 'linear-gradient(90deg, #1d4ed8, #2563eb)' : '#fff', color: blu ? '#fff' : '#374151',
        border: blu ? 'none' : '1.5px solid #E5E7EB', boxShadow: blu ? '0 6px 18px rgba(37,99,235,0.35)' : 'none' }}
    >{testo}</button>
  )

  return (
    <div
      style={{ position: 'relative', background: '#fff', border: `1.5px solid ${proposta ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 16, overflow: 'hidden', opacity: rifiutata ? 0.85 : 1,
        boxShadow: proposta ? '0 4px 16px rgba(37,99,235,0.14)' : '0 1px 2px rgba(16,24,40,0.06), 0 5px 14px rgba(16,24,40,0.07)' }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: rifiutata ? '#C0C7D1' : '#2563eb' }} />

      {/* La riga, come quella delle pratiche */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 13px 14px 16px' }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconaCartellino />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16.5, letterSpacing: '0.03em', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.targa || 'Targa mancante'}</div>
          {(r.marca || r.modello) && (
            <div style={{ fontSize: 13.5, color: '#6B7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[r.marca, r.modello].filter(Boolean).join(' ')}{r.anno ? ` · ${r.anno}` : ''}</div>
          )}
          <div style={{ fontSize: 13.5, color: '#6B7280', marginTop: 1 }}>Richiesta di valutazione</div>
        </div>
        <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: pillola.bg, color: pillola.text, whiteSpace: 'nowrap' }}>{pillola.label}</span>
      </div>

      {/* In valutazione: solo il piede */}
      {r.stato === 'da_valutare' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, background: '#F8FAFC', borderTop: '1px solid #F1F3F6', padding: '7px 13px 7px 16px', fontSize: 12.5, color: '#6B7280' }}>
          <span>Ti rispondiamo entro un giorno lavorativo</span>
          <span style={{ color: '#9AA7B5', flexShrink: 0 }}>{dataBreve(r.creato_il)}</span>
        </div>
      )}

      {/* La proposta, tutta nella card */}
      {proposta && (
        <div style={{ padding: '0 14px 14px 16px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#1D4ED8' }}>La nostra proposta</div>
          <div style={{ fontSize: r.offerta_tipo === 'acquisto' ? 30 : 20, fontWeight: 800, letterSpacing: r.offerta_tipo === 'acquisto' ? '-1px' : '-0.4px', color: '#0F172A', marginTop: 2, lineHeight: 1.1 }}>{cifra}</div>
          {r.offerta_messaggio && (
            <div style={{ marginTop: 8, fontSize: 13, color: '#374151', lineHeight: 1.55, background: '#F8FAFC', border: '1px solid #EEF1F5', borderRadius: 10, padding: '9px 11px', whiteSpace: 'pre-line' }}>{r.offerta_messaggio}</div>
          )}
          <div style={{ marginTop: 8, fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
            {r.offerta_tipo === 'acquisto'
              ? 'Se accetti, ti chiediamo quattro cose in più e fissiamo il ritiro.'
              : 'Se accetti, ti chiediamo quattro cose in più e la richiesta diventa una pratica di demolizione.'}
          </div>
          {errore && <div style={{ marginTop: 8, fontSize: 12.5, color: '#9B1C1C' }}>{errore}</div>}
          {confermaNo ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>Rifiuti la proposta? Potrai ripensarci dalla tua area personale.</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {bottone('Torna indietro', () => setConfermaNo(false))}
                {bottone(lavoro ? '…' : 'Sì, rifiuto', () => rispondi('rifiuta'), true)}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {bottone('No, grazie', () => setConfermaNo(true))}
              {bottone(lavoro ? '…' : 'Accetto', () => rispondi('accetta'), true)}
            </div>
          )}
        </div>
      )}

      {/* Accettata: manca solo completare */}
      {accettata && (
        <div style={{ padding: '0 14px 14px 16px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#DCF3E4', border: '1.5px solid #B7E4C7', borderRadius: 10, padding: '9px 10px', fontSize: 12.5, color: '#1F7A43', lineHeight: 1.5 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12" /></svg>
            <span>Hai accettato: <strong>{cifra}</strong>. Ora mancano quattro risposte veloci: spazio per il carro attrezzi, chi consegna, libretto, certificato di proprietà.</span>
          </div>
          <button type="button" onClick={() => router.push(`/dashboard/completa/${r.id}`)} className="btn-pagina" style={{ marginTop: 12 }}>Completa la pratica</button>
        </div>
      )}

      {/* Rifiutata: spenta, con "Cambia idea" */}
      {rifiutata && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, background: '#F8FAFC', borderTop: '1px solid #F1F3F6', padding: '7px 13px 7px 16px', fontSize: 12.5, color: '#6B7280' }}>
          <span>Hai rifiutato la proposta{r.risposta_il ? ` il ${dataBreve(r.risposta_il)}` : ''}</span>
          <button type="button" onClick={() => rispondi('riapri')} disabled={lavoro} style={{ color: '#1D4ED8', fontWeight: 600, fontSize: 12.5, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Cambia idea →</button>
        </div>
      )}
    </div>
  )
}
