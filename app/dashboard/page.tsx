'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { pillolaStato } from '@/lib/statiCliente'
import IconaVeicolo from '../components/IconaVeicolo'
import AiutoWhatsApp from '../components/AiutoWhatsApp'
import PannelloImpostazioni from './PannelloImpostazioni'
import CardValutazione, { RichiestaValutazione } from './CardValutazione'
import Marchio from '../components/Marchio'

// ⭐ 05/10 (mockup A "righe larghe" approvato): su PC ogni pratica dice
// anche LA COSA DA FARE ADESSO, in base allo stato
function cosaFare(stato: string, inAttesa: boolean | null): { testo: string; link?: boolean } {
  if (inAttesa && stato !== 'completata' && stato !== 'annullata') return { testo: 'Pratica in pausa: ti abbiamo scritto il perché' }
  switch (stato) {
    case 'in_attesa_documenti': return { testo: 'Carica i documenti', link: true }
    case 'documenti_parzialmente_approvati': return { testo: 'Rifai i documenti segnalati', link: true }
    case 'in_attesa_approvazione_admin': return { testo: 'Stiamo verificando i tuoi documenti' }
    case 'da_assegnare': case 'in_attesa_assegnazione': case 'in_assegnazione_manuale': return { testo: 'Documenti ok: stiamo scegliendo il demolitore' }
    case 'assegnata': case 'in_attesa_conferma_cliente': return { testo: 'Il demolitore ti fissa il ritiro a breve' }
    case 'ritiro_confermato': return { testo: 'Guarda giorno e ora del ritiro', link: true }
    case 'ritirata': case 'in_attesa_recensione_cliente': case 'in_attesa_cert_rottamazione': return { testo: 'Ritirata: aspettiamo il certificato di rottamazione' }
    case 'in_attesa_cert_radiazione_pra': return { testo: 'Aspettiamo la radiazione al PRA' }
    case 'completata': return { testo: 'Scarica i certificati', link: true }
    case 'annullata': return { testo: 'Pratica annullata' }
    default: return { testo: 'Apri la pratica', link: true }
  }
}

