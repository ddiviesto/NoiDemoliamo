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
import Marchio from './Marchio'

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
    // ⭐ 05/10 (Davide): appena installata, l'app deve aprirsi su "Accedi"
    // (o sulle pratiche se è già dentro), non sulla pagina del sito da cui
    // ha premuto il tasto: Chrome sposta questa scheda nella finestra
    // dell'app, quindi basta portarla sull'area personale.
    const fatta = () => { window.__ndInstalla = null; window.dispatchEvent(new Event('nd-installa-fatta')); setTimeout(() => { window.location.href = '/dashboard?da=app' }, 400) }
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

/** La sezione del sito, prima del piede (⭐ 05/10, mockup B): card di vetro
 *  come le altre sezioni, col telefono che ha già l'icona nella home.
 *  Sparisce dentro l'app installata. */
export function SezioneInstalla() {
  const { stato, installa } = useInstallaApp()
  const [foglio, setFoglio] = useState(false)
  if (stato === 'installata') return null
  const spunte = ['Gratis', 'iPhone, Android e PC', 'Stessi accessi del sito']
  return (
    <section className="w-full" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px 56px' }}>
      <div
        className="flex flex-col sm:flex-row items-center gap-7 sm:gap-9"
        style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(231,235,243,0.9)', borderRadius: 26, padding: '30px 34px' }}
      >
        {/* il telefono con l'icona già nella home */}
        <div className="flex-shrink-0" aria-hidden="true" style={{ width: 150, height: 300, borderRadius: 26, border: '7px solid #0F172A', background: 'linear-gradient(160deg,#1e293b,#0f172a)', padding: '26px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px 8px', alignContent: 'start' }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i}>
              {i === 2
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src="/icona-app.png" alt="" width={32} height={32} style={{ display: 'block', margin: '0 auto', borderRadius: 9 }} />
                : <span style={{ display: 'block', width: 32, height: 32, borderRadius: 9, background: '#94A3B8', opacity: 0.45, margin: '0 auto' }} />}
              <span style={{ display: 'block', textAlign: 'center', fontSize: 7, color: '#E2E8F0', marginTop: 3 }}>{i === 2 ? 'NoiDemoliamo' : ['Messaggi', 'Foto', '', 'Mappe', 'Meteo', 'Note'][i]}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#2563eb' }}>L&apos;app</div>
          <h2 className="flex items-baseline flex-wrap" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1.15, marginTop: 8, color: '#0F1B33', gap: '0.28em' }}>
            <span>Porta</span><Marchio misura={28} /><span>nella tua home</span>
          </h2>
          <p style={{ fontSize: 15, color: '#5B6779', lineHeight: 1.65, marginTop: 10, maxWidth: 520 }}>Si installa dal sito, senza store: icona sul telefono o sul computer, si apre a tutto schermo e ti tiene aggiornato sulla pratica.</p>
          <div className="flex flex-wrap" style={{ gap: 18, marginTop: 14 }}>
            {spunte.map(t => (
              <span key={t} className="flex items-center" style={{ fontSize: 13, color: '#374151', gap: 6 }}>
                <span className="inline-flex items-center justify-center" style={{ width: 16, height: 16, borderRadius: 999, background: '#DCF3E4', color: '#1F7A43', fontSize: 10, fontWeight: 800 }}>✓</span>{t}
              </span>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <button onClick={async () => { if (await installa() === 'foglio') setFoglio(true) }} className="btn-pagina btn-pagina--auto" style={{ fontSize: 14, padding: '13px 26px' }}>
              {SCARICA} Installa l&apos;app
            </button>
          </div>
        </div>
      </div>
      {foglio && <FoglioInstalla stato={stato} onChiudi={() => setFoglio(false)} />}
    </section>
  )
}
