/**
 * Logica dell'algoritmo di assegnazione automatica delle pratiche di demolizione.
 *
 * Il flusso:
 *   1. Carica i dati della pratica (comune ritiro, lat, lng)
 *   2. Trova i demolitori che coprono quel comune (mappa copertura)
 *   3. Esclude chi è oltre la soglia di pratiche aperte (`max_pratiche_aperte_demolitore`)
 *   4. Calcola la distanza stradale di ognuno via Google Distance Matrix API
 *   5. Calcola la velocità storica (giorni medi tra assegnazione e completamento)
 *   6. Ordina per: velocità → distanza → carico settimanale
 *   7. Restituisce il demolitore vincitore (o null se nessuno è valido)
 *
 * Non scrive nulla nel DB: questo è il pezzo "puro" dell'algoritmo, separato
 * dall'endpoint per essere facilmente testabile.
 */

import { SupabaseClient } from '@supabase/supabase-js'

// ============================================================
// TIPI
// ============================================================

export interface PraticaDaAssegnare {
  id: string
  comune_ritiro: string | null
  provincia_ritiro: string | null
  lat: number | null
  lng: number | null
}

export interface DemolitoreCandidato {
  id: string
  ragione_sociale: string
  indirizzo: string | null
  citta: string | null
  provincia: string | null
  lat: number | null
  lng: number | null
  // Metriche di scoring (calcolate dall'algoritmo)
  distanza_km?: number
  durata_minuti?: number
  velocita_media_giorni?: number
  pratiche_aperte?: number
}

export interface RisultatoAssegnazione {
  vincitore: DemolitoreCandidato | null
  candidati_valutati: DemolitoreCandidato[]
  motivo_fallimento?: string
}

// ============================================================
// COSTANTI
// ============================================================

// Velocità storica di default per demolitori senza pratiche completate.
// Valore alto = li penalizza un po' (assegnati solo se non ci sono migliori).
const VELOCITA_DEFAULT_GIORNI = 999

// ============================================================
// FUNZIONI INTERNE
// ============================================================

/**
 * Legge dalle impostazioni la soglia massima di pratiche aperte per demolitore.
 * Default 15 se non trovata.
 */
async function getSogliaMaxPratiche(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from('impostazioni')
    .select('valore')
    .eq('chiave', 'max_pratiche_aperte_demolitore')
    .single()
  if (!data) return 15
  const n = parseInt(data.valore, 10)
  return isNaN(n) ? 15 : n
}

/**
 * Trova tutti i demolitori che coprono un dato comune.
 * Espande le regole di copertura: regioni, province, comuni inclusi/esclusi,
 * province escluse.
 */
async function trovaDemolitoriPerComune(
  supabase: SupabaseClient,
  comuneRitiro: string,
  provinciaRitiro: string,
  regioneRitiro: string | null
): Promise<string[]> {
  // Legge tutte le regole di copertura dal DB
  const { data: regole } = await supabase
    .from('demolitori_comuni')
    .select('demolitore_id, comune, provincia, tipo')
  if (!regole) return []

  // Raggruppa per demolitore
  type Cop = {
    regioniSel: Set<string>
    provinceSel: Set<string>
    provinceEsc: Set<string>
    comuniIncl: Set<string>
    comuniEsc: Set<string>
  }
  const coperturaPerDemolitore = new Map<string, Cop>()
  for (const r of regole) {
    let c = coperturaPerDemolitore.get(r.demolitore_id)
    if (!c) {
      c = {
        regioniSel: new Set(),
        provinceSel: new Set(),
        provinceEsc: new Set(),
        comuniIncl: new Set(),
        comuniEsc: new Set(),
      }
      coperturaPerDemolitore.set(r.demolitore_id, c)
    }
    if (r.tipo === 'regione') c.regioniSel.add(r.comune)
    else if (r.tipo === 'provincia') c.provinceSel.add(r.comune)
    else if (r.tipo === 'provincia_esclusa') c.provinceEsc.add(r.comune)
    else if (r.tipo === 'comune_incluso') c.comuniIncl.add(r.comune)
    else if (r.tipo === 'comune_escluso') c.comuniEsc.add(r.comune)
  }

  // Per ogni demolitore, verifica se copre questo comune
  const ids: string[] = []
  coperturaPerDemolitore.forEach((c, demId) => {
    if (c.comuniEsc.has(comuneRitiro)) return
    if (c.comuniIncl.has(comuneRitiro)) { ids.push(demId); return }
    if (c.provinceEsc.has(provinciaRitiro)) return
    if (c.provinceSel.has(provinciaRitiro)) { ids.push(demId); return }
    if (regioneRitiro && c.regioniSel.has(regioneRitiro)) { ids.push(demId); return }
  })
  return ids
}

