'use client'

// ============================================================
// "AGGIUNGI UN ALTRO VEICOLO" nell'area del cliente
// ⭐ 19/11 (Davide, mockup A "aggiungi-veicolo"): non più la riga larga
// quanto le pratiche, che portava sempre alla demolizione. È una PILLOLA
// affusolata, corta e centrata; al clic chiede cosa si vuole fare col
// veicolo, con le due scelte delle porte della home:
//   "Voglio rottamarlo"          → /inizia
//   "Voglio venderlo o sapere quanto vale"  → /vendi-auto   (20/11: le parole della seconda porta)
// Su PC la domanda è una NUVOLETTA col becco sotto la pillola (regola 20);
// sul TELEFONO è il foglio che sale dal basso, come "Installa l'app"
// (nel body, con la pagina sotto ferma).
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import IconaVeicolo from '../components/IconaVeicolo'
import { useBloccaPaginaSuTelefono } from '@/lib/bloccaPagina'

const CARTELLINO = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <path d="M7 7h.01" />
  </svg>
)

const DOMANDA = 'Cosa vuoi fare con questo veicolo?'

function Scelta({ href, icona, titolo, sotto }: { href: string; icona: React.ReactNode; titolo: string; sotto: string }) {
  return (
    <Link
      href={href}
      className="flex items-center transition-colors hover:!bg-[#EFF6FF] hover:!border-[#93C5FD] active:scale-[0.99]"
      style={{ gap: 12, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 13, padding: '11px 12px' }}
    >
      <span className="flex items-center justify-center flex-shrink-0" style={{ width: 38, height: 38, borderRadius: 11, background: '#DBEAFE' }}>{icona}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#111827' }}>{titolo}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: '#6B7280', marginTop: 1 }}>{sotto}</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
    </Link>
  )
}

function LeDueScelte() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Scelta href="/inizia" icona={<IconaVeicolo tipo="autovettura" />} titolo="Voglio rottamarlo" sotto="Demolizione gratuita, anche il ritiro" />
      <Scelta href="/vendi-auto" icona={CARTELLINO} titolo="Voglio venderlo o sapere quanto vale" sotto="Valutazione gratuita, senza impegno" />
    </div>
  )
}

/** Il foglio del telefono: esiste solo da aperto, così ferma la pagina sotto */
function FoglioScelte({ onChiudi }: { onChiudi: () => void }) {
  useBloccaPaginaSuTelefono()
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="sm:hidden fixed inset-0 z-[90] flex items-end justify-center foglio-velo" style={{ background: 'rgba(15,23,42,0.45)', overscrollBehavior: 'contain', touchAction: 'none' }} onClick={onChiudi}>
      <div className="w-full bg-white foglio-sale" style={{ borderRadius: '20px 20px 0 0', padding: '18px 16px calc(22px + env(safe-area-inset-bottom))', boxShadow: '0 -10px 30px rgba(15,27,51,0.18)' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-[16px] font-bold tracking-[-0.3px] text-[#0F172A]" style={{ marginBottom: 12 }}>{DOMANDA}</h3>
        <LeDueScelte />
      </div>
    </div>,
    document.body
  )
}

export default function AggiungiVeicolo() {
  const [aperto, setAperto] = useState(false)
  const scatola = useRef<HTMLDivElement>(null)

  // la nuvoletta si chiude cliccando fuori o con Esc
  useEffect(() => {
    if (!aperto) return
    const fuori = (e: MouseEvent) => {
      // il foglio del telefono sta nel body, fuori da questa scatola: lì decide lui quando chiudere
      if ((e.target as Element | null)?.closest?.('.foglio-velo')) return
      if (scatola.current && !scatola.current.contains(e.target as Node)) setAperto(false)
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAperto(false) }
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc) }
  }, [aperto])

  return (
    <div className="flex justify-center" style={{ marginTop: 6 }}>
      <div ref={scatola} className="relative">
        <button
          type="button"
          onClick={() => setAperto(a => !a)}
          aria-expanded={aperto}
          className="inline-flex items-center transition-colors hover:!bg-[#EFF6FF] active:scale-[0.98]"
          style={{ gap: 9, background: aperto ? '#EFF6FF' : '#fff', border: `1.5px solid ${aperto ? '#2563EB' : '#BFDBFE'}`, color: '#1D4ED8', fontWeight: 700, fontSize: 14, borderRadius: 999, padding: '6px 20px 6px 7px', boxShadow: '0 4px 14px rgba(37,99,235,0.10)', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          <span className="flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, borderRadius: 999, background: '#2563EB' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </span>
          Aggiungi un altro veicolo
        </button>

        {/* PC: la nuvoletta col becco, centrata sotto la pillola */}
        {aperto && (
          <div className="hidden sm:block absolute z-[60] text-left nuvola-entra" style={{ top: 'calc(100% + 12px)', left: '50%', marginLeft: -220, width: 440, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 18, padding: 12, boxShadow: '0 14px 40px rgba(15,27,51,0.16)' }}>
            <span aria-hidden="true" style={{ position: 'absolute', top: -9, left: 'calc(50% - 8px)', width: 16, height: 16, background: '#fff', borderLeft: '1.5px solid #E5E7EB', borderTop: '1.5px solid #E5E7EB', transform: 'rotate(45deg)' }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F1B33', padding: '4px 6px 10px' }}>{DOMANDA}</div>
            <LeDueScelte />
          </div>
        )}

        {/* TELEFONO: il foglio dal basso */}
        {aperto && <FoglioScelte onChiudi={() => setAperto(false)} />}
      </div>
    </div>
  )
}
