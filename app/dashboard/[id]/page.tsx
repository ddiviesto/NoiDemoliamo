'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { pillolaStato } from '@/lib/statiCliente'
import TabDocumenti from './TabDocumenti'
import TabRitiro from './TabRitiro'
import TabStato from './TabStato'
import TabChat from './TabChat'
import AiutoWhatsApp from '../../components/AiutoWhatsApp'

export interface Pratica {
  id: string
  user_id: string | null
  targa: string | null
  tipo_mezzo: string | null
  marca: string | null
  modello: string | null
  anno: number | null
  km: number | null
  incidentato: boolean | null
  marciante: boolean | null
  va_in_moto: boolean | null
  parti_mancanti: boolean | null
  note_veicolo: string | null
  indirizzo_ritiro: string | null
  comune_ritiro: string | null
  provincia_ritiro: string | null
  spazio_carro_attrezzi: string | null
  delegato_nome: string | null
  delegato_telefono: string | null
  casistica: string | null
  codice_fiscale: string | null
  nome_richiedente: string | null
  telefono: string | null
  ruolo_richiedente: string | null
  libretto: string | null
  certificato_proprieta: string | null
  eredita: string | null
  demolitore_id: string | null
  data_ritiro_prevista: string | null
  data_certificato_rottamazione: string | null
  data_certificato_pra: string | null
  riassegnata: boolean | null
  in_attesa: boolean | null
  stato: string
  creato_il: string
}

// ⭐ 28/07 (mockup approvato, idea di Davide): quarta linguetta "Ritiro"
// tra Documenti e Stato — la casa degli originali da consegnare e della
// data fissata dal demolitore
type Tab = 'documenti' | 'ritiro' | 'stato' | 'chat'

function chatDemolitoreVisibile(stato: string): boolean {
  const statiVisibili = [
    'assegnata',
    'in_attesa_conferma_cliente',
    'ritiro_confermato',
    'ritirata',
    'in_attesa_cert_rottamazione',
    'in_attesa_cert_radiazione_pra',
  ]
  return statiVisibili.includes(stato)
}

// ============================================================
// BANNER DINAMICO (stesso blu del banner di /inizia)
// ============================================================

