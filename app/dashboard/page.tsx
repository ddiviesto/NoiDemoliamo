'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { pillolaStato } from '@/lib/statiCliente'
import IconaVeicolo from '../components/IconaVeicolo'
import AiutoWhatsApp from '../components/AiutoWhatsApp'
import PannelloImpostazioni from './PannelloImpostazioni'

interface Pratica {
  id: string
  targa: string | null
  tipo_mezzo: string | null
  marca: string | null
  modello: string | null
  indirizzo_ritiro: string | null
  stato: string
  creato_il: string
  in_attesa: boolean | null
}

// ⭐ 28/07 (mockup approvato): le pillole di stato vivono in UNA tabella
// sola condivisa con l'header della pagina pratica — lib/statiCliente.ts

// ============================================================
// ICONE SVG
// ============================================================

// ⭐ 28/07: le icone dei mezzi sono quelle ORIGINALI di /inizia, in un
// componente condiviso (app/components/IconaVeicolo.tsx) — via la copia
// ridotta che stava qui

function IconaPinPiccola() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a98a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}

function IconaScatolaVuota() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#9aa7b5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}

// ============================================================

export default function DashboardCliente() {
  const router = useRouter()
  const [pratiche, setPratiche] = useState<Pratica[]>([])
  const [loading, setLoading] = useState(true)
  const [nomeUtente, setNomeUtente] = useState<string>('')
  // Pannello impostazioni (ingranaggio nell'header)
  const [impostazioniAperte, setImpostazioniAperte] = useState(false)
  const [profilo, setProfilo] = useState<{ nome: string; cognome: string; telefono: string; email: string }>({ nome: '', cognome: '', telefono: '', email: '' })

  // Tornando da Privacy/Termini il pannello si riapre da solo
  useEffect(() => {
    if (sessionStorage.getItem('nd_riapri_impostazioni')) {
      sessionStorage.removeItem('nd_riapri_impostazioni')
      setImpostazioniAperte(true)
    }
  }, [])

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Recupera dati utente
      const { data: utente } = await supabase
        .from('utenti')
        .select('nome, cognome, telefono, email')
        .eq('id', session.user.id)
        .single()
      if (utente?.nome) setNomeUtente(utente.nome.split(' ')[0])
      const emailLogin = session.user.email || ''
      setProfilo({ nome: utente?.nome || '', cognome: utente?.cognome || '', telefono: utente?.telefono || '', email: emailLogin || utente?.email || '' })
      // Se il cliente ha cambiato email (confermata dal link), la tabella
      // utenti si riallinea da sola al login successivo
      if (emailLogin && utente && utente.email !== emailLogin) {
        await supabase.from('utenti').update({ email: emailLogin }).eq('id', session.user.id)
      }

      // Recupera pratiche dell'utente
      const { data, error } = await supabase
        .from('pratiche')
        .select('id, targa, tipo_mezzo, marca, modello, indirizzo_ritiro, stato, creato_il, in_attesa')
        .eq('user_id', session.user.id)
        .order('creato_il', { ascending: false })

      if (!error && data) setPratiche(data)
      setLoading(false)
    }
    carica()
  }, [router])

  // Aggiornamento automatico (22/07): gli stati delle pratiche in lista si
  // aggiornano da soli (il tempo reale manda solo le righe visibili all'utente)
  const ricaricaPratiche = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data, error } = await supabase
      .from('pratiche')
      .select('id, targa, tipo_mezzo, marca, modello, indirizzo_ritiro, stato, creato_il, in_attesa')
      .eq('user_id', session.user.id)
      .order('creato_il', { ascending: false })
    if (!error && data) setPratiche(data)
  }
  useAggiornaLive({
    canale: 'cliente-lista-pratiche',
    tabelle: [{ tabella: 'pratiche' }],
    onCambio: ricaricaPratiche,
  })

  // ⭐ Tira giù sul pannello Impostazioni: ricarica il profilo dal server
  // (rotellina B, mockup 28/07)
  const ricaricaProfilo = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: utente } = await supabase
      .from('utenti')
      .select('nome, cognome, telefono, email')
      .eq('id', session.user.id)
      .single()
    const emailLogin = session.user.email || ''
    if (utente?.nome) setNomeUtente(utente.nome.split(' ')[0])
    setProfilo({ nome: utente?.nome || '', cognome: utente?.cognome || '', telefono: utente?.telefono || '', email: emailLogin || utente?.email || '' })
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      // ⭐ 28/07 sera: sul TELEFONO la schermata di caricamento è BIANCA come
      // le pagine — il lampo viola al refresh era questo sfondo lavanda che
      // appariva per un attimo. Su PC resta lavanda (lì la cornice è quella).
      <main className="min-h-screen flex items-center justify-center bg-white sm:bg-[linear-gradient(135deg,#e0e7ff_0%,#ddd6fe_100%)]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    // ⭐ 28/07 (mockup approvato, proposta 2): sul TELEFONO l'app è a TUTTO
    // SCHERMO (bianco fino ai bordi, header blu in cima, via la cornice
    // lavanda); su PC resta la card centrata di sempre
    <main className="min-h-screen flex justify-center sm:p-4 sm:pt-6 bg-white sm:bg-[linear-gradient(135deg,#e0e7ff_0%,#ddd6fe_100%)]">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl sm:shadow-lg overflow-hidden min-h-screen sm:min-h-0" style={{ alignSelf: 'flex-start' }}>

        {/* HEADER BLU (stile banner /inizia) */}
        <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          {/* Logo vero (variante A su mockup 22/07): lo stesso di /inizia e login */}
          <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={38} height={38} className="rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">NoiDemoliamo</div>
            <div className="text-sm font-semibold leading-tight truncate">
              {nomeUtente ? `Ciao, ${nomeUtente}!` : 'La tua area personale'}
            </div>
          </div>
          {/* Ingranaggio: apre il pannello impostazioni (Esci ora vive lì) */}
          <button
            onClick={() => setImpostazioniAperte(true)}
            aria-label="Impostazioni"
            className="bg-white/85 hover:bg-white text-blue-700 rounded-lg p-2 flex-shrink-0 shadow-sm transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">

          {/* TITOLO */}
          <div>
            <h1 className="font-bold text-gray-900" style={{ fontSize: 15 }}>Le tue pratiche</h1>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: 13 }}>{pratiche.length} {pratiche.length === 1 ? 'pratica attiva' : 'pratiche'}</p>
          </div>

          {/* LISTA PRATICHE */}
          {pratiche.length === 0 ? (
            <div style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <IconaScatolaVuota />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Nessuna pratica</h2>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 18px' }}>Inizia ora la tua prima richiesta di demolizione gratuita.</p>
              <button
                onClick={() => router.push('/inizia')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                Richiedi demolizione
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {pratiche.map(p => {
                // Pillola dalla tabella unica (gestisce anche la pausa "In attesa")
                const s = pillolaStato(p.stato, p.in_attesa)
                return (
                  // ⭐ 28/07 sera (mockup approvato, mix B+C taglia 2): card con
                  // OMBRA morbida, targa 16.5 e icona più grande, BARRETTA BLU
                  // di stato sul fianco (elemento interno: il bordo celeste del
                  // passaggio non la tocca), scritte secondarie più leggibili
                  <button
                    key={p.id}
                    onClick={() => router.push(`/dashboard/${p.id}`)}
                    style={{ position: 'relative', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: 0, textAlign: 'left', transition: 'border-color 0.15s', overflow: 'hidden', boxShadow: '0 1px 2px rgba(16,24,40,0.06), 0 5px 14px rgba(16,24,40,0.07)' }}
                    className="hover:!border-[#BFDBFE] active:scale-[0.995]"
                  >
                    {/* Barretta blu di stato sul fianco sinistro */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#2563eb' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 13px 14px 16px' }}>
                      {/* Quadratino con icona veicolo */}
                      <div style={{ width: 46, height: 46, borderRadius: 13, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <IconaVeicolo tipo={p.tipo_mezzo} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 16.5, letterSpacing: '0.03em', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.targa || 'Targa mancante'}
                        </div>
                        {p.tipo_mezzo && (
                          <div style={{ fontSize: 13.5, color: '#6B7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.tipo_mezzo.charAt(0).toUpperCase() + p.tipo_mezzo.slice(1)}
                          </div>
                        )}
                        {(p.marca || p.modello) && (
                          <div style={{ fontSize: 13.5, color: '#6B7280', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[p.marca, p.modello].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </div>

                      <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>

                    {(p.indirizzo_ritiro || p.creato_il) && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#F8FAFC', borderTop: '1px solid #F1F3F6', padding: '7px 13px 7px 16px' }}>
                        {p.indirizzo_ritiro ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#6B7280', minWidth: 0 }}>
                            <IconaPinPiccola />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.indirizzo_ritiro}</span>
                          </span>
                        ) : <span />}
                        <span style={{ fontSize: 12.5, color: '#9AA7B5', flexShrink: 0 }}>
                          {new Date(p.creato_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}

              {/* Nuova richiesta: card in fila con le pratiche (variante B su
                  mockup 22/07 — via il riquadro tratteggiato col +) */}
              <button
                onClick={() => router.push('/inizia')}
                className="w-full text-left hover:!border-[#BFDBFE] active:scale-[0.995]"
                style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '12px 13px', transition: 'border-color 0.15s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  {/* ⭐ 28/07 (mockup approvato): quadratino blu pieno col + */}
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 3px 9px rgba(37,99,235,0.25)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>Aggiungi un altro veicolo</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>Sempre gratis, come la prima</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </button>
            </div>
          )}

        </div>
      </div>

      <AiutoWhatsApp />

      <PannelloImpostazioni
        aperto={impostazioniAperte}
        onChiudi={() => setImpostazioniAperte(false)}
        nome={profilo.nome}
        cognome={profilo.cognome}
        telefono={profilo.telefono}
        email={profilo.email}
        onProfiloAggiornato={patch => {
          setProfilo(p => ({ ...p, ...patch }))
          if (patch.nome) setNomeUtente(patch.nome.split(' ')[0])
        }}
        onEsci={logout}
        onAggiorna={ricaricaProfilo}
      />
    </main>
  )
}