'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AiutoWhatsApp from '../components/AiutoWhatsApp'

// Campo a pillola condiviso con la pagina di login
const CAMPO_PILLOLA = 'group flex items-center gap-2.5 rounded-full px-[18px] py-[13px] bg-[#F9FAFB] border-[1.5px] border-[#E5E7EB] transition-[border-color,background-color,box-shadow] duration-150 focus-within:bg-white focus-within:border-[#2563eb] focus-within:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]'
const ICONA_CAMPO = 'flex-shrink-0 text-[#9AA7B5] group-focus-within:text-[#2563eb] transition-colors'

const ATTESA_RINVIO = 60 // secondi prima di poter rimandare il link

export default function RecuperaPassword() {
  const [email, setEmail] = useState('')
  const [inviata, setInviata] = useState(false)
  const [invioInCorso, setInvioInCorso] = useState(false)
  const [errore, setErrore] = useState('')
  const [secondi, setSecondi] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function avviaConto() {
    setSecondi(ATTESA_RINVIO)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSecondi(s => {
        if (s <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0 }
        return s - 1
      })
    }, 1000)
  }

  async function handleInvia() {
    setErrore('')
    const pulita = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pulita)) {
      setErrore('Scrivi un indirizzo email valido')
      return
    }

    setInvioInCorso(true)
    const { error } = await supabase.auth.resetPasswordForEmail(pulita, {
      redirectTo: `${window.location.origin}/nuova-password`,
    })
    setInvioInCorso(false)

    // Per riservatezza non diciamo mai se l'email esiste o no: si va sempre
    // alla conferma. Fermiamo solo gli errori di rete o di troppe richieste.
    if (error) {
      const msg = error.message || ''
      if (msg.includes('rate') || msg.includes('security purposes')) {
        setErrore('Hai già chiesto un link da poco. Aspetta un minuto e riprova.')
        return
      }
      if (msg.includes('fetch') || msg.includes('network')) {
        setErrore('Errore di connessione. Controlla la rete e riprova.')
        return
      }
    }

    setInviata(true)
    avviaConto()
  }

  const formatoConto = `${Math.floor(secondi / 60)}:${String(secondi % 60).padStart(2, '0')}`

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
            <div className="text-sm font-semibold leading-tight">Recupera la password</div>
          </div>
        </div>

        <div className="px-6 pt-7 pb-8">

          {!inviata ? (
            <>
              {/* RICHIESTA */}
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3.5 flex items-center justify-center" style={{ background: '#DBEAFE' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h1 className="text-[21px] font-bold text-center" style={{ color: '#0F1B33' }}>Hai dimenticato la password?</h1>
              <p className="text-[13.5px] text-center text-gray-500 mt-1.5 mb-6 leading-relaxed">
                Succede a tutti. Scrivi la tua email e ti mandiamo subito un link per sceglierne una nuova.
              </p>

              <label className="block text-xs font-semibold text-gray-700 mb-1.5 ml-1">Email</label>
              <div className={`${CAMPO_PILLOLA} mb-5`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={ICONA_CAMPO}>
                  <rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" />
                </svg>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrore('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInvia() }}
                  className="flex-1 min-w-0 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400"
                  placeholder="nome@email.it"
                />
              </div>

              {errore && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl" style={{ background: '#FEF6F6', border: '1.5px solid #F3C8C8' }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="text-sm" style={{ color: '#C0392B' }}>{errore}</span>
                </div>
              )}

              <button onClick={handleInvia} disabled={invioInCorso} className="btn-pagina">
                {invioInCorso ? 'Invio in corso...' : 'Inviami il link'}
              </button>
            </>
          ) : (
            <>
              {/* CONFERMA */}
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3.5 flex items-center justify-center" style={{ background: '#DBEAFE' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" />
                </svg>
              </div>
              <h1 className="text-[21px] font-bold text-center" style={{ color: '#0F1B33' }}>Controlla la tua email</h1>
              <p className="text-[13.5px] text-center text-gray-500 mt-1.5 mb-6 leading-relaxed">
                Abbiamo mandato il link a<br />
                <b className="text-gray-900">{email.trim().toLowerCase()}</b>
              </p>

              <div className="flex items-start gap-3 rounded-2xl p-4 mb-5" style={{ background: '#EFF6FF', border: '1.5px solid #DBEAFE' }}>
                <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#DBEAFE' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900 mb-0.5">Non la vedi?</div>
                  <div className="text-[12.5px] text-gray-600 leading-relaxed">Può metterci qualche minuto. Guarda anche nella posta indesiderata (spam).</div>
                </div>
              </div>

              {secondi > 0 ? (
                <button disabled className="w-full rounded-full py-[15px] text-base font-semibold" style={{ background: '#E8ECF3', color: '#5B6779' }}>
                  Rimanda il link ({formatoConto})
                </button>
              ) : (
                <button onClick={handleInvia} disabled={invioInCorso} className="btn-pagina">
                  {invioInCorso ? 'Invio in corso...' : 'Rimanda il link'}
                </button>
              )}
            </>
          )}

          <Link href="/login" className="block text-center text-[13px] mt-[18px]" style={{ color: '#5B6779' }}>
            Ricordi la password? <b className="font-semibold text-blue-600">Torna ad Accedi</b>
          </Link>

        </div>
      </div>

      <AiutoWhatsApp />
    </main>
  )
}
