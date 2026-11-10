import { supabase } from '@/lib/supabase'

// ============================================================
// ⭐ 07/11 (Davide): ULTIMO PASSO dei flussi. Se l'email ha già un account
// (per esempio una prova precedente, o un cliente che torna), non si blocca
// con "User already registered": si prova ad ENTRARE con la password scritta.
// Se è quella giusta, la richiesta si aggancia a quell'account; se no, il
// flusso cambia faccia (solo email e password, "Accedi e invia").
// Condiviso da /inizia e /vendi-auto (regola 29).
// ============================================================

/** L'email esiste già e la password scritta non è la sua */
export class EmailGiaRegistrata extends Error {
  constructor() {
    super('Questa email ha già un account e la password non è quella.')
    this.name = 'EmailGiaRegistrata'
  }
}

/** `nuovo` = l'account è nato adesso (non era un cliente che è rientrato):
 *  serve a sapere se, a salvataggio fallito, va tolto (annullaRegistrazione). */
export async function registraOAccedi(email: string, password: string): Promise<{ id: string; nuovo: boolean }> {
  const { data: reg, error: errReg } = await supabase.auth.signUp({ email, password })
  if (!errReg) {
    const id = reg.user?.id
    if (!id) throw new Error('Utente non creato')
    return { id, nuovo: true }
  }
  const m = (errReg.message || '').toLowerCase()
  const giaRegistrata = m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists')
  if (!giaRegistrata) throw errReg

  // già registrata: proviamo ad entrare con la password scritta
  const { data: acc, error: errAcc } = await supabase.auth.signInWithPassword({ email, password })
  if (errAcc || !acc.user) throw new EmailGiaRegistrata()
  return { id: acc.user.id, nuovo: false }
}

// ⭐ 08/11 (Davide): l'account nasce PRIMA del salvataggio della richiesta.
// Se il salvataggio fallisce, l'account appena creato va tolto subito, se no
// resta orfano e al tentativo dopo il sito dice "email già registrata".
// Il server (/api/annulla-registrazione) cancella solo chi chiama, solo se
// è nato da pochi minuti e non ha né pratiche né valutazioni. Non lancia mai:
// è una pulizia, l'errore vero resta quello del salvataggio.
export async function annullaRegistrazione(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/annulla-registrazione', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
    const esito = await res.json().catch(() => null)
    if (esito?.eliminato) await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // pulizia non riuscita: l'account resta, lo toglie l'admin con "Pulisci account senza pratiche"
  }
}
