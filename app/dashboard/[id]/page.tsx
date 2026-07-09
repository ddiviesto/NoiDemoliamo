'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TabDocumenti from './TabDocumenti'
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
  stato: string
  creato_il: string
}

type Tab = 'documenti' | 'stato' | 'chat'

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

function bannerInfo(p: Pratica): { icona: React.ReactNode; titolo: string; sottotitolo: string; bg: string } {
  const ico = (path: React.ReactNode) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
  )
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
        titolo: 'Stiamo verificando i tuoi documenti',
        sottotitolo: 'Ti avviseremo entro 3 ore — non serve fare nulla',
        bg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
      }
    case 'documenti_parzialmente_approvati':
      return {
        icona: ico(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
        titolo: 'Alcuni documenti vanno rifatti',
        sottotitolo: 'Controlla il tab Documenti per i dettagli',
        bg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
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
        titolo: 'Documenti approvati',
        sottotitolo: 'Stiamo assegnando un demolitore alla tua pratica',
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
        bg: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
      }
    case 'ritirata':
    case 'in_attesa_cert_rottamazione':
      return {
        icona: ico(<><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></>),
        titolo: 'Veicolo ritirato',
        sottotitolo: 'Stiamo preparando il certificato di rottamazione',
        bg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      }
    case 'in_attesa_cert_radiazione_pra':
      return {
        icona: ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>),
        titolo: 'In attesa radiazione PRA',
        sottotitolo: 'Disponibile entro 15 giorni dal ritiro',
        bg: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
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

// Badge di stato nell'header blu (pillola chiara)
function statoBadge(stato: string): { label: string; bg: string; text: string } {
  switch (stato) {
    case 'in_attesa_documenti': return { label: 'In attesa documenti', bg: '#FAEEDA', text: '#854F0B' }
    case 'in_attesa_approvazione_admin': return { label: 'In verifica', bg: '#E0EDFB', text: '#1E4E8C' }
    case 'documenti_parzialmente_approvati': return { label: 'Documenti da rifare', bg: '#FBE2E2', text: '#9B1C1C' }
    case 'da_assegnare': return { label: 'Approvata', bg: '#DCF3E4', text: '#1F7A43' }
    case 'assegnata':
    case 'in_attesa_conferma_cliente':
    case 'ritiro_confermato': return { label: 'Assegnata', bg: '#E0EDFB', text: '#1E4E8C' }
    case 'ritirata':
    case 'in_attesa_cert_rottamazione':
    case 'in_attesa_cert_radiazione_pra': return { label: 'In lavorazione', bg: '#EDE4FB', text: '#6B21A8' }
    case 'completata': return { label: 'Completata', bg: '#DCF3E4', text: '#1F7A43' }
    case 'annullata': return { label: 'Annullata', bg: '#E7EAEE', text: '#4B5563' }
    default: return { label: stato, bg: '#E7EAEE', text: '#4B5563' }
  }
}

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

  const handleDocRifiutatiCambiati = useCallback((numero: number) => {
    setDocRifiutati(prev => prev === numero ? prev : numero)
  }, [])

  // Quando il cliente invia/elimina documenti lo stato pratica può cambiare
  // (ricalcolato dal server): ricarico la pratica così banner e badge si aggiornano.
  const ricaricaPratica = useCallback(async () => {
    const { data } = await supabase.from('pratiche').select('*').eq('id', id).single()
    if (data) setPratica(data)
  }, [id])

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
      const { count } = await supabase
        .from('messaggi_chat')
        .select('id', { count: 'exact', head: true })
        .eq('pratica_id', pratica.id)
        .eq('letto', false)
        .neq('mittente_id', session.user.id)
      setChatNonLetti(count || 0)
    }
    if (pratica) contaNonLetti()
  }, [pratica, tab])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }
  if (!pratica) return null

  const banner = bannerInfo(pratica)
  const badge = statoBadge(pratica.stato)

  return (
    <main className="min-h-screen flex justify-center p-4 pt-6" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg overflow-hidden relative" style={{ alignSelf: 'flex-start' }}>

        {/* HEADER BLU (stile banner /inizia) */}
        <div className="px-4 py-3 flex items-center gap-3 text-white sticky top-0 z-30" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-white/85 hover:bg-white text-blue-700 rounded-lg px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 flex-shrink-0 shadow-sm transition-all"
          >
            ← Pratiche
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

          {/* BANNER STATO DINAMICO */}
          <div className="text-white rounded-2xl p-4 flex items-center gap-3 shadow-md" style={{ background: banner.bg }}>
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">{banner.icona}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-tight">{banner.titolo}</div>
              <div className="text-xs opacity-90 mt-1 leading-snug">{banner.sottotitolo}</div>
            </div>
          </div>

          {/* TAB BAR a pillole */}
          <div className="rounded-2xl p-1 flex gap-1" style={{ background: '#EFF3F9' }}>
            <TabButton attivo={tab === 'documenti'} onClick={() => setTab('documenti')} Icona={IconaDocumenti} label="Documenti" badge={docRifiutati > 0 ? docRifiutati : 0} />
            <TabButton attivo={tab === 'stato'} onClick={() => setTab('stato')} Icona={IconaStato} label="Stato" />
            <TabButton attivo={tab === 'chat'} onClick={() => setTab('chat')} Icona={IconaChat} label="Chat" badge={chatNonLetti} />
          </div>

          {/* CONTENUTO TAB */}
          {tab === 'documenti' && (
            <TabDocumenti pratica={pratica} onDocRifiutatiCambiati={handleDocRifiutatiCambiati} onStatoCambiato={ricaricaPratica} />
          )}
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

      <AiutoWhatsApp />
    </main>
  )
}

function TabButton(props: {
  attivo: boolean
  onClick: () => void
  Icona: React.ComponentType<{ attivo: boolean }>
  label: string
  badge?: number
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
      <Icona attivo={props.attivo} />
      <span className="text-xs font-medium">{props.label}</span>
      {mostraBadge && (
        <span className="absolute top-1.5 right-2.5 min-w-[18px] h-[18px] text-[10px] font-bold px-1 rounded-full leading-none flex items-center justify-center bg-red-500 text-white">
          {props.badge}
        </span>
      )}
    </button>
  )
}