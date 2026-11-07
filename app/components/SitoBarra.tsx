'use client'

// ============================================================
// BARRA DEL SITO PUBBLICO — L'ISOLA GALLEGGIANTE
// ⭐ 18/08 (restyling "isola galleggiante" scelto da Davide sul mockup):
// via la striscia bianca attaccata ai bordi. La barra è una PILLOLA DI
// VETRO staccata dai lati, che resta in cima mentre si scorre.
// ⚠️ 18/08: le voci dei due servizi sono tolte perché quelle pagine sono
// state cancellate: si finisce prima la home, poi si rifanno e le voci
// tornano qui.
// ============================================================

import Link from 'next/link'
import Marchio from './Marchio'
import { WhatsAppBarra } from './AiutoWhatsApp'

export default function SitoBarra() {
  return (
    <div className="sticky z-50 -mx-2.5 sm:mx-auto flex items-center justify-between gap-1.5 sm:gap-3 py-2 pl-3 pr-2 sm:py-[9px] sm:pl-4 sm:pr-[9px]" style={{
      top: 14, marginTop: 18, maxWidth: 1000,
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(18px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 10px 34px rgba(15,27,51,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      borderRadius: 999,
    }}>
      {/* ⭐ 27/08: niente tondino accanto al nome — il marchio è la scritta,
          e il suo segno è la fogliolina sulla "i" */}
      {/* ⭐ 07/11: sul telefono tutto un po' più stretto (marchio 18, meno aria nei
          bottoni, "Richiedi" senza "ora" sotto i 430px) così la barra regge anche
          col tondino WhatsApp: prima "Richiedi ora" andava a capo e usciva dall'isola */}
      <Link href="/" className="flex items-center">
        <span className="flex sm:hidden"><Marchio misura={17} /></span>
        <span className="hidden sm:flex"><Marchio misura={21} /></span>
      </Link>

      <div className="flex items-center gap-0.5">
        {/* ⭐ 07/11 (Davide): sul telefono l'aiuto WhatsApp sta qui, a sinistra di Accedi */}
        <WhatsAppBarra />
        <Link
          href="/login"
          className="transition-colors hover:bg-blue-600/[0.08] py-[9px] px-2 sm:px-3.5"
          style={{ fontSize: 13.5, fontWeight: 600, color: '#4A5670', borderRadius: 999 }}
        >
          Accedi
        </Link>
        <Link
          href="/inizia"
          className="transition-all hover:brightness-105 active:scale-[0.98] whitespace-nowrap py-[11px] px-3.5 sm:px-5"
          style={{
            fontSize: 13.5, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            borderRadius: 999,
            boxShadow: '0 8px 20px rgba(37,99,235,0.35)', marginLeft: 4,
          }}
        >
          Richiedi<span className="hidden min-[430px]:inline"> ora</span>
        </Link>
      </div>
    </div>
  )
}
