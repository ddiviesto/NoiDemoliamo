/**
 * Endpoint server-side per ANNULLARE una pratica (con motivo obbligatorio)
 * e per RIATTIVARLA (20/07: body { riattiva: true }).
 * All'annullamento salviamo lo stato in cui era (pratiche.stato_precedente):
 * la riattivazione la riporta ESATTAMENTE dov'era rimasta.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const praticaId: string | undefined = body.pratica_id
    const riattiva: boolean = body.riattiva === true
    const motivo: string = (body.motivo || '').trim()
    if (!praticaId) return NextResponse.json({ error: 'Manca pratica_id' }, { status: 400 })
    if (!riattiva && !motivo) return NextResponse.json({ error: 'Manca il motivo dell\'annullamento' }, { status: 400 })

    // Verifica admin
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

    // IMPORTANTE: se la pratica era assegnata, il demolitore_id NON viene azzerato.
    // Resta come traccia storica: serve all'admin per le statistiche di qualità
    // ("quante pratiche annullate dopo l'assegnazione ha questo demolitore?").
    // La pratica annullata non conta comunque più tra le "aperte" del demolitore
    // (tutti i conteggi escludono stato completata/annullata).
    const { data: pratica } = await supabase.from('pratiche').select('id, stato, stato_precedente, demolitore_id').eq('id', praticaId).single()
    if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })
    const eraAssegnata = !!pratica.demolitore_id

    // ---- RIATTIVAZIONE: torna esattamente dov'era rimasta ----
    if (riattiva) {
      if (pratica.stato !== 'annullata') return NextResponse.json({ error: 'La pratica non è annullata' }, { status: 400 })
      // Fallback per le annullate "storiche" (prima di stato_precedente):
      // si riparte dalla fase documenti e il self-heal della pagina admin
      // (/api/pratica-stato) la rimette a posto da solo.
      const statoRipristinato = pratica.stato_precedente || 'in_attesa_documenti'
      const { error: errRi } = await supabase
        .from('pratiche')
        .update({
          stato: statoRipristinato,
          stato_precedente: null,
          motivo_annullamento: null,
          aggiornato_il: new Date().toISOString(),
        })
        .eq('id', praticaId)
      if (errRi) {
        console.error('Errore riattivazione pratica:', errRi)
        return NextResponse.json({ error: 'Errore nel salvataggio. Hai eseguito l\'SQL del 20/07 su Supabase?' }, { status: 500 })
      }
      return NextResponse.json({ success: true, stato: statoRipristinato })
    }

    // ---- ANNULLAMENTO (salva lo stato per la riattivazione futura) ----
    if (pratica.stato === 'annullata') return NextResponse.json({ error: 'La pratica è già annullata' }, { status: 400 })
    const { error } = await supabase
      .from('pratiche')
      .update({
        stato: 'annullata',
        stato_precedente: pratica.stato,
        motivo_annullamento: motivo,
        aggiornato_il: new Date().toISOString(),
      })
      .eq('id', praticaId)
    if (error) {
      console.error('Errore annullamento pratica:', error)
      return NextResponse.json({ error: 'Errore nel salvataggio. Hai eseguito l\'SQL del 20/07 su Supabase?' }, { status: 500 })
    }

    return NextResponse.json({ success: true, era_assegnata: eraAssegnata })
  } catch (err) {
    console.error('Errore endpoint pratica-annulla:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
