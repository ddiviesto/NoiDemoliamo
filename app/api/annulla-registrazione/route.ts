/**
 * Endpoint server-side: ANNULLA UNA REGISTRAZIONE APPENA FATTA.
 *
 * ⭐ 08/11 (Davide): nei moduli (/inizia e /vendi-auto) l'account nasce PRIMA
 * del salvataggio della richiesta. Se il salvataggio fallisce, l'account
 * restava lì orfano e al tentativo dopo il sito diceva "email già
 * registrata". Ora, a salvataggio fallito, il modulo chiama questo endpoint
 * e l'account appena creato sparisce.
 *
 * Chi chiama cancella SOLO SÉ STESSO (l'utente del token), e solo se:
 *   - non è l'admin né un operatore (demolitore, commerciante, collaboratore)
 *   - l'accesso è nato da pochi minuti
 *   - non ha nessuna pratica né richiesta di valutazione
 * In tutti gli altri casi non tocca niente e risponde eliminato: false.
 *
 * Sicurezza: SUPABASE_SERVICE_ROLE_KEY + utente verificato via Authorization.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'
const RUOLI_PROTETTI = ['admin', 'demolitore', 'commerciante', 'collaboratore']
const MINUTI_MASSIMI = 15

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await supabaseUser.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const no = (motivo: string) => NextResponse.json({ eliminato: false, motivo })

    if (user.email === ADMIN_EMAIL) return no('protetto')
    const natoDa = Date.now() - new Date(user.created_at).getTime()
    if (!(natoDa >= 0 && natoDa < MINUTI_MASSIMI * 60 * 1000)) return no('non è una registrazione appena fatta')

    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: scheda } = await supabase.from('utenti').select('tipo').eq('id', user.id).maybeSingle()
    if (scheda?.tipo && RUOLI_PROTETTI.includes(scheda.tipo)) return no('protetto')

    const [{ count: nPratiche, error: e1 }, { count: nValutazioni, error: e2 }] = await Promise.all([
      supabase.from('pratiche').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('veicoli_vendita').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    // se non si riesce a contare non si cancella: meglio un account in più che una richiesta orfana
    if (e1 || e2) return no('controllo non riuscito')
    if ((nPratiche || 0) > 0 || (nValutazioni || 0) > 0) return no('ha già una richiesta')

    await supabase.from('utenti').delete().eq('id', user.id)
    const { error: errAuth } = await supabase.auth.admin.deleteUser(user.id)
    if (errAuth) {
      console.error('annulla-registrazione, accesso non cancellato:', errAuth.message)
      return no('accesso non cancellato')
    }
    return NextResponse.json({ eliminato: true })
  } catch (e) {
    console.error('annulla-registrazione:', e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
