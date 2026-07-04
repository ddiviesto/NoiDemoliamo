/**
 * Endpoint server-side per la PULIZIA degli account senza pratiche.
 *
 * Cancella gli account CLIENTE che non hanno NESSUNA pratica collegata
 * (tipici resti delle pratiche di prova già eliminate).
 *
 * NON tocca MAI:
 *   - l'admin
 *   - gli operatori (demolitore / commerciante / collaboratore)
 *   - i clienti che hanno almeno una pratica
 *
 * Due modalità:
 *   - dry_run: restituisce l'elenco di chi VERREBBE eliminato (anteprima)
 *   - esecuzione: cancella davvero (riga utenti + login auth)
 *
 * Sicurezza: SUPABASE_SERVICE_ROLE_KEY + verifica admin via Authorization.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

// Ruoli da NON cancellare mai (operatori + admin)
const RUOLI_PROTETTI = ['admin', 'demolitore', 'commerciante', 'collaboratore']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const dryRun: boolean = body.dry_run === true

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

    // Utenti che HANNO almeno una pratica
    const { data: praticheUsers } = await supabase.from('pratiche').select('user_id')
    const conPratiche = new Set<string>()
    for (const p of praticheUsers || []) if (p.user_id) conPratiche.add(p.user_id as string)

    // Tutti gli utenti registrati
    const { data: utenti } = await supabase.from('utenti').select('id, nome, tipo')

    // Candidati: senza pratiche, non protetti
    const candidati = (utenti || []).filter(u => {
      if (conPratiche.has(u.id)) return false
      if (u.tipo && RUOLI_PROTETTI.includes(u.tipo)) return false
      return true
    })

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        candidati: candidati.map(u => ({ id: u.id, nome: u.nome ?? null, tipo: u.tipo ?? null })),
      })
    }

    // ESECUZIONE: cancella davvero (con doppia sicurezza sull'email admin)
    let eliminati = 0
    for (const u of candidati) {
      try {
        const { data: au } = await supabase.auth.admin.getUserById(u.id)
        if (au?.user?.email === ADMIN_EMAIL) continue // non toccare mai l'admin
        await supabase.from('utenti').delete().eq('id', u.id)
        await supabase.auth.admin.deleteUser(u.id)
        eliminati++
      } catch (e) {
        console.warn('Pulizia utente saltato:', u.id, e)
      }
    }

    return NextResponse.json({ success: true, eliminati })
  } catch (err) {
    console.error('Errore endpoint pulizia utenti:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
