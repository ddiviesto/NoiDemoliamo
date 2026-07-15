/**
 * Download di un MODULO PDF già compilato coi dati della pratica.
 *
 * GET /api/modulo-pdf?checklist_id=... (Authorization: Bearer <token>)
 * Autorizzati: il CLIENTE proprietario della pratica e l'admin.
 *
 * - individua il template dal catalogo (casistiche_documenti.template_pdf)
 * - genera il PDF con lib/moduli/generaModulo (moduli nostri da zero,
 *   moduli ACI compilati sopra gli originali in docs/moduli/originali/)
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
      .select('user_id, stato, casistica, nome_richiedente, codice_fiscale, marca, modello, targa, delegato_nome')
      .eq('id', riga.pratica_id)
      .single()
    if (!pratica) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })

    const isAdmin = user.email === ADMIN_EMAIL
    if (!isAdmin && pratica.user_id !== user.id) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

    // Cintura di sicurezza (10/07): il CLIENTE scarica i moduli solo DOPO che
    // l'admin ha verificato/approvato i documenti (i dati compilati devono
    // essere già controllati — niente firme su dati sbagliati). L'admin può sempre.
    // ⭐ ECCEZIONE (10/07 sera): la DICHIARAZIONE DEL FERMO è scaricabile SUBITO —
    // serve al cliente per chiedere l'Attestazione di inutilizzabilità al Comune
    // (Legge 14/2026), che a sua volta va caricata nella checklist. Senza
    // l'eccezione il flusso si bloccherebbe in un circolo.
    const STATI_PRE_VERIFICA = ['in_attesa_documenti', 'in_attesa_approvazione_admin', 'documenti_parzialmente_approvati']
    const sempreDisponibile = doc.template_pdf === 'DICHIARAZIONE_SOSTITUTIVA_STATO_VEICOLO_CON_FERMO_AMMINISTRATIVO'
    if (!isAdmin && !sempreDisponibile && STATI_PRE_VERIFICA.includes(pratica.stato)) {
      return NextResponse.json({ error: 'Il modulo sarà disponibile dopo la verifica dei documenti' }, { status: 403 })
    }

    // Genera il PDF compilato
    const pdf = await generaModuloCompilato(
      doc.template_pdf,
      {
        casistica: pratica.casistica,
        nomeRichiedente: pratica.nome_richiedente,
        codiceFiscale: pratica.codice_fiscale,
        marcaModello: [pratica.marca, pratica.modello].filter(Boolean).join(' ') || null,
        targa: pratica.targa,
        delegatoNome: pratica.delegato_nome,
      },
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
