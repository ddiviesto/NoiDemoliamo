'use client'

/**
 * BARRA LATERALE A SCOMPARSA — AREA DEMOLITORE (23/07/2026, mockup approvato).
 * Su PC: colonnina di sole icone a sinistra che si APRE DA SOLA quando il
 * mouse si avvicina (hover). Sul telefono: nascosta, si apre col bottone ☰
 * come tenda da sinistra. Voci: Pratiche · La tua azienda (anagrafica) ·
 * Fatturazione (presto) · Esci in fondo.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export type VoceSidebar = 'pratiche' | 'azienda'

function Voce({ attiva, disabilitata, scura, onClick, icona, label, extra, espansa }: {
  attiva?: boolean
  disabilitata?: boolean
  /** per le voci in FONDO alla barra, dove la dissolvenza è quasi bianca */
  scura?: boolean
  onClick?: () => void
  icona: React.ReactNode
  label: string
  extra?: React.ReactNode
  espansa: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabilitata}
      className="w-full flex items-center gap-3 rounded-[9px] transition-colors"
      style={{
        padding: '10px 12px', margin: '1px 0',
        fontSize: 12.5, fontWeight: attiva ? 700 : 600, whiteSpace: 'nowrap',
        color: disabilitata ? 'rgba(240,245,255,0.55)' : attiva ? '#fff' : scura ? '#3E5170' : '#F0F5FF',
        background: attiva ? 'rgba(255,255,255,0.22)' : 'transparent',
        cursor: disabilitata ? 'default' : 'pointer',
      }}
      onMouseEnter={e => { if (!attiva && !disabilitata) e.currentTarget.style.background = scura ? 'rgba(30,58,110,0.08)' : 'rgba(255,255,255,0.12)' }}
      onMouseLeave={e => { if (!attiva) e.currentTarget.style.background = 'transparent' }}
    >
      <span className="flex-shrink-0">{icona}</span>
      <span className="flex items-center gap-2 transition-opacity duration-150" style={{ opacity: espansa ? 1 : 0 }}>
        {label}{extra}
      </span>
    </button>
  )
}

function VociMenu({ attiva, espansa, nome, onPratiche, onAzienda, onEsci }: {
  attiva: VoceSidebar
  espansa: boolean
  nome: string
  onPratiche: () => void
  onAzienda: () => void
  onEsci: () => void
}) {
  return (
    <>
      {/* In testa: LOGO VERO + NOME DEL DEMOLITORE (richieste Davide 23/07) */}
      <div className="flex items-center gap-3 whitespace-nowrap" style={{ padding: '4px 10px 13px', borderBottom: '1px solid rgba(255,255,255,0.18)', marginBottom: 8 }}>
        <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={28} height={28} className="rounded-lg flex-shrink-0" />
        <span className="transition-opacity duration-150 truncate text-white" style={{ fontSize: 12.5, fontWeight: 800, opacity: espansa ? 1 : 0, maxWidth: 150 }}>{nome || '…'}</span>
      </div>
      <Voce attiva={attiva === 'pratiche'} onClick={onPratiche} espansa={espansa} label="Pratiche"
        icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 16.5V13a1 1 0 0 0-1-1H3v4.5" /><path d="M3 12V7a1 1 0 0 1 1-1h9l3 4h3a2 2 0 0 1 2 2v4.5" /><circle cx="6.5" cy="17.5" r="2" /><circle cx="17.5" cy="17.5" r="2" /></svg>} />
      <Voce attiva={attiva === 'azienda'} onClick={onAzienda} espansa={espansa} label="La tua azienda"
        icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></svg>} />
      <Voce disabilitata espansa={espansa} label="Fatturazione"
        extra={<span style={{ fontSize: 8.5, fontWeight: 700, background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: 999, padding: '1px 7px' }}>PRESTO</span>}
        icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>} />
      <div className="mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.25)', paddingTop: 8 }}>
        <Voce onClick={onEsci} espansa={espansa} label="Esci"
          icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>} />
      </div>
    </>
  )
}

export default function SidebarDemolitore({ attiva, apertaMobile, onChiudiMobile, onPratiche, onAzienda, onEsci }: {
  attiva: VoceSidebar
  apertaMobile: boolean
  onChiudiMobile: () => void
  onPratiche: () => void
  onAzienda: () => void
  onEsci: () => void
}) {
  const [hover, setHover] = useState(false)
  const [nome, setNome] = useState('')

  // Il nome del demolitore in testa alla barra (si carica da solo)
  useEffect(() => {
    let vivo = true
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: u } = await supabase.from('utenti').select('nome').eq('id', session.user.id).single()
      if (vivo && u?.nome) setNome(u.nome)
    }
    carica()
    return () => { vivo = false }
  }, [])

  return (
    <>
      {/* ===== PC: colonnina che si apre all'avvicinarsi del mouse =====
          ⭐ 23/07 (variante A su mockup): BLU NoiDemoliamo come l'admin */}
      <div
        className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen overflow-hidden"
        style={{
          width: hover ? 212 : 58,
          background: 'linear-gradient(180deg, #2563eb 0%, #2563eb 65%, #7CA4F2 100%)',
          transition: 'width 0.22s ease',
          boxShadow: hover ? '6px 0 24px rgba(15,27,51,0.25)' : 'none',
          padding: '12px 8px',
          zIndex: 30,
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <VociMenu attiva={attiva} espansa={hover} nome={nome} onPratiche={onPratiche} onAzienda={onAzienda} onEsci={onEsci} />
      </div>

      {/* ===== TELEFONO: tenda da sinistra col bottone ☰ ===== */}
      <div
        onClick={onChiudiMobile}
        className="lg:hidden fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'rgba(17,24,39,0.45)', opacity: apertaMobile ? 1 : 0, pointerEvents: apertaMobile ? 'auto' : 'none' }}
      />
      <div
        className="lg:hidden fixed top-0 left-0 bottom-0 z-50 flex flex-col shadow-2xl transition-transform duration-300"
        style={{ width: 240, padding: '14px 10px', background: 'linear-gradient(180deg, #2563eb 0%, #2563eb 65%, #7CA4F2 100%)', transform: apertaMobile ? 'translateX(0)' : 'translateX(-105%)' }}
      >
        <VociMenu attiva={attiva} espansa={true} nome={nome} onPratiche={() => { onChiudiMobile(); onPratiche() }} onAzienda={() => { onChiudiMobile(); onAzienda() }} onEsci={onEsci} />
      </div>
    </>
  )
}
