'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================
// CHAT ADMIN (17/07/2026) — dentro il dettaglio pratica.
// Due conversazioni:
//   · Tu ↔ Cliente        → l'admin scrive (mittente_tipo 'admin')
//   · Demolitore ↔ Cliente → SOLA LETTURA (controllo qualità)
// Messaggi rapidi: frasi salvate in `messaggi_preimpostati` (solo admin),
// un tocco le mette nella casella (si possono ritoccare prima di inviare);
// "Gestisci" apre la finestrella per aggiungerle/modificarle/eliminarle.
// Niente real-time: bottone di aggiornamento discreto (come nel resto dell'app).
// ============================================================

interface Messaggio {
  id: string
  mittente_tipo: 'cliente' | 'admin' | 'demolitore' | 'commerciante'
  testo: string
  creato_il: string
}

interface Preimpostato {
  id: string
  testo: string
  ordine: number
}

function fmtOra(x: string) {
  return new Date(x).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ChatAdmin({ praticaId, demolitoreNome }: { praticaId: string; demolitoreNome: string | null }) {
  const [tab, setTab] = useState<'cliente' | 'demolitore'>('cliente')
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [testo, setTesto] = useState('')
  const [inviando, setInviando] = useState(false)
  const [preimpostati, setPreimpostati] = useState<Preimpostato[]>([])
  const [preimpostatiOk, setPreimpostatiOk] = useState(false)
  const [gestisci, setGestisci] = useState(false)
  const listaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    caricaMessaggi()
    caricaPreimpostati()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [praticaId])

  // Scorre in fondo SOLO dentro il riquadro messaggi: la pagina non si
  // muove mai (niente scrollIntoView: faceva "sobbalzare" tutto).
  useEffect(() => {
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight
  }, [messaggi, tab])

  async function caricaMessaggi() {
    const { data } = await supabase
      .from('messaggi_chat')
      .select('id, mittente_tipo, testo, creato_il')
      .eq('pratica_id', praticaId)
      .order('creato_il', { ascending: true })
    setMessaggi((data as Messaggio[]) || [])
  }

  async function caricaPreimpostati() {
    const { data, error } = await supabase
      .from('messaggi_preimpostati')
      .select('*')
      .order('ordine', { ascending: true })
    if (error) { setPreimpostatiOk(false); return }
    setPreimpostatiOk(true)
    setPreimpostati((data as Preimpostato[]) || [])
  }

  async function invia() {
    const t = testo.trim()
    if (!t || inviando) return
    setInviando(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setInviando(false); return }
    const { error } = await supabase.from('messaggi_chat').insert({
      pratica_id: praticaId,
      mittente_id: session.user.id,
      mittente_tipo: 'admin',
      testo: t,
      letto: false,
    })
    if (error) {
      alert('Errore nell\'invio del messaggio. Riprova.')
    } else {
      setTesto('')
      await caricaMessaggi()
    }
    setInviando(false)
  }

  // Stessa regola della chat del cliente: la conversazione è definita dai mittenti
  const visibili = messaggi.filter(m =>
    tab === 'cliente' ? (m.mittente_tipo === 'admin' || m.mittente_tipo === 'cliente')
      : (m.mittente_tipo === 'demolitore' || m.mittente_tipo === 'cliente')
  )

  return (
    <div className="p-5" style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)' }}>
      <div className="flex items-center justify-between">
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#0F1B33', margin: 0 }}>
          <span style={{ width: 3, height: 15, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
          Chat
          <span style={{ fontWeight: 400, fontSize: 11, color: '#64748b' }}>· parla con il cliente</span>
        </p>
        <button onClick={caricaMessaggi} className="flex items-center gap-1.5 text-[11.5px] font-bold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg px-2.5 py-1.5 transition-colors" style={{ border: '1px solid #E5E7EB' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6" /><path d="M21.34 15.57a10 10 0 1 1-.57-8.38" /></svg>
          Aggiorna
        </button>
      </div>

      {/* LINGUETTE */}
      <div className="flex gap-1.5 rounded-xl p-1 mt-3" style={{ background: '#EFF3F9' }}>
        <button
          onClick={() => setTab('cliente')}
          className="flex-1 py-2 rounded-[10px] text-[11.5px] font-semibold transition-all"
          style={tab === 'cliente' ? { background: '#2563eb', color: '#fff' } : { color: '#5F6C7E' }}
        >
          Tu ↔ Cliente
        </button>
        <button
          onClick={() => setTab('demolitore')}
          className="flex-1 py-2 rounded-[10px] text-[11.5px] font-semibold transition-all flex items-center justify-center gap-1.5"
          style={tab === 'demolitore' ? { background: '#2563eb', color: '#fff' } : { color: '#5F6C7E' }}
        >
          Demolitore ↔ Cliente
          <span className="text-[9px] font-bold rounded-full px-1.5 py-0.5" style={tab === 'demolitore' ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: '#E7EAEE', color: '#4B5563' }}>solo lettura</span>
        </button>
      </div>

      {/* MESSAGGI */}
      <div ref={listaRef} className="mt-3 overflow-y-auto" style={{ maxHeight: 320, minHeight: 120 }}>
        {visibili.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: '#9AA7B5' }}>
            {tab === 'cliente' ? 'Nessun messaggio: scrivi tu il primo.' : `Nessun messaggio tra ${demolitoreNome || 'il demolitore'} e il cliente.`}
          </p>
        ) : (
          visibili.map(msg => {
            const mio = msg.mittente_tipo === 'admin'
            const dem = msg.mittente_tipo === 'demolitore'
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: (mio || dem) ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                <div style={{
                  maxWidth: '78%', borderRadius: 12, padding: '7px 11px', fontSize: 12.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  ...(mio ? { background: '#2563eb', color: '#fff', borderBottomRightRadius: 4 }
                    : dem ? { background: '#E4E4FB', color: '#3730A3', borderBottomRightRadius: 4 }
                      : { background: '#F3F4F6', color: '#374151', borderBottomLeftRadius: 4 }),
                }}>
                  {msg.testo}
                </div>
                <div style={{ fontSize: 9.5, color: '#9AA7B5', marginTop: 2 }}>
                  {msg.mittente_tipo === 'cliente' ? 'Cliente' : dem ? (demolitoreNome || 'Demolitore') : 'Tu'} · {fmtOra(msg.creato_il)}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* MESSAGGI RAPIDI + CASELLA (solo nella conversazione col cliente) */}
      {tab === 'cliente' && (
        <div className="mt-2 pt-2" style={{ borderTop: '1px dashed #E5E7EB' }}>
          {preimpostatiOk && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ fontSize: 10, fontWeight: 800, color: '#9AA7B5', letterSpacing: 0.5 }}>MESSAGGI RAPIDI</span>
                <button onClick={() => setGestisci(true)} className="text-[10.5px] font-semibold underline" style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Gestisci</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {preimpostati.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setTesto(p.testo)}
                    title={p.testo}
                    className="text-[11px] font-semibold rounded-full px-2.5 py-1.5 transition-colors hover:bg-blue-100"
                    style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E4E8C', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {p.testo}
                  </button>
                ))}
                {preimpostati.length === 0 && <span className="text-[11px]" style={{ color: '#9AA7B5' }}>Nessuna frase salvata: premi Gestisci per crearle.</span>}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={testo}
              onChange={e => setTesto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); invia() } }}
              rows={testo.includes('\n') || testo.length > 70 ? 3 : 1}
              placeholder="Scrivi un messaggio al cliente…"
              className="flex-1 border-[1.5px] border-gray-200 rounded-[11px] px-3 py-2.5 text-[12.5px] text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400 resize-none"
            />
            <button
              onClick={invia}
              disabled={inviando || !testo.trim()}
              className="flex-shrink-0 w-10 rounded-[10px] flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: '#2563eb', minHeight: 40 }}
              aria-label="Invia"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      )}
      {tab === 'cliente' && !preimpostatiOk && (
        <p className="text-[10.5px] mt-1.5" style={{ color: '#9AA7B5' }}>
          Per i messaggi rapidi esegui su Supabase l&apos;SQL docs/sql/2026-07-17-attesa-note-preimpostati.sql
        </p>
      )}

      {/* GESTIONE MESSAGGI RAPIDI */}
      {gestisci && (
        <GestisciPreimpostati
          preimpostati={preimpostati}
          onChiudi={() => setGestisci(false)}
          onCambiati={caricaPreimpostati}
        />
      )}
    </div>
  )
}

