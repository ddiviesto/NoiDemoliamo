'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============================================================
// PANNELLO IMPOSTAZIONI CLIENTE — variante A (restyling 22/07):
// scheda "I TUOI DATI" con valori in LETTURA e Modifica/Cambia
// per riga (stessa regola dell'admin); i campi si aprono solo
// col tasto, Salva e Annulla sono bottoncini compatti affiancati.
// ============================================================

// ⭐ 29/07 (mockup approvato dal giro iPhone): campo di modifica a PILLOLA
// nella veste "a fuoco" fissa — bordo blu + alone azzurro (il campo esiste
// solo mentre si modifica, quindi è sempre "attivo").
// ⚠️ Su schermi piccoli (iPhone) il testo resta 16px: sotto quella soglia
// iOS zooma tutta la pagina al focus. Da sm in su (PC) scende a 13.5px.
const INPUT_CLS = 'w-full bg-white border-[1.5px] border-blue-600 rounded-full px-4 py-2.5 text-base sm:text-[13.5px] font-medium text-gray-900 outline-none shadow-[0_0_0_3px_rgba(37,99,235,0.12)] placeholder:text-gray-400 placeholder:font-normal'

type Sezione = 'nome' | 'telefono' | 'email' | 'password' | null

export default function PannelloImpostazioni({ aperto, onChiudi, nome, cognome, telefono, email, onProfiloAggiornato, onEsci, onAggiorna }: {
  aperto: boolean
  onChiudi: () => void
  nome: string
  cognome: string
  telefono: string
  email: string
  onProfiloAggiornato: (patch: { nome?: string; cognome?: string; telefono?: string }) => void
  onEsci: () => void
  onAggiorna?: () => Promise<void>
}) {
  const router = useRouter()
  const [sezione, setSezione] = useState<Sezione>(null)
  const [busy, setBusy] = useState(false)
  const [esito, setEsito] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  // Il banner verde di conferma sparisce da solo dopo qualche secondo
  // (gli ERRORI invece restano finché non si corregge o si chiude).
  // I messaggi lunghi (es. conferma cambio email) hanno più tempo per essere letti.
  useEffect(() => {
    if (!esito || esito.tipo !== 'ok') return
    const durata = esito.testo.length > 60 ? 8000 : 3500
    const t = setTimeout(() => setEsito(null), durata)
    return () => clearTimeout(t)
  }, [esito])

  // Pannello aperto = la pagina dietro resta FERMA. Su Safari iPhone
  // overflow:hidden non basta: si congela il body con position:fixed
  // alla posizione attuale e la si ripristina alla chiusura (niente salti).
  useEffect(() => {
    if (!aperto) return
    const scrollY = window.scrollY
    const body = document.body
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    return () => {
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [aperto])

  // ⭐ TIRA GIÙ PER AGGIORNARE (mockup 28/07, rotellina B "coda che sfuma"):
  // col pannello aperto, tirare giù NON deve più far ricaricare Safari.
  // Il gesto lo gestiamo noi: la lista scende, la rotellina gira, i dati
  // del profilo si ricaricano e tutto risale da solo.
  const scorriRef = useRef<HTMLDivElement>(null)
  const [tiro, setTiro] = useState(0)              // di quanto è tirata giù la lista
  const [aggiornando, setAggiornando] = useState(false)
  const [trascinando, setTrascinando] = useState(false)
  const tiroRef = useRef(0)
  const partenzaYRef = useRef(0)
  const attivoRef = useRef(false)
  const apertoRef = useRef(aperto)
  apertoRef.current = aperto
  const aggiornandoRef = useRef(false)
  const onAggiornaRef = useRef(onAggiorna)
  onAggiornaRef.current = onAggiorna

  useEffect(() => {
    const el = scorriRef.current
    if (!el) return
    const SOGLIA = 44 // px di tiro oltre i quali, al rilascio, parte l'aggiornamento

    const posaTiro = (v: number) => { tiroRef.current = v; setTiro(v) }

    const inizio = (e: TouchEvent) => {
      if (!apertoRef.current || aggiornandoRef.current || el.scrollTop > 0) return
      partenzaYRef.current = e.touches[0].clientY
      attivoRef.current = true
    }
    const movimento = (e: TouchEvent) => {
      if (!attivoRef.current || aggiornandoRef.current) return
      const delta = e.touches[0].clientY - partenzaYRef.current
      if (delta <= 0 || el.scrollTop > 0) {
        if (tiroRef.current !== 0) { posaTiro(0); setTrascinando(false) }
        if (delta < -8) attivoRef.current = false // sta scorrendo la lista, non tirando
        return
      }
      // Qui il dito sta tirando giù dalla cima: il gesto è NOSTRO
      // (preventDefault spegne anche l'aggiornamento nativo di Safari)
      e.preventDefault()
      setTrascinando(true)
      posaTiro(Math.min(72, delta / 2.2)) // resistenza tipo elastico
    }
    const fine = () => {
      if (!attivoRef.current) return
      attivoRef.current = false
      setTrascinando(false)
      if (tiroRef.current >= SOGLIA) {
        aggiornandoRef.current = true
        setAggiornando(true)
        posaTiro(SOGLIA)
        // La rotellina resta in vista almeno il tempo di farsi vedere
        Promise.all([onAggiornaRef.current?.(), new Promise(r => setTimeout(r, 700))])
          .finally(() => {
            aggiornandoRef.current = false
            setAggiornando(false)
            posaTiro(0)
          })
      } else {
        posaTiro(0)
      }
    }

    el.addEventListener('touchstart', inizio, { passive: true })
    el.addEventListener('touchmove', movimento, { passive: false })
    el.addEventListener('touchend', fine)
    el.addEventListener('touchcancel', fine)
    return () => {
      el.removeEventListener('touchstart', inizio)
      el.removeEventListener('touchmove', movimento)
      el.removeEventListener('touchend', fine)
      el.removeEventListener('touchcancel', fine)
    }
  }, [])

  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovoTelefono, setNuovoTelefono] = useState('')
  const [nuovaEmail, setNuovaEmail] = useState('')
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [ripetiPassword, setRipetiPassword] = useState('')

  function apriSezione(s: Sezione) {
    setEsito(null)
    // Campo UNICO "Nome e cognome" (26/07): come alla registrazione
    if (s === 'nome') setNuovoNome([nome, cognome].filter(Boolean).join(' '))
    if (s === 'telefono') setNuovoTelefono(telefono)
    if (s === 'email') setNuovaEmail('')
    if (s === 'password') { setNuovaPassword(''); setRipetiPassword('') }
    setSezione(prev => (prev === s ? null : s))
  }

  // Le pagine legali si aprono NELLA STESSA scheda: "indietro" riporta
  // qui e il pannello si riapre da solo (flag letto dalla dashboard)
  function apriPagina(percorso: string) {
    sessionStorage.setItem('nd_riapri_impostazioni', '1')
    router.push(percorso)
  }

  // Profilo (nome/cognome/telefono): passa dal server (/api/profilo)
  async function salvaProfilo(dati: { nome?: string; cognome?: string; telefono?: string }, messaggioOk: string) {
    setBusy(true)
    setEsito(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessione scaduta')
      const res = await fetch('/api/profilo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(dati),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'Errore')
      onProfiloAggiornato(dati)
      setEsito({ tipo: 'ok', testo: messaggioOk })
      setSezione(null)
    } catch {
      setEsito({ tipo: 'errore', testo: 'Errore nel salvataggio. Riprova.' })
    }
    setBusy(false)
  }

  async function salvaNome() {
    // Tutto nel campo `nome` (il cognome separato si svuota): stessa
    // convenzione della registrazione, un campo solo
    const n = nuovoNome.trim()
    if (!n) { setEsito({ tipo: 'errore', testo: 'Scrivi il tuo nome e cognome.' }); return }
    await salvaProfilo({ nome: n, cognome: '' }, 'Nome aggiornato.')
  }

  async function salvaTelefono() {
    const t = nuovoTelefono.trim()
    if (t.replace(/\D/g, '').length < 6) { setEsito({ tipo: 'errore', testo: 'Scrivi un numero di telefono valido.' }); return }
    await salvaProfilo({ telefono: t }, 'Telefono aggiornato: vale anche per le pratiche in corso.')
  }

  async function cambiaEmail() {
    const e = nuovaEmail.trim().toLowerCase()
    if (!e || !e.includes('@') || !e.includes('.')) { setEsito({ tipo: 'errore', testo: 'Scrivi un indirizzo email valido.' }); return }
    if (e === email.toLowerCase()) { setEsito({ tipo: 'errore', testo: 'È già la tua email attuale.' }); return }
    setBusy(true)
    setEsito(null)
    // Supabase manda il link di conferma: il login cambia SOLO dopo il click.
    // Se l'email è già usata da un altro account viene rifiutata (niente doppioni).
    const { error } = await supabase.auth.updateUser({ email: e })
    if (error) {
      const msg = /already|exists|registered/i.test(error.message)
        ? 'Questa email è già usata da un altro account.'
        : 'Errore nel cambio email. Riprova tra qualche minuto.'
      setEsito({ tipo: 'errore', testo: msg })
    } else {
      setEsito({ tipo: 'ok', testo: `Ti abbiamo inviato un'email di conferma a ${e}. Il cambio avviene dopo che confermi dal link (controlla anche la vecchia casella).` })
      setNuovaEmail('')
      setSezione(null)
    }
    setBusy(false)
  }

  async function cambiaPassword() {
    if (nuovaPassword.length < 6) { setEsito({ tipo: 'errore', testo: 'La password deve avere almeno 6 caratteri.' }); return }
    if (nuovaPassword !== ripetiPassword) { setEsito({ tipo: 'errore', testo: 'Le due password non coincidono.' }); return }
    setBusy(true)
    setEsito(null)
    const { error } = await supabase.auth.updateUser({ password: nuovaPassword })
    if (error) {
      setEsito({ tipo: 'errore', testo: 'Errore nel cambio password. Riprova.' })
    } else {
      setEsito({ tipo: 'ok', testo: 'Password aggiornata.' })
      setNuovaPassword('')
      setRipetiPassword('')
      setSezione(null)
    }
    setBusy(false)
  }

  // ---- Pezzi di interfaccia ----
  // NOTA: sono FUNZIONI chiamate direttamente (non componenti <Cosi/>):
  // definirli come componenti dentro al componente li farebbe rimontare a
  // ogni render e i campi perderebbero il focus a ogni tasto digitato.

  // ⭐ 28/07 (mockup approvato): come le righe del CRM — etichetta scura
  // in evidenza, valore grigio leggero (prima era il contrario)
  function etichetta(testo: string) {
    return <div style={{ fontSize: 12, fontWeight: 600, color: '#1E293B' }}>{testo}</div>
  }

  // ⭐ 29/07 (mockup approvato dal giro iPhone): in LETTURA la riga resta
  // com'era (etichetta, valore, link a destra); in MODIFICA diventa una
  // COLONNA ordinata — etichetta → campo a pillola largo → spiegazione →
  // Annulla/Salva a pillola in basso a destra (prima era tutto schiacciato)
  function riga(opts: {
    label: string
    valore: string
    azione: string
    inEdit: boolean
    onApri: () => void
    onSalva: () => void
    testoSalva?: string
    hint?: string
    campi?: React.ReactNode
    campiExtra?: React.ReactNode
    ultima?: boolean
  }) {
    return (
      <div className="px-4 py-3" style={{ borderBottom: opts.ultima ? 'none' : '1px solid #F1F4F8' }}>
        {!opts.inEdit ? (
          <div className="flex items-center gap-2.5">
            <div style={{ flex: 1, minWidth: 0 }}>
              {etichetta(opts.label)}
              <div style={{ marginTop: 2, fontSize: 12.5, color: '#6B7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opts.valore}</div>
            </div>
            {/* ⭐ 28/07 (mockup approvato): l'azione è un link blu sottolineato */}
            <button onClick={opts.onApri} className="flex-shrink-0 transition-colors hover:text-blue-800" style={{ background: 'none', border: 'none', color: '#1D4ED8', fontSize: 11.5, fontWeight: 600, textDecoration: 'underline', padding: '5px 2px', cursor: 'pointer' }}>
              {opts.azione}
            </button>
          </div>
        ) : (
          <div>
            {etichetta(opts.label)}
            <div style={{ marginTop: 8 }}>{opts.campi}</div>
            {opts.campiExtra && <div style={{ marginTop: 8 }}>{opts.campiExtra}</div>}
            {opts.hint && <div style={{ fontSize: 11, color: '#9AA7B5', marginTop: 7, lineHeight: 1.45 }}>{opts.hint}</div>}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => setSezione(null)} disabled={busy} className="transition-colors hover:bg-gray-50 disabled:opacity-50" style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 13px', cursor: 'pointer' }}>
                Annulla
              </button>
              <button onClick={opts.onSalva} disabled={busy} className="transition-all hover:brightness-105 disabled:opacity-50" style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', border: 'none', color: '#fff', fontSize: 11.5, fontWeight: 700, borderRadius: 999, padding: '6px 15px', cursor: 'pointer', boxShadow: '0 3px 9px rgba(37,99,235,0.3)' }}>
                {busy ? 'Salvo…' : (opts.testoSalva || 'Salva')}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  function Tile({ bg, children }: { bg: string; children: React.ReactNode }) {
    return <span style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{children}</span>
  }

  function Voce({ onClick, tile, label, freccia = true, colore = '#111827' }: { onClick: () => void; tile: React.ReactNode; label: string; freccia?: boolean; colore?: string }) {
    return (
      <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50" style={{ borderBottom: '1px solid #F1F4F8' }}>
        {tile}
        <span className="text-[13.5px] font-semibold flex-1" style={{ color: colore }}>{label}</span>
        {freccia && <span style={{ color: '#9CA3AF', fontSize: 15 }}>›</span>}
      </button>
    )
  }

  return (
    <div className={`fixed inset-0 z-50 ${aperto ? '' : 'pointer-events-none'}`} aria-hidden={!aperto}>
      {/* Sfondo scuro: chiude toccando fuori */}
      <div
        onClick={onChiudi}
        className="absolute inset-0 transition-opacity duration-200"
        style={{ background: 'rgba(15,23,42,0.45)', opacity: aperto ? 1 : 0, touchAction: 'none' }}
      />
      {/* Pannello che scivola da destra. ⭐ Sul TELEFONO (mockup 28/07,
          variante A + larghezza B): carta al 70% dello schermo, staccata
          dai bordi e con gli angoli smussati — la parte scura per chiudere
          è comoda. Su PC resta la colonna da 340px attaccata al bordo. */}
      <div
        className="absolute bg-white flex flex-col transition-transform duration-200 ease-out overflow-hidden right-2.5 top-3.5 bottom-3.5 w-[70vw] rounded-[20px] sm:right-0 sm:top-0 sm:bottom-0 sm:w-[340px] sm:rounded-r-none sm:rounded-l-2xl"
        style={{ boxShadow: '-8px 0 30px rgba(15,23,42,0.25)', transform: aperto ? 'translateX(0)' : 'translateX(calc(100% + 24px))' }}
      >
        {/* Testata */}
        <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #F1F4F8' }}>
          <span className="text-[14.5px] font-bold text-gray-900">Impostazioni</span>
          <button onClick={onChiudi} aria-label="Chiudi" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* overscroll-contain: quando la lista arriva in cima o in fondo il
            gesto NON passa alla pagina dietro (niente refresh di Safari) */}
        <div ref={scorriRef} className="flex-1 overflow-y-auto overscroll-contain">
          <div style={{ position: 'relative', transform: `translateY(${tiro}px)`, transition: trascinando ? 'none' : 'transform 0.25s ease' }}>
            {/* Rotellina "coda che sfuma" (mockup B): compare nel vuoto del tiro */}
            <div style={{ position: 'absolute', top: -40, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{
                width: 27, height: 27, borderRadius: '50%',
                background: 'conic-gradient(from 0deg, rgba(29,78,216,0) 0% 12%, #1d4ed8 88% 100%)',
                WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3.4px), #000 calc(100% - 3px))',
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 3.4px), #000 calc(100% - 3px))',
                opacity: aggiornando ? 1 : Math.min(1, tiro / 44),
                transform: aggiornando ? undefined : `rotate(${tiro * 4.5}deg)`,
                animation: aggiornando ? 'nd-gira 0.9s linear infinite' : 'none',
              }} />
            </div>

          {/* Esito operazioni */}
          {esito && (
            <div className="mx-4 mt-3 rounded-xl px-3 py-2.5 text-[12px]" style={esito.tipo === 'ok'
              ? { background: '#DCF3E4', color: '#1F7A43', border: '1px solid #C8E6D5' }
              : { background: '#FBE2E2', color: '#9B1C1C', border: '1px solid #F3C8C8' }}>
              {esito.testo}
            </div>
          )}

          {/* ====== I TUOI DATI: lettura pulita, modifica col tasto ====== */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#9AA7B5', padding: '14px 16px 7px' }}>I TUOI DATI</div>

          {riga({
            label: 'Nome e cognome',
            valore: [nome, cognome].filter(Boolean).join(' ') || '—',
            azione: 'Modifica',
            inEdit: sezione === 'nome',
            onApri: () => apriSezione('nome'),
            onSalva: salvaNome,
            campi: <input className={INPUT_CLS} value={nuovoNome} onChange={e => setNuovoNome(e.target.value)} placeholder="Nome e cognome" />,
          })}

          {riga({
            label: 'Telefono per il ritiro',
            valore: telefono || '—',
            azione: 'Modifica',
            inEdit: sezione === 'telefono',
            onApri: () => apriSezione('telefono'),
            onSalva: salvaTelefono,
            hint: 'Lo userà il demolitore per fissare il ritiro · vale anche per le pratiche in corso',
            campi: <input className={INPUT_CLS} type="tel" inputMode="tel" value={nuovoTelefono} onChange={e => setNuovoTelefono(e.target.value)} placeholder="Numero di telefono" />,
          })}

          {riga({
            label: 'Email di accesso',
            valore: email || '—',
            azione: 'Cambia',
            inEdit: sezione === 'email',
            onApri: () => apriSezione('email'),
            onSalva: cambiaEmail,
            testoSalva: 'Invia',
            hint: "Ti mandiamo un link di conferma alla nuova email: l'accesso cambia solo dopo il click",
            campi: <input className={INPUT_CLS} type="email" inputMode="email" autoCapitalize="none" value={nuovaEmail} onChange={e => setNuovaEmail(e.target.value)} placeholder="Nuova email" />,
          })}

          {riga({
            label: 'Password',
            valore: '••••••••',
            azione: 'Cambia',
            inEdit: sezione === 'password',
            onApri: () => apriSezione('password'),
            onSalva: cambiaPassword,
            testoSalva: 'Aggiorna',
            campi: <input className={INPUT_CLS} type="password" value={nuovaPassword} onChange={e => setNuovaPassword(e.target.value)} placeholder="Nuova password (min. 6 caratteri)" />,
            campiExtra: <input className={INPUT_CLS} type="password" value={ripetiPassword} onChange={e => setRipetiPassword(e.target.value)} placeholder="Ripeti la nuova password" />,
          })}

          {/* ====== ALTRO ====== */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#9AA7B5', padding: '14px 16px 7px' }}>ALTRO</div>

          <a href="https://wa.me/393518280493" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50" style={{ borderBottom: '1px solid #F1F4F8' }}>
            <Tile bg="#DCF3E4"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg></Tile>
            <span className="text-[13.5px] font-semibold flex-1 text-gray-900">Assistenza WhatsApp</span>
            <span style={{ color: '#9CA3AF', fontSize: 15 }}>›</span>
          </a>

          {/* Legali: STESSA scheda, così "indietro" riporta qui */}
          {/* ⭐ 28/07 (mockup approvato): tile dei legali in azzurro, via il grigio */}
          <Voce
            onClick={() => apriPagina('/privacy')}
            tile={<Tile bg="#EFF6FF"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></Tile>}
            label="Privacy"
          />
          <Voce
            onClick={() => apriPagina('/termini')}
            tile={<Tile bg="#EFF6FF"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg></Tile>}
            label="Termini di servizio"
          />
          </div>
        </div>

        {/* Esci: in fondo, separato */}
        <div style={{ borderTop: '1px solid #F1F4F8' }}>
          {/* ⭐ 28/07 (mockup approvato): Esci col rosso tenue delle pillole */}
          <Voce
            onClick={onEsci}
            tile={<Tile bg="#F3D9D9"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A94444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg></Tile>}
            label="Esci dall'account"
            freccia={false}
            colore="#A94444"
          />
        </div>
      </div>
    </div>
  )
}
