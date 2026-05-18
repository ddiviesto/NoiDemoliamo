'use client'

import { useEffect, useState } from 'react'
import MappaComuni from './MappaComuni'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

interface Demolitore {
  id: string
  ragione_sociale: string
  email: string | null
  telefono: string | null
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  cap: string | null
  stato: string
  fee_per_pratica: number
  contratto_firmato: boolean
  note: string | null
  velocita_media_giorni: number
  max_pratiche_settimanali: number
}

interface Comune {
  id: string
  comune: string
  provincia: string
  cap: string | null
  fee_comune: number | null
  distanza_km: number | null
}

export default function DettaglioDemolitore() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [demolitore, setDemolitore] = useState<Demolitore | null>(null)
  const [comuni, setComuni] = useState<Comune[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [showAddComune, setShowAddComune] = useState(false)
  const [nuovoComune, setNuovoComune] = useState({ comune: '', provincia: '', cap: '', fee_comune: '', distanza_km: '' })

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push('/login'); return }

      const { data: dem } = await supabase.from('demolitori').select('*').eq('id', id).single()
      if (!dem) { router.push('/admin/demolitori'); return }
      setDemolitore(dem)

      const { data: com } = await supabase.from('demolitori_comuni').select('*').eq('demolitore_id', id)
      if (com) setComuni(com)

      setLoading(false)
    }
    if (id) carica()
  }, [id, router])

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

  async function aggiornaFee(fee: number) {
    await supabase.from('demolitori').update({ fee_per_pratica: fee }).eq('id', id)
    setDemolitore(prev => prev ? { ...prev, fee_per_pratica: fee } : null)
  }

  async function aggiungiComune() {
    if (!nuovoComune.comune.trim()) return
    const { data } = await supabase.from('demolitori_comuni').insert({
      demolitore_id: id,
      comune: nuovoComune.comune,
      provincia: nuovoComune.provincia,
      cap: nuovoComune.cap || null,
      fee_comune: nuovoComune.fee_comune ? parseFloat(nuovoComune.fee_comune) : null,
      distanza_km: nuovoComune.distanza_km ? parseFloat(nuovoComune.distanza_km) : null,
    }).select().single()
    if (data) {
      setComuni(prev => [...prev, data])
      setNuovoComune({ comune: '', provincia: '', cap: '', fee_comune: '', distanza_km: '' })
      setShowAddComune(false)
    }
  }

  async function rimuoviComune(comuneId: string) {
    await supabase.from('demolitori_comuni').delete().eq('id', comuneId)
    setComuni(prev => prev.filter(c => c.id !== comuneId))
  }

  if (loading) return (
    <main className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
      <div className="text-gray-400 text-sm">Caricamento...</div>
    </main>
  )

  if (!demolitore) return null

  return (
    <main className="min-h-screen bg-[#f0f4f8]">
      <div className="bg-[#0d2144] px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/admin/demolitori')} className="text-blue-300 hover:text-white transition-colors text-sm">
          ← Indietro
        </button>
        <span className="text-white font-medium text-sm">{demolitore.ragione_sociale}</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-4">

        {/* DATI PRINCIPALI */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🏭</span> Dati demolitore
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Ragione sociale', val: demolitore.ragione_sociale },
              { label: 'Email', val: demolitore.email },
              { label: 'Telefono', val: demolitore.telefono },
              { label: 'Indirizzo', val: demolitore.indirizzo },
              { label: 'Città', val: demolitore.citta },
              { label: 'Provincia', val: demolitore.provincia },
              { label: 'CAP', val: demolitore.cap },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{item.label}</div>
                <div className="text-sm font-medium text-gray-800">{item.val || '—'}</div>
              </div>
            ))}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Fee per pratica (€)</div>
              <input
                type="number"
                defaultValue={demolitore.fee_per_pratica}
                onBlur={e => aggiornaFee(parseFloat(e.target.value))}
                className="text-sm font-medium text-gray-800 bg-transparent outline-none w-full"
              />
            </div>
          </div>
          {demolitore.note && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Note</div>
              <div className="text-sm text-gray-700">{demolitore.note}</div>
            </div>
          )}
        </div>

        {/* STATO E CONTRATTO */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>⚙️</span> Stato e contratto
          </h2>
          <div className="flex flex-col gap-3">

            {/* Stato */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Stato demolitore</label>
              <div className="flex gap-2">
                {[
                  { val: 'in_attesa', label: 'In attesa', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
                  { val: 'attivo', label: 'Attivo', color: 'bg-green-100 text-green-800 border-green-200' },
                  { val: 'sospeso', label: 'Sospeso', color: 'bg-red-100 text-red-800 border-red-200' },
                ].map(s => (
                  <button
                    key={s.val}
                    onClick={() => aggiornaStato(s.val)}
                    disabled={salvando}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${demolitore.stato === s.val ? s.color + ' border-2' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contratto */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Contratto</label>
              <div className="flex gap-2">
                <button
                  onClick={() => aggiornaContratto(true)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${demolitore.contratto_firmato ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                >
                  ✅ Contratto firmato
                </button>
                <button
                  onClick={() => aggiornaContratto(false)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${!demolitore.contratto_firmato ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                >
                  ❌ Non firmato
                </button>
              </div>
            </div>

          </div>
        </div>

{/* AREA DI COPERTURA */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <span>📍</span> Area di copertura
            </h2>
          </div>
          <MappaComuni
            onSalva={async (nuoviComuni) => {
              for (const c of nuoviComuni) {
                await supabase.from('demolitori_comuni').insert({
                  demolitore_id: id,
                  comune: c.comune,
                  provincia: c.provincia,
                  fee_comune: c.fee_comune || null,
                  distanza_km: c.distanza_km || null,
                })
              }
              const { data } = await supabase.from('demolitori_comuni').select('*').eq('demolitore_id', id)
              if (data) setComuni(data)
            }}
            comuniSalvati={comuni.map(c => c.comune)}
          />
</div>
      </div>
    </main>
  )
}