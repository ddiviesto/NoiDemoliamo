'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AiutoWhatsApp from '../components/AiutoWhatsApp'

// Campo a pillola: si "accende" quando il cliente ci scrive dentro
const CAMPO_PILLOLA = 'group flex items-center gap-2.5 rounded-full px-[18px] py-[13px] bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] transition-[border-color,background-color,box-shadow] duration-150 focus-within:bg-white focus-within:border-[#2563eb] focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]'
const ICONA_CAMPO = 'flex-shrink-0 text-[#9AA7B5] group-focus-within:text-[#2563eb] transition-colors'

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
    } else if (utenteData?.tipo === 'demolitore') {
      router.push('/demolitore')
    } else {
      router.push('/dashboard')
    }

    setCaricamento(false)
  }

  return (
    <main className="min-h-screen flex justify-center sm:p-4 sm:pt-6 bg-white sm:bg-[linear-gradient(135deg,#e0e7ff_0%,#ddd6fe_100%)]">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl sm:shadow-lg overflow-hidden min-h-screen sm:min-h-0" style={{ alignSelf: 'flex-start' }}>

        {/* TESTATA BLU ALTA col benvenuto e il logo a cavallo (mockup approvato) */}
        <div className="relative text-white px-4 pt-3.5 pb-12" style={{ background: 'linear-gradient(120deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%)' }}>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/30"
              style={{ background: 'rgba(255,255,255,0.18)' }}
              aria-label="Torna alla home"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="marchio marchio--chiaro marchio--occhiello text-[10px]">NoiDemoliamo</div>
          </div>
          <h1 className="text-[22px] font-bold mt-4 leading-tight">Bentornato</h1>
          <p className="text-[13px] mt-1" style={{ color: '#DBEAFE' }}>Entra nella tua area personale</p>
          <div className="absolute left-6 -bottom-[37px] w-[74px] h-[74px] bg-white rounded-[20px] flex items-center justify-center" style={{ boxShadow: '0 8px 20px rgba(16,24,40,0.18)' }}>
            <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={58} height={58} className="rounded-2xl" priority />
          </div>
        </div>

        <div className="px-6 pt-14 pb-8">

          {/* EMAIL */}
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 ml-1">Email</label>
          <div className={`${CAMPO_PILLOLA} mb-4`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={ICONA_CAMPO}>
              <rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" />
            </svg>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400"
              placeholder="nome@email.it"
            />
          </div>

          {/* PASSWORD */}
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 ml-1">Password</label>
          <div className={`${CAMPO_PILLOLA} mb-2.5`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={ICONA_CAMPO}>
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

          {/* PASSWORD DIMENTICATA */}
          <div className="flex justify-end mb-5 mr-1">
            <Link href="/recupera-password" className="text-[13px] font-semibold text-blue-600 hover:text-blue-700">
              Password dimenticata?
            </Link>
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
            className="btn-pagina"
          >
            {caricamento ? 'Accesso in corso...' : 'Accedi'}
          </button>

        </div>
      </div>

      <AiutoWhatsApp />
    </main>
  )
}
