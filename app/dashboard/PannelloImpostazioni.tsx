'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============================================================
// PANNELLO IMPOSTAZIONI CLIENTE — variante A (restyling 22/07):
// scheda "I TUOI DATI" con valori in LETTURA e Modifica/Cambia
// per riga (stessa regola dell'admin); i campi si aprono solo
// col tasto, Salva e Annulla sono bottoncini compatti affiancati.
// ============================================================

// Campo per la modifica sul posto (variante B, mockup 26/07): niente
// cornice, solo un FILO BLU sotto il testo (azzurrino, blu pieno a fuoco).
// Altezza fissa 26px = identica alla riga in lettura, così non c'è sobbalzo.
// ⚠️ Su schermi piccoli (iPhone) il testo resta 16px: sotto quella soglia
// iOS zooma tutta la pagina al focus. Da sm in su (PC) scende a 13.5px.
const INPUT_CLS = 'w-full h-[26px] bg-transparent border-0 border-b-2 border-blue-300 rounded-none px-0.5 text-base sm:text-[13.5px] font-medium text-gray-900 outline-none focus:border-blue-600 transition-colors placeholder:text-gray-400 placeholder:font-normal'

type Sezione = 'nome' | 'telefono' | 'email' | 'password' | null

export default function PannelloImpostazioni({ aperto, onChiudi, nome, cognome, telefono, email, onProfiloAggiornato, onEsci }: {
  aperto: boolean
  onChiudi: () => void
  nome: string
  cognome: string
  telefono: string
  email: string
  onProfiloAggiornato: (patch: { nome?: string; cognome?: string; telefono?: string }) => void
  onEsci: () => void
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

  function etichetta(testo: string) {
    return <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, color: '#8B95A5', textTransform: 'uppercase' }}>{testo}</div>
  }

  // Riga dato con MODIFICA SUL POSTO (variante B, mockup 26/07): NESSUN
  // sobbalzo. La zona valore/campo ha ALTEZZA FISSA (26px) e i due stati
  // si scambiano in dissolvenza; i bottoni hanno larghezza RISERVATA
  // (Annulla · Salva appare al posto di Modifica senza spostare nulla);
  // suggerimento ed eventuali campi extra si aprono morbidi (grid 0fr→1fr).
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
    const fade = (visibile: boolean): React.CSSProperties => ({
      opacity: visibile ? 1 : 0,
      pointerEvents: visibile ? 'auto' : 'none',
      transition: 'opacity .18s ease',
    })
    return (
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: opts.ultima ? 'none' : '1px solid #F1F4F8' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {etichetta(opts.label)}
          {/* Zona valore/campo ad altezza fissa: lettura e modifica sovrapposte */}
          <div style={{ position: 'relative', height: 26, marginTop: 2 }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', fontSize: 13.5, fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...fade(!opts.inEdit) }}>
              {opts.valore}
            </div>
            <div style={{ position: 'absolute', inset: 0, ...fade(opts.inEdit) }}>
              {opts.campi}
            </div>
          </div>
          {(opts.hint || opts.campiExtra) && (
            <div style={{ display: 'grid', gridTemplateRows: opts.inEdit ? '1fr' : '0fr', transition: 'grid-template-rows .22s ease' }}>
              <div style={{ overflow: 'hidden' }}>
                {opts.campiExtra && <div style={{ paddingTop: 6 }}>{opts.campiExtra}</div>}
                {opts.hint && <div style={{ fontSize: 10, color: '#9AA7B5', paddingTop: 4, lineHeight: 1.4 }}>{opts.hint}</div>}
              </div>
            </div>
          )}
        </div>
        {/* Bottoni a larghezza riservata: i due gruppi si scambiano in dissolvenza */}
        <div className="flex-shrink-0" style={{ position: 'relative', width: 124, height: 26, alignSelf: 'flex-start', marginTop: 16 }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', ...fade(!opts.inEdit) }}>
            <button onClick={opts.onApri} tabIndex={opts.inEdit ? -1 : 0} className="flex items-center gap-1 transition-colors hover:bg-blue-100" style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '5px 10px' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
              {opts.azione}
            </button>
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', ...fade(opts.inEdit) }}>
            <button onClick={() => setSezione(null)} disabled={busy} tabIndex={opts.inEdit ? 0 : -1} className="transition-colors hover:bg-gray-50 disabled:opacity-50" style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '5px 9px' }}>
              Annulla
            </button>
            <button onClick={opts.onSalva} disabled={busy} tabIndex={opts.inEdit ? 0 : -1} className="transition-colors hover:bg-blue-700 disabled:opacity-50" style={{ background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '5px 10px' }}>
              {busy ? 'Salvo…' : (opts.testoSalva || 'Salva')}
            </button>
          </div>
        </div>
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
        style={{ background: 'rgba(15,23,42,0.45)', opacity: aperto ? 1 : 0 }}
      />
      {/* Pannello che scivola da destra */}
      <div
        className="absolute top-0 right-0 bottom-0 bg-white flex flex-col transition-transform duration-200 ease-out"
        style={{ width: 'min(340px, 88vw)', borderRadius: '16px 0 0 16px', boxShadow: '-8px 0 30px rgba(15,23,42,0.25)', transform: aperto ? 'translateX(0)' : 'translateX(105%)' }}
      >
        {/* Testata */}
        <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #F1F4F8' }}>
          <span className="text-[14.5px] font-bold text-gray-900">Impostazioni</span>
          <button onClick={onChiudi} aria-label="Chiudi" className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Esito operazioni */}
          {esito && (
            <div className="mx-4 mt-3 rounded-xl px-3 py-2.5 text-[12px]" style={esito.tipo === 'ok'
              ? { background: '#DCF3E4', color: '#1F7A43', border: '1px solid #C8E6D5' }
              : { background: '#FBE2E2', color: '#9B1C1C', border: '1px solid #F3C8C8' }}>
              {esito.testo}
            </div>
          )}

          {/* ====== I TUOI DATI: lettura pulita, modifica col tasto ====== */}
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color: '#9AA7B5', padding: '14px 16px 7px' }}>I TUOI DATI</div>

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
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color: '#9AA7B5', padding: '14px 16px 7px' }}>ALTRO</div>

          <a href="https://wa.me/393518280493" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50" style={{ borderBottom: '1px solid #F1F4F8' }}>
            <Tile bg="#DCF3E4"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg></Tile>
            <span className="text-[13.5px] font-semibold flex-1 text-gray-900">Assistenza WhatsApp</span>
            <span style={{ color: '#9CA3AF', fontSize: 15 }}>›</span>
          </a>

          {/* Legali: STESSA scheda, così "indietro" riporta qui */}
          <Voce
            onClick={() => apriPagina('/privacy')}
            tile={<Tile bg="#EEF1F5"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></Tile>}
            label="Privacy"
          />
          <Voce
            onClick={() => apriPagina('/termini')}
            tile={<Tile bg="#EEF1F5"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg></Tile>}
            label="Termini di servizio"
          />
        </div>

        {/* Esci: in fondo, separato */}
        <div style={{ borderTop: '1px solid #F1F4F8' }}>
          <Voce
            onClick={onEsci}
            tile={<Tile bg="#FBDADA"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg></Tile>}
            label="Esci dall'account"
            freccia={false}
            colore="#C0392B"
          />
        </div>
      </div>
    </div>
  )
}
