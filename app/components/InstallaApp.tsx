'use client'

// ============================================================
// "INSTALLA L'APP" (⭐ 05/10, mockup approvato da Davide)
// Non c'è un'app negli store: il sito si installa come app (web app),
// con l'icona nella home e a tutto schermo. Questo file ha tre pezzi:
//   1. <RegistraApp />  — nel layout: registra il file di servizio e
//      intercetta la richiesta di installazione di Chrome/Edge
//      (beforeinstallprompt), che arriva PRIMA che il cliente prema
//      qualsiasi tasto, quindi va presa al volo e tenuta da parte.
//   2. useInstallaApp() — dice al tasto in che situazione siamo:
//      'installata' (siamo dentro l'app) · 'pronta' (Chrome/Edge ha la
//      finestra pronta) · 'iphone' (Safari: solo le istruzioni) ·
//      'istruzioni' (tutto il resto: si spiega dal menu del browser)
//   3. <FoglioInstalla /> — il foglio che sale dal basso con i passi
//      per iPhone (o le istruzioni generiche).
// ============================================================

import { useEffect, useState } from 'react'

interface EventoInstalla extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window { __ndInstalla?: EventoInstalla | null }
}

export function RegistraApp() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { /* senza, il sito funziona uguale */ })
    }
    const prendi = (e: Event) => { e.preventDefault(); window.__ndInstalla = e as EventoInstalla; window.dispatchEvent(new Event('nd-installa-pronta')) }
    window.addEventListener('beforeinstallprompt', prendi)
    const fatta = () => { window.__ndInstalla = null; window.dispatchEvent(new Event('nd-installa-fatta')) }
    window.addEventListener('appinstalled', fatta)
    return () => { window.removeEventListener('beforeinstallprompt', prendi); window.removeEventListener('appinstalled', fatta) }
  }, [])
  return null
}

export type StatoInstalla = 'installata' | 'pronta' | 'iphone' | 'istruzioni'

export function useInstallaApp() {
  const [stato, setStato] = useState<StatoInstalla>('istruzioni')
  useEffect(() => {
    const calcola = () => {
      const dentroApp = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
      if (dentroApp) return setStato('installata')
      if (window.__ndInstalla) return setStato('pronta')
      const ua = navigator.userAgent
      const iphone = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      setStato(iphone ? 'iphone' : 'istruzioni')
    }
    calcola()
    window.addEventListener('nd-installa-pronta', calcola)
    window.addEventListener('nd-installa-fatta', calcola)
    return () => { window.removeEventListener('nd-installa-pronta', calcola); window.removeEventListener('nd-installa-fatta', calcola) }
  }, [])

  // Premuto il tasto: su Chrome/Edge apre la finestra del browser, altrimenti dice di aprire il foglio
  async function installa(): Promise<'finestra' | 'foglio' | 'niente'> {
    if (stato === 'installata') return 'niente'
    if (stato === 'pronta' && window.__ndInstalla) {
      const ev = window.__ndInstalla
      await ev.prompt()
      const scelta = await ev.userChoice
      if (scelta.outcome === 'accepted') { window.__ndInstalla = null; setStato('installata') }
      return 'finestra'
    }
    return 'foglio'
  }
  return { stato, installa }
}

const CONDIVIDI = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: '-2px' }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>

/** Il foglio con i passi: sale dal basso sul telefono, finestra centrata su PC */
export function FoglioInstalla({ stato, onChiudi }: { stato: StatoInstalla; onChiudi: () => void }) {
  const iphone = stato === 'iphone'
  const chrome = /CriOS/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
  const tasto = (t: React.ReactNode) => <span style={{ background: '#F1F3F6', borderRadius: 6, padding: '2px 7px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{t}</span>
  const passi: React.ReactNode[] = iphone
    ? (chrome
      ? [<>Apri questa pagina in <b>Safari</b> (da Chrome non si può)</>, <>Tocca {tasto(<>{CONDIVIDI} Condividi</>)} in basso</>, <>Scegli {tasto('Aggiungi alla schermata Home')} e poi {tasto('Aggiungi')}</>]
      : [<>Tocca {tasto(<>{CONDIVIDI} Condividi</>)} in basso in Safari</>, <>Scegli {tasto('Aggiungi alla schermata Home')}</>, <>Tocca {tasto('Aggiungi')} in alto a destra</>])
    : [<>Apri il menu del browser (i tre puntini in alto a destra)</>, <>Scegli {tasto('Installa app')} oppure {tasto('Aggiungi alla schermata Home')}</>, <>Conferma: l&apos;icona compare nella home o sul desktop</>]

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" style={{ background: 'rgba(15,23,42,0.45)' }} onClick={onChiudi}>
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl" style={{ borderRadius: '20px 20px 0 0', padding: '18px 18px 22px', boxShadow: '0 -10px 30px rgba(15,27,51,0.18)' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-[16px] font-extrabold tracking-[-0.3px] text-[#0F172A]">Aggiungi NoiDemoliamo alla home</h3>
        <p className="text-[12.5px] text-gray-500 mt-0.5">{iphone ? 'Su iPhone si fa in tre tocchi:' : 'Si fa in tre passi dal tuo browser:'}</p>
        <div className="mt-2">
          {passi.map((p, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2.5 text-[13px] text-gray-700" style={{ borderBottom: i === passi.length - 1 ? 'none' : '1px solid #F1F4F8' }}>
              <span className="flex items-center justify-center flex-shrink-0 text-[11px] font-bold" style={{ width: 24, height: 24, borderRadius: 999, background: '#EFF6FF', border: '1.5px solid #93C5FD', color: '#1D4ED8' }}>{i + 1}</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
        <button onClick={onChiudi} className="btn-pagina mt-3 sm:!w-full">Ho capito</button>
      </div>
    </div>
  )
}

const SCARICA = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>

/** La striscia blu del sito, prima del piede (sparisce dentro l'app installata) */
export function SezioneInstalla() {
  const { stato, installa } = useInstallaApp()
  const [foglio, setFoglio] = useState(false)
  if (stato === 'installata') return null
  return (
    <section className="w-full" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px 56px' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-7 text-white" style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', borderRadius: 22, padding: '26px 28px', boxShadow: '0 10px 30px rgba(37,99,235,0.25)' }}>
        <span className="flex items-center justify-center flex-shrink-0" style={{ width: 72, height: 72, borderRadius: 18, background: '#fff', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icona-app.png" alt="" width={72} height={72} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[22px] font-extrabold tracking-[-0.5px] leading-tight">Porta NoiDemoliamo nella tua home</h2>
          <p className="text-[14px] mt-1 leading-relaxed" style={{ opacity: 0.92 }}>Installa l&apos;app sul telefono o sul computer: segui la pratica, carica i documenti e ricevi gli aggiornamenti senza aprire il browser. Gratis, senza store.</p>
        </div>
        <button onClick={async () => { if (await installa() === 'foglio') setFoglio(true) }} className="flex items-center gap-2 transition-all hover:brightness-105 active:scale-[0.99] flex-shrink-0" style={{ background: '#fff', color: '#1D4ED8', borderRadius: 999, padding: '13px 24px', fontSize: 14, fontWeight: 700, boxShadow: '0 6px 18px rgba(0,0,0,0.15)', cursor: 'pointer', border: 'none' }}>
          {SCARICA} Installa l&apos;app
        </button>
      </div>
      {foglio && <FoglioInstalla stato={stato} onChiudi={() => setFoglio(false)} />}
    </section>
  )
}
