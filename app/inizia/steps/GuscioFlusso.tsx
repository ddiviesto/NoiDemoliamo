'use client'

// ============================================================
// IL GUSCIO DEI FLUSSI (demolizione e valutazione)
// ⭐ 19/08 (impianto C approvato da Davide, mockup "Senza scatola"):
//
// TELEFONO — resta tutto com'era: card bianca a tutto schermo, testata blu
// con la freccia tonda, fascetta azzurra col servizio e il mezzo, barra di
// avanzamento. Non si tocca: è la modalità in cui compila quasi tutta la gente.
//
// PC — il flusso entra nel mondo della home nuova: fondo lilla con gli aloni,
// ISOLA GALLEGGIANTE in cima col marchio e la pillolina della richiesta,
// NIENTE scatola bianca (il contenuto vive sulla scena), riga con la freccia
// tonda, la barra di avanzamento e "PASSO N DI M". Il titolo grande con la
// parola in sfumatura lo mette TitoloPasso.
// ============================================================

import Image from 'next/image'

export function GuscioFlusso({ servizio, mezzo, passo, totale, titoloBanner, icona, onIndietro, children }: {
  servizio: string
  mezzo: string
  passo: number          // 1-based
  totale: number
  titoloBanner: string
  icona: React.ReactNode
  onIndietro: () => void
  children: React.ReactNode
}) {
  const pct = Math.round((passo / totale) * 100)

  return (
    <main className="flusso-scena min-h-screen flex items-start justify-center p-0 sm:p-7 sm:pt-6">
      <div className="w-full max-w-md sm:max-w-[980px]">

        {/* ---------- ISOLA GALLEGGIANTE (solo PC) ---------- */}
        <div
          className="hidden sm:flex items-center justify-between gap-4 mb-7"
          style={{
            background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 10px 30px rgba(15,27,51,0.10)',
            borderRadius: 999, padding: '8px 8px 8px 16px',
          }}
        >
          <span className="flex items-center gap-2.5">
            <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={30} height={30} style={{ borderRadius: 9 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0F1B33', letterSpacing: '-0.3px' }}>NoiDemoliamo</span>
          </span>
          <span className="flex items-center gap-2.5">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 999, padding: '7px 14px' }}>
              {servizio}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#3E4C63' }}>{mezzo}</span>
          </span>
        </div>

        {/* ---------- il contenuto: card bianca sul telefono, scena nuda su PC ---------- */}
        <div className="bg-white sm:bg-transparent rounded-none p-7 sm:p-0 min-h-screen sm:min-h-0 relative">

          {/* TESTATA BLU — solo telefono */}
          <div className="sm:hidden -mx-7 -mt-7 mb-5 px-4 py-3 bg-gradient-to-r from-[#1d4ed8] to-[#2563eb] flex items-center gap-3 text-white">
            <button
              onClick={onIndietro}
              aria-label="Torna indietro"
              className="flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/30 active:scale-95"
              style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
            <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">{icona}</div>
              <div className="flex flex-col min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">Passo {passo} di {totale}</div>
                <div className="text-sm font-semibold leading-tight truncate">{titoloBanner}</div>
              </div>
            </div>
            <span style={{ width: 38, flexShrink: 0 }} />
          </div>

          {/* FASCETTA servizio + mezzo — solo telefono (su PC sta nell'isola) */}
          <div
            className="sm:hidden -mx-7 -mt-5 mb-5 flex items-center"
            style={{ background: '#EFF6FF', borderBottom: '1px solid #DBEAFE', padding: '9px 16px' }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1D4ED8' }}>{servizio}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#3E4C63', marginLeft: 6 }}>{mezzo}</span>
          </div>

          {/* RIGA ALTA — solo PC: freccia tonda, barra, "PASSO N DI M" */}
          <div className="hidden sm:flex items-center gap-4 mb-7">
            <button
              onClick={onIndietro}
              aria-label="Torna indietro"
              className="flex items-center justify-center flex-shrink-0 transition-all hover:bg-white active:scale-95"
              style={{ width: 44, height: 44, borderRadius: 999, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(226,232,245,0.9)', boxShadow: '0 6px 16px rgba(15,27,51,0.07)', cursor: 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B2E6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            </button>
            <div className="flex-1 overflow-hidden" style={{ height: 5, background: 'rgba(15,27,51,0.07)', borderRadius: 999 }}>
              <div className="transition-all duration-500 ease-out" style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#2563eb,#7c3aed)', borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#7C8AA5', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
              PASSO {passo} DI {totale}
            </span>
          </div>

          {/* BARRA sottile — solo telefono */}
          <div className="sm:hidden h-1 bg-gray-100 rounded-full mb-5 mt-1 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
          </div>

          {children}
        </div>
      </div>
    </main>
  )
}
