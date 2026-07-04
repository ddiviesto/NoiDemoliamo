'use client'

import { useEffect, useState } from 'react'
import MappaComuni, { CoperturaRecord } from './MappaComuni'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { REGIONI, PROVINCE } from '../../_data/zone'
import AutocompleteIndirizzo from '../../../inizia/steps/AutocompleteIndirizzo'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

type TipoZona = 'regione' | 'provincia' | 'comune'
interface Tariffa { id: string; tipo: TipoZona; nome: string; fee: number }
const TIPO_ZONA_LABEL: Record<TipoZona, string> = { regione: 'Regione', provincia: 'Provincia', comune: 'Comune' }

const FORM_VUOTO = {
  ragione_sociale: '', piva: '', codice_sdi: '',
  indirizzo: '', citta: '', provincia: '', cap: '', lat: null as number | null, lng: null as number | null,
  telefono_fisso: '', email_aziendale: '', pec: '', email_assegnazione: '',
  titolare_nome: '', titolare_cellulare: '',
  referente_nome: '', referente_cellulare: '',
}

interface Demolitore {
  id: string
  ragione_sociale: string
  piva: string | null
  codice_sdi: string | null
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  cap: string | null
  lat: number | null
  lng: number | null
  telefono_fisso: string | null
  email_aziendale: string | null
  pec: string | null
  email_assegnazione: string | null
  titolare_nome: string | null
  titolare_cellulare: string | null
  referente_nome: string | null
  referente_cellulare: string | null
  stato: string
  fee_per_pratica: number
  contratto_firmato: boolean
  velocita_media_giorni: number
}

const STATO_META: Record<string, { label: string; bg: string; text: string }> = {
  attivo: { label: 'Attivo', bg: '#DCF3E4', text: '#1F7A43' },
  in_attesa: { label: 'In attesa', bg: '#FAEEDA', text: '#854F0B' },
  sospeso: { label: 'Sospeso', bg: '#FBE2E2', text: '#9B1C1C' },
}
function metaStato(s: string) { return STATO_META[s] || { label: s, bg: '#E7EAEE', text: '#4B5563' } }

function iniziali(nome: string): string {
  const parti = nome.trim().split(/\s+/).filter(Boolean)
  if (parti.length === 0) return '—'
  if (parti.length === 1) return parti[0].slice(0, 2).toUpperCase()
  return (parti[0][0] + parti[1][0]).toUpperCase()
}