// ⭐ 28/07 sera (mockup A): `tenue` = banner in ROSSO TENUE (rosa di famiglia,
// testo rosso scuro) — via il rosso pieno che urlava
function bannerInfo(p: Pratica): { icona: React.ReactNode; titolo: string; sottotitolo: string; bg: string; tenue?: boolean } {
  const ico = (path: React.ReactNode) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
  )
  // Pratica in pausa (decisa dall'admin): messaggio sereno, nessun dettaglio
  if (p.in_attesa && p.stato !== 'completata' && p.stato !== 'annullata') {
    return {
      icona: ico(<><circle cx="12" cy="12" r="9.5" /><polyline points="12 7 12 12 15.5 13.5" /></>),
      titolo: 'La tua pratica è momentaneamente in attesa',
      sottotitolo: 'Riprenderemo appena possibile: non devi fare nulla',
      bg: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    }
  }
  switch (p.stato) {
    case 'in_attesa_documenti':
      return {
        icona: ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></>),
        titolo: 'Carica i tuoi documenti',
        sottotitolo: "Procedi al caricamento dei documenti per l'assegnazione al demolitore",
        bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      }
    case 'in_attesa_approvazione_admin':
      return {
        icona: ico(<><circle cx="12" cy="12" r="9.5"/><polyline points="12 7 12 12 15.5 13.5"/></>),
        // ⭐ 29/07 (testo dettato da Davide): niente promesse di orario
        titolo: 'Documentazione ricevuta',
        sottotitolo: 'Stiamo verificando che i documenti siano idonei per la demolizione: ti faremo sapere a breve, non devi fare altro.',
        bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      }
    case 'documenti_parzialmente_approvati':
      return {
        icona: ico(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
        titolo: 'Alcuni documenti vanno rifatti',
        sottotitolo: 'Qui sotto vedi quali sono e cosa correggere',
        bg: '#FBE2E2',
        tenue: true,
      }
    case 'da_assegnare':
      // Se la pratica è stata riassegnata, il cliente non deve allarmarsi:
      // messaggio sereno "stiamo scegliendo un nuovo demolitore".
      if (p.riassegnata) {
        return {
          icona: ico(<><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></>),
          titolo: 'Stiamo scegliendo un nuovo demolitore',
          sottotitolo: 'Nessun problema per la tua pratica: ti aggiorniamo a breve, non devi fare nulla',
          bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
        }
      }
      return {
        icona: ico(<polyline points="20 6 9 17 4 12"/>),
        titolo: 'Documenti approvati, è tutto in ordine',
        sottotitolo: 'Stiamo assegnando un demolitore alla tua pratica. Tieni gli originali a portata di mano: ti serviranno il giorno del ritiro.',
        bg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      }
    case 'assegnata':
    case 'in_attesa_conferma_cliente':
      if (p.riassegnata) {
        return {
          icona: ico(<><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></>),
          titolo: 'Nuovo demolitore in arrivo',
          sottotitolo: 'Abbiamo aggiornato l\'assegnazione: un nuovo demolitore ti contatterà entro 8 ore lavorative per fissare il ritiro',
          bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
        }
      }
      return {
        icona: ico(<><path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" /></>),
        titolo: 'Il tuo demolitore è pronto',
        sottotitolo: 'Ti contatterà entro 8 ore lavorative per concordare giorno e ora del ritiro',
        bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      }
    case 'ritiro_confermato':
      return {
        icona: ico(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>),
        titolo: 'Ritiro confermato',
        sottotitolo: p.data_ritiro_prevista
          ? `Il demolitore arriverà il ${new Date(p.data_ritiro_prevista).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}`
          : 'Data ritiro confermata',
        bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      }
    case 'ritirata':
    case 'in_attesa_cert_rottamazione':
      return {
        icona: ico(<><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></>),
        titolo: 'Veicolo ritirato',
        sottotitolo: 'Stiamo preparando il certificato di rottamazione',
        bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      }
    case 'in_attesa_cert_radiazione_pra':
      return {
        icona: ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>),
        titolo: 'In attesa radiazione PRA',
        sottotitolo: 'Disponibile entro 15 giorni dal ritiro',
        bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      }
    case 'completata':
      return {
        icona: ico(<polyline points="20 6 9 17 4 12"/>),
        titolo: 'Pratica completata',
        sottotitolo: 'Scarica i certificati dal tab Documenti',
        bg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      }
    case 'annullata':
      return {
        icona: ico(<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>),
        titolo: 'Pratica annullata',
        sottotitolo: 'Questa pratica non è più attiva',
        bg: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
      }
    default:
      return {
        icona: ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>),
        titolo: 'La tua pratica',
        sottotitolo: 'Tutto sotto controllo',
        bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      }
  }
}

// ⭐ 28/07 (mockup approvato): la pillola dell'header è IDENTICA a quella
// della home — tabella unica in lib/statiCliente.ts, via i nomi propri
// ("Approvata", "Assegnata", "In lavorazione")

// ============================================================
// ICONE TAB
// ============================================================

