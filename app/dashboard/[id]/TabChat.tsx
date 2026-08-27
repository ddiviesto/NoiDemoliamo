'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useAggiornaLive } from '@/lib/aggiornaLive'
import { Pratica } from './page'

// ⭐ 28/07 (richiesta Davide): nella chat il logo VERO di NoiDemoliamo
// al posto della "N" nel tondino scuro
function LogoNoiDemoliamo({ size }: { size: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: '#fff', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Image src="/icona-app.png" alt="NoiDemoliamo" width={size} height={size} style={{ objectFit: "cover" }} />
    </span>
  )
}

interface Messaggio {
  id: string
  pratica_id: string
  mittente_id: string
  mittente_tipo: 'cliente' | 'admin' | 'demolitore' | 'commerciante'
  testo: string
  letto: boolean
  creato_il: string
  // ⭐ 26/07: canale del messaggio (NULL = messaggio vecchio, criterio mittenti)
  conversazione?: 'cliente_noidemoliamo' | 'cliente_demolitore' | 'demolitore_noidemoliamo' | null
}

interface Props {
  pratica: Pratica
  chatDemolitoreVisibile: boolean // = chat demolitore ATTIVA (può scrivere)
  praticaCompletata: boolean
  onMessaggiLetti?: () => void
}

type SubTab = 'admin' | 'demolitore'

// ============================================================
// ICONE SVG
// ============================================================

/** Icona demolitore: carro attrezzi con auto sul pianale */
function IconaDemolitore({ size = 16, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512">
      <path d="M80.08 82.66L60.24 102.5L192.9 242.7v58.6h78v-50.9zm-25.4 40.14v80.3l4.01 2.7c10.56 7 14.74 14.1 15.93 19.8c1.18 5.8-.43 10.8-3.85 14.9c-6.86 8.3-19.91 12.3-32.73-.6l-12.72 12.8c19.18 19.1 46.13 15.1 59.27-.6c6.58-7.9 9.97-18.9 7.65-30.1c-2.05-10-8.72-19.7-19.56-28v-52.2zm258.02 52.5v144h-185c22.6 5.8 40.6 23.5 46.7 46H337c7.5-27.6 32.8-48 62.7-48s55.2 20.4 62.7 48h24.3v-84.6l-60.2-105.4zm36 14h62.1l54.7 92H348.7v-83zm-321.49 130l11.5 46h10.25c6.12-22.5 24.09-40.2 46.74-46zm84.49 16c-26.08 0-47.02 20.9-47.02 47s20.94 47 47.02 47c26.1 0 47-20.9 47-47s-20.9-47-47-47m288 0c-26.1 0-47 20.9-47 47s20.9 47 47 47s47-20.9 47-47s-20.9-47-47-47" fill={color} />
    </svg>
  )
}

function IconaSpuntaCerchio({ size = 28, color = '#16a34a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="8 12 11 15 16 9"/>
    </svg>
  )
}

function IconaInfo({ size = 14, color = '#1d4ed8' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="11" x2="12" y2="17"/>
      <line x1="12" y1="7.5" x2="12" y2="7.5"/>
    </svg>
  )
}

function IconaInvia({ size = 16, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill={color} stroke={color}/>
    </svg>
  )
}

// ============================================================

// Stato della chat demolitore: prima, durante, dopo
function statoChatDemolitore(stato: string): 'prima_assegnazione' | 'attiva' | 'archiviata' {
  const statiAttivi = [
    'assegnata',
    'in_attesa_conferma_cliente',
    'ritiro_confermato',
    'ritirata',
    'in_attesa_cert_rottamazione',
  ]
  const statiPostCertificato = [
    'in_attesa_cert_radiazione_pra',
    'completata',
  ]
  if (statiAttivi.includes(stato)) return 'attiva'
  if (statiPostCertificato.includes(stato)) return 'archiviata'
  return 'prima_assegnazione'
}

export default function TabChat({ pratica, onMessaggiLetti }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('admin')
  const statoDem = statoChatDemolitore(pratica.stato)

  return (
    <div className="flex flex-col gap-3">

      {/* ⭐ 28/07 (mockup approvato): via i linguettoni col bordone blu — i
          canali sono PILLOLINE, famiglia del CRM */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setSubTab('admin')}
          className="transition-all"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: '6px 13px', cursor: 'pointer',
            background: subTab === 'admin' ? '#DBEAFE' : '#fff',
            border: `1.5px solid ${subTab === 'admin' ? '#BFDBFE' : '#E5E7EB'}`,
            color: subTab === 'admin' ? '#1D4ED8' : '#5F6C7E' }}
        >
          <LogoNoiDemoliamo size={18} />
          NoiDemoliamo
        </button>
        <button
          onClick={() => setSubTab('demolitore')}
          className="transition-all"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, borderRadius: 999, padding: '6px 13px', cursor: 'pointer',
            background: subTab === 'demolitore' ? '#DBEAFE' : '#fff',
            border: `1.5px solid ${subTab === 'demolitore' ? '#BFDBFE' : '#E5E7EB'}`,
            color: subTab === 'demolitore' ? '#1D4ED8' : '#5F6C7E' }}
        >
          <IconaDemolitore size={14} color={subTab === 'demolitore' ? '#1D4ED8' : '#8a98a8'} />
          Demolitore
        </button>
      </div>

      {/* CONTENUTO */}
      {subTab === 'admin' && (
        <Chat
          pratica={pratica}
          destinatarioTipo="admin"
          onMessaggiLetti={onMessaggiLetti}
        />
      )}
      {subTab === 'demolitore' && (
        <>
          {statoDem === 'attiva' && (
            <Chat
              pratica={pratica}
              destinatarioTipo="demolitore"
              onMessaggiLetti={onMessaggiLetti}
            />
          )}
          {statoDem === 'prima_assegnazione' && <PlaceholderPrimaAssegnazione />}
          {statoDem === 'archiviata' && <PlaceholderArchiviata />}
        </>
      )}
    </div>
  )
}

