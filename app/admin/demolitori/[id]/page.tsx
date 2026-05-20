'use client'

import { useEffect, useState } from 'react'
import MappaComuni, { CoperturaRecord } from './MappaComuni'
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

export default function DettaglioDemolitore() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [demolitore, setDemolitore] = useState<Demolitore | null>(null)
  // copertura = lista di record letti dalla tabella demolitori_comuni
  const [copertura, setCopertura] = useState<CoperturaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [messaggio, setMessaggio] = useState<string | null>(null)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) { router.push('/login'); return }

      const { data: dem } = await supabase.from('demolitori').select('*').eq('id', id).single()
      if (!dem) { router.push('/admin/demolitori'); return }
      setDemolitore(dem)

      // Carica la copertura del demolitore.
      const { data: cov } = await supabase
        .from('demolitori_comuni')
        .select('*')
        .eq('demolitore_id', id)
      if (cov) setCopertura(cov as CoperturaRecord[])

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

  // Salva la copertura dalla mappa: prima cancella tutti i vecchi record di
  // questo demolitore, poi inserisce quelli nuovi. Niente duplicati possibili.
  async function salvaCopertura(records: CoperturaRecord[]) {
    setSalvando(true)
    setMessaggio(null)
    try {
      const { error: errDel } = await supabase
        .from('demolitori_comuni')
        .delete()
        .eq('demolitore_id', id)
      if (errDel) throw errDel

      if (records.length > 0) {
        const righe = records.map(r => ({
          demolitore_id: id,
          comune: r.comune,
          provincia: r.provincia,
          tipo: r.tipo,
          fee_comune: r.fee_comune ?? null,
          distanza_km: r.distanza_km ?? null,
        }))
        const { error: errIns } = await supabase
          .from('demolitori_comuni')
          .insert(righe)
        if (errIns) throw errIns
      }

      const { data } = await supabase
        .from('demolitori_comuni')
        .select('*')
        .eq('demolitore_id', id)
      if (data) setCopertura(data as CoperturaRecord[])

      setMessaggio('✅ Copertura salvata correttamente')
      setTimeout(() => setMessaggio(null), 3000)
    } catch (err) {
      console.error('Errore salvataggio copertura:', err)
      setMessaggio('❌ Errore durante il salvataggio')
      setTimeout(() => setMessaggio(null), 4000)
    } finally {
      setSalvando(false)
    }
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
            {messaggio && (
              <span className={`text-xs font-medium ${messaggio.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {messaggio}
              </span>
            )}
          </div>
          <MappaComuni
            coperturaIniziale={copertura}
            onSalva={salvaCopertura}
          />
        </div>
      </div>
    </main>
  )
}