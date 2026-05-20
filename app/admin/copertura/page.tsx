'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MappaCopertura, { RecordCopertura } from './MappaCopertura'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

export default function PaginaCoperturaAdmin() {
  const router = useRouter()
  const [records, setRecords] = useState<RecordCopertura[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.email !== ADMIN_EMAIL) {
        router.push('/login')
        return
      }
      // Leggiamo tutti i record di copertura di tutti i demolitori in una sola query
      const { data, error } = await supabase
        .from('demolitori_comuni')
        .select('demolitore_id, comune, provincia, tipo')
      if (error) {
        console.error('Errore lettura coperture:', error)
        setRecords([])
      } else {
        setRecords((data || []) as RecordCopertura[])
      }
      setLoading(false)
    }
    carica()
  }, [router])

  return (
    <main className="min-h-screen bg-[#f0f4f8]">
      <div className="bg-[#0d2144] px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/admin')}
          className="text-blue-300 hover:text-white transition-colors text-sm"
        >
          ← Indietro
        </button>
        <span className="text-white font-medium text-sm">Copertura territoriale</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-semibold text-gray-800 flex items-center gap-2 text-lg">
              <span>🗺️</span> Mappa copertura demolitori
            </h1>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Visualizza dove i demolitori coprono il territorio e individua le zone scoperte
            dove vale la pena cercare nuovi collaboratori.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <div className="text-sm text-gray-400">Caricamento dati...</div>
              </div>
            </div>
          ) : (
            <MappaCopertura recordCopertura={records} />
          )}
        </div>
      </div>
    </main>
  )
}