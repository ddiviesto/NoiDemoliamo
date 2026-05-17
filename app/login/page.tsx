'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const [caricamento, setCaricamento] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setCaricamento(true)
    setErrore('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrore('Email o password non corretti')
      setCaricamento(false)
      return
    }

    const userId = data.user?.id
    if (!userId) { setCaricamento(false); return }

    const { data: utenteData } = await supabase
      .from('utenti')
      .select('tipo')
      .eq('id', userId)
      .single()

    if (utenteData?.tipo === 'admin') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }

    setCaricamento(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md relative">
        <Link href="/" className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 transition text-2xl">
          ←
        </Link>
        <div className="flex justify-center mb-6">
          <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={120} height={120} className="rounded-xl" />
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Accedi</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              placeholder="la-tua@email.it"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {errore && <p className="text-red-500 text-sm">{errore}</p>}

          <button
            onClick={handleLogin}
            disabled={caricamento}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {caricamento ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Non hai un account?{' '}
          <Link href="/inizia" className="text-blue-600 font-semibold">Registrati</Link>
        </p>
      </div>
    </main>
  )
}