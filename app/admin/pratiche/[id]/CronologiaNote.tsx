'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================
// CRONOLOGIA E NOTE DELLA PRATICA — SOLO ADMIN (17/07/2026)
// Timeline di note con data e ora esatte (tabella pratiche_note,
// RLS solo admin). Le note della messa in attesa / ripresa vengono
// inserite in automatico dalla pagina e riconosciute dal prefisso.
// ============================================================

interface Nota {
  id: string
  testo: string
  creato_il: string
}

const PREFISSO_ATTESA = 'Messa in attesa'
const PREFISSO_RIPRESA = 'Pratica ripresa'

function fmtGiorno(x: string) {
  return new Date(x).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }).toUpperCase().replace('.', '')
}
function fmtOra(x: string) {
  return new Date(x).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export default function CronologiaNote({ praticaId, praticaCreataIl, refreshKey }: {
  praticaId: string
  praticaCreataIl: string
  refreshKey: number
}) {
  const [note, setNote] = useState<Nota[]>([])
  const [tabellaAssente, setTabellaAssente] = useState(false)
  const [nuova, setNuova] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function carica() {
      const { data, error } = await supabase
        .from('pratiche_note')
        .select('*')
        .eq('pratica_id', praticaId)
        .order('creato_il', { ascending: false })
      if (error) { setTabellaAssente(true); return }
      setTabellaAssente(false)
      setNote((data as Nota[]) || [])
    }
    carica()
  }, [praticaId, refreshKey])

  async function aggiungi() {
    const testo = nuova.trim()
    if (!testo) return
    setSalvando(true)
    const { data, error } = await supabase
      .from('pratiche_note')
      .insert({ pratica_id: praticaId, testo })
      .select()
      .single()
    if (!error && data) {
      setNote(prev => [data as Nota, ...prev])
      setNuova('')
    } else {
      alert('Errore nel salvataggio della nota. Riprova.')
    }
    setSalvando(false)
  }

  return (
    <div className="p-5" style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)' }}>
      <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#0F1B33', margin: 0 }}>
        <span style={{ width: 3, height: 15, background: '#2563eb', borderRadius: 2, flexShrink: 0 }} />
        Cronologia e note
        <span style={{ fontWeight: 400, fontSize: 11, color: '#64748b' }}>· le vedi solo tu</span>
      </p>

      {tabellaAssente ? (
        <p className="text-xs mt-3" style={{ color: '#854F0B', background: '#FDF7EA', border: '1px solid #F0DFB8', borderRadius: 10, padding: '8px 12px' }}>
          Per attivare le note esegui su Supabase l&apos;SQL <b>docs/sql/2026-07-17-attesa-note-preimpostati.sql</b>
        </p>
      ) : (
        <div className="mt-2">
          {note.map(n => {
            const isAttesa = n.testo.startsWith(PREFISSO_ATTESA)
            const isRipresa = n.testo.startsWith(PREFISSO_RIPRESA)
            return (
              <div key={n.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #F1F4F8' }}>
                <div style={{ flexShrink: 0, width: 66, fontSize: 10, fontWeight: 700, color: '#94A3B8', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {fmtGiorno(n.creato_il)}<br />{fmtOra(n.creato_il)}
                </div>
                <div style={{ flex: 1, fontSize: 12.5, color: '#3E4C63', lineHeight: 1.5, minWidth: 0 }}>
                  {(isAttesa || isRipresa) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: isAttesa ? '#FAEEDA' : '#DCF3E4', color: isAttesa ? '#854F0B' : '#1F7A43', fontSize: 10.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px', marginRight: 6, verticalAlign: 'middle' }}>
                      {isAttesa ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                      )}
                      {isAttesa ? 'In attesa' : 'Ripresa'}
                    </span>
                  )}
                  {n.testo}
                </div>
              </div>
            )
          })}

          {/* Prima voce fissa: la nascita della pratica */}
          <div style={{ display: 'flex', gap: 10, padding: '9px 0' }}>
            <div style={{ flexShrink: 0, width: 66, fontSize: 10, fontWeight: 700, color: '#94A3B8', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              {fmtGiorno(praticaCreataIl)}<br />{fmtOra(praticaCreataIl)}
            </div>
            <div style={{ flex: 1, fontSize: 12.5, color: '#94A3B8', lineHeight: 1.5 }}>Pratica creata dal cliente</div>
          </div>

          {/* Aggiungi nota */}
          <div className="flex gap-2 mt-2">
            <input
              value={nuova}
              onChange={e => setNuova(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') aggiungi() }}
              placeholder="Aggiungi una nota… (data e ora si salvano da sole)"
              className="flex-1 border-[1.5px] border-gray-200 rounded-[11px] px-3 py-2 text-[12.5px] text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
            />
            <button
              onClick={aggiungi}
              disabled={salvando || !nuova.trim()}
              className="flex-shrink-0 rounded-[10px] px-3.5 text-white font-bold text-lg transition-all disabled:opacity-40"
              style={{ background: '#2563eb' }}
              aria-label="Aggiungi nota"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
