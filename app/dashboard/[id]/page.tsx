'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TabDocumenti from './TabDocumenti'
import TabStato from './TabStato'
import TabChat from './TabChat'

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

function bannerInfo(p: Pratica): { emoji: string; titolo: string; sottotitolo: string; bg: string } {
  switch (p.stato) {
    case 'in_attesa_documenti':
      return {
        emoji: '📋',
        titolo: 'Carica i tuoi documenti',
        sottotitolo: 'Procedi al caricamento dei documenti per l\'assegnazione al demolitore',
        bg: 'from-blue-600 to-blue-800',
      }
    case 'in_attesa_approvazione_admin':
      return {
        emoji: '⏳',
        titolo: 'Stiamo verificando i tuoi documenti',
        sottotitolo: 'Ti avviseremo entro 3 ore — non serve fare nulla',
        bg: 'from-blue-600 to-blue-800',
      }
    case 'documenti_parzialmente_approvati':
      return {
        emoji: '⚠️',
        titolo: 'Alcuni documenti vanno rifatti',
        sottotitolo: 'Controlla il tab Documenti per i dettagli',
        bg: 'from-red-500 to-red-700',
      }
    case 'da_assegnare':
      return {
        emoji: '✅',
        titolo: 'Documenti approvati!',
        sottotitolo: 'Stiamo assegnando un demolitore alla tua pratica',
        bg: 'from-green-600 to-green-800',
      }
    case 'assegnata':
    case 'in_attesa_conferma_cliente':
      return {
        emoji: '🔧',
        titolo: 'Demolitore assegnato',
        sottotitolo: 'Ti contatterà a breve per fissare il ritiro',
        bg: 'from-blue-600 to-blue-800',
      }
    case 'ritiro_confermato':
      return {
        emoji: '📅',
        titolo: 'Ritiro confermato',
        sottotitolo: p.data_ritiro_prevista
          ? `Il demolitore arriverà il ${new Date(p.data_ritiro_prevista).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}`
          : 'Data ritiro confermata',
        bg: 'from-indigo-600 to-indigo-800',
      }
    case 'ritirata':
    case 'in_attesa_cert_rottamazione':
      return {
        emoji: '🚚',
        titolo: 'Veicolo ritirato',
        sottotitolo: 'Stiamo preparando il certificato di rottamazione',
        bg: 'from-purple-600 to-purple-800',
      }
    case 'in_attesa_cert_radiazione_pra':
      return {
        emoji: '📄',
        titolo: 'In attesa radiazione PRA',
        sottotitolo: 'Disponibile entro 15 giorni dal ritiro',
        bg: 'from-teal-600 to-teal-800',
      }
    case 'completata':
      return {
        emoji: '🎉',
        titolo: 'Pratica completata',
        sottotitolo: 'Scarica i certificati dal tab Documenti',
        bg: 'from-green-600 to-green-800',
      }
    case 'annullata':
      return {
        emoji: '❌',
        titolo: 'Pratica annullata',
        sottotitolo: 'Questa pratica non è più attiva',
        bg: 'from-gray-500 to-gray-700',
      }
    default:
      return {
        emoji: '📋',
        titolo: 'La tua pratica',
        sottotitolo: 'Tutto sotto controllo',
        bg: 'from-blue-600 to-blue-800',
      }
  }
}

function statoBadge(stato: string): { label: string; bg: string; text: string } {
  switch (stato) {
    case 'in_attesa_documenti': return { label: 'In attesa documenti', bg: 'bg-yellow-500/15 border border-yellow-400/40', text: 'text-yellow-200' }
    case 'in_attesa_approvazione_admin': return { label: 'In verifica', bg: 'bg-blue-500/15 border border-blue-400/40', text: 'text-blue-200' }
    case 'documenti_parzialmente_approvati': return { label: 'Documenti da rifare', bg: 'bg-red-500/15 border border-red-400/40', text: 'text-red-200' }
    case 'da_assegnare': return { label: 'Approvata', bg: 'bg-green-500/15 border border-green-400/40', text: 'text-green-200' }
    case 'assegnata':
    case 'in_attesa_conferma_cliente':
    case 'ritiro_confermato': return { label: 'Assegnata', bg: 'bg-blue-500/15 border border-blue-400/40', text: 'text-blue-200' }
    case 'ritirata':
    case 'in_attesa_cert_rottamazione':
    case 'in_attesa_cert_radiazione_pra': return { label: 'In lavorazione', bg: 'bg-purple-500/15 border border-purple-400/40', text: 'text-purple-200' }
    case 'completata': return { label: 'Completata', bg: 'bg-green-500/20 border border-green-400/50', text: 'text-green-200' }
    case 'annullata': return { label: 'Annullata', bg: 'bg-gray-500/15 border border-gray-400/40', text: 'text-gray-300' }
    default: return { label: stato, bg: 'bg-gray-500/15 border border-gray-400/40', text: 'text-gray-300' }
  }
}

