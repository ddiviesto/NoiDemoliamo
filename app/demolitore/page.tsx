'use client'

/**
 * AREA DEMOLITORE — fase 1: guscio con accesso e benvenuto.
 * La dashboard completa (pratiche assegnate, ritiri, certificati) è la fase 2:
 * questa pagina verifica il ruolo, saluta e spiega cosa arriverà.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AreaDemolitore() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')

  useEffect(() => {
    async function verifica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: u } = await supabase.from('utenti').select('nome, tipo').eq('id', session.user.id).single()
      if (u?.tipo !== 'demolitore') {
        router.push(u?.tipo === 'admin' ? '/admin' : '/dashboard')
        return
      }
      setNome(u?.nome || '')
      setLoading(false)
    }
    verifica()
  }, [router])

  async function esci() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen flex justify-center p-4 pt-6" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg overflow-hidden" style={{ alignSelf: 'flex-start' }}>

        <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M6 21V7l6-4 6 4v14" /><path d="M10 21v-6h4v6" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">NoiDemoliamo</div>
            <div className="text-sm font-semibold leading-tight truncate">Area demolitore</div>
          </div>
          <button onClick={esci} className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex-shrink-0 transition-colors">
            Esci
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-4">
            <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={72} height={72} className="rounded-2xl" priority />
          </div>

          <h1 className="text-xl font-semibold text-center text-gray-900">Benvenuto{nome ? `, ${nome}` : ''}</h1>
          <p className="text-sm text-center text-gray-500 mt-1 mb-5">Il tuo account è attivo</p>

          <div className="flex items-start gap-2.5 rounded-xl p-3 text-[13.5px] leading-relaxed mb-4" style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1E3A8A' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            <span>La tua dashboard è in preparazione. Qui a breve troverai le pratiche assegnate, i ritiri da fissare e il caricamento dei certificati. Per ora non devi fare nulla.</span>
          </div>

          <div className="flex flex-col gap-2">
            {[
              'Pratiche assegnate con tutti i dati del ritiro',
              'Fissare data e ora del ritiro',
              'Segnare il veicolo come ritirato',
              'Caricare certificati di rottamazione e PRA',
            ].map(t => (
              <div key={t} className="flex items-center gap-2.5">
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" /></svg>
                </span>
                <span className="text-[13.5px] text-gray-600">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
