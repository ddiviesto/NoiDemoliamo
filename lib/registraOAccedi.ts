import { supabase } from '@/lib/supabase'

// ============================================================
// ⭐ 07/11 (Davide): ULTIMO PASSO dei flussi. Se l'email ha già un account
// (per esempio una prova precedente, o un cliente che torna), non si blocca
// con "User already registered": si prova ad ENTRARE con la password scritta.
// Se è quella giusta, la richiesta si aggancia a quell'account; se no, il
// messaggio dice cosa fare. Condiviso da /inizia e /vendi-auto (regola 29).
// ============================================================

export async function registraOAccedi(email: string, password: string): Promise<string> {
  const { data: reg, error: errReg } = await supabase.auth.signUp({ email, password })
  if (!errReg) {
    const id = reg.user?.id
    if (!id) throw new Error('Utente non creato')
    return id
  }
  const m = (errReg.message || '').toLowerCase()
  const giaRegistrata = m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists')
  if (!giaRegistrata) throw errReg

  // già registrata: proviamo ad entrare con la password scritta
  const { data: acc, error: errAcc } = await supabase.auth.signInWithPassword({ email, password })
  if (errAcc || !acc.user) {
    throw new Error('Questa email ha già un account, ma la password non è quella: accedi dalla pagina Accedi (o recupera la password) e poi rifai la richiesta.')
  }
  return acc.user.id
}