// ICONE SVG PROFESSIONALI
function IconaDocumenti({ attivo }: { attivo: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={attivo ? 'text-white' : 'text-gray-400'}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="13" y2="17"/>
    </svg>
  )
}

function IconaStato({ attivo }: { attivo: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={attivo ? 'text-white' : 'text-gray-400'}>
      <circle cx="5" cy="6" r="2"/>
      <path d="M5 8 Q 5 12, 12 12 T 19 16"/>
      <circle cx="12" cy="12" r="2"/>
      <circle cx="19" cy="18" r="2"/>
    </svg>
  )
}

function IconaChat({ attivo }: { attivo: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={attivo ? 'text-white' : 'text-gray-400'}>
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
  // NEW: contiamo SOLO i documenti rifiutati
  const [docRifiutati, setDocRifiutati] = useState(0)
  const [chatNonLetti, setChatNonLetti] = useState(0)

  const handleDocRifiutatiCambiati = useCallback((numero: number) => {
    setDocRifiutati(prev => prev === numero ? prev : numero)
  }, [])

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
      <main className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Caricamento...</div>
      </main>
    )
  }
  if (!pratica) return null

  const banner = bannerInfo(pratica)
  const badge = statoBadge(pratica.stato)

  return (
    <main className="min-h-screen bg-[#f0f4f8]">
      {/* TOPBAR */}
      <div className="bg-[#0d2144] px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={() => router.push('/dashboard')} className="text-blue-300 hover:text-white text-lg leading-none p-1 -ml-1">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold truncate">
            {pratica.targa || 'Senza targa'}
          </div>
          {(pratica.marca || pratica.modello) && (
            <div className="text-blue-300 text-[11px] truncate">
              {[pratica.marca, pratica.modello].filter(Boolean).join(' ')}
            </div>
          )}
        </div>
        <span className={`flex-shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-md ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-3 flex flex-col gap-3">

        {/* BANNER STATO DINAMICO */}
        <div className={`bg-gradient-to-br ${banner.bg} text-white rounded-2xl p-4 flex items-center gap-3 shadow-md`}>
          <div className="text-3xl flex-shrink-0">{banner.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">{banner.titolo}</div>
            <div className="text-xs opacity-90 mt-1 leading-snug">{banner.sottotitolo}</div>
          </div>
        </div>

        {/* TAB BAR */}
        <div className="bg-white border border-gray-200 rounded-2xl p-1 flex gap-1">
          <TabButton
            attivo={tab === 'documenti'}
            onClick={() => setTab('documenti')}
            Icona={IconaDocumenti}
            label="Documenti"
            badge={docRifiutati > 0 ? docRifiutati : 0}
            badgeRosso
          />
          <TabButton
            attivo={tab === 'stato'}
            onClick={() => setTab('stato')}
            Icona={IconaStato}
            label="Stato"
          />
          <TabButton
            attivo={tab === 'chat'}
            onClick={() => setTab('chat')}
            Icona={IconaChat}
            label="Chat"
            badge={chatNonLetti}
            badgeRosso
          />
        </div>

        {/* CONTENUTO TAB */}
        {tab === 'documenti' && (
          <TabDocumenti
            pratica={pratica}
            onDocRifiutatiCambiati={handleDocRifiutatiCambiati}
          />
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
    </main>
  )
}

function TabButton(props: {
  attivo: boolean
  onClick: () => void
  Icona: React.ComponentType<{ attivo: boolean }>
  label: string
  badge?: number
  badgeRosso?: boolean
}) {
  const { Icona } = props
  const mostraBadge = (props.badge ?? 0) > 0
  return (
    <button
      onClick={props.onClick}
      className={`flex-1 rounded-xl py-3 px-2 flex flex-col items-center gap-1 transition-all relative min-h-[60px] ${
        props.attivo ? 'bg-[#0d2144] text-white' : 'bg-transparent text-gray-500 hover:bg-gray-50'
      }`}
    >
      <Icona attivo={props.attivo} />
      <span className="text-xs font-medium">{props.label}</span>
      {mostraBadge && (
        <span className={`absolute top-2 right-3 min-w-[18px] h-[18px] text-[10px] font-bold px-1 rounded-full leading-none flex items-center justify-center bg-red-500 text-white`}>
          {props.badge}
        </span>
      )}
    </button>
  )
}