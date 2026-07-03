'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
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
    <main className="min-h-screen flex justify-center p-4 pt-6" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg overflow-hidden" style={{ alignSelf: 'flex-start' }}>

        {/* HEADER BLU (stile banner /inizia) */}
        <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          <Link
            href="/"
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
            aria-label="Torna alla home"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">NoiDemoliamo</div>
            <div className="text-sm font-semibold leading-tight">Bentornato</div>
          </div>
        </div>

        <div className="p-6">

          {/* LOGO */}
          <div className="flex justify-center mb-4">
            <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={88} height={88} className="rounded-2xl" priority />
          </div>

          <h1 className="text-xl font-semibold text-center text-gray-900">Accedi</h1>
          <p className="text-sm text-center text-gray-500 mt-1 mb-5">Entra nella tua area personale</p>

          {/* EMAIL */}
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
          <div className="flex items-center gap-2.5 mb-3.5" style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '11px 12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA7B5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" />
            </svg>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400"
              placeholder="nome@email.it"
            />
          </div>

          {/* PASSWORD */}
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
          <div className="flex items-center gap-2.5 mb-5" style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '11px 12px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA7B5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              type={mostraPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
              className="flex-1 min-w-0 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400"
              placeholder="La tua password"
            />
            <button
              type="button"
              onClick={() => setMostraPassword(v => !v)}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={mostraPassword ? 'Nascondi password' : 'Mostra password'}
            >
              {mostraPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /><path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {errore && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-sm" style={{ color: '#C0392B' }}>{errore}</span>
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={caricamento}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50 active:scale-[0.99]"
          >
            {caricamento ? 'Accesso in corso...' : 'Accedi'}
          </button>

        </div>
      </div>
    </main>
  )
}
