'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '../_components/AdminSidebar'
import AutocompleteIndirizzo from '../../inizia/steps/AutocompleteIndirizzo'
import TendinaDemolitore from './TendinaDemolitore'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

interface Demolitore {
  id: string
  ragione_sociale: string
  citta: string | null
  provincia: string | null
  stato: string
  fee_per_pratica: number
  velocita_media_giorni: number
  contratto_firmato: boolean
  creato_il: string
}

interface CoperturaRow { demolitore_id: string; comune: string; tipo: string }

// Stato semplificato: o è attivo (riceve pratiche) o non lo è.
function metaStato(s: string) {
  return s === 'attivo'
    ? { label: 'Attivo', bg: '#DCF3E4', text: '#1F7A43' }
    : { label: 'Non attivo', bg: '#E7EAEE', text: '#4B5563' }
}

function iniziali(nome: string): string {
  const parti = nome.trim().split(/\s+/).filter(Boolean)
  if (parti.length === 0) return '—'
  if (parti.length === 1) return parti[0].slice(0, 2).toUpperCase()
  return (parti[0][0] + parti[1][0]).toUpperCase()
}

function riassuntoCopertura(records: CoperturaRow[]): string | null {
  const regioni = records.filter(r => r.tipo === 'regione').map(r => r.comune)
  const province = records.filter(r => r.tipo === 'provincia').map(r => r.comune)
  const comuni = records.filter(r => r.tipo === 'comune_incluso')
  if (regioni.length) return regioni.slice(0, 2).join(' · ') + (regioni.length > 2 ? ` +${regioni.length - 2}` : '')
  if (province.length) return 'Prov. ' + province.slice(0, 2).join(' · ') + (province.length > 2 ? ` +${province.length - 2}` : '')
  if (comuni.length) return `${comuni.length} ${comuni.length === 1 ? 'comune' : 'comuni'}`
  return null
}

const FORM_VUOTO = {
  ragione_sociale: '', piva: '', codice_sdi: '',
  indirizzo: '', citta: '', provincia: '', cap: '', lat: null as number | null, lng: null as number | null,
  telefono_fisso: '', email_aziendale: '', pec: '', email_assegnazione: '',
  titolare_nome: '', titolare_cellulare: '',
  referente_nome: '', referente_cellulare: '',
}