export default function DettaglioDemolitore() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [demolitore, setDemolitore] = useState<Demolitore | null>(null)
  const [copertura, setCopertura] = useState<CoperturaRecord[]>([])
  const [stats, setStats] = useState<{ aperte: number; completate: number }>({ aperte: 0, completate: 0 })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null)

  // Form anagrafica (modificabile)
  const [form, setForm] = useState({ ...FORM_VUOTO })
  const [salvataAnagrafica, setSalvataAnagrafica] = useState(false)

  // Tariffe speciali per zona
  const [tariffe, setTariffe] = useState<Tariffa[]>([])
  const [nuovaTipo, setNuovaTipo] = useState<TipoZona>('regione')
  const [nuovoNome, setNuovoNome] = useState('')
  const [nuovaFee, setNuovaFee] = useState('')
  const [erroreTariffa, setErroreTariffa] = useState<string | null>(null)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push('/login'); return }

      const { data: dem } = await supabase.from('demolitori').select('*').eq('id', id).single()
      if (!dem) { router.push('/admin/demolitori'); return }
      setDemolitore(dem)
      setForm({
        ragione_sociale: dem.ragione_sociale || '', piva: dem.piva || '', codice_sdi: dem.codice_sdi || '',
        indirizzo: dem.indirizzo || '', citta: dem.citta || '', provincia: dem.provincia || '', cap: dem.cap || '', lat: dem.lat ?? null, lng: dem.lng ?? null,
        telefono_fisso: dem.telefono_fisso || '', email_aziendale: dem.email_aziendale || '', pec: dem.pec || '', email_assegnazione: dem.email_assegnazione || '',
        titolare_nome: dem.titolare_nome || '', titolare_cellulare: dem.titolare_cellulare || '',
        referente_nome: dem.referente_nome || '', referente_cellulare: dem.referente_cellulare || '',
      })

      const { data: cov } = await supabase.from('demolitori_comuni').select('*').eq('demolitore_id', id)
      if (cov) setCopertura(cov as CoperturaRecord[])

      const { data: prat } = await supabase.from('pratiche').select('stato').eq('demolitore_id', id)
      const aperte = (prat || []).filter(p => p.stato !== 'completata' && p.stato !== 'annullata').length
      const completate = (prat || []).filter(p => p.stato === 'completata').length
      setStats({ aperte, completate })

      const { data: tar } = await supabase.from('demolitori_tariffe').select('*').eq('demolitore_id', id).order('tipo')
      setTariffe((tar as Tariffa[]) || [])

      setLoading(false)
    }
    if (id) carica()
  }, [id, router])

  async function salvaAnagrafica() {
    if (!form.ragione_sociale.trim()) return
    setSalvando(true)
    await supabase.from('demolitori').update({
      ragione_sociale: form.ragione_sociale, piva: form.piva || null, codice_sdi: form.codice_sdi || null,
      indirizzo: form.indirizzo || null, citta: form.citta || null, provincia: form.provincia || null, cap: form.cap || null, lat: form.lat, lng: form.lng,
      telefono_fisso: form.telefono_fisso || null, email_aziendale: form.email_aziendale || null, pec: form.pec || null, email_assegnazione: form.email_assegnazione || null,
      titolare_nome: form.titolare_nome || null, titolare_cellulare: form.titolare_cellulare || null,
      referente_nome: form.referente_nome || null, referente_cellulare: form.referente_cellulare || null,
    }).eq('id', id)
    setDemolitore(prev => prev ? { ...prev, ...form } : null)
    setSalvando(false)
    setSalvataAnagrafica(true)
    setTimeout(() => setSalvataAnagrafica(false), 2500)
  }

  async function aggiornaStato(stato: string) {
    setSalvando(true)
    await supabase.from('demolitori').update({ stato }).eq('id', id)
    setDemolitore(prev => prev ? { ...prev, stato } : null)
    setSalvando(false)
  }

  async function aggiornaContratto(val: boolean) {
    setSalvando(true)
    await supabase.from('demolitori').update({ contratto_firmato: val }).eq('id', id)
    setDemolitore(prev => prev ? { ...prev, contratto_firmato: val } : null)
    setSalvando(false)
  }

  async function aggiornaFeeBase(fee: number) {
    await supabase.from('demolitori').update({ fee_per_pratica: fee }).eq('id', id)
    setDemolitore(prev => prev ? { ...prev, fee_per_pratica: fee } : null)
  }

  async function aggiungiTariffa() {
    const nome = nuovoNome.trim()
    const fee = parseFloat(nuovaFee)
    setErroreTariffa(null)
    if (!nome) { setErroreTariffa('Scrivi la zona'); return }
    if (isNaN(fee)) { setErroreTariffa('Scrivi un importo'); return }
    const { data, error } = await supabase.from('demolitori_tariffe')
      .insert({ demolitore_id: id, tipo: nuovaTipo, nome, fee })
      .select().single()
    if (error) {
      setErroreTariffa(error.code === '23505' ? 'Questa zona ha già una tariffa' : 'Errore nel salvataggio')
      return
    }
    setTariffe(prev => [...prev, data as Tariffa])
    setNuovoNome(''); setNuovaFee('')
  }

  async function aggiornaFeeTariffa(tid: string, feeStr: string) {
    const fee = parseFloat(feeStr)
    if (isNaN(fee)) return
    await supabase.from('demolitori_tariffe').update({ fee }).eq('id', tid)
    setTariffe(prev => prev.map(t => t.id === tid ? { ...t, fee } : t))
  }

  async function eliminaTariffa(tid: string) {
    await supabase.from('demolitori_tariffe').delete().eq('id', tid)
    setTariffe(prev => prev.filter(t => t.id !== tid))
  }

  // Salva la copertura (cancella i vecchi record e reinserisce i nuovi).
  async function salvaCopertura(records: CoperturaRecord[]) {
    setSalvando(true)
    setMessaggio(null)
    try {
      const { error: errDel } = await supabase.from('demolitori_comuni').delete().eq('demolitore_id', id)
      if (errDel) throw errDel
      if (records.length > 0) {
        const righe = records.map(r => ({ demolitore_id: id, comune: r.comune, provincia: r.provincia, tipo: r.tipo, distanza_km: r.distanza_km ?? null }))
        const { error: errIns } = await supabase.from('demolitori_comuni').insert(righe)
        if (errIns) throw errIns
      }
      const { data } = await supabase.from('demolitori_comuni').select('*').eq('demolitore_id', id)
      if (data) setCopertura(data as CoperturaRecord[])
      setMessaggio({ ok: true, testo: 'Copertura salvata' })
      setTimeout(() => setMessaggio(null), 3000)
    } catch (err) {
      console.error('Errore salvataggio copertura:', err)
      setMessaggio({ ok: false, testo: 'Errore durante il salvataggio' })
      setTimeout(() => setMessaggio(null), 4000)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5FB' }}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </main>
  )
  if (!demolitore) return null

  const s = metaStato(demolitore.stato)

  return (
    <main className="min-h-screen" style={{ background: '#F4F5FB' }}>

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.push('/admin/demolitori')} className="text-sm text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-700 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          Demolitori
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: '#DBEAFE', color: '#1E4E8C' }}>{iniziali(demolitore.ragione_sociale)}</div>
        <div className="min-w-0">
          <div className="text-[15px] font-bold text-gray-900 leading-tight truncate">{demolitore.ragione_sociale}</div>
          <div className="text-[11px] text-gray-400">{demolitore.citta ? `${demolitore.citta}${demolitore.provincia ? ` (${demolitore.provincia})` : ''}` : 'Sede non impostata'}</div>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {demolitore.contratto_firmato && <span className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: '#DCF3E4', color: '#1F7A43' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Contratto</span>}
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: s.bg, color: s.text }}>{s.label}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-4">

        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* ANAGRAFICA (modificabile) */}
          <div className="flex-1 min-w-0 w-full bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">Anagrafica</p>
              {salvataAnagrafica && <span className="text-xs font-medium text-green-600">Salvato</span>}
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Azienda</p>
                <div className="grid grid-cols-2 gap-3">
                  <Campo cols={2} label="Ragione sociale" value={form.ragione_sociale} onChange={v => setForm(f => ({ ...f, ragione_sociale: v }))} />
                  <Campo label="Partita IVA" value={form.piva} onChange={v => setForm(f => ({ ...f, piva: v }))} />
                  <Campo label="Codice SDI" value={form.codice_sdi} onChange={v => setForm(f => ({ ...f, codice_sdi: v.toUpperCase() }))} maxLength={7} />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Indirizzo sede</p>
                <AutocompleteIndirizzo valoreIniziale={form.indirizzo} placeholder="Cerca l'indirizzo…" onSelezione={d => setForm(f => ({ ...f, indirizzo: d.indirizzo, citta: d.comune || '', provincia: d.provincia || '', cap: d.cap || '', lat: d.lat ?? null, lng: d.lng ?? null }))} />
                {form.indirizzo && <p className="text-[11px] text-gray-500 mt-1.5">{form.indirizzo}{form.citta ? ` · ${form.citta}` : ''}{form.provincia ? ` (${form.provincia})` : ''}{form.cap ? ` · ${form.cap}` : ''}</p>}
              </div>

              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Contatti azienda</p>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Telefono fisso" value={form.telefono_fisso} onChange={v => setForm(f => ({ ...f, telefono_fisso: v }))} />
                  <Campo label="Email aziendale" value={form.email_aziendale} onChange={v => setForm(f => ({ ...f, email_aziendale: v }))} />
                  <Campo label="PEC" value={form.pec} onChange={v => setForm(f => ({ ...f, pec: v }))} />
                  <Campo label="Email assegnazione pratiche" value={form.email_assegnazione} onChange={v => setForm(f => ({ ...f, email_assegnazione: v }))} />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Titolare</p>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nome e cognome" value={form.titolare_nome} onChange={v => setForm(f => ({ ...f, titolare_nome: v }))} />
                  <Campo label="Cellulare" value={form.titolare_cellulare} onChange={v => setForm(f => ({ ...f, titolare_cellulare: v }))} />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Referente pratiche demolizione</p>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nome e cognome" value={form.referente_nome} onChange={v => setForm(f => ({ ...f, referente_nome: v }))} />
                  <Campo label="Cellulare" value={form.referente_cellulare} onChange={v => setForm(f => ({ ...f, referente_cellulare: v }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={salvaAnagrafica} disabled={salvando || !form.ragione_sociale.trim()} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {salvando ? 'Salvataggio…' : 'Salva modifiche'}
              </button>
            </div>
          </div>

          {/* COLONNA DESTRA */}
          <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-4">

            {/* STATISTICHE */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-gray-800 mb-3">Statistiche</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <StatBox valore={stats.aperte} label="Aperte" />
                <StatBox valore={stats.completate} label="Completate" />
                <StatBox valore={demolitore.velocita_media_giorni > 0 ? `${demolitore.velocita_media_giorni}g` : '—'} label="Velocità" />
              </div>
            </div>

            {/* CONTRIBUZIONE */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-gray-800 mb-3">Contribuzione</p>
              <div className="flex items-center gap-2 mb-1">
                <input type="number" defaultValue={demolitore.fee_per_pratica || ''} onBlur={e => aggiornaFeeBase(parseFloat(e.target.value) || 0)} placeholder="0" className="w-20 border border-gray-200 rounded-lg px-2.5 py-1.5 text-lg font-bold text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
                <span className="text-sm text-gray-500">€ / pratica <span className="text-gray-400">(base)</span></span>
              </div>

              <div className="border-t border-gray-100 mt-3 pt-3">
                <p className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wide mb-2">Tariffe speciali per zona</p>

                {tariffe.length > 0 && (
                  <div className="flex flex-col gap-1.5 mb-2.5">
                    {tariffe.map(t => (
                      <div key={t.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] text-gray-800 truncate">{t.nome}</div>
                          <div className="text-[10px] text-gray-400">{TIPO_ZONA_LABEL[t.tipo]}</div>
                        </div>
                        <input type="number" defaultValue={t.fee} onBlur={e => aggiornaFeeTariffa(t.id, e.target.value)} className="w-14 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white text-right" />
                        <span className="text-xs text-gray-400">€</span>
                        <button onClick={() => eliminaTariffa(t.id)} aria-label="Elimina tariffa" className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-600 flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <select value={nuovaTipo} onChange={e => { setNuovaTipo(e.target.value as TipoZona); setNuovoNome('') }} className="border border-gray-200 rounded-lg px-1.5 py-1.5 text-[11px] text-gray-700 bg-gray-50 outline-none focus:border-blue-500">
                    <option value="regione">Regione</option>
                    <option value="provincia">Provincia</option>
                    <option value="comune">Comune</option>
                  </select>
                  <input list="zone-suggerimenti" value={nuovoNome} onChange={e => { setNuovoNome(e.target.value); setErroreTariffa(null) }} placeholder={nuovaTipo === 'comune' ? 'Scrivi il comune' : 'Cerca…'} className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
                  <input type="number" value={nuovaFee} onChange={e => { setNuovaFee(e.target.value); setErroreTariffa(null) }} placeholder="€" className="w-12 border border-gray-200 rounded-lg px-1.5 py-1.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white text-right" />
                </div>
                <datalist id="zone-suggerimenti">
                  {(nuovaTipo === 'regione' ? REGIONI : nuovaTipo === 'provincia' ? PROVINCE : []).map(z => <option key={z} value={z} />)}
                </datalist>
                <button onClick={aggiungiTariffa} className="mt-2 w-full py-2 rounded-lg text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors">+ Aggiungi tariffa</button>
                {erroreTariffa && <p className="text-[11px] text-red-600 mt-1.5">{erroreTariffa}</p>}
                <p className="text-[10.5px] text-gray-400 mt-2 leading-relaxed">Il veicolo viene fatturato con la tariffa più specifica: comune › provincia › regione › base.</p>
              </div>
            </div>

            {/* STATO + CONTRATTO */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-gray-800 mb-3">Stato</p>
              <div className="flex gap-2 mb-4">
                {(['in_attesa', 'attivo', 'sospeso'] as const).map(val => {
                  const meta = metaStato(val)
                  const on = demolitore.stato === val
                  return (
                    <button key={val} onClick={() => aggiornaStato(val)} disabled={salvando} className="flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all" style={on ? { background: meta.bg, color: meta.text } : { background: '#F3F5F9', color: '#9AA7B5' }}>
                      {meta.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Contratto</p>
              <div className="flex gap-2">
                <button onClick={() => aggiornaContratto(true)} className="flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all" style={demolitore.contratto_firmato ? { background: '#DCF3E4', color: '#1F7A43' } : { background: '#F3F5F9', color: '#9AA7B5' }}>Firmato</button>
                <button onClick={() => aggiornaContratto(false)} className="flex-1 px-2 py-2 rounded-xl text-xs font-semibold transition-all" style={!demolitore.contratto_firmato ? { background: '#FBE2E2', color: '#9B1C1C' } : { background: '#F3F5F9', color: '#9AA7B5' }}>Non firmato</button>
              </div>
            </div>
          </div>
        </div>

        {/* AREA DI COPERTURA (mappa intatta) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">Area di copertura</p>
            {messaggio && <span className="text-xs font-semibold" style={{ color: messaggio.ok ? '#1F7A43' : '#C0392B' }}>{messaggio.testo}</span>}
          </div>
          <MappaComuni coperturaIniziale={copertura} onSalva={salvaCopertura} />
        </div>
      </div>
    </main>
  )
}

function Campo({ label, value, onChange, cols = 1, maxLength, textarea = false }: { label: string; value: string; onChange: (v: string) => void; cols?: 1 | 2; maxLength?: number; textarea?: boolean }) {
  return (
    <div className={cols === 2 ? 'col-span-2' : ''}>
      <label className="block text-[11px] font-medium text-gray-500 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white resize-none" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
      )}
    </div>
  )
}

function StatBox({ valore, label }: { valore: number | string; label: string }) {
  return (
    <div className="rounded-xl py-2.5" style={{ background: '#F9FAFB' }}>
      <div className="text-lg font-bold text-gray-900">{valore}</div>
      <div className="text-[10.5px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}