// Placeholder: prima dell'assegnazione
function PlaceholderPrimaAssegnazione() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center" style={{ minHeight: 320 }}>
      <div className="w-16 h-16 flex items-center justify-center mb-3" style={{ background: '#DBEAFE', borderRadius: 16 }}>
        <IconaDemolitore size={34} color="#2563eb" />
      </div>
      <div className="text-sm font-semibold text-gray-800 mb-1">In attesa del demolitore</div>
      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
        Non appena assegneremo un demolitore alla tua pratica, potrai parlare con lui da qui per organizzare il ritiro.
      </p>
      <div className="mt-4 bg-blue-50 rounded-xl px-3 py-2 text-[11px] text-blue-700 max-w-xs flex items-start gap-1.5">
        <span className="flex-shrink-0 mt-0.5">
          <IconaInfo size={13} color="#1d4ed8" />
        </span>
        <span>Nel frattempo puoi parlare con noi nella chat <strong>NoiDemoliamo</strong></span>
      </div>
    </div>
  )
}

// Placeholder: chat archiviata dopo certificato rottamazione
function PlaceholderArchiviata() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center" style={{ minHeight: 320 }}>
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
        <IconaSpuntaCerchio size={32} color="#16a34a" />
      </div>
      <div className="text-sm font-semibold text-gray-800 mb-1">Chat archiviata</div>
      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
        Il demolitore ha completato il suo lavoro e caricato il certificato di rottamazione. La chat è stata archiviata.
      </p>
      <div className="mt-4 bg-blue-50 rounded-xl px-3 py-2 text-[11px] text-blue-700 max-w-xs flex items-start gap-1.5">
        <span className="flex-shrink-0 mt-0.5">
          <IconaInfo size={13} color="#1d4ed8" />
        </span>
        <span>Per qualsiasi domanda scrivi a <strong>NoiDemoliamo</strong></span>
      </div>
    </div>
  )
}

// ============================================================
// CHAT (componente riusabile per admin/demolitore)
// ============================================================

