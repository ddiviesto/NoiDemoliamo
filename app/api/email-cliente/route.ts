/**
 * Endpoint admin: email dell'account del cliente di una pratica.
 *
 * ⭐ 28/07 sera: la tendina del CRM mostrava "—" al posto dell'email — il
 * browser admin non può leggere la tabella `utenti` (RLS: ognuno vede solo
 * la propria riga). Come per gli altri dati riservati si passa da qui col
 * service role, SOLO admin. La fonte è l'account di LOGIN (Supabase Auth,
 * sempre aggiornato anche dopo un cambio email), con `utenti.email` come
 * riserva.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const praticaId: string | undefined = body.pratica_id
    if (!praticaId) return NextResponse.json({ error: 'Manca pratica_id' }, { status: 400 })

    // Solo admin
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user } } = await supabaseUser.auth.getUser(token)
    if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: pratica } = await supabase
      .from('pratiche')
      .select('user_id')
      .eq('id', praticaId)
      .single()
    if (!pratica?.user_id) return NextResponse.json({ email: null })

    // Email di login (fonte di verità), con la tabella utenti come riserva
    const { data: au } = await supabase.auth.admin.getUserById(pratica.user_id)
    let email = au?.user?.email || null
    if (!email) {
      const { data: u } = await supabase.from('utenti').select('email').eq('id', pratica.user_id).maybeSingle()
      email = u?.email || null
    }
    return NextResponse.json({ email })
  } catch {
    return NextResponse.json({ error: 'Errore inatteso' }, { status: 500 })
  }
}