/**
 * Conta le pratiche aperte (non completate, non annullate) di un demolitore.
 */
async function contaPraticheAperteDemolitore(
  supabase: SupabaseClient,
  demolitoreId: string
): Promise<number> {
  const { count } = await supabase
    .from('pratiche')
    .select('*', { count: 'exact', head: true })
    .eq('demolitore_id', demolitoreId)
    .not('stato', 'in', '(completata,annullata)')
  return count || 0
}

/**
 * Calcola la velocità media di un demolitore: giorni dalla data di assegnazione
 * al RITIRO EFFETTIVO del veicolo, mediati sulle ultime N pratiche ritirate.
 * Misura la reattività reale del demolitore (quanto ci mette a passare a ritirare).
 */
async function velocitaMediaDemolitore(
  supabase: SupabaseClient,
  demolitoreId: string,
  ultimeN: number = 20
): Promise<number> {
  const { data } = await supabase
    .from('pratiche')
    .select('data_assegnazione, data_ritiro_effettuato')
    .eq('demolitore_id', demolitoreId)
    .not('data_assegnazione', 'is', null)
    .not('data_ritiro_effettuato', 'is', null)
    .order('data_ritiro_effettuato', { ascending: false })
    .limit(ultimeN)
  if (!data || data.length === 0) return VELOCITA_DEFAULT_GIORNI

  const giorni = data.map(p => {
    const da = new Date(p.data_assegnazione).getTime()
    const a = new Date(p.data_ritiro_effettuato).getTime()
    return (a - da) / (1000 * 60 * 60 * 24)
  })
  return giorni.reduce((s, g) => s + g, 0) / giorni.length
}

/**
 * Chiama Google Distance Matrix API per ottenere distanza/durata stradale
 * tra il punto di partenza (demolitore) e di arrivo (pratica).
 * Una sola chiamata gestisce più demolitori in batch (più efficiente).
 */
