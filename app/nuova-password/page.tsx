'use client'

/**
 * Pagina di atterraggio del link "password dimenticata".
 * Il link email contiene i token nell'URL: supabase-js li rileva e crea
 * la sessione; qui il cliente sceglie la nuova password ed entra
 * direttamente nella sua area (stessa meccanica di /imposta-password,
 * che resta per gli inviti dei demolitori).
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AiutoWhatsApp from '../components/AiutoWhatsApp'

type Fase = 'verifica' | 'pronta' | 'link_non_valido'

const CAMPO_PILLOLA = 'group flex items-center gap-2.5 rounded-full px-[18px] py-[13px] bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] transition-[border-color,background-color,box-shadow] duration-150 focus-within:bg-white focus-within:border-[#2563eb] focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]'
const ICONA_CAMPO = 'flex-shrink-0 text-[#9AA7B5] group-focus-within:text-[#2563eb] transition-colors'

const LUNGHEZZA_MINIMA = 8

export default function NuovaPassword() {
  const router = useRouter()
  const [fase, setFase] = useState<Fase>('verifica')
  const [password, setPassword] = useState('')
  const [mostraPassword, setMostraPassword] = useState(false)
  const [errore, setErrore] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let annullato = false

    // Il parsing dei token nell'URL da parte di supabase-js è asincrono:
    // ascoltiamo l'evento di login e in parallelo controlliamo la sessione.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessione) => {
      if (sessione && !annullato) setFase('pronta')
    })

    async function verifica() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session && !annullato) { setFase('pronta'); return }

      // Fallback flusso PKCE: token come ?code= nella query
      const code = new URLSearchParams(window.location.search).get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && !annullato) { setFase('pronta'); return }
      }

      // Ultimo tentativo dopo che supabase-js ha processato l'hash
      setTimeout(async () => {
        if (annullato) return
        const { data: { session: s2 } } = await supabase.auth.getSession()
        setFase(prev => (prev === 'pronta' ? prev : s2 ? 'pronta' : 'link_non_valido'))
      }, 2500)
    }
    verifica()

    return () => {
      annullato = true
      sub.subscription.unsubscribe()
    }
  }, [])

  async function handleSalva() {
    setErrore('')
    if (password.length < LUNGHEZZA_MINIMA) {
      setErrore(`La password deve avere almeno ${LUNGHEZZA_MINIMA} caratteri.`)
      return
    }

    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      const msg = error.message || ''
      if (msg.includes('different from the old')) {
        setErrore('Questa è la password che usavi già: scrivine una diversa.')
      } else {
        setErrore('Non siamo riusciti a salvare la password. Riprova tra qualche istante.')
      }
      setSalvando(false)
      return
    }

    // Si entra direttamente nella propria area, in base al ruolo
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    let destinazione = '/dashboard'
    if (userId) {
      const { data: u } = await supabase.from('utenti').select('tipo').eq('id', userId).single()
      if (u?.tipo === 'demolitore') destinazione = '/demolitore'
      else if (u?.tipo === 'admin') destinazione = '/admin'
    }
    router.push(destinazione)
  }

  const lunghezzaOk = password.length >= LUNGHEZZA_MINIMA

  return (
    <main className="min-h-screen flex justify-center sm:p-4 sm:pt-6 bg-white sm:bg-[linear-gradient(135deg,#e0e7ff_0%,#ddd6fe_100%)]">
      <div className="w-full sm:max-w-md bg-white sm:rounded-3xl sm:shadow-lg overflow-hidden min-h-screen sm:min-h-0" style={{ alignSelf: 'flex-start' }}>

        {/* BANNER SOTTILE (pagina di passaggio) */}
        <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          <Link
            href="/login"
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/30"
            style={{ background: 'rgba(255,255,255,0.18)' }}
            aria-label="Torna ad Accedi"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">NoiDemoliamo</div>
            <div className="text-sm font-semibold leading-tight">Nuova password</div>
          </div>
        </div>

        <div className="px-6 pt-7 pb-8">

          {fase === 'verifica' && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Verifica del link in corso…</p>
            </div>
          )}

          {fase === 'link_non_valido' && (
            <>
              <div className="flex items-start gap-2.5 rounded-xl p-3 mb-5 text-[13.5px] leading-relaxed" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Questo link non è più valido (è scaduto o è già stato usato). Chiedine uno nuovo: ci vuole un attimo.</span>
              </div>
              <Link href="/recupera-password" className="btn-pagina text-center">
                Richiedi un nuovo link
              </Link>
            </>
          )}

          {fase === 'pronta' && (
            <>
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3.5 flex items-center justify-center" style={{ background: '#DBEAFE' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <h1 className="text-[21px] font-bold text-center" style={{ color: '#0F1B33' }}>Scegli la nuova password</h1>
              <p className="text-[13.5px] text-center text-gray-500 mt-1.5 mb-6 leading-relaxed">
                La userai da adesso in poi per entrare nella tua area.
              </p>

              <label className="block text-xs font-semibold text-gray-700 mb-1.5 ml-1">Nuova password</label>
              <div className={`${CAMPO_PILLOLA} mb-2.5`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={ICONA_CAMPO}>
                  <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={mostraPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrore('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSalva() }}
                  className="flex-1 min-w-0 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400"
                  placeholder={`Almeno ${LUNGHEZZA_MINIMA} caratteri`}
                />
                <button type="button" onClick={() => setMostraPassword(v => !v)} className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors" aria-label={mostraPassword ? 'Nascondi password' : 'Mostra password'}>
                  {mostraPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /><path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 mb-5 ml-1 text-[12.5px]" style={{ color: lunghezzaOk ? '#1F7A43' : '#6B7280' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={lunghezzaOk ? '#16A34A' : '#9CA3AF'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Almeno {LUNGHEZZA_MINIMA} caratteri
              </div>

              {errore && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="text-sm" style={{ color: '#C0392B' }}>{errore}</span>
                </div>
              )}

              <button onClick={handleSalva} disabled={salvando} className="btn-pagina">
                {salvando ? 'Salvataggio…' : 'Salva ed entra'}
              </button>
            </>
          )}

        </div>
      </div>

      <AiutoWhatsApp />
    </main>
  )
}