export default function GestioneDemolitori() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [demolitori, setDemolitori] = useState<Demolitore[]>([])
  const [coperture, setCoperture] = useState<Record<string, CoperturaRow[]>>({})
  const [statsDem, setStatsDem] = useState<Record<string, { aperte: number; completate: number; annullate: number }>>({})
  const [ricerca, setRicerca] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ ...FORM_VUOTO })
  // ⭐ 28/07 (mockup approvato): la scheda del demolitore vive nella TENDINA
  // sotto la riga, come le pratiche — la pagina di dettaglio non esiste più
  const [selId, setSelId] = useState<string | null>(null)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push('/login'); return }
      await ricarica()
      setLoading(false)
    }
    carica()
  }, [router])

  async function ricarica() {
    const { data } = await supabase.from('demolitori').select('id, ragione_sociale, citta, provincia, stato, fee_per_pratica, velocita_media_giorni, contratto_firmato, creato_il').order('creato_il', { ascending: false })
    setDemolitori(data || [])

    const { data: cov } = await supabase.from('demolitori_comuni').select('demolitore_id, comune, tipo')
    const mappaCov: Record<string, CoperturaRow[]> = {}
    for (const c of (cov as CoperturaRow[]) || []) (mappaCov[c.demolitore_id] ||= []).push(c)
    setCoperture(mappaCov)

    // ⭐ 28/07: i 4 quadratini (aperte/completate/annullate/velocità) si
    // vedono anche a scheda CHIUSA — i conteggi si calcolano per tutti qui
    const { data: prat } = await supabase.from('pratiche').select('demolitore_id, stato').not('demolitore_id', 'is', null)
    const mappa: Record<string, { aperte: number; completate: number; annullate: number }> = {}
    for (const p of prat || []) {
      if (!p.demolitore_id) continue
      const st = (mappa[p.demolitore_id] ||= { aperte: 0, completate: 0, annullate: 0 })
      if (p.stato === 'completata') st.completate += 1
      else if (p.stato === 'annullata') st.annullate += 1
      else st.aperte += 1
    }
    setStatsDem(mappa)
  }

  function set<K extends keyof typeof FORM_VUOTO>(k: K, v: (typeof FORM_VUOTO)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function salva() {
    if (!form.ragione_sociale.trim()) return
    setSalvando(true)
    const { error } = await supabase.from('demolitori').insert({
      ragione_sociale: form.ragione_sociale,
      piva: form.piva || null,
      codice_sdi: form.codice_sdi || null,
      indirizzo: form.indirizzo || null,
      citta: form.citta || null,
      provincia: form.provincia || null,
      cap: form.cap || null,
      lat: form.lat,
      lng: form.lng,
      telefono_fisso: form.telefono_fisso || null,
      email_aziendale: form.email_aziendale || null,
      pec: form.pec || null,
      email_assegnazione: form.email_assegnazione || null,
      titolare_nome: form.titolare_nome || null,
      titolare_cellulare: form.titolare_cellulare || null,
      referente_nome: form.referente_nome || null,
      referente_cellulare: form.referente_cellulare || null,
      stato: 'in_attesa',
      contratto_firmato: false,
      fee_per_pratica: 0,
    })
    if (!error) {
      await ricarica()
      setForm({ ...FORM_VUOTO })
      setShowForm(false)
    } else {
      console.error(error)
      alert('Errore nel salvataggio. Controlla i campi e riprova.')
    }
    setSalvando(false)
  }

  const attivi = demolitori.filter(d => d.stato === 'attivo').length
  const q = ricerca.trim().toLowerCase()
  const filtrati = q ? demolitori.filter(d => [d.ragione_sociale, d.citta, d.provincia].filter(Boolean).join(' ').toLowerCase().includes(q)) : demolitori
  // Non attivi in una sezione a parte: si individuano al volo e il "perché"
  // si legge nelle note della loro scheda.
  const filtratiAttivi = filtrati.filter(d => d.stato === 'attivo')
  const filtratiNonAttivi = filtrati.filter(d => d.stato !== 'attivo')

  // Card demolitore, identica nelle due sezioni (attivi / non attivi).
  // ⭐ 28/07: il clic APRE LA TENDINA sotto la riga (via il salto di pagina);
  // se è già aperta, la richiude.
  function cardDemolitore(d: Demolitore) {
    const s = metaStato(d.stato)
    const cop = riassuntoCopertura(coperture[d.id] || [])
    const barColor = d.stato === 'attivo' ? '#97C459' : '#C0C7D1'
    const st = statsDem[d.id] || { aperte: 0, completate: 0, annullate: 0 }
    const nAperte = st.aperte
    // Aperta: al posto della card c'è il blocco unico con la tendina (la sua
    // testata è la STESSA riga, tinta d'azzurro: nessun sobbalzo)
    if (selId === d.id) {
      return (
        <TendinaDemolitore
          key={d.id}
          demolitoreId={d.id}
          base={{ ...d, cop, nAperte: st.aperte, nCompletate: st.completate, nAnnullate: st.annullate }}
          onChiudi={() => setSelId(null)}
          onDatiCambiati={ricarica}
        />
      )
    }
    return (
      <div
        key={d.id}
        onClick={() => setSelId(d.id)}
        // ⭐ 27/07: hover AZZURRO gemello delle righe pratiche (#EFF6FF);
        // la barretta colorata a sinistra (stato) resta com'è
        className="group bg-white cursor-pointer transition-all hover:!bg-[#EFF6FF] hover:!border-t-[#BFDBFE] hover:!border-r-[#BFDBFE] hover:!border-b-[#BFDBFE] hover:shadow-[0_2px_8px_rgba(37,99,235,0.10)] hover:-translate-y-[1px]"
        style={{ border: '1.5px solid #E5E7EB', borderLeft: `4px solid ${barColor}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)' }}
      >
        {/* Quadratino iniziali */}
        <div style={{ width: 46, height: 46, borderRadius: 12, background: '#DBEAFE', color: '#1E4E8C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
          {iniziali(d.ragione_sociale)}
        </div>

        {/* Nome + città */}
        <div style={{ flex: 1.6, minWidth: 0 }}>
          <div className="text-[15px] font-bold text-gray-900 truncate">{d.ragione_sociale}</div>
          <div className="text-[12.5px] truncate" style={{ color: '#4B5563', marginTop: 2 }}>{d.citta ? `${d.citta}${d.provincia ? ` (${d.provincia})` : ''}` : 'Sede non impostata'}</div>
        </div>

        {/* Stato */}
        <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
          <span className="inline-block text-[11.5px] font-bold rounded-full" style={{ background: s.bg, color: s.text, padding: '4px 12px' }}>{s.label}</span>
        </div>

        {/* Copertura */}
        <div style={{ flex: 1.4, minWidth: 0, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
          <div className="text-[10.5px] font-bold uppercase" style={{ color: '#94A3B8', letterSpacing: 0.4 }}>Copertura</div>
          {cop
            ? <div className="text-[13px] font-semibold truncate" style={{ color: '#111827', marginTop: 2 }}>{cop}</div>
            : <div className="text-[13px] truncate" style={{ color: '#94A3B8', marginTop: 2 }}>Da impostare</div>}
        </div>

        {/* Fee */}
        <div style={{ flexShrink: 0, minWidth: 70, borderLeft: '1px solid #EEF1F5', paddingLeft: 14 }}>
          <div className="text-[10.5px] font-bold uppercase" style={{ color: '#94A3B8', letterSpacing: 0.4 }}>Fee</div>
          <div className="text-[13.5px] font-bold" style={{ color: '#111827', marginTop: 2 }}>{d.fee_per_pratica ? `${d.fee_per_pratica} €` : '—'}</div>
        </div>

        {/* ⭐ 28/07 (richiesta Davide): i 4 quadratini si vedono anche a
            scheda CHIUSA — gemelli di quelli della tendina aperta */}
        <BoxRiga n={String(st.aperte)} l="aperte" acceso={nAperte > 0} />
        <BoxRiga n={String(st.completate)} l="completate" />
        <BoxRiga n={String(st.annullate)} l="annullate" rosso={st.annullate > 0} />
        <BoxRiga n={d.velocita_media_giorni > 0 ? `${d.velocita_media_giorni}g` : '—'} l="velocità" />
      </div>
    )
  }

  // Durante il caricamento la STRUTTURA resta al suo posto (barra laterale
  // compresa): la rotellina gira solo nell'area contenuti — niente lampo
  // grigio passando da una pagina all'altra (26/07)
  if (loading) return (
    <main className="min-h-screen flex" style={{ background: '#ECEEF2' }}>
      <AdminSidebar attivo="demolitori" />
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </main>
  )

  return (
    <main className="min-h-screen flex" style={{ background: '#ECEEF2' }}>
      <AdminSidebar attivo="demolitori" />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ⭐ 27/07: barra AZZURRA gemella del CRM pratiche (mockup approvato) */}
        <div className="border-b px-6 py-3 flex items-center gap-4" style={{ background: '#EFF6FF', borderColor: '#DBEAFE' }}>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Demolitori</h1>
            <p className="text-xs mt-1" style={{ color: '#5B6779' }}>{demolitori.length} registrati · {attivi} attivi</p>
          </div>
          {/* Ricerca a PILLOLA (26/07, variante A su mockup): gemella del CRM pratiche */}
          <div className="ml-auto">
            <div className="flex items-center gap-2 rounded-full border px-3.5 py-2 w-[210px] focus-within:w-[300px] bg-white border-[#DBEAFE] focus-within:border-blue-300 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.10)] transition-all duration-300">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input value={ricerca} onChange={e => setRicerca(e.target.value)} placeholder="Cerca…" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400" />
              {ricerca && <button onClick={() => setRicerca('')} className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0">×</button>}
            </div>
          </div>
          {/* ⭐ 28/07 (richiesta Davide): pillola sobria, via il blu pieno aggressivo */}
          <button onClick={() => setShowForm(true)} className="transition-colors hover:bg-blue-50" style={{ background: '#fff', border: '1.5px solid #BFDBFE', color: '#1D4ED8', fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '7px 16px', cursor: 'pointer' }}>
            Aggiungi
          </button>
        </div>

        <div className="p-6 overflow-auto">
          {filtrati.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500 bg-white" style={{ border: '1.5px solid #E5E7EB', borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.07)' }}>
              {demolitori.length === 0 ? 'Nessun demolitore. Aggiungi il primo per iniziare.' : 'Nessun demolitore trovato.'}
            </div>
          ) : (
            <>
              {filtratiAttivi.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {filtratiAttivi.map(cardDemolitore)}
                </div>
              )}

              {/* NON ATTIVI: sezione a parte per individuarli al volo */}
              {filtratiNonAttivi.length > 0 && (
                <div className={filtratiAttivi.length > 0 ? 'mt-7' : ''}>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <p className="text-[12px] font-bold uppercase m-0" style={{ color: '#64748b', letterSpacing: 0.5 }}>Non attivi</p>
                    <span className="text-[11px] font-bold rounded-full px-2 py-0.5" style={{ background: '#E7EAEE', color: '#4B5563' }}>{filtratiNonAttivi.length}</span>
                    <span className="text-[11.5px]" style={{ color: '#94A3B8' }}>Non ricevono nuove pratiche · il perché è nelle note della scheda</span>
                  </div>
                  <div className="flex flex-col gap-2.5" style={{ opacity: 0.85 }}>
                    {filtratiNonAttivi.map(cardDemolitore)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODALE NUOVO DEMOLITORE */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-semibold text-gray-900">Nuovo demolitore</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              <Sezione titolo="Azienda">
                <div className="grid grid-cols-2 gap-3">
                  <Campo cols={2} label="Ragione sociale *" value={form.ragione_sociale} onChange={v => set('ragione_sociale', v)} placeholder="Rossi Demolizioni Srl" />
                  <Campo label="Partita IVA" value={form.piva} onChange={v => set('piva', v)} placeholder="01234567890" />
                  <Campo label="Codice SDI" value={form.codice_sdi} onChange={v => set('codice_sdi', v.toUpperCase())} placeholder="ABCDEFG" maxLength={7} />
                </div>
              </Sezione>

              <Sezione titolo="Indirizzo sede">
                <AutocompleteIndirizzo
                  compatto
                  placeholder="Cerca l'indirizzo…"
                  onSelezione={(d) => setForm(f => ({ ...f, indirizzo: d.indirizzo, citta: d.comune || '', provincia: d.provincia || '', cap: d.cap || '', lat: d.lat ?? null, lng: d.lng ?? null }))}
                />
                {form.indirizzo && <p className="text-[11px] text-gray-500 mt-1.5">{form.indirizzo}{form.citta ? ` · ${form.citta}` : ''}{form.provincia ? ` (${form.provincia})` : ''}{form.cap ? ` · ${form.cap}` : ''}</p>}
              </Sezione>

              <Sezione titolo="Contatti azienda">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Telefono fisso" value={form.telefono_fisso} onChange={v => set('telefono_fisso', v)} placeholder="081 1234567" />
                  <Campo label="Email aziendale" value={form.email_aziendale} onChange={v => set('email_aziendale', v)} placeholder="info@azienda.it" />
                  <Campo label="PEC" value={form.pec} onChange={v => set('pec', v)} placeholder="azienda@pec.it" />
                  <Campo label="Email assegnazioni pratiche" value={form.email_assegnazione} onChange={v => set('email_assegnazione', v)} placeholder="pratiche@azienda.it" />
                </div>
              </Sezione>

              <Sezione titolo="Titolare">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nome e cognome" value={form.titolare_nome} onChange={v => set('titolare_nome', v)} placeholder="Mario Rossi" />
                  <Campo label="Cellulare" value={form.titolare_cellulare} onChange={v => set('titolare_cellulare', v)} placeholder="333 1234567" />
                </div>
              </Sezione>

              <Sezione titolo="Referente pratiche demolizione">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nome e cognome" value={form.referente_nome} onChange={v => set('referente_nome', v)} placeholder="Luca Bianchi" />
                  <Campo label="Cellulare" value={form.referente_cellulare} onChange={v => set('referente_cellulare', v)} placeholder="333 7654321" />
                </div>
              </Sezione>
            </div>

            <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
              {/* ⭐ 29/07 (mockup B): pillole — Salva col gradiente di famiglia */}
              <button onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors" style={{ border: '1.5px solid #E5E7EB' }}>Annulla</button>
              <button onClick={salva} disabled={salvando || !form.ragione_sociale.trim()} className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                {salvando ? 'Salvataggio…' : 'Salva demolitore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// Quadratino statistica della riga (gemello di quelli della tendina aperta)
function BoxRiga({ n, l, acceso = false, rosso = false }: { n: string; l: string; acceso?: boolean; rosso?: boolean }) {
  const bg = rosso ? '#FBDADA' : acceso ? '#E0EDFB' : '#fff'
  const col = rosso ? '#9B1C1C' : acceso ? '#1E4E8C' : '#6B7280'
  const bordo = rosso ? '#F3C8C8' : '#E5E7EB'
  return (
    <div style={{ flexShrink: 0, textAlign: 'center', background: bg, borderRadius: 10, padding: '6px 14px', minWidth: 70, border: `1px solid ${bordo}` }}>
      <div className="text-[15px] font-bold" style={{ color: col }}>{n}</div>
      <div className="text-[10px] font-semibold uppercase" style={{ color: col }}>{l}</div>
    </div>
  )
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">{titolo}</p>
      {children}
    </div>
  )
}

function Campo({ label, value, onChange, placeholder, cols = 1, maxLength }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; cols?: 1 | 2; maxLength?: number }) {
  return (
    <div className={cols === 2 ? 'col-span-2' : ''}>
      <label className="block text-[11px] font-semibold mb-1.5" style={{ color: '#475569' }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className="w-full border-[1.5px] border-gray-200 rounded-[10px] px-3 py-2 text-[13.5px] font-medium text-gray-900 bg-white outline-none hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400" />
    </div>
  )
}
