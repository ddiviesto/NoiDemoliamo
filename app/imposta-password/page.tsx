'use client'

/**
 * Pagina di atterraggio del link di invito (o recovery) Supabase.
 * Il link contiene i token nell'URL: supabase-js li rileva e crea la
 * sessione; qui l'utente sceglie la password e viene portato nella sua area.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Fase = 'verifica' | 'pronta' | 'link_non_valido'

export default function ImpostaPassword() {
  const router = useRouter()
  const [fase, setFase] = useState<Fase>('verifica')
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
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
    if (password.length < 6) { setErrore('La password deve avere almeno 6 caratteri.'); return }
    if (password !== conferma) { setErrore('Le due password non coincidono.'); return }

    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setErrore('Non siamo riusciti a salvare la password. Riprova tra qualche istante.')
      setSalvando(false)
      return
    }

    // Redirect in base al ruolo
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

  const inputBox: React.CSSProperties = { background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '11px 12px' }

  return (
    <main className="min-h-screen flex justify-center p-4 pt-6" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg overflow-hidden" style={{ alignSelf: 'flex-start' }}>

        {/* HEADER BLU (stile login) */}
        <div className="px-4 py-3 flex items-center gap-3 text-white" style={{ background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)' }}>
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100">NoiDemoliamo</div>
            <div className="text-sm font-semibold leading-tight">Imposta la tua password</div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-4">
            <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={88} height={88} className="rounded-2xl" priority />
          </div>

          {fase === 'verifica' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Verifica del link in corso…</p>
            </div>
          )}

          {fase === 'link_non_valido' && (
            <div className="py-4">
              <div className="flex items-start gap-2.5 rounded-xl p-3 text-[13.5px] leading-relaxed" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8', color: '#9B1C1C' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                <span>Questo link non è più valido (è scaduto o è già stato usato). Chiedi a NoiDemoliamo di mandarti un nuovo invito.</span>
              </div>
            </div>
          )}

          {fase === 'pronta' && (
            <>
              <h1 className="text-xl font-semibold text-center text-gray-900">Scegli la password</h1>
              <p className="text-sm text-center text-gray-500 mt-1 mb-5">La userai per accedere alla tua area</p>

              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nuova password</label>
              <div className="flex items-center gap-2.5 mb-3.5" style={inputBox}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA7B5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={mostraPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrore('') }}
                  className="flex-1 min-w-0 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400"
                  placeholder="Almeno 6 caratteri"
                />
                <button type="button" onClick={() => setMostraPassword(v => !v)} className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors" aria-label={mostraPassword ? 'Nascondi password' : 'Mostra password'}>
                  {mostraPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /><path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>

              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ripeti la password</label>
              <div className="flex items-center gap-2.5 mb-5" style={inputBox}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA7B5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <input
                  type={mostraPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={conferma}
                  onChange={e => { setConferma(e.target.value); setErrore('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSalva() }}
                  className="flex-1 min-w-0 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400"
                  placeholder="Stessa password"
                />
              </div>

              {errore && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  <span className="text-sm" style={{ color: '#C0392B' }}>{errore}</span>
                </div>
              )}

              <button
                onClick={handleSalva}
                disabled={salvando}
                className="btn-pagina"
              >
                {salvando ? 'Salvataggio…' : 'Salva e accedi'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
