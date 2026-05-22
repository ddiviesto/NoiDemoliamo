'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Pratica } from './page'

interface Messaggio {
  id: string
  pratica_id: string
  mittente_id: string
  mittente_tipo: 'cliente' | 'admin' | 'demolitore' | 'commerciante'
  testo: string
  letto: boolean
  creato_il: string
}

interface Props {
  pratica: Pratica
  chatDemolitoreVisibile: boolean // = chat demolitore ATTIVA (può scrivere)
  praticaCompletata: boolean
  onMessaggiLetti?: () => void
}

type SubTab = 'admin' | 'demolitore'

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
  // Sub-tab attivo: sempre 2 sub-tab visibili
  const [subTab, setSubTab] = useState<SubTab>('admin')
  const statoDem = statoChatDemolitore(pratica.stato)

  return (
    <div className="flex flex-col gap-3">

      {/* SUB-TAB sempre presenti */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubTab('admin')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
            subTab === 'admin'
              ? 'bg-blue-50 border-2 border-blue-600 text-blue-800'
              : 'bg-gray-100 border-2 border-transparent text-gray-600'
          }`}
        >
          <div className="w-6 h-6 bg-[#0d2144] rounded-full flex items-center justify-center text-white text-[10px] font-bold">N</div>
          NoiDemoliamo
        </button>
        <button
          onClick={() => setSubTab('demolitore')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
            subTab === 'demolitore'
              ? 'bg-blue-50 border-2 border-blue-600 text-blue-800'
              : 'bg-gray-100 border-2 border-transparent text-gray-600'
          }`}
        >
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-[12px]">🔧</div>
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
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl mb-3">
        🔧
      </div>
      <div className="text-sm font-semibold text-gray-800 mb-1">In attesa del demolitore</div>
      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
        Non appena assegneremo un demolitore alla tua pratica, potrai parlare con lui da qui per organizzare il ritiro.
      </p>
      <div className="mt-4 bg-blue-50 rounded-xl px-3 py-2 text-[11px] text-blue-700 max-w-xs">
        💡 Nel frattempo puoi parlare con noi nella chat <strong>NoiDemoliamo</strong>
      </div>
    </div>
  )
}

// Placeholder: chat archiviata dopo certificato rottamazione
function PlaceholderArchiviata() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center text-center" style={{ minHeight: 320 }}>
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mb-3">
        ✅
      </div>
      <div className="text-sm font-semibold text-gray-800 mb-1">Chat archiviata</div>
      <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
        Il demolitore ha completato il suo lavoro e caricato il certificato di rottamazione. La chat è stata archiviata.
      </p>
      <div className="mt-4 bg-blue-50 rounded-xl px-3 py-2 text-[11px] text-blue-700 max-w-xs">
        💡 Per qualsiasi domanda scrivi a <strong>NoiDemoliamo</strong>
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

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setUserId(session.user.id)

      const tipiVisibili = destinatarioTipo === 'admin'
        ? ['admin', 'cliente']
        : ['demolitore', 'cliente']

      const { data } = await supabase
        .from('messaggi_chat')
        .select('*')
        .eq('pratica_id', pratica.id)
        .in('mittente_tipo', tipiVisibili)
        .order('creato_il', { ascending: true })

      setMessaggi(data || [])

      if (data && data.length > 0) {
        const daSegnarLetti = data
          .filter(m => !m.letto && m.mittente_id !== session.user.id)
          .map(m => m.id)
        if (daSegnarLetti.length > 0) {
          await supabase.from('messaggi_chat').update({ letto: true }).in('id', daSegnarLetti)
          if (onMessaggiLetti) onMessaggiLetti()
        }
      }
    }
    carica()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pratica.id, destinatarioTipo])

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
  const headerColor = isAdmin ? '#0d2144' : '#f97316'
  const headerLetter = isAdmin ? 'N' : '🔧'
  const headerNome = isAdmin ? 'NoiDemoliamo' : 'Demolitore'
  const headerSubtitle = isAdmin ? '● Risposta media: 2 ore' : '● Comunica per il ritiro'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: 380 }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: headerColor }}
        >
          {headerLetter}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900">{headerNome}</div>
          <div className="text-[11px] text-green-600 font-medium">{headerSubtitle}</div>
        </div>
      </div>

      {/* Messaggi */}
      <div ref={containerRef} className="flex-1 overflow-y-auto bg-gray-50 p-3 flex flex-col gap-2" style={{ maxHeight: 400 }}>
        {messaggi.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center px-4">
            <p className="text-xs text-gray-400 italic">
              {isAdmin ? 'Inizia la conversazione con NoiDemoliamo...' : 'Scrivi al demolitore per organizzare il ritiro...'}
            </p>
          </div>
        ) : (
          messaggi.map(m => {
            const isMio = m.mittente_id === userId
            return (
              <div key={m.id} className={`flex ${isMio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[78%]`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                    isMio
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                  }`}>
                    {m.testo}
                  </div>
                  <div className={`text-[10px] text-gray-400 mt-1 ${isMio ? 'text-right' : 'text-left'}`}>
                    {new Date(m.creato_il).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="p-2.5 border-t border-gray-100 flex gap-2 items-center">
        <input
          type="text"
          value={testo}
          onChange={e => setTesto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && invia()}
          placeholder="Scrivi un messaggio..."
          disabled={inviando}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={invia}
          disabled={inviando || !testo.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
        >
          {inviando ? '...' : '→'}
        </button>
      </div>
    </div>
  )
}