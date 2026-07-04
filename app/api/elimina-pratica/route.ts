/**
 * Endpoint server-side per l'ELIMINAZIONE DEFINITIVA di una pratica.
 *
 * Cancella TUTTO ciò che riguarda la pratica:
 *   1. I file nello Storage (bucket documenti-pratiche e foto-pratiche, cartella = pratica_id)
 *   2. Le righe nelle tabelle collegate (checklist, foto, documenti, chat, ecc.)
 *   3. La riga della pratica stessa
 *
 * Irreversibile. Usato dall'admin per pulire le pratiche di prova senza entrare nel DB.
 * Sicurezza: SUPABASE_SERVICE_ROLE_KEY (bypassa RLS) + verifica admin via Authorization.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

// Tabelle collegate a una pratica tramite colonna pratica_id.
// La cancellazione è "best effort": se una tabella non ha la colonna, si ignora l'errore.
const TABELLE_COLLEGATE = [
  'pratica_documenti_checklist',
  'documenti_approvazione',
  'foto_pratiche',
  'documenti',
  'messaggi_chat',
  'messaggi',
  'solleciti',
  'notifiche',
  'interessi_commercianti',
  'fatture',
]

const BUCKETS = ['documenti-pratiche', 'foto-pratiche']

async function svuotaCartellaStorage(supabase: SupabaseClient, bucket: string, praticaId: string) {
  const { data: files, error } = await supabase.storage.from(bucket).list(praticaId, { limit: 1000 })
  if (error || !files || files.length === 0) return
  const paths = files.map(f => `${praticaId}/${f.name}`)
  await supabase.storage.from(bucket).remove(paths)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const praticaId: string | undefined = body.pratica_id
    if (!praticaId) {
      return NextResponse.json({ error: 'Manca pratica_id' }, { status: 400 })
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

    // La pratica esiste?
    const { data: pratica } = await supabase.from('pratiche').select('id').eq('id', praticaId).single()
    if (!pratica) {
      return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })
    }

    // 1) Cancella i file dallo Storage (entrambi i bucket)
    for (const bucket of BUCKETS) {
      try { await svuotaCartellaStorage(supabase, bucket, praticaId) }
      catch (e) { console.warn(`Storage ${bucket}:`, e) }
    }

    // 2) Cancella le righe collegate (best effort)
    for (const tabella of TABELLE_COLLEGATE) {
      const { error } = await supabase.from(tabella).delete().eq('pratica_id', praticaId)
      if (error) console.warn(`Delete ${tabella}:`, error.message)
    }

    // 3) Cancella la pratica
    const { error: errPratica } = await supabase.from('pratiche').delete().eq('id', praticaId)
    if (errPratica) {
      console.error('Errore delete pratica:', errPratica)
      return NextResponse.json({ error: 'Errore durante l\'eliminazione della pratica' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Errore endpoint eliminazione:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
