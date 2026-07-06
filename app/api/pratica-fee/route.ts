/**
 * Endpoint server-side per impostare/rimuovere l'IMPORTO CONCORDATO (una tantum)
 * di una singola pratica (pratiche.fee_concordata).
 *
 * Se valorizzato, in fatturazione vale QUESTO importo e ignora le tariffe del
 * demolitore (caso: veicolo fuori zona che il demolitore paga a prezzo speciale).
 * fee = null → rimuove l'importo (tornano a valere le tariffe di zona).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const praticaId: string | undefined = body.pratica_id
    const fee: number | null = body.fee === null || body.fee === undefined ? null : Number(body.fee)
    if (!praticaId) return NextResponse.json({ error: 'Manca pratica_id' }, { status: 400 })
    if (fee !== null && (isNaN(fee) || fee < 0)) return NextResponse.json({ error: 'Importo non valido' }, { status: 400 })

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

    const { error } = await supabase
      .from('pratiche')
      .update({ fee_concordata: fee, aggiornato_il: new Date().toISOString() })
      .eq('id', praticaId)
    if (error) {
      console.error('Errore update fee_concordata:', error)
      return NextResponse.json({ error: 'Errore nel salvataggio' }, { status: 500 })
    }

    return NextResponse.json({ success: true, fee })
  } catch (err) {
    console.error('Errore endpoint pratica-fee:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