const CAMPI_VALUTAZIONE = 'id, stato, targa, tipo_mezzo, marca, modello, anno, offerta_tipo, offerta_importo, offerta_messaggio, offerta_inviata_il, risposta_cliente, risposta_il, creato_il'

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
  // ⭐ 03/10: le richieste di valutazione (flusso D) stanno in cima alle
  // pratiche; quelle chiuse o già diventate pratica non si mostrano
  const [valutazioni, setValutazioni] = useState<RichiestaValutazione[]>([])
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

      const { data: val } = await supabase
        .from('veicoli_vendita')
        .select(CAMPI_VALUTAZIONE)
        .eq('user_id', session.user.id)
        .in('stato', ['da_valutare', 'risposta_inviata', 'rifiutata'])
        .order('creato_il', { ascending: false })
      if (val) setValutazioni(val)
      setLoading(false)
    }
    carica()
  }, [router])

  const ricaricaValutazioni = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: val } = await supabase
      .from('veicoli_vendita')
      .select(CAMPI_VALUTAZIONE)
      .eq('user_id', session.user.id)
      .in('stato', ['da_valutare', 'risposta_inviata', 'rifiutata'])
      .order('creato_il', { ascending: false })
    if (val) setValutazioni(val)
  }

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
    tabelle: [{ tabella: 'pratiche' }, { tabella: 'veicoli_vendita' }],
    onCambio: () => { ricaricaPratiche(); ricaricaValutazioni() },
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
    // ⭐ 05/10 (mockup A approvato): su PC l'area entra nel mondo del sito
    // come i flussi (fondo lilla con gli aloni, isola galleggiante, titolo
    // grande, niente scatola bianca); la classe flusso-scena fa lo sfondo
    <main className="flusso-scena min-h-screen flex justify-center sm:p-7 sm:pt-8 bg-white">
      <div className="w-full sm:max-w-[1000px] bg-white sm:bg-transparent overflow-hidden sm:overflow-visible min-h-screen sm:min-h-0" style={{ alignSelf: 'flex-start' }}>

        {/* ISOLA GALLEGGIANTE — solo PC: marchio, saluto, ingranaggio, Esci */}
        <div
          className="hidden sm:flex items-center justify-between gap-4 mb-8"
          style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 10px 30px rgba(15,27,51,0.10)', borderRadius: 999, padding: '8px 8px 8px 20px' }}
        >
          <Marchio misura={20} />
          <span className="flex items-center gap-2.5">
            <span style={{ fontSize: 13, fontWeight: 600, color: '#3E4C63' }}>{nomeUtente ? `Ciao, ${nomeUtente}` : 'La tua area personale'}</span>
            <button
              onClick={() => setImpostazioniAperte(true)}
              aria-label="Impostazioni"
              className="flex items-center justify-center transition-all hover:bg-blue-50"
              style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', border: '1px solid #E2E8F5', color: '#1D4ED8', cursor: 'pointer' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            </button>
            <button onClick={logout} className="transition-colors hover:bg-blue-100" style={{ fontSize: 12.5, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 999, padding: '8px 14px', cursor: 'pointer' }}>Esci</button>
          </span>
        </div>

        {/* HEADER BLU (stile banner /inizia) — solo telefono */}
        <div className="sm:hidden px-4 py-3 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          {/* Logo vero (variante A su mockup 22/07): lo stesso di /inizia e login */}
          
          <div className="flex-1 min-w-0">
            <div className="marchio marchio--chiaro marchio--occhiello text-[10px]">NoiDemoliamo</div>
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

        <div className="p-4 sm:p-0 flex flex-col gap-3 sm:gap-3.5">

          {/* TITOLO: piccolo sul telefono, grande con la parola in sfumatura su PC */}
          <div className="sm:mb-3">
            <h1 className="font-bold text-gray-900 sm:hidden" style={{ fontSize: 15 }}>Le tue pratiche</h1>
            <h1 className="flusso-titolo hidden sm:block text-[36px] font-extrabold text-[#0F172A] tracking-[-1.2px] leading-tight">Le tue <span className="parola" style={{ color: '#1D4ED8' }}>pratiche</span></h1>
            <p className="text-gray-500 mt-0.5 sm:mt-2 sm:text-[15px] sm:text-gray-700" style={{ fontSize: 13 }}>
              {(() => {
                const proposte = valutazioni.filter(v => v.stato === 'risposta_inviata' && !v.risposta_cliente).length
                const daCompletare = valutazioni.filter(v => v.stato === 'risposta_inviata' && v.risposta_cliente === 'accettata').length
                if (proposte) return `${proposte} ${proposte === 1 ? 'proposta da leggere' : 'proposte da leggere'}`
                if (daCompletare) return `${daCompletare} ${daCompletare === 1 ? 'pratica da completare' : 'pratiche da completare'}`
                const inVal = valutazioni.filter(v => v.stato === 'da_valutare').length
                const parti = []
                if (inVal) parti.push(`${inVal} ${inVal === 1 ? 'richiesta' : 'richieste'}`)
                parti.push(`${pratiche.length} ${pratiche.length === 1 ? 'pratica attiva' : 'pratiche'}`)
                return parti.join(', ')
              })()}
            </p>
          </div>

          {/* LE RICHIESTE DI VALUTAZIONE (⭐ 03/10): in cima, le rifiutate
              vanno in fondo alla lista */}
          {valutazioni.filter(v => v.stato !== 'rifiutata').map(v => (
            <CardValutazione key={v.id} r={v} onCambiata={ricaricaValutazioni} />
          ))}

          {/* LISTA PRATICHE */}
          {pratiche.length === 0 && valutazioni.length === 0 ? (
            <div style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <IconaScatolaVuota />
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Nessuna pratica</h2>
              <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 18px' }}>Inizia ora la tua prima richiesta di demolizione gratuita.</p>
              <button
                onClick={() => router.push('/inizia')}
                className="btn-pagina btn-pagina--auto"
                style={{ fontSize: 14, padding: '12px 26px', margin: '0 auto' }}
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
                    {/* Barretta blu di stato sul fianco sinistro (verde se completata) */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: p.stato === 'completata' ? '#1F7A43' : '#2563eb' }} />

                    {/* ⭐ 05/10 (mockup A): su PC la card è UNA RIGA LARGA con
                        quattro zone: targa e mezzo · dove e quando · stato e
                        cosa fare adesso · freccia */}
                    {(() => {
                      const fai = cosaFare(p.stato, p.in_attesa)
                      return (
                        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 16, padding: '16px 18px 16px 22px' }}>
                          <div style={{ width: 50, height: 50, borderRadius: 14, background: p.stato === 'completata' ? '#DCF3E4' : '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <IconaVeicolo tipo={p.tipo_mezzo} colore={p.stato === 'completata' ? '#1F7A43' : undefined} />
                          </div>
                          <div style={{ flex: 1.4, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '0.03em', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.targa || 'Targa mancante'}</div>
                            <div style={{ fontSize: 13.5, color: '#6B7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {[[p.marca, p.modello].filter(Boolean).join(' '), p.tipo_mezzo ? p.tipo_mezzo.charAt(0).toUpperCase() + p.tipo_mezzo.slice(1) : ''].filter(Boolean).join(' · ') || '—'}
                            </div>
                          </div>
                          <div style={{ flex: 1.3, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 16 }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#8A94A3' }}>Dove si trova</div>
                            <div style={{ fontSize: 13.5, color: '#374151', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.indirizzo_ritiro || '—'}</div>
                            <div style={{ fontSize: 12.5, color: '#6B7280', marginTop: 2 }}>Richiesta del {new Date(p.creato_il).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                          </div>
                          <div style={{ flex: 1.2, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 16 }}>
                            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>{s.label}</span>
                            <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 5, color: fai.link ? '#1D4ED8' : '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fai.testo}{fai.link ? ' →' : ''}</div>
                          </div>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
                        </div>
                      )
                    })()}

                    <div className="flex sm:hidden" style={{ alignItems: 'center', gap: 11, padding: '14px 13px 14px 16px' }}>
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
                      <div className="flex sm:hidden" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#F8FAFC', borderTop: '1px solid #F1F3F6', padding: '7px 13px 7px 16px' }}>
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

              {valutazioni.filter(v => v.stato === 'rifiutata').map(v => (
                <CardValutazione key={v.id} r={v} onCambiata={ricaricaValutazioni} />
              ))}

              {/* Nuova richiesta: card in fila con le pratiche (variante B su
                  mockup 22/07 — via il riquadro tratteggiato col +) */}
              <button
                onClick={() => router.push('/inizia')}
                className="w-full text-left hover:!border-[#BFDBFE] active:scale-[0.995] sm:hidden"
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

              {/* ⭐ 05/10 (Davide): su PC niente card tratteggiata a tutta larghezza, un BOTTONE a pillola centrato */}
              <div className="hidden sm:flex justify-center" style={{ marginTop: 10 }}>
                <button onClick={() => router.push('/inizia')} className="btn-pagina btn-pagina--auto" style={{ fontSize: 14, padding: '12px 26px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Aggiungi un altro veicolo
                </button>
              </div>
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