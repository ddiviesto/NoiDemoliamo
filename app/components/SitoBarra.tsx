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
import Image from 'next/image'
import Marchio from './Marchio'

export default function SitoBarra() {
  return (
    <div className="sticky z-50 mx-auto flex items-center justify-between gap-3" style={{
      top: 14, marginTop: 18, maxWidth: 1000,
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(18px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: '0 10px 34px rgba(15,27,51,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      borderRadius: 999, padding: '9px 9px 9px 16px',
    }}>
      <Link href="/" className="flex items-center gap-2.5">
        <Image
          src="/NoiDemoliamoLogo.png"
          alt="NoiDemoliamo"
          width={32}
          height={32}
          priority
          style={{ borderRadius: 10 }}
        />
        <Marchio misura={17} />
      </Link>

      <div className="flex items-center gap-0.5">
        <Link
          href="/login"
          className="transition-colors hover:bg-blue-600/[0.08]"
          style={{ fontSize: 13.5, fontWeight: 600, color: '#4A5670', padding: '9px 14px', borderRadius: 999 }}
        >
          Accedi
        </Link>
        <Link
          href="/inizia"
          className="transition-all hover:brightness-105 active:scale-[0.98]"
          style={{
            fontSize: 13.5, fontWeight: 700, color: '#fff',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            padding: '11px 20px', borderRadius: 999,
            boxShadow: '0 8px 20px rgba(37,99,235,0.35)', marginLeft: 4,
          }}
        >
          Richiedi ora
        </Link>
      </div>
    </div>
  )
}
