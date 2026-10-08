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

import { useEffect, useRef, useState } from 'react'
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
/** Le istruzioni per installare. Sul TELEFONO è il foglio che sale dal
 *  basso; su PC (⭐ 08/10, mockup A scelto da Davide) è una NUVOLETTA
 *  ancorata al bottone col becco, come le altre nuvolette dell'app (regola
 *  20): chi la usa la mette dentro un contenitore `relative` accanto al
 *  bottone. `lato` dice da che parte sta il becco. Clic fuori o Esc chiude. */
export function FoglioInstalla({ stato, onChiudi, lato = 'destra', larghezza = 360 }: { stato: StatoInstalla; onChiudi: () => void; lato?: 'sinistra' | 'destra'; larghezza?: number }) {
  const iphone = stato === 'iphone'
  const chrome = /CriOS/.test(typeof navigator !== 'undefined' ? navigator.userAgent : '')
  const tasto = (t: React.ReactNode) => <span style={{ background: '#F1F3F6', borderRadius: 6, padding: '2px 7px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{t}</span>
  const passiIphone: React.ReactNode[] = chrome
    ? [<>Apri questa pagina in <b>Safari</b> (da Chrome non si può)</>, <>Tocca {tasto(<>{CONDIVIDI} Condividi</>)} in basso</>, <>Scegli {tasto('Aggiungi alla schermata Home')} e poi {tasto('Aggiungi')}</>]
    : [<>Tocca {tasto(<>{CONDIVIDI} Condividi</>)} in basso in Safari</>, <>Scegli {tasto('Aggiungi alla schermata Home')}</>, <>Tocca {tasto('Aggiungi')} in alto a destra</>]
  const passiTelefono: React.ReactNode[] = [<>Apri il menu del browser (i tre puntini in alto a destra)</>, <>Scegli {tasto('Installa app')} oppure {tasto('Aggiungi alla schermata Home')}</>, <>Conferma: l&apos;icona compare nella home o sul desktop</>]
  const passiPc: React.ReactNode[] = [<>Apri il menu del browser (i tre puntini in alto a destra) oppure clicca l&apos;iconcina {tasto(<span style={{ display: 'inline-flex', verticalAlign: '-2px' }}>{SCARICA}</span>)} nella barra dell&apos;indirizzo</>, <>Scegli {tasto('Installa app')} oppure {tasto('Aggiungi alla schermata Home')}</>, <>Conferma: l&apos;icona compare sul desktop e nel menu Start</>]

  // la nuvoletta si chiude cliccando fuori o con Esc
  const nuvola = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const fuori = (e: MouseEvent) => { if (nuvola.current && !nuvola.current.contains(e.target as Node)) onChiudi() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi() }
    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuori); document.removeEventListener('keydown', esc) }
  }, [onChiudi])

  const lista = (passi: React.ReactNode[]) => passi.map((p, i) => (
    <div key={i} className="flex items-center gap-2.5 py-2.5 text-[13px] text-gray-700" style={{ borderBottom: i === passi.length - 1 ? 'none' : '1px solid #F1F4F8' }}>
      <span className="flex items-center justify-center flex-shrink-0 text-[11px] font-bold" style={{ width: 24, height: 24, borderRadius: 999, background: '#EFF6FF', border: '1.5px solid #93C5FD', color: '#1D4ED8' }}>{i + 1}</span>
      <span>{p}</span>
    </div>
  ))

  return (
    <>
      {/* TELEFONO: il foglio dal basso */}
      <div className="sm:hidden fixed inset-0 z-[90] flex items-end justify-center" style={{ background: 'rgba(15,23,42,0.45)' }} onClick={onChiudi}>
        <div className="w-full bg-white" style={{ borderRadius: '20px 20px 0 0', padding: '18px 18px 22px', boxShadow: '0 -10px 30px rgba(15,27,51,0.18)' }} onClick={e => e.stopPropagation()}>
          <h3 className="text-[16px] font-bold tracking-[-0.3px] text-[#0F172A]">Aggiungi NoiDemoliamo alla home</h3>
          <p className="text-[12.5px] text-gray-500 mt-0.5">{iphone ? 'Su iPhone si fa in tre tocchi:' : 'Si fa in tre passi dal tuo browser:'}</p>
          <div className="mt-2">{lista(iphone ? passiIphone : passiTelefono)}</div>
          <button onClick={onChiudi} className="btn-pagina mt-3">Ho capito</button>
        </div>
      </div>

      {/* PC: la nuvoletta ancorata al bottone */}
      <div ref={nuvola} className="hidden sm:block absolute z-[60] text-left" style={{ top: 'calc(100% + 14px)', [lato === 'destra' ? 'right' : 'left']: 0, width: larghezza, maxWidth: 'calc(100vw - 32px)', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 18, padding: '16px 18px', boxShadow: '0 14px 40px rgba(15,27,51,0.16)' }}>
        <span aria-hidden="true" style={{ position: 'absolute', top: -9, [lato === 'destra' ? 'right' : 'left']: 46, width: 16, height: 16, background: '#fff', borderLeft: '1.5px solid #E5E7EB', borderTop: '1.5px solid #E5E7EB', transform: 'rotate(45deg)' }} />
        <button onClick={onChiudi} aria-label="Chiudi" className="absolute flex items-center justify-center hover:bg-gray-200 transition-colors" style={{ top: 12, right: 12, width: 26, height: 26, borderRadius: 999, background: '#F1F3F6', border: 'none', cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <h3 className="text-[15px] font-bold text-[#0F172A]" style={{ paddingRight: 30 }}>{iphone ? 'Aggiungi NoiDemoliamo alla home' : 'Aggiungi NoiDemoliamo al computer'}</h3>
        <p className="text-[12px] text-gray-500" style={{ margin: '2px 0 6px' }}>{iphone ? 'Su iPhone si fa in tre tocchi:' : 'Si fa in tre passi dal tuo browser:'}</p>
        {lista(iphone ? passiIphone : passiPc)}
        <div className="flex justify-end" style={{ marginTop: 10 }}>
          <button onClick={onChiudi} className="btn-pagina btn-pagina--auto" style={{ fontSize: 13.5, padding: '10px 26px', width: 'auto' }}>Ho capito</button>
        </div>
      </div>
    </>
  )
}

const SCARICA = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>

/** Il telefonino con l'icona di NoiDemoliamo già nella home (disegno puro,
 *  niente immagine): grande nella sezione della home, piccolo nella striscia
 *  dell'accesso. `larghezza` 150 = la misura della home. */
function Telefonino({ larghezza = 150 }: { larghezza?: number }) {
  const k = larghezza / 150
  const ico = Math.round(32 * k)
  return (
    <div className="flex-shrink-0" aria-hidden="true" style={{ width: larghezza, height: larghezza * 2, borderRadius: 26 * k, border: `${Math.max(2, 7 * k)}px solid #0F172A`, background: 'linear-gradient(160deg,#1e293b,#0f172a)', padding: `${26 * k}px ${12 * k}px`, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: `${10 * k}px ${8 * k}px`, alignContent: 'start' }}>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i}>
          {i === 2
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src="/icona-app.png" alt="" width={ico} height={ico} style={{ display: 'block', margin: '0 auto', borderRadius: 9 * k }} />
            : <span style={{ display: 'block', width: ico, height: ico, borderRadius: 9 * k, background: '#94A3B8', opacity: 0.45, margin: '0 auto' }} />}
          {k >= 0.8 && <span style={{ display: 'block', textAlign: 'center', fontSize: 7, color: '#E2E8F0', marginTop: 3 }}>{i === 2 ? 'NoiDemoliamo' : ['Messaggi', 'Foto', '', 'Mappe', 'Meteo', 'Note'][i]}</span>}
        </div>
      ))}
    </div>
  )
}