async function calcolaDistanzeStradali(
  apiKey: string,
  destLat: number,
  destLng: number,
  origini: Array<{ lat: number; lng: number }>
): Promise<Array<{ km: number; minuti: number } | null>> {
  if (origini.length === 0) return []

  const originsStr = origini.map(o => `${o.lat},${o.lng}`).join('|')
  const destinationsStr = `${destLat},${destLng}`
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}&destinations=${encodeURIComponent(destinationsStr)}&units=metric&language=it&key=${apiKey}`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data.status !== 'OK') {
      console.error('Distance Matrix non OK:', data.status, data.error_message)
      return origini.map(() => null)
    }
    return data.rows.map((row: { elements: Array<{ status: string; distance?: { value: number }; duration?: { value: number } }> }) => {
      const el = row.elements?.[0]
      if (!el || el.status !== 'OK' || !el.distance || !el.duration) return null
      return {
        km: el.distance.value / 1000,
        minuti: el.duration.value / 60,
      }
    })
  } catch (err) {
    console.error('Errore Distance Matrix:', err)
    return origini.map(() => null)
  }
}

// ============================================================
// FUNZIONE PRINCIPALE
// ============================================================

/**
 * Esegue l'algoritmo di assegnazione su una pratica e restituisce il demolitore
 * vincitore + la lista completa dei candidati valutati (per debug/log).
 */
export async function calcolaAssegnazione(
  supabase: SupabaseClient,
  pratica: PraticaDaAssegnare,
  googleApiKey: string,
  regioneRitiro: string | null = null
): Promise<RisultatoAssegnazione> {
  if (!pratica.comune_ritiro || !pratica.provincia_ritiro) {
    return { vincitore: null, candidati_valutati: [], motivo_fallimento: 'Pratica senza comune/provincia di ritiro' }
  }
  if (pratica.lat == null || pratica.lng == null) {
    return { vincitore: null, candidati_valutati: [], motivo_fallimento: 'Pratica senza coordinate (lat/lng)' }
  }

  // STEP 1 — trovo i demolitori che coprono questo comune
  const demolitoriIds = await trovaDemolitoriPerComune(
    supabase, pratica.comune_ritiro, pratica.provincia_ritiro, regioneRitiro
  )
  if (demolitoriIds.length === 0) {
    return { vincitore: null, candidati_valutati: [], motivo_fallimento: 'Nessun demolitore copre il comune di ritiro' }
  }

  // STEP 2 — leggo i dati anagrafici dei demolitori (solo quelli attivi)
  const { data: demolitoriRaw } = await supabase
    .from('demolitori')
    .select('id, ragione_sociale, indirizzo, citta, provincia, lat, lng, stato')
    .in('id', demolitoriIds)
    .eq('stato', 'attivo')
  if (!demolitoriRaw || demolitoriRaw.length === 0) {
    return { vincitore: null, candidati_valutati: [], motivo_fallimento: 'Nessun demolitore attivo copre la zona' }
  }

  // STEP 3 — esclusione per saturazione (max pratiche aperte)
  const soglia = await getSogliaMaxPratiche(supabase)
  const candidatiConCarico: DemolitoreCandidato[] = []
  for (const d of demolitoriRaw) {
    const aperte = await contaPraticheAperteDemolitore(supabase, d.id)
    if (aperte >= soglia) continue
    candidatiConCarico.push({ ...d, pratiche_aperte: aperte })
  }
  if (candidatiConCarico.length === 0) {
    return { vincitore: null, candidati_valutati: [], motivo_fallimento: `Tutti i demolitori in zona sono saturi (oltre ${soglia} pratiche aperte)` }
  }

  // STEP 4 — distanza stradale (solo per chi ha coordinate valide)
  const conCoordinate = candidatiConCarico.filter(d => d.lat != null && d.lng != null)
  const distanze = await calcolaDistanzeStradali(
    googleApiKey,
    pratica.lat, pratica.lng,
    conCoordinate.map(d => ({ lat: d.lat!, lng: d.lng! }))
  )
  conCoordinate.forEach((d, i) => {
    if (distanze[i]) {
      d.distanza_km = distanze[i]!.km
      d.durata_minuti = distanze[i]!.minuti
    }
  })

  // STEP 5 — velocità storica per ognuno
  for (const d of candidatiConCarico) {
    d.velocita_media_giorni = await velocitaMediaDemolitore(supabase, d.id)
  }

  // STEP 6 — ordinamento: velocità asc → distanza asc → pratiche aperte asc
  const ordinati = [...candidatiConCarico].sort((a, b) => {
    const vA = a.velocita_media_giorni ?? VELOCITA_DEFAULT_GIORNI
    const vB = b.velocita_media_giorni ?? VELOCITA_DEFAULT_GIORNI
    if (vA !== vB) return vA - vB
    const dA = a.distanza_km ?? Infinity
    const dB = b.distanza_km ?? Infinity
    if (dA !== dB) return dA - dB
    const pA = a.pratiche_aperte ?? 0
    const pB = b.pratiche_aperte ?? 0
    return pA - pB
  })

  return { vincitore: ordinati[0], candidati_valutati: ordinati }
}