// ============================================================
// FINESTRELLA "GESTISCI": aggiungi / modifica / elimina le frasi
// ============================================================

function GestisciPreimpostati({ preimpostati, onChiudi, onCambiati }: {
  preimpostati: Preimpostato[]
  onChiudi: () => void
  onCambiati: () => Promise<void> | void
}) {
  const [bozze, setBozze] = useState<Record<string, string>>({})
  const [nuovo, setNuovo] = useState('')
  const [occupato, setOccupato] = useState(false)

  async function salvaModifica(p: Preimpostato) {
    const t = (bozze[p.id] ?? p.testo).trim()
    if (!t || t === p.testo) { setBozze(b => { const n = { ...b }; delete n[p.id]; return n }); return }
    setOccupato(true)
    const { error } = await supabase.from('messaggi_preimpostati').update({ testo: t }).eq('id', p.id)
    if (error) alert('Errore nel salvataggio. Riprova.')
    else { setBozze(b => { const n = { ...b }; delete n[p.id]; return n }); await onCambiati() }
    setOccupato(false)
  }

  async function elimina(p: Preimpostato) {
    setOccupato(true)
    const { error } = await supabase.from('messaggi_preimpostati').delete().eq('id', p.id)
    if (error) alert('Errore nell\'eliminazione. Riprova.')
    else await onCambiati()
    setOccupato(false)
  }

  async function aggiungi() {
    const t = nuovo.trim()
    if (!t) return
    setOccupato(true)
    const ordineMax = preimpostati.reduce((m, p) => Math.max(m, p.ordine), 0)
    const { error } = await supabase.from('messaggi_preimpostati').insert({ testo: t, ordine: ordineMax + 1 })
    if (error) alert('Errore nel salvataggio. Riprova.')
    else { setNuovo(''); await onCambiati() }
    setOccupato(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onChiudi}>
      <div className="bg-white rounded-2xl p-5 max-w-lg w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-gray-900 text-[15px]">Messaggi rapidi</p>
          <button onClick={onChiudi} className="text-gray-400 hover:text-gray-700" style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Le frasi che usi più spesso: un tocco in chat le mette nella casella (le puoi ritoccare prima di inviare).</p>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {preimpostati.map(p => {
            const bozza = bozze[p.id] ?? p.testo
            const modificata = bozza.trim() !== p.testo
            return (
              <div key={p.id} className="flex gap-2 items-start">
                <textarea
                  value={bozza}
                  onChange={e => setBozze(b => ({ ...b, [p.id]: e.target.value }))}
                  rows={2}
                  className="flex-1 border-[1.5px] border-gray-200 rounded-[10px] px-3 py-2 text-[12.5px] text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                />
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => salvaModifica(p)}
                    disabled={occupato || !modificata}
                    className="text-[11px] font-bold text-white rounded-lg px-2.5 py-1.5 disabled:opacity-30"
                    style={{ background: '#2563eb' }}
                  >
                    Salva
                  </button>
                  <button
                    onClick={() => elimina(p)}
                    disabled={occupato}
                    className="text-[11px] font-semibold rounded-lg px-2.5 py-1.5 disabled:opacity-30"
                    style={{ background: '#fff', border: '1.5px solid #F3C8C8', color: '#C0392B' }}
                  >
                    Elimina
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #F1F4F8' }}>
          <textarea
            value={nuovo}
            onChange={e => setNuovo(e.target.value)}
            rows={2}
            placeholder="Nuova frase rapida…"
            className="flex-1 border-[1.5px] border-gray-200 rounded-[10px] px-3 py-2 text-[12.5px] text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
          />
          <button
            onClick={aggiungi}
            disabled={occupato || !nuovo.trim()}
            className="flex-shrink-0 text-[12px] font-bold text-white rounded-[10px] px-4 disabled:opacity-30"
            style={{ background: '#16A34A' }}
          >
            Aggiungi
          </button>
        </div>
      </div>
    </div>
  )
}