/** ⭐ 08/10 (mockup A "secondo giro", Davide): la STRISCIA nella pagina di
 *  accesso. Telefonino piccolo, "Hai già l'app?", il gancio dei certificati,
 *  e una pillola BIANCA col bordo celeste: nella pagina il blu resta solo di
 *  "Accedi". Sparisce dentro l'app installata. */
export function StrisciaInstalla({ className = '' }: { className?: string }) {
  const { stato, installa } = useInstallaApp()
  const [foglio, setFoglio] = useState(false)
  if (stato === 'installata') return null
  return (
    <>
      <div className={`flex items-center gap-3.5 ${className}`} style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(231,235,243,0.9)', borderRadius: 18, padding: '12px 14px' }}>
        <Telefonino larghezza={44} />
        {/* sul telefono la pillola scende sotto il testo (in riga lo strizzava) */}
        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3.5">
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>Hai già l&apos;app?</div>
            <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2, lineHeight: 1.45 }}>Quando il certificato è pronto lo scarichi direttamente da lì, e la pratica la segui con un tocco. Gratis, senza store.</div>
          </div>
          <span className="relative flex-shrink-0 self-start sm:self-auto">
            <button onClick={async () => { if (await installa() === 'foglio') setFoglio(true) }} className="inline-flex items-center gap-1.5 transition-colors hover:bg-blue-50 active:scale-[0.98]" style={{ background: foglio ? '#EFF6FF' : '#fff', color: '#2563eb', border: `1.5px solid ${foglio ? '#2563eb' : '#BFDBFE'}`, borderRadius: 999, padding: '9px 14px', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {SCARICA} Installa l&apos;app
            </button>
            {foglio && <FoglioInstalla stato={stato} onChiudi={() => setFoglio(false)} lato="destra" />}
          </span>
        </div>
      </div>
    </>
  )
}

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
        <Telefonino />

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
          <div className="relative inline-block" style={{ marginTop: 20 }}>
            <button onClick={async () => { if (await installa() === 'foglio') setFoglio(true) }} className="btn-pagina btn-pagina--auto" style={{ fontSize: 14, padding: '13px 26px' }}>
              {SCARICA} Installa l&apos;app
            </button>
            {foglio && <FoglioInstalla stato={stato} onChiudi={() => setFoglio(false)} lato="sinistra" />}
          </div>
        </div>
      </div>
    </section>
  )
}
