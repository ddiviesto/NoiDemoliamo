/**
 * Endpoint AREA DEMOLITORE: caricamento certificati (FormData).
 *
 * Campi form: pratica_id, tipo ('rottamazione' | 'pra'), file (pdf/immagine).
 *
 *  - rottamazione → data_certificato_rottamazione + cert_rottamazione_url,
 *                   stato 'in_attesa_cert_radiazione_pra'
 *  - pra          → data_certificato_pra + cert_pra_url, stato 'completata'
 *                   (regola fissa: SOLO il certificato PRA completa la pratica)
 *
 * I file vanno nel bucket privato documenti-pratiche sotto la cartella
 * della pratica, come i documenti del cliente.
 */

import { NextRequest, NextResponse } from 'next/server'
import { autenticaDemolitore, praticaDelDemolitore } from '@/lib/demolitoreAuth'

const MAX_BYTES = 15 * 1024 * 1024 // 15 MB
const ESTENSIONI_OK = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic']

const STATI_ROTTAMAZIONE = ['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione']
// Il PRA può arrivare anche se la rottamazione non è ancora registrata
const STATI_PRA = [...STATI_ROTTAMAZIONE, 'in_attesa_cert_radiazione_pra']

export async function POST(req: NextRequest) {
  try {
    const auth = await autenticaDemolitore(req)
    if (!auth.ok) return NextResponse.json({ error: auth.messaggio }, { status: auth.status })
    const { supabase, demolitoreId } = auth

    const form = await req.formData()
    const praticaId = String(form.get('pratica_id') || '')
    const tipo = String(form.get('tipo') || '')
    const file = form.get('file')
    if (!praticaId || (tipo !== 'rottamazione' && tipo !== 'pra') || !(file instanceof File)) {
      return NextResponse.json({ error: 'Dati mancanti: servono pratica_id, tipo e file' }, { status: 400 })
    }
    if (file.size === 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File vuoto o troppo grande (max 15 MB)' }, { status: 400 })
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!ESTENSIONI_OK.includes(ext)) {
      return NextResponse.json({ error: 'Formato non ammesso: usa PDF o immagine' }, { status: 400 })
    }

    const { pratica, errore } = await praticaDelDemolitore(supabase, praticaId, demolitoreId, 'id, stato')
    if (!pratica) return NextResponse.json({ error: errore }, { status: 404 })
    const stato = pratica.stato as string
    const statiAmmessi = tipo === 'rottamazione' ? STATI_ROTTAMAZIONE : STATI_PRA
    if (!statiAmmessi.includes(stato)) {
      return NextResponse.json({ error: `Non puoi caricare questo certificato in questo stato (${stato})` }, { status: 409 })
    }

    // Upload nel bucket privato, cartella della pratica
    const path = `${praticaId}/cert-${tipo}-${Date.now()}.${ext}`
    const contenuto = Buffer.from(await file.arrayBuffer())
    const { error: errUpload } = await supabase.storage
      .from('documenti-pratiche')
      .upload(path, contenuto, { contentType: file.type || 'application/octet-stream' })
    if (errUpload) {
      console.error('Errore upload certificato:', errUpload)
      return NextResponse.json({ error: 'Errore nel caricamento del file' }, { status: 500 })
    }

    const adesso = new Date().toISOString()
    const aggiornamento = tipo === 'rottamazione'
      ? { data_certificato_rottamazione: adesso, cert_rottamazione_url: path, stato: 'in_attesa_cert_radiazione_pra', aggiornato_il: adesso }
      : { data_certificato_pra: adesso, cert_pra_url: path, stato: 'completata', aggiornato_il: adesso }
    const { error: errUpdate } = await supabase.from('pratiche').update(aggiornamento).eq('id', praticaId)
    if (errUpdate) {
      console.error('Errore aggiornamento pratica dopo certificato:', errUpdate)
      return NextResponse.json({ error: 'File caricato ma pratica non aggiornata: riprova' }, { status: 500 })
    }

    return NextResponse.json({ success: true, stato: aggiornamento.stato })
  } catch (err) {
    console.error('Errore endpoint demolitore-certificato:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