function Chat({
  pratica,
  destinatarioTipo,
  onMessaggiLetti,
}: {
  pratica: Pratica
  destinatarioTipo: 'admin' | 'demolitore'
  onMessaggiLetti?: () => void
}) {
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [inviando, setInviando] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Fotografia dell'ultimo elenco: si aggiorna lo stato SOLO se è cambiato
  // davvero qualcosa (altrimenti lo scroll salterebbe a ogni controllo)
  const messaggiJson = useRef('')

  async function carica() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setUserId(session.user.id)

    const { data } = await supabase
      .from('messaggi_chat')
      .select('*')
      .eq('pratica_id', pratica.id)
      .order('creato_il', { ascending: true })

    // ⭐ 26/07: filtro per CANALE — i messaggi vecchi (conversazione NULL)
    // seguono il criterio dei mittenti; il canale demolitore↔NoiDemoliamo
    // non riguarda il cliente e non passa mai di qui
    const visibili = ((data || []) as Messaggio[]).filter(m =>
      destinatarioTipo === 'admin'
        ? m.conversazione === 'cliente_noidemoliamo' || (m.conversazione == null && (m.mittente_tipo === 'admin' || m.mittente_tipo === 'cliente'))
        : m.conversazione === 'cliente_demolitore' || (m.conversazione == null && (m.mittente_tipo === 'demolitore' || m.mittente_tipo === 'cliente'))
    )

    const json = JSON.stringify(visibili)
    if (json !== messaggiJson.current) {
      messaggiJson.current = json
      setMessaggi(visibili)
    }

    if (visibili.length > 0) {
      const daSegnarLetti = visibili
        .filter(m => !m.letto && m.mittente_id !== session.user.id)
        .map(m => m.id)
      if (daSegnarLetti.length > 0) {
        await supabase.from('messaggi_chat').update({ letto: true }).in('id', daSegnarLetti)
        if (onMessaggiLetti) onMessaggiLetti()
      }
    }
  }

  useEffect(() => {
    carica()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pratica.id, destinatarioTipo])

  // Aggiornamento automatico (22/07): i messaggi nuovi appaiono da soli
  useAggiornaLive({
    canale: `chat-${destinatarioTipo}-${pratica.id}`,
    tabelle: [{ tabella: 'messaggi_chat', filtro: `pratica_id=eq.${pratica.id}` }],
    onCambio: () => carica(),
    pollingMs: 30000,
  })

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messaggi])

  async function invia() {
    if (!testo.trim() || inviando || !userId) return
    setInviando(true)
    const { data, error } = await supabase
      .from('messaggi_chat')
      .insert({
        pratica_id: pratica.id,
        mittente_id: userId,
        mittente_tipo: 'cliente',
        testo: testo.trim(),
        letto: false,
        conversazione: destinatarioTipo === 'admin' ? 'cliente_noidemoliamo' : 'cliente_demolitore',
      })
      .select('*')
      .single()
    setInviando(false)
    if (error) {
      alert('Errore nell\'invio del messaggio. Riprova.')
      return
    }
    if (data) {
      setMessaggi(prev => [...prev, data])
      setTesto('')
    }
  }

  const isAdmin = destinatarioTipo === 'admin'
  const headerNome = isAdmin ? 'NoiDemoliamo' : 'Demolitore'
  // ⭐ 29/07 (richiesta Davide): via "Risposta media: 2 ore" — deve sentire
  // che ci siamo, senza tempi
  const headerSubtitle = isAdmin ? 'Ti rispondiamo subito' : 'Comunica per il ritiro'

  return (
    <div className="bg-white overflow-hidden flex flex-col" style={{ minHeight: 380, border: '1.5px solid #E5E7EB', borderRadius: 16 }}>
      {/* ⭐ 29/07 (mockup approvato): testata di FAMIGLIA — quadratino
          azzurro 38px col logo, titolo 14/700, pallino verde */}
      <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid #F1F3F6' }}>
        <div className="flex items-center justify-center flex-shrink-0" style={{ width: 38, height: 38, background: '#DBEAFE', borderRadius: 11 }}>
          {isAdmin ? <LogoNoiDemoliamo size={28} /> : <IconaDemolitore size={20} color="#2563eb" />}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{headerNome}</div>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: '#22C55E', flexShrink: 0 }} />
            {headerSubtitle}
          </div>
        </div>
      </div>

      {/* Messaggi — ⭐ 29/07 (mockup approvato): area BIANCA (via il grigione),
          bolle compatte con l'ORARIO DENTRO (blu a destra, grigie a sinistra) */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2" style={{ maxHeight: 400 }}>
        {messaggi.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-5 gap-2.5" style={{ minHeight: 220 }}>
            <span style={{ width: 54, height: 54, borderRadius: 999, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isAdmin ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              ) : (
                <IconaDemolitore size={26} color="#2563eb" />
              )}
            </span>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>{isAdmin ? 'Siamo qui per te' : 'Organizza il ritiro'}</div>
            <p style={{ fontSize: 11.5, color: '#6B7280', lineHeight: 1.5, maxWidth: 240, margin: 0 }}>
              {isAdmin ? 'Scrivici per qualsiasi dubbio sulla tua pratica: ti rispondiamo subito.' : 'Scrivi al demolitore per accordarvi su giorno e ora del ritiro.'}
            </p>
          </div>
        ) : (
          messaggi.map(m => {
            const isMio = m.mittente_id === userId
            return (
              <div key={m.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[78%] px-3 py-2 text-[13px] leading-relaxed"
                  style={isMio
                    ? { background: '#2563eb', color: '#fff', borderRadius: 16, borderBottomRightRadius: 6 }
                    : { background: '#F1F4F8', color: '#1E293B', borderRadius: 16, borderBottomLeftRadius: 6 }}
                >
                  {m.testo}
                  <span style={{ display: 'block', fontSize: 9.5, marginTop: 3, opacity: 0.65, textAlign: 'right' }}>
                    {new Date(m.creato_il).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-gray-100 flex gap-2 items-center">
        {/* ⭐ 28/07 (screen iPhone di Davide): placeholder più scuro e testo
            16px sul telefono — sotto i 16px Safari ZOOMA la pagina al tocco */}
        <input
          type="text"
          value={testo}
          onChange={e => setTesto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && invia()}
          placeholder="Scrivi un messaggio…"
          disabled={inviando}
          className="flex-1 rounded-full px-4 py-2.5 text-base sm:text-[13px] text-gray-900 outline-none focus:border-blue-500 disabled:opacity-50 placeholder:text-gray-500"
          style={{ border: '1.5px solid #D6DBE3' }}
        />
        <button
          onClick={invia}
          disabled={inviando || !testo.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          aria-label="Invia messaggio"
        >
          {inviando ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <IconaInvia size={16} color="#ffffff" />
          )}
        </button>
      </div>
    </div>
  )
}