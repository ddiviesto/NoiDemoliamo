/**
 * Download di un MODULO PDF (IN BIANCO: lo compila il cliente a penna).
 *
 * GET /api/modulo-pdf?checklist_id=... (Authorization: Bearer <token>)
 * Autorizzati: il CLIENTE proprietario della pratica e l'admin.
 *
 * ⭐ DECISIONE 15/07 (Davide): per ora NIENTE autocompilazione su nessun
 * modulo (nemmeno le deleghe) e NIENTE blocco pre-verifica — i moduli sono
 * scaricabili SUBITO dal box verde. In futuro si rivaluterà la compilazione.
 *
 * - individua il template dal catalogo (casistiche_documenti.template_pdf)
 * - genera il PDF con lib/moduli/generaModulo (moduli nostri da zero in
 *   bianco, moduli ACI/curatore = PDF originali in docs/moduli/originali/)
 * - traccia il download in pratica_documenti_checklist.scaricato_il
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import path from 'path'
import { generaModuloCompilato } from '@/lib/moduli/generaModulo'

const ADMIN_EMAIL = 'ddiviesto@gmail.com'

export async function GET(req: NextRequest) {
  try {
    const checklistId = req.nextUrl.searchParams.get('checklist_id')
    if (!checklistId) return NextResponse.json({ error: 'Manca checklist_id' }, { status: 400 })

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

    // Riga checklist → documento del catalogo → pratica
    const { data: riga } = await supabase
      .from('pratica_documenti_checklist')
      .select('id, pratica_id, documento_id')
      .eq('id', checklistId)
      .single()
    if (!riga) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })

    const { data: doc } = await supabase
      .from('casistiche_documenti')
      .select('nome, template_pdf')
      .eq('id', riga.documento_id)
      .single()
    if (!doc?.template_pdf) return NextResponse.json({ error: 'Questo documento non è un modulo da scaricare' }, { status: 400 })

    const { data: pratica } = await supabase
      .from('pratiche')
      .select('user_id, casistica')
      .eq('id', riga.pratica_id)
      .single()
    if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })

    const isAdmin = user.email === ADMIN_EMAIL
    if (!isAdmin && pratica.user_id !== user.id) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    // Genera il PDF IN BIANCO: si passa SOLO la casistica (serve alla
    // dichiarazione del fermo per scegliere la qualifica giusta), nessun
    // dato personale compilato (decisione 15/07).
    const pdf = await generaModuloCompilato(
      doc.template_pdf,
      { casistica: pratica.casistica },
      // I PDF ACI originali vivono nel repo (vedi outputFileTracingIncludes in next.config)
      (nomeFile) => readFile(path.join(process.cwd(), 'docs', 'moduli', 'originali', nomeFile)),
    )

    // Traccia il download (non blocca la risposta se fallisce)
    await supabase
      .from('pratica_documenti_checklist')
      .update({ scaricato_il: new Date().toISOString() })
      .eq('id', checklistId)

    const nomeFile = `${doc.nome.replace(/[^\w àèéìòù'-]/gi, '').trim() || 'Modulo'}.pdf`
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomeFile}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('Errore generazione modulo PDF:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