function IconaDocumenti({ attivo }: { attivo: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={attivo ? '#fff' : '#8a98a8'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  )
}

function IconaRitiro({ attivo }: { attivo: boolean }) {
  // Blocco appunti: la lista degli originali da consegnare
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={attivo ? '#fff' : '#8a98a8'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/>
      <line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )
}

function IconaStato({ attivo }: { attivo: boolean }) {
  // Timeline a tappe: rappresenta l'avanzamento della pratica
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={attivo ? '#fff' : '#8a98a8'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.5" cy="5" r="2" />
      <line x1="11" y1="5" x2="20" y2="5" />
      <circle cx="5.5" cy="12" r="2" />
      <line x1="11" y1="12" x2="20" y2="12" />
      <circle cx="5.5" cy="19" r="2" />
      <line x1="11" y1="19" x2="16" y2="19" />
    </svg>
  )
}

function IconaChat({ attivo }: { attivo: boolean }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={attivo ? '#fff' : '#8a98a8'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2"/>
      <polyline points="3 7 12 13 21 7"/>
    </svg>
  )
}

export default function DettaglioPraticaCliente() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [pratica, setPratica] = useState<Pratica | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('documenti')
  const [docRifiutati, setDocRifiutati] = useState(0)
  const [chatNonLetti, setChatNonLetti] = useState(0)
  // ⭐ Pallino sulla linguetta Ritiro (28/07 sera, variante A): FISSO per
  // tutta la vita della pratica — si spegne solo quando il demolitore
  // registra il ritiro effettivo (o la pratica è annullata). Così il
  // cliente prima o poi ci clicca di sicuro.
  const [ritiroNuovo, setRitiroNuovo] = useState(false)

  const handleDocRifiutatiCambiati = useCallback((numero: number) => {
    setDocRifiutati(prev => prev === numero ? prev : numero)
  }, [])

  // Quando il cliente invia/elimina documenti lo stato pratica può cambiare
  // (ricalcolato dal server): ricarico la pratica così banner e badge si aggiornano.
  const ricaricaPratica = useCallback(async () => {
    const { data } = await supabase.from('pratiche').select('*').eq('id', id).single()
    if (data) setPratica(data)
  }, [id])

  // ⭐ 29/07 (mockup approvato): INVITO ALLE FOTO sotto il banner — solo in
  // "Documenti in verifica", solo con ZERO foto, e mai sulla tab Documenti
  // (lì parla il banner foto che esiste già: un solo invito per volta)
  const [numFoto, setNumFoto] = useState<number | null>(null)
  const [apriFoto, setApriFoto] = useState(false)
  const contaFoto = useCallback(async () => {
    const { count } = await supabase.from('foto_pratiche').select('id', { count: 'exact', head: true }).eq('pratica_id', id)
    setNumFoto(count ?? 0)
  }, [id])
  useEffect(() => { if (id) contaFoto() }, [id, contaFoto])

  // Il pallino resta acceso finché il veicolo non è stato RITIRATO davvero
  // (via anche ad annullata): aprire la tab non lo spegne più.
  useEffect(() => {
    if (!pratica) { setRitiroNuovo(false); return }
    const dopoRitiro = ['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione', 'in_attesa_cert_radiazione_pra', 'completata', 'annullata'].includes(pratica.stato)
    setRitiroNuovo(!dopoRitiro)
  }, [pratica])

  function apriTabRitiro() {
    setTab('ritiro')
  }

  // Aggiornamento automatico (22/07): stato/banner e contatore chat si
  // aggiornano da soli quando l'admin o il demolitore cambiano qualcosa
  // (il ricaricamento della pratica fa ripartire anche il conteggio non letti)
  useAggiornaLive({
    canale: `cliente-pratica-${id}`,
    tabelle: [
      { tabella: 'pratiche', filtro: `id=eq.${id}` },
      { tabella: 'messaggi_chat', filtro: `pratica_id=eq.${id}` },
      // ⭐ 29/07: anche le foto — l'invito foto sparisce da solo al primo scatto
      { tabella: 'foto_pratiche', filtro: `pratica_id=eq.${id}` },
    ],
    onCambio: () => { ricaricaPratica(); contaFoto() },
    attivo: !!id,
  })

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('pratiche')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()
      if (error || !data) { router.push('/dashboard'); return }
      setPratica(data)
      setLoading(false)
    }
    if (id) carica()
  }, [id, router])

  useEffect(() => {
    async function contaNonLetti() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !pratica) return
      // ⭐ 26/07: il canale demolitore↔NoiDemoliamo non riguarda il cliente
      // e non deve gonfiare il suo contatore
      const { count } = await supabase
        .from('messaggi_chat')
        .select('id', { count: 'exact', head: true })
        .eq('pratica_id', pratica.id)
        .eq('letto', false)
        .neq('mittente_id', session.user.id)
        .or('conversazione.is.null,conversazione.neq.demolitore_noidemoliamo')
      setChatNonLetti(count || 0)
    }
    if (pratica) contaNonLetti()
  }, [pratica, tab])

  if (loading) {
    return (
      // ⭐ 28/07 sera: caricamento BIANCO sul telefono (via il lampo viola al
      // refresh), lavanda solo da sm in su — come la home
      <main className="min-h-screen flex items-center justify-center bg-white sm:bg-[linear-gradient(135deg,#e0e7ff_0%,#ddd6fe_100%)]">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }
  if (!pratica) return null

  const banner = bannerInfo(pratica)
  const badge = pillolaStato(pratica.stato, pratica.in_attesa)

  return (
    // ⭐ 28/07 (mockup approvato, proposta 2): sul TELEFONO l'app è a TUTTO
    // SCHERMO (bianco fino ai bordi, header blu in cima); su PC card centrata
    <main className="min-h-screen flex justify-center sm:p-4 sm:pt-6 bg-white sm:bg-[linear-gradient(135deg,#e0e7ff_0%,#ddd6fe_100%)]">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl sm:shadow-lg overflow-hidden relative min-h-screen sm:min-h-0" style={{ alignSelf: 'flex-start' }}>

        {/* HEADER BLU (stile banner /inizia) */}
        <div className="px-4 py-3 flex items-center gap-3 text-white sticky top-0 z-30" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          {/* ⭐ 29/07 (stessa quadra di /inizia): TONDO traslucido con la sola
              freccia sottile al posto della pillastrella "← Pratiche" */}
          <button
            onClick={() => router.push('/dashboard')}
            aria-label="Torna alle pratiche"
            className="flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/30 active:scale-95"
            style={{ width: 38, height: 38, borderRadius: 999, background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">La tua pratica</div>
            <div className="text-sm font-semibold leading-tight truncate">
              {[pratica.marca, pratica.modello].filter(Boolean).join(' ') || 'Veicolo'}
              {pratica.targa ? ` · ${pratica.targa}` : ''}
            </div>
          </div>
          <span className="flex-shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ background: badge.bg, color: badge.text }}>
            {badge.label}
          </span>
        </div>

        <div className="p-4 flex flex-col gap-3">

          {/* BANNER STATO DINAMICO — ⭐ 28/07 sera: la versione `tenue` è
              rosa di famiglia con testo rosso scuro (via il rosso pieno) */}
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${banner.tenue ? '' : 'text-white shadow-md'}`} style={{ background: banner.bg, border: banner.tenue ? '1.5px solid #F3C8C8' : undefined, color: banner.tenue ? '#7C2D2D' : undefined }}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${banner.tenue ? '' : 'bg-white/20'}`} style={banner.tenue ? { background: '#F3C8C8', color: '#A94444' } : undefined}>{banner.icona}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-tight">{banner.titolo}</div>
              <div className="text-xs opacity-90 mt-1 leading-snug">{banner.sottotitolo}</div>
            </div>
          </div>

          {/* ⭐ 29/07 (mockup approvato): INVITO ALLE FOTO — solo in
              "Documenti in verifica", zero foto, e MAI sulla tab Documenti
              (lì c'è già il suo banner: un solo invito per volta) */}
          {pratica.stato === 'in_attesa_approvazione_admin' && numFoto === 0 && tab !== 'documenti' && (
            <button
              onClick={() => { setApriFoto(true); setTab('documenti') }}
              className="active:scale-[0.99]"
              style={{ width: '100%', background: '#F0F7FF', border: '1.5px solid #CFE3F8', borderRadius: 14, padding: 13, display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer', textAlign: 'left', transition: 'transform 0.1s' }}
            >
              <span style={{ width: 38, height: 38, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 13.5, color: '#0C447C' }}>Intanto puoi caricare le foto del veicolo</span>
                <span style={{ display: 'block', fontSize: 11.5, color: '#1E4E8C', marginTop: 2, lineHeight: 1.45 }}>Ci aiutano a mandare il carro attrezzi giusto: falle quando vuoi, direttamente davanti al veicolo.</span>
              </span>
              <span style={{ textAlign: 'center', flexShrink: 0, alignSelf: 'center' }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 3px 9px rgba(37,99,235,0.25)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                </span>
                <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#2563eb', marginTop: 3 }}>Aggiungi</span>
              </span>
            </button>
          )}

          {/* TAB BAR a pillole */}
          <div className="rounded-2xl p-1 flex gap-1" style={{ background: '#EFF3F9' }}>
            <TabButton attivo={tab === 'documenti'} onClick={() => setTab('documenti')} Icona={IconaDocumenti} label="Documenti" badge={docRifiutati > 0 ? docRifiutati : 0} />
            <TabButton attivo={tab === 'ritiro'} onClick={apriTabRitiro} Icona={IconaRitiro} label="Ritiro" puntino={ritiroNuovo} />
            <TabButton attivo={tab === 'stato'} onClick={() => setTab('stato')} Icona={IconaStato} label="Stato" />
            <TabButton attivo={tab === 'chat'} onClick={() => setTab('chat')} Icona={IconaChat} label="Chat" badge={chatNonLetti} />
          </div>

          {/* CONTENUTO TAB */}
          {tab === 'documenti' && (
            <TabDocumenti pratica={pratica} onDocRifiutatiCambiati={handleDocRifiutatiCambiati} onStatoCambiato={ricaricaPratica} apriFoto={apriFoto} onFotoAperta={() => setApriFoto(false)} />
          )}
          {tab === 'ritiro' && <TabRitiro pratica={pratica} />}
          {tab === 'stato' && <TabStato pratica={pratica} />}
          {tab === 'chat' && (
            <TabChat
              pratica={pratica}
              chatDemolitoreVisibile={chatDemolitoreVisibile(pratica.stato)}
              praticaCompletata={pratica.stato === 'completata'}
              onMessaggiLetti={() => setChatNonLetti(0)}
            />
          )}

        </div>
      </div>

      {/* ⭐ 29/07 (mockup approvato): sulla tab CHAT niente bottone WhatsApp
          — lì si parla già con NoiDemoliamo, e copriva il tasto d'invio */}
      {tab !== 'chat' && <AiutoWhatsApp />}
    </main>
  )
}

function TabButton(props: {
  attivo: boolean
  onClick: () => void
  Icona: React.ComponentType<{ attivo: boolean }>
  label: string
  badge?: number
  // Pallino spia senza numero (es. "data del ritiro fissata, non ancora vista")
  puntino?: boolean
}) {
  const { Icona } = props
  const mostraBadge = (props.badge ?? 0) > 0
  return (
    <button
      onClick={props.onClick}
      className="flex-1 rounded-xl py-2.5 px-2 flex flex-col items-center gap-1 transition-all relative min-h-[58px]"
      style={props.attivo
        ? { background: '#2563eb', color: '#fff' }
        : { background: 'transparent', color: '#5F6C7E' }}
    >
      {/* Il contatore sta ATTACCATO all'icona (non sperso nell'angolo del
          riquadro), col bordino del colore dello sfondo per staccare bene */}
      <span className="relative">
        <Icona attivo={props.attivo} />
        {mostraBadge && (
          <span
            className="absolute min-w-[18px] h-[18px] text-[10px] font-bold px-1 rounded-full leading-none flex items-center justify-center bg-red-500 text-white"
            style={{ top: -7, right: -13, border: `2px solid ${props.attivo ? '#2563eb' : '#EFF3F9'}` }}
          >
            {props.badge}
          </span>
        )}
        {!mostraBadge && props.puntino && (
          <span
            className="absolute w-[12px] h-[12px] rounded-full bg-red-500"
            style={{ top: -4, right: -8, border: `2px solid ${props.attivo ? '#2563eb' : '#EFF3F9'}` }}
          />
        )}
      </span>
      <span className="text-xs font-medium">{props.label}</span>
    </button>
  )
}