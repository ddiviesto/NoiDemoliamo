'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

interface Demolitore {
  id: string
  ragione_sociale: string
  email: string | null
  telefono: string | null
  citta: string | null
  provincia: string | null
  stato: string
  fee_per_pratica: number
  contratto_firmato: boolean
  creato_il: string
}

export default function GestioneDemolitori() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [demolitori, setDemolitori] = useState<Demolitore[]>([])
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    ragione_sociale: '',
    email: '',
    telefono: '',
    indirizzo: '',
    citta: '',
    provincia: '',
    cap: '',
    fee_per_pratica: '',
    note: '',
  })

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('demolitori')
        .select('*')
        .order('creato_il', { ascending: false })
      if (data) setDemolitori(data)
      setLoading(false)
    }
    carica()
  }, [router])

  async function salva() {
    if (!form.ragione_sociale.trim()) return
    setSalvando(true)
    const { error } = await supabase.from('demolitori').insert({
      ragione_sociale: form.ragione_sociale,
      email: form.email || null,
      telefono: form.telefono || null,
      indirizzo: form.indirizzo || null,
      citta: form.citta || null,
      provincia: form.provincia || null,
      cap: form.cap || null,
      fee_per_pratica: parseFloat(form.fee_per_pratica) || 0,
      note: form.note || null,
      stato: 'in_attesa',
      contratto_firmato: false,
    })
    if (!error) {
      const { data } = await supabase.from('demolitori').select('*').order('creato_il', { ascending: false })
      if (data) setDemolitori(data)
      setForm({ ragione_sociale: '', email: '', telefono: '', indirizzo: '', citta: '', provincia: '', cap: '', fee_per_pratica: '', note: '' })
      setShowForm(false)
    }
    setSalvando(false)
  }

  const STATO_COLOR: Record<string, string> = {
    attivo: 'bg-green-100 text-green-800',
    in_attesa: 'bg-yellow-100 text-yellow-800',
    sospeso: 'bg-red-100 text-red-800',
  }

  if (loading) return (
    <main className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
      <div className="text-gray-400 text-sm">Caricamento...</div>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#f0f4f8]">
      <div className="bg-[#0d2144] px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/admin')} className="text-blue-300 hover:text-white transition-colors text-sm">
          ← Indietro
        </button>
        <span className="text-white font-medium text-sm">Gestione demolitori</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Demolitori</h1>
            <p className="text-sm text-gray-500 mt-0.5">{demolitori.length} demolitori registrati</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            + Aggiungi demolitore
          </button>
        </div>

        {/* FORM NUOVO DEMOLITORE */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Nuovo demolitore</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Ragione sociale *</label>
                <input type="text" value={form.ragione_sociale} onChange={e => setForm(f => ({ ...f, ragione_sociale: e.target.value }))} placeholder="Es. Rossi Demolizioni Srl" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@demolizioni.it" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telefono</label>
                <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="333 1234567" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Indirizzo sede</label>
                <input type="text" value={form.indirizzo} onChange={e => setForm(f => ({ ...f, indirizzo: e.target.value }))} placeholder="Via Roma 1" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Città</label>
                <input type="text" value={form.citta} onChange={e => setForm(f => ({ ...f, citta: e.target.value }))} placeholder="Roma" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Provincia</label>
                <input type="text" value={form.provincia} onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))} placeholder="RM" maxLength={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white uppercase" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">CAP</label>
                <input type="text" value={form.cap} onChange={e => setForm(f => ({ ...f, cap: e.target.value }))} placeholder="00100" maxLength={5} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fee per pratica (€)</label>
                <input type="number" value={form.fee_per_pratica} onChange={e => setForm(f => ({ ...f, fee_per_pratica: e.target.value }))} placeholder="50" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Note</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Note interne..." rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-blue-500 focus:bg-white resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={salva} disabled={salvando || !form.ragione_sociale} className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${!salvando && form.ragione_sociale ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {salvando ? 'Salvataggio...' : 'Salva demolitore'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all">
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* LISTA DEMOLITORI */}
        {demolitori.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🏭</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Nessun demolitore</h2>
            <p className="text-sm text-gray-500">Aggiungi il primo demolitore per iniziare.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {demolitori.map(d => (
              <div key={d.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-bold text-gray-900">{d.ragione_sociale}</span>
                    {d.citta && <span className="text-sm text-gray-400 ml-2">· {d.citta} ({d.provincia})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${STATO_COLOR[d.stato] || 'bg-gray-100 text-gray-600'}`}>
                      {d.stato === 'attivo' ? 'Attivo' : d.stato === 'in_attesa' ? 'In attesa' : 'Sospeso'}
                    </span>
                    {d.contratto_firmato && <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg">📝 Contratto firmato</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {d.email && <span>✉️ {d.email}</span>}
                  {d.telefono && <span>📞 {d.telefono}</span>}
                  <span>💶 {d.fee_per_pratica}€/pratica</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}