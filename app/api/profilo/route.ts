/**
 * Modifica del PROFILO del cliente loggato (pannello Impostazioni, 22/07).
 * Ogni utente può aggiornare SOLO la propria riga in `utenti`
 * (nome, cognome, telefono) — scrive il server col service role.
 *
 * ⭐ TELEFONO: è il recapito che il demolitore usa per fissare data e ora
 * del ritiro → si aggiorna anche sulle PRATICHE ATTIVE (non completate,
 * non annullate), così demolitore e admin vedono sempre il numero giusto.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    const token = authHeader.substring(7)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user } } = await supabaseUser.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Whitelist: solo i campi del profilo
    const update: Record<string, unknown> = {}
    if (typeof body.nome === 'string') {
      const n = body.nome.trim()
      if (!n) return NextResponse.json({ error: 'Il nome non può essere vuoto' }, { status: 400 })
      update.nome = n
    }
    if (typeof body.cognome === 'string') update.cognome = body.cognome.trim() || null
    if (typeof body.telefono === 'string') {
      const t = body.telefono.trim()
      if (!t) return NextResponse.json({ error: 'Il telefono non può essere vuoto' }, { status: 400 })
      update.telefono = t
    }
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

    const { error: errUtente } = await supabase.from('utenti').update(update).eq('id', user.id)
    if (errUtente) throw errUtente

    // Il telefono vale anche per le pratiche in corso (contatto per il ritiro)
    if (update.telefono) {
      const { error: errPratiche } = await supabase
        .from('pratiche')
        .update({ telefono: update.telefono })
        .eq('user_id', user.id)
        .not('stato', 'in', '("completata","annullata")')
      if (errPratiche) throw errPratiche
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Errore modifica profilo:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
