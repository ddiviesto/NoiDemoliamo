'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ============================================================
// PANNELLO IMPOSTAZIONI CLIENTE (variante A su mockup, 22/07)
// Si apre dall'ingranaggio nell'header e scivola da destra.
// Dentro: nome+email, modifica nome/cognome, cambia email (con
// conferma via link Supabase, niente doppioni: email già usate
// vengono rifiutate), cambia password, assistenza, legali, esci.
// ============================================================

const INPUT_CLS = 'w-full border-[1.5px] border-gray-200 rounded-xl px-3 py-2.5 text-base text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400'

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

  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovoCognome, setNuovoCognome] = useState('')
  const [nuovoTelefono, setNuovoTelefono] = useState('')
  const [nuovaEmail, setNuovaEmail] = useState('')
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [ripetiPassword, setRipetiPassword] = useState('')

  function apriSezione(s: Sezione) {
    setEsito(null)
    if (s === 'nome') { setNuovoNome(nome); setNuovoCognome(cognome) }
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
    const n = nuovoNome.trim()
    if (!n) { setEsito({ tipo: 'errore', testo: 'Scrivi almeno il nome.' }); return }
    await salvaProfilo({ nome: n, cognome: nuovoCognome.trim() }, 'Nome aggiornato.')
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

  function Tile({ bg, children }: { bg: string; children: React.ReactNode }) {
    return <span style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{children}</span>
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
          {/* Chi sei */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #F1F4F8' }}>
            <div className="text-[13.5px] font-bold text-gray-900">{[nome, cognome].filter(Boolean).join(' ') || 'Il tuo account'}</div>
            <div className="text-[12px] text-gray-500 mt-0.5 truncate">{email}</div>
          </div>

          {/* Esito operazioni */}
          {esito && (
            <div className="mx-4 mt-3 rounded-xl px-3 py-2.5 text-[12px]" style={esito.tipo === 'ok'
              ? { background: '#DCF3E4', color: '#1F7A43', border: '1px solid #C8E6D5' }
              : { background: '#FBE2E2', color: '#9B1C1C', border: '1px solid #F3C8C8' }}>
              {esito.testo}
            </div>
          )}

          {/* Nome e cognome */}
          <Voce
            onClick={() => apriSezione('nome')}
            tile={<Tile bg="#DBEAFE"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></Tile>}
            label="Nome e cognome"
          />
          {sezione === 'nome' && (
            <div className="px-4 py-3 flex flex-col gap-2" style={{ background: '#F9FAFB', borderBottom: '1px solid #F1F4F8' }}>
              <input className={INPUT_CLS} value={nuovoNome} onChange={e => setNuovoNome(e.target.value)} placeholder="Nome" />
              <input className={INPUT_CLS} value={nuovoCognome} onChange={e => setNuovoCognome(e.target.value)} placeholder="Cognome" />
              <button onClick={salvaNome} disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {busy ? 'Salvo…' : 'Salva'}
              </button>
              <p className="text-[11px] text-gray-500 leading-snug">Aggiorna il tuo profilo. Il nome sulle pratiche già aperte resta quello dichiarato al momento della richiesta.</p>
            </div>
          )}

          {/* Telefono per il ritiro */}
          <Voce
            onClick={() => apriSezione('telefono')}
            tile={<Tile bg="#DBEAFE"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg></Tile>}
            label="Telefono per il ritiro"
          />
          {sezione === 'telefono' && (
            <div className="px-4 py-3 flex flex-col gap-2" style={{ background: '#F9FAFB', borderBottom: '1px solid #F1F4F8' }}>
              <input className={INPUT_CLS} type="tel" inputMode="tel" value={nuovoTelefono} onChange={e => setNuovoTelefono(e.target.value)} placeholder="Numero di telefono" />
              <button onClick={salvaTelefono} disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {busy ? 'Salvo…' : 'Salva'}
              </button>
              <p className="text-[11px] text-gray-500 leading-snug">È il numero che il <b>demolitore userà per fissare data e ora del ritiro</b>: si aggiorna anche sulle tue pratiche in corso.</p>
            </div>
          )}

          {/* Cambia email */}
          <Voce
            onClick={() => apriSezione('email')}
            tile={<Tile bg="#DBEAFE"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg></Tile>}
            label="Cambia email"
          />
          {sezione === 'email' && (
            <div className="px-4 py-3 flex flex-col gap-2" style={{ background: '#F9FAFB', borderBottom: '1px solid #F1F4F8' }}>
              <input className={INPUT_CLS} type="email" inputMode="email" autoCapitalize="none" value={nuovaEmail} onChange={e => setNuovaEmail(e.target.value)} placeholder="Nuova email" />
              <button onClick={cambiaEmail} disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {busy ? 'Invio…' : 'Invia email di conferma'}
              </button>
              <p className="text-[11px] text-gray-500 leading-snug">Ti mandiamo un link di conferma alla nuova email: l&apos;accesso cambia solo dopo il click. Continuerai a entrare con quella attuale finché non confermi.</p>
            </div>
          )}

          {/* Cambia password */}
          <Voce
            onClick={() => apriSezione('password')}
            tile={<Tile bg="#DBEAFE"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></Tile>}
            label="Cambia password"
          />
          {sezione === 'password' && (
            <div className="px-4 py-3 flex flex-col gap-2" style={{ background: '#F9FAFB', borderBottom: '1px solid #F1F4F8' }}>
              <input className={INPUT_CLS} type="password" value={nuovaPassword} onChange={e => setNuovaPassword(e.target.value)} placeholder="Nuova password (min. 6 caratteri)" />
              <input className={INPUT_CLS} type="password" value={ripetiPassword} onChange={e => setRipetiPassword(e.target.value)} placeholder="Ripeti la nuova password" />
              <button onClick={cambiaPassword} disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {busy ? 'Salvo…' : 'Aggiorna password'}
              </button>
            </div>
          )}

          {/* Assistenza WhatsApp */}
          <a href="https://wa.me/393518280493" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50" style={{ borderBottom: '1px solid #F1F4F8' }}>
            <Tile bg="#DCF3E4"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg></Tile>
            <span className="text-[13.5px] font-semibold flex-1 text-gray-900">Assistenza WhatsApp</span>
            <span style={{ color: '#9CA3AF', fontSize: 15 }}>›</span>
          </a>

          {/* Legali: STESSA scheda, così "indietro" riporta qui (le pagine
              sono le stesse linkate da /inizia: si modificano in un posto solo) */}
          <Voce
            onClick={() => apriPagina('/privacy')}
            tile={<Tile bg="#EEF1F5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></Tile>}
            label="Privacy"
          />
          <Voce
            onClick={() => apriPagina('/termini')}
            tile={<Tile bg="#EEF1F5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg></Tile>}
            label="Termini di servizio"
          />
        </div>

        {/* Esci: in fondo, separato */}
        <div style={{ borderTop: '1px solid #F1F4F8' }}>
          <Voce
            onClick={onEsci}
            tile={<Tile bg="#FBDADA"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg></Tile>}
            label="Esci dall'account"
            freccia={false}
            colore="#C0392B"
          />
        </div>
      </div>
    </div>
  )
}
