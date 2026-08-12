/**
 * Utilità condivise dell'AREA DEMOLITORE (lato client).
 * Le pagine non parlano mai direttamente con le tabelle: tutto passa
 * dagli endpoint /api/demolitore-* con il token di sessione.
 */

import { supabase } from '@/lib/supabase'

export async function chiamataDemolitore<T = Record<string, unknown>>(percorso: string, body?: object): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(percorso, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(body || {}),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error || 'Errore di comunicazione')
  return json as T
}

export async function caricaCertificato(praticaId: string, tipo: 'rottamazione' | 'pra', file: File) {
  const { data: { session } } = await supabase.auth.getSession()
  const form = new FormData()
  form.append('pratica_id', praticaId)
  form.append('tipo', tipo)
  form.append('file', file)
  const res = await fetch('/api/demolitore-certificato', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token || ''}` },
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as { error?: string }).error || 'Errore nel caricamento del file')
  return json
}

// ============================================================
// Tipi e raggruppamento pipeline
// ============================================================

export interface PraticaDemolitore {
  id: string
  stato: string
  targa: string | null
  tipo_mezzo: string | null
  tipo_mezzo_altro: string | null
  marca: string | null
  modello: string | null
  anno: number | null
  km: number | null
  casistica: string | null
  nome_richiedente: string | null
  telefono: string | null
  codice_fiscale: string | null
  indirizzo_ritiro: string | null
  comune_ritiro: string | null
  provincia_ritiro: string | null
  marciante: boolean | null
  delegato_nome: string | null
  data_assegnazione: string | null
  scadenza_proposta_ritiro: string | null
  data_ritiro_prevista: string | null
  data_ritiro_effettuato: string | null
  data_certificato_rottamazione: string | null
  data_certificato_pra: string | null
  cert_rottamazione_a_mano: boolean | null
  motivo_annullamento: string | null
  aggiornato_il: string | null
  creato_il: string | null
  /** messaggi del cliente non ancora letti (dal server) */
  non_letti?: number
  /** ⭐ 12/08: note di NoiDemoliamo non ancora lette (spia sulla riga) */
  note_non_lette?: number
}

// ============================================================
// IL FLUSSO DEL DEMOLITORE — 5 fasi + "non a buon fine" fuori fila
// (redesign 23/07/2026, mockup approvato da Davide)
// ============================================================

export type GruppoPratica = 'arrivo' | 'fissato' | 'rottamazione' | 'targhe' | 'completate' | 'annullate'

const STATI_ROTTAMAZIONE = ['ritirata', 'in_attesa_recensione_cliente', 'in_attesa_cert_rottamazione']

export function gruppoDi(p: Pick<PraticaDemolitore, 'stato'>): GruppoPratica {
  if (p.stato === 'annullata') return 'annullate'
  if (p.stato === 'completata') return 'completate'
  if (p.stato === 'in_attesa_cert_radiazione_pra') return 'targhe'
  if (STATI_ROTTAMAZIONE.includes(p.stato)) return 'rottamazione'
  if (p.stato === 'ritiro_confermato') return 'fissato'
  return 'arrivo' // assegnata, in_attesa_conferma_cliente
}

// Etichette delle casistiche (stessa lingua del CRM admin)
export const CASISTICA_LABEL: Record<string, string> = {
  persona_fisica: 'Persona fisica',
  eredi_accettato: 'Eredi (accettata)',
  eredi_rinuncia: 'Eredi (con rinuncia)',
  societa: 'Società',
  societa_fallita: 'Società fallita',
  associazione: 'Associazione',
  non_intestatario: 'Non intestatario',
  targhe_straniere: 'Targhe straniere',
}

export const GRUPPO_LABEL: Record<GruppoPratica, string> = {
  arrivo: 'In arrivo · fissa il ritiro',
  fissato: 'Ritiro fissato',
  rottamazione: 'Ritirata · cert. rottamazione',
  targhe: 'Cancellazione targhe (PRA)',
  completate: 'Completate',
  annullate: 'Non a buon fine',
}

// ============================================================
// Formattazioni
// ============================================================

export function nomeVeicolo(p: Pick<PraticaDemolitore, 'marca' | 'modello' | 'tipo_mezzo' | 'tipo_mezzo_altro'>): string {
  const mm = [p.marca, p.modello].filter(Boolean).join(' ')
  if (mm) return mm
  if (p.tipo_mezzo === 'altro' && p.tipo_mezzo_altro) return p.tipo_mezzo_altro
  return p.tipo_mezzo ? p.tipo_mezzo.charAt(0).toUpperCase() + p.tipo_mezzo.slice(1) : 'Veicolo'
}

export function fmtData(x: string): string {
  return new Date(x).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDataOra(x: string): string {
  return new Date(x).toLocaleString('it-IT', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function eOggi(x: string): boolean {
  const d = new Date(x), oggi = new Date()
  return d.getDate() === oggi.getDate() && d.getMonth() === oggi.getMonth() && d.getFullYear() === oggi.getFullYear()
}

/** Countdown verso la scadenza delle 8 ore lavorative. */
export function countdownScadenza(scadenzaIso: string | null): { testo: string; inRitardo: boolean } | null {
  if (!scadenzaIso) return null
  const diffMin = Math.round((new Date(scadenzaIso).getTime() - Date.now()) / 60000)
  const assoluto = Math.abs(diffMin)
  const h = Math.floor(assoluto / 60)
  const m = assoluto % 60
  const durata = h > 0 ? `${h}h ${m}m` : `${m}m`
  return diffMin >= 0
    ? { testo: `${durata} per fissare`, inRitardo: false }
    : { testo: `In ritardo di ${durata}`, inRitardo: true }
}
