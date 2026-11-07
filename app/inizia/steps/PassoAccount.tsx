'use client'

// ============================================================
// I PEZZI DELL'ULTIMO PASSO quando l'email è già registrata
// (⭐ 07/11, mockup scelto da Davide; condivisi da /inizia e /vendi-auto)
//
// - SchedaChi: il cliente è GIÀ DENTRO (sessione aperta). Niente campi: una
//   riga dice a nome di chi parte la richiesta, con "Non sei tu? Esci".
// - CampiAccesso: ha scritto un'email che HA GIÀ UN ACCOUNT e la password non
//   è quella. Nome e telefono spariscono, l'avviso sta sul campo email,
//   resta la password, sotto "Recupera la password" e "Usa un'altra email".
// ============================================================

import Link from 'next/link'
import { CampoModulo, classeCampo } from './PezziFlusso'

function iniziali(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '·'
}

export function SchedaChi({ nome, email, telefono, onEsci }: { nome: string; email: string; telefono: string; onEsci: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-white" style={{ border: '1.5px solid #E5E7EB', borderRadius: 16, padding: '12px 14px', boxShadow: '0 1px 3px rgba(16,24,40,0.07)' }}>
      <span className="flex items-center justify-center flex-shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: '#DBEAFE', color: '#1E4E8C', fontWeight: 700, fontSize: 14 }}>{iniziali(nome || email)}</span>
      <span className="flex-1 min-w-0">
        <span className="block truncate" style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{nome || 'Il tuo account'}</span>
        <span className="block truncate" style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{[email, telefono].filter(Boolean).join(' · ')}</span>
      </span>
      <button type="button" onClick={onEsci} className="flex-shrink-0 transition-colors hover:bg-blue-100" style={{ fontSize: 12.5, fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 999, padding: '7px 12px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
        Non sei tu? Esci
      </button>
    </div>
  )
}

export function CampiAccesso({ email, password, onEmail, onPassword, mostra, onMostra, erroreEmail, errorePassword, onUsaAltraEmail }: {
  email: string
  password: string
  onEmail: (v: string) => void
  onPassword: (v: string) => void
  mostra: boolean
  onMostra: () => void
  // undefined = l'avviso standard "ha già un account"; stringa = un altro testo (es. password sbagliata)
  erroreEmail?: string
  errorePassword?: boolean
  onUsaAltraEmail: () => void
}) {
  return (
    <>
      <CampoModulo label="La tua email" errore={erroreEmail ?? 'Questa email ha già un account. Scrivi qui sotto la password di quell’account: la richiesta finirà nella tua area personale insieme alle altre.'}>
        <input type="email" inputMode="email" autoComplete="email" value={email} onChange={e => onEmail(e.target.value)} placeholder="mario@email.it" className={classeCampo(true)} />
      </CampoModulo>
      <CampoModulo label="La password del tuo account" aiutoTipo={errorePassword ? 'errore' : undefined} aiuto={errorePassword ? 'La password non è quella: riprova, oppure recuperala qui sotto.' : undefined}>
        <div className="relative">
          <input
            type={mostra ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={e => onPassword(e.target.value)}
            placeholder="La tua password"
            className={classeCampo(!!errorePassword, 'pr-20')}
          />
          <button type="button" onClick={onMostra} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: '#1D4ED8' }} aria-label={mostra ? 'Nascondi password' : 'Mostra password'}>
            {mostra ? 'Nascondi' : 'Mostra'}
          </button>
        </div>
      </CampoModulo>
      <p className="text-center" style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 0' }}>
        Non la ricordi? <Link href="/recupera-password" className="font-bold underline" style={{ color: '#1D4ED8' }}>Recupera la password</Link>
        {' · '}
        <button type="button" onClick={onUsaAltraEmail} className="font-bold underline" style={{ color: '#1D4ED8', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13 }}>Usa un&apos;altra email</button>
      </p>
    </>
  )
}
