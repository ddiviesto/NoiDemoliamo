/**
 * Endpoint server-side: ACCESSO all'area demolitore (stato + revoca).
 *
 * azione 'stato'  → il demolitore ha un account di accesso? (LED verde/rosso
 *                   nella scheda admin: la verità sta in utenti.demolitore_id,
 *                   che il client admin non può leggere per RLS)
 * azione 'revoca' → spegne SOLO il login (righe utenti + account auth).
 *                   La scheda demolitore resta intatta e le pratiche storiche
 *                   restano collegate a lui: è la via di mezzo tra "Non attivo"
 *                   e l'eliminazione definitiva. Un nuovo "Invita all'area"
 *                   ricrea l'accesso quando serve.
 *
 * Sicurezza: SUPABASE_SERVICE_ROLE_KEY + verifica admin via Authorization.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const demolitoreId: string | undefined = body.demolitore_id
    const azione: string = body.azione || 'stato'
    if (!demolitoreId) {
      return NextResponse.json({ error: 'demolitore_id mancante' }, { status: 400 })
    }

    // Verifica admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user } } = await supabaseUser.auth.getUser(token)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Account di accesso collegati alla scheda demolitore
    const { data: account } = await supabase.from('utenti').select('id, email').eq('demolitore_id', demolitoreId)

    if (azione === 'stato') {
      return NextResponse.json({
        success: true,
        accesso: (account || []).length > 0,
        email: account?.[0]?.email || null,
      })
    }

    if (azione === 'revoca') {
      if (!account || account.length === 0) {
        return NextResponse.json({ error: 'Questo demolitore non ha un accesso da revocare' }, { status: 404 })
      }
      for (const a of account) {
        await supabase.from('utenti').delete().eq('id', a.id)
        try { await supabase.auth.admin.deleteUser(a.id) } catch (e) { console.warn('deleteUser:', e) }
      }
      // La scheda torna "mai invitata": un nuovo invito ricrea l'accesso
      await supabase.from('demolitori').update({ invito_inviato_il: null }).eq('id', demolitoreId)
      return NextResponse.json({ success: true, revocati: account.length })
    }

    return NextResponse.json({ error: `Azione sconosciuta: ${azione}` }, { status: 400 })
  } catch (err) {
    console.error('Errore endpoint accesso-demolitore:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
