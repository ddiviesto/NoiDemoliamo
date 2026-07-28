'use client'

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '@/lib/googleMaps'

// Tipologia dei record salvati nel database per la copertura del demolitore.
// Distingue tra unità intere selezionate e singoli comuni/province inclusi/esclusi.
export type TipoCopertura = 'regione' | 'provincia' | 'provincia_esclusa' | 'comune_incluso' | 'comune_escluso'

export interface CoperturaRecord {
  comune: string       // nome dell'unità (regione/provincia/comune)
  provincia: string    // sigla o nome provincia di riferimento (può essere '' per regioni)
  tipo: TipoCopertura
  fee_comune?: number | null
  distanza_km?: number | null
}

interface Props {
  // Lista dei record letti dal DB (per ripristinare lo stato all'apertura).
  coperturaIniziale?: CoperturaRecord[]
  // Salvataggio: riceve TUTTI i record (regioni + province + inclusi + esclusi)
  onSalva: (records: CoperturaRecord[]) => void | Promise<void>
}

// ============================================================
// COSTANTI
// ============================================================

const SUPABASE_GEOJSON_URL =
  'https://egsufeczoroxqnagzqfq.supabase.co/storage/v1/object/public/geojson-comuni'

// Soglie di zoom per cambiare layer visuale.
// Google Maps: 0 = pianeta, 22 = singolo edificio.
//   < ZOOM_PROVINCE   → layer REGIONI
//   < ZOOM_COMUNI     → layer PROVINCE
//   >= ZOOM_COMUNI    → layer COMUNI
const ZOOM_PROVINCE = 7
const ZOOM_COMUNI = 9

// Colori
const COLOR_SELECTED_FILL = '#3b82f6'
const COLOR_SELECTED_STROKE = '#1d4ed8'
const COLOR_EXCLUDED_FILL = '#ef4444'
const COLOR_EXCLUDED_STROKE = '#dc2626'
const COLOR_HOVER_FILL = '#93c5fd'
const COLOR_BORDER = '#94a3b8'

// Mappa provincia → slug regione (per scaricare i file dei comuni dal Supabase Storage)
const PROVINCE_REGIONI: Record<string, string> = {
  'Torino': 'piemonte', 'Vercelli': 'piemonte', 'Novara': 'piemonte', 'Cuneo': 'piemonte',
  'Asti': 'piemonte', 'Alessandria': 'piemonte', 'Biella': 'piemonte', 'Verbano-Cusio-Ossola': 'piemonte',
  'Aosta': 'valle-d-aosta',
  'Genova': 'liguria', 'Savona': 'liguria', 'La Spezia': 'liguria', 'Imperia': 'liguria',
  'Milano': 'lombardia', 'Bergamo': 'lombardia', 'Brescia': 'lombardia', 'Como': 'lombardia',
  'Cremona': 'lombardia', 'Lecco': 'lombardia', 'Lodi': 'lombardia', 'Mantova': 'lombardia',
  'Monza e della Brianza': 'lombardia', 'Pavia': 'lombardia', 'Sondrio': 'lombardia', 'Varese': 'lombardia',
  'Bolzano/Bozen': 'trentino-alto-adige', 'Trento': 'trentino-alto-adige',
  'Venezia': 'veneto', 'Padova': 'veneto', 'Treviso': 'veneto', 'Verona': 'veneto',
  'Vicenza': 'veneto', 'Belluno': 'veneto', 'Rovigo': 'veneto',
  'Trieste': 'friuli-venezia-giulia', 'Udine': 'friuli-venezia-giulia',
  'Gorizia': 'friuli-venezia-giulia', 'Pordenone': 'friuli-venezia-giulia',
  'Bologna': 'emilia-romagna', 'Ferrara': 'emilia-romagna', 'Forlì-Cesena': 'emilia-romagna',
  'Modena': 'emilia-romagna', 'Parma': 'emilia-romagna', 'Piacenza': 'emilia-romagna',
  'Ravenna': 'emilia-romagna', 'Reggio nell\'Emilia': 'emilia-romagna', 'Rimini': 'emilia-romagna',
  'Firenze': 'toscana', 'Arezzo': 'toscana', 'Grosseto': 'toscana', 'Livorno': 'toscana',
  'Lucca': 'toscana', 'Massa-Carrara': 'toscana', 'Pisa': 'toscana', 'Pistoia': 'toscana',
  'Prato': 'toscana', 'Siena': 'toscana',
  'Perugia': 'umbria', 'Terni': 'umbria',
  'Ancona': 'marche', 'Ascoli Piceno': 'marche', 'Fermo': 'marche',
  'Macerata': 'marche', 'Pesaro e Urbino': 'marche',
  'Roma': 'lazio', 'Frosinone': 'lazio', 'Latina': 'lazio', 'Rieti': 'lazio', 'Viterbo': 'lazio',
  'L\'Aquila': 'abruzzo', 'Chieti': 'abruzzo', 'Pescara': 'abruzzo', 'Teramo': 'abruzzo',
  'Campobasso': 'molise', 'Isernia': 'molise',
  'Napoli': 'campania', 'Avellino': 'campania', 'Benevento': 'campania',
  'Caserta': 'campania', 'Salerno': 'campania',
  'Bari': 'puglia', 'Brindisi': 'puglia', 'Foggia': 'puglia', 'Lecce': 'puglia',
  'Taranto': 'puglia', 'Barletta-Andria-Trani': 'puglia',
  'Potenza': 'basilicata', 'Matera': 'basilicata',
  'Catanzaro': 'calabria', 'Cosenza': 'calabria', 'Crotone': 'calabria',
  'Reggio di Calabria': 'calabria', 'Vibo Valentia': 'calabria',
  'Palermo': 'sicilia', 'Agrigento': 'sicilia', 'Caltanissetta': 'sicilia',
  'Catania': 'sicilia', 'Enna': 'sicilia', 'Messina': 'sicilia',
  'Ragusa': 'sicilia', 'Siracusa': 'sicilia', 'Trapani': 'sicilia',
  'Cagliari': 'sardegna', 'Nuoro': 'sardegna', 'Oristano': 'sardegna',
  'Sassari': 'sardegna', 'Sud Sardegna': 'sardegna',
}

// ============================================================
// COMPONENTE
// ============================================================

type Layer = 'regioni' | 'province' | 'comuni'

export default function MappaComuni({ coperturaIniziale, onSalva }: Props) {
  // --- Refs DOM e mappa ---
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const initStartedRef = useRef(false)
  const [loading, setLoading] = useState(true)

  // --- Stato selezione (visibile in pannello laterale) ---
  // Cosa l'admin ha cliccato direttamente: regioni, province, comuni inclusi singolarmente.
  // Le esclusioni sono i "buchi" puntuali nella copertura (province o comuni rimossi).
  const [regioniSelezionate, setRegioniSelezionate] = useState<Set<string>>(new Set())
  const [provinceSelezionate, setProvinceSelezionate] = useState<Set<string>>(new Set())
  const [provinceEscluse, setProvinceEscluse] = useState<Set<string>>(new Set())
  const [comuniInclusi, setComuniInclusi] = useState<Set<string>>(new Set())
  const [comuniEsclusi, setComuniEsclusi] = useState<Set<string>>(new Set())
  const [layerCorrente, setLayerCorrente] = useState<Layer>('regioni')

  // Tooltip: nome dell'unità sotto il mouse + posizione (in pixel relativi al container mappa).
  // "sub" è la riga secondaria opzionale (es. provincia · regione per i comuni).
  const [tooltip, setTooltip] = useState<{ name: string; sub?: string; x: number; y: number } | null>(null)

  // --- Ref-mirror dello stato (per usarlo dentro i listener di Google Maps) ---
  const regioniSelRef = useRef<Set<string>>(new Set())
  const provinceSelRef = useRef<Set<string>>(new Set())
  const provinceEsclRef = useRef<Set<string>>(new Set())
  const comuniInclRef = useRef<Set<string>>(new Set())
  const comuniEsclRef = useRef<Set<string>>(new Set())
  useEffect(() => { regioniSelRef.current = regioniSelezionate }, [regioniSelezionate])
  useEffect(() => { provinceSelRef.current = provinceSelezionate }, [provinceSelezionate])
  useEffect(() => { provinceEsclRef.current = provinceEscluse }, [provinceEscluse])
  useEffect(() => { comuniInclRef.current = comuniInclusi }, [comuniInclusi])
  useEffect(() => { comuniEsclRef.current = comuniEsclusi }, [comuniEsclusi])

  // Ripristina lo stato dalla copertura iniziale (passata dal genitore quando
  // l'admin riapre la pagina di un demolitore già configurato).
  // Eseguito una sola volta quando arriva il valore dal genitore.
  const coperturaIniziProcessata = useRef(false)
  useEffect(() => {
    if (!coperturaIniziale || coperturaIniziProcessata.current) return
    if (coperturaIniziale.length === 0) return
    coperturaIniziProcessata.current = true

    const regs = new Set<string>()
    const provs = new Set<string>()
    const provsEsc = new Set<string>()
    const incl = new Set<string>()
    const escl = new Set<string>()
    for (const rec of coperturaIniziale) {
      if (rec.tipo === 'regione') regs.add(rec.comune)
      else if (rec.tipo === 'provincia') provs.add(rec.comune)
      else if (rec.tipo === 'provincia_esclusa') provsEsc.add(rec.comune)
      else if (rec.tipo === 'comune_incluso') incl.add(rec.comune)
      else if (rec.tipo === 'comune_escluso') escl.add(rec.comune)
    }
    setRegioniSelezionate(regs)
    setProvinceSelezionate(provs)
    setProvinceEscluse(provsEsc)
    setComuniInclusi(incl)
    setComuniEsclusi(escl)
  }, [coperturaIniziale])

  // --- Poligoni Google Maps creati ---
  const poligoniRegioni = useRef<Map<string, google.maps.Polygon[]>>(new Map())
  const poligoniProvince = useRef<Map<string, google.maps.Polygon[]>>(new Map())
  const poligoniComuni = useRef<Map<string, google.maps.Polygon[]>>(new Map())

  // --- Metadata: associazioni gerarchiche ---
  // Servono per la logica "a cascata": dato un comune, qual è la sua provincia/regione?
  const comuneToProvincia = useRef<Map<string, string>>(new Map())
  const provinciaToRegione = useRef<Map<string, string>>(new Map())
  const regioniCaricateComuni = useRef<Set<string>>(new Set())

  // ============================================================
  // LOGICA DI COPERTURA
  // Una unità è "coperta" se è stata selezionata direttamente
  // O se un suo "antenato" (regione → provincia → comune) lo è stato.
  // Le esclusioni puntuali tolgono unità dalla copertura.
  // ============================================================

  function regioneCoperta(nomeReg: string): boolean {
    return regioniSelRef.current.has(nomeReg)
  }

  function provinciaCoperta(nomeProv: string): boolean {
    if (provinceEsclRef.current.has(nomeProv)) return false // esclusa esplicitamente
    if (provinceSelRef.current.has(nomeProv)) return true
    const reg = provinciaToRegione.current.get(nomeProv)
    if (reg && regioniSelRef.current.has(reg)) return true
    return false
  }

  function comuneCoperto(nomeCom: string): boolean {
    if (comuniEsclRef.current.has(nomeCom)) return false // escluso puntualmente
    if (comuniInclRef.current.has(nomeCom)) return true  // incluso singolarmente
    const prov = comuneToProvincia.current.get(nomeCom)
    if (prov && provinciaCoperta(prov)) return true
    return false
  }

  // ============================================================
  // RENDERING: stile dei poligoni in base allo stato corrente
  // ============================================================

  function stilizzaRegione(nomeReg: string) {
    const polys = poligoniRegioni.current.get(nomeReg)
    if (!polys) return
    // 3 casi:
    // 1. Regione selezionata SENZA esclusioni interne → blu pieno
    // 2. Regione selezionata CON esclusioni → trasparente (vedrai le province coperte
    //    come "macchie" blu sopra la regione)
    // 3. Regione non selezionata → trasparente
    const selezionata = regioneCoperta(nomeReg)
    const haEsclusioni = selezionata && regioneHaEsclusioniInterne(nomeReg)
    const totalmenteCoperta = selezionata && !haEsclusioni

    polys.forEach(p => p.setOptions({
      fillColor: COLOR_SELECTED_FILL,
      fillOpacity: totalmenteCoperta ? 0.4 : 0,
      strokeColor: totalmenteCoperta ? COLOR_SELECTED_STROKE : COLOR_BORDER,
      strokeWeight: 1.5,
    }))
  }

  // Controlla se una regione (selezionata interamente) ha esclusioni interne:
  // province escluse esplicitamente o comuni esclusi che le appartengono.
  function regioneHaEsclusioniInterne(nomeReg: string): boolean {
    // Province escluse di questa regione
    let trovato = false
    provinceEsclRef.current.forEach(nomeProv => {
      if (trovato) return
      if (provinciaToRegione.current.get(nomeProv) === nomeReg) trovato = true
    })
    if (trovato) return true
    // Comuni esclusi di questa regione
    comuniEsclRef.current.forEach(nomeCom => {
      if (trovato) return
      const prov = comuneToProvincia.current.get(nomeCom)
      if (!prov) return
      const reg = provinciaToRegione.current.get(prov)
      if (reg === nomeReg) trovato = true
    })
    return trovato
  }

  function stilizzaProvincia(nomeProv: string) {
    const polys = poligoniProvince.current.get(nomeProv)
    if (!polys) return
    // 3 casi simili alle regioni:
    // 1. Provincia coperta SENZA comuni esclusi al suo interno → blu pieno
    // 2. Provincia coperta CON comuni esclusi → trasparente (i suoi comuni coperti
    //    appaiono come "macchie" blu, gli esclusi come "buchi")
    // 3. Provincia non coperta → trasparente
    const coperta = provinciaCoperta(nomeProv)
    const haEsclusioniInterne = coperta && provinciaHaComuniEsclusi(nomeProv)
    const totalmenteCoperta = coperta && !haEsclusioniInterne

    polys.forEach(p => p.setOptions({
      fillColor: COLOR_SELECTED_FILL,
      fillOpacity: totalmenteCoperta ? 0.35 : 0,
      strokeColor: totalmenteCoperta ? COLOR_SELECTED_STROKE : COLOR_BORDER,
      strokeWeight: 1.2,
    }))
  }

  // Controlla se una provincia coperta ha comuni esclusi al suo interno.
  function provinciaHaComuniEsclusi(nomeProv: string): boolean {
    let trovato = false
    comuniEsclRef.current.forEach(nomeCom => {
      if (trovato) return
      if (comuneToProvincia.current.get(nomeCom) === nomeProv) trovato = true
    })
    return trovato
  }

  function stilizzaComune(nomeCom: string) {
    const polys = poligoniComuni.current.get(nomeCom)
    if (!polys) return
    const escluso = comuniEsclRef.current.has(nomeCom)
    const inclusoSingolarmente = comuniInclRef.current.has(nomeCom)
    // Coperto = c'è copertura attiva su questo comune
    const coperto = comuneCoperto(nomeCom)

    // Logica visiva pulita:
    // - Coperto (per qualunque motivo) → blu
    // - Non coperto → trasparente, con confine grigio molto leggero
    // I comuni esclusi NON sono più rossi: il rosso esiste solo come anteprima al hover.
    // Manteniamo i comuni "esclusi" e "inclusi singolari" comunque visibili in ogni
    // layer come riferimento di dove l'admin ha messo modifiche.
    if (coperto) {
      polys.forEach(p => p.setOptions({
        fillColor: COLOR_SELECTED_FILL,
        fillOpacity: 0.3,
        strokeColor: COLOR_SELECTED_STROKE,
        strokeWeight: 0.8,
      }))
    } else if (escluso || inclusoSingolarmente) {
      // Trasparente ma con un bordo visibile per far capire che è un comune "modificato"
      polys.forEach(p => p.setOptions({
        fillColor: COLOR_SELECTED_FILL,
        fillOpacity: 0,
        strokeColor: COLOR_BORDER,
        strokeWeight: 0.8,
      }))
    } else {
      polys.forEach(p => p.setOptions({
        fillColor: COLOR_SELECTED_FILL,
        fillOpacity: 0,
        strokeColor: COLOR_BORDER,
        strokeWeight: 0.8,
      }))
    }
  }

  // Aggiorna il tooltip in base alla posizione del mouse (in coordinate
  // del container della mappa). domEvent ci dà clientX/clientY relativi
  // alla finestra, sottraiamo il bounding del container per ottenere il
  // posizionamento corretto dentro al div della mappa.
  function aggiornaTooltip(nome: string, domEvent?: MouseEvent, sub?: string) {
    if (!domEvent || !mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    setTooltip({
      name: nome,
      sub,
      x: domEvent.clientX - rect.left,
      y: domEvent.clientY - rect.top,
    })
  }

  // ============================================================
  // VISIBILITÀ: quale layer mostrare in base allo zoom
  // ============================================================

  function aggiornaVisibilitaLayer(zoom: number) {
    let layer: Layer
    if (zoom < ZOOM_PROVINCE) layer = 'regioni'
    else if (zoom < ZOOM_COMUNI) layer = 'province'
    else layer = 'comuni'

    setLayerCorrente(layer)

    // REGIONI: visibili solo nel layer regioni
    poligoniRegioni.current.forEach((polys, nomeReg) => {
      const visible = layer === 'regioni'
      polys.forEach(p => p.setOptions({ visible, clickable: visible }))
      if (visible) stilizzaRegione(nomeReg)
    })

    // PROVINCE: visibili nel layer province, MA anche nel layer regioni se:
    // - selezionate direttamente (province singole fuori da una regione coperta)
    // - appartenenti a una regione coperta CHE HA ESCLUSIONI interne (così l'admin
    //   vede a colpo d'occhio "dentro questa regione la copertura è parziale")
    poligoniProvince.current.forEach((polys, nomeProv) => {
      const coperta = provinciaCoperta(nomeProv)
      let mostraInLayerRegioni = false
      if (coperta && layer === 'regioni') {
        const selezionataDirettamente = provinceSelRef.current.has(nomeProv)
        if (selezionataDirettamente) {
          mostraInLayerRegioni = true
        } else {
          // È coperta perché la regione è selezionata: la mostro solo se la regione
          // ha esclusioni interne (altrimenti la regione stessa è già blu pieno)
          const reg = provinciaToRegione.current.get(nomeProv)
          if (reg && regioneHaEsclusioniInterne(reg)) {
            mostraInLayerRegioni = true
          }
        }
      }
      const visible = layer === 'province' || mostraInLayerRegioni
      const clickable = layer === 'province'
      polys.forEach(p => p.setOptions({ visible, clickable }))
      if (visible) stilizzaProvincia(nomeProv)
    })

    // COMUNI: visibili nel layer comuni, MA anche negli altri layer se:
    // - inclusi singolarmente (isolotti blu)
    // - esclusi (buchi nella copertura)
    // - coperti E la loro provincia/regione ha esclusioni interne (così l'admin
    //   vede a colpo d'occhio quali parti della provincia/regione sono coperte
    //   anche tornando a zoom basso)
    poligoniComuni.current.forEach((polys, nomeCom) => {
      const escluso = comuniEsclRef.current.has(nomeCom)
      const inclusoSingolarmente = comuniInclRef.current.has(nomeCom)
      const coperto = comuneCoperto(nomeCom)

      let visibilePerCoperturaParziale = false
      if (coperto && !escluso) {
        const prov = comuneToProvincia.current.get(nomeCom)
        if (prov) {
          const provHaEsclusi = provinciaHaComuniEsclusi(prov)
          // Se la sua provincia ha esclusioni, mostralo come "macchia" blu
          // dentro la provincia trasparente (visibile in layer province e regioni).
          if (provHaEsclusi && (layer === 'province' || layer === 'regioni')) {
            visibilePerCoperturaParziale = true
          }
        }
      }

      const visible = layer === 'comuni' || escluso || inclusoSingolarmente || visibilePerCoperturaParziale
      const clickable = layer === 'comuni'
      polys.forEach(p => p.setOptions({ visible, clickable }))
      if (visible) stilizzaComune(nomeCom)
    })
  }

  // ============================================================
  // CARICAMENTO COMUNI DI UNA REGIONE (lazy, da Supabase Storage)
  // ============================================================

  async function caricaComuniRegione(slugRegione: string, map: google.maps.Map): Promise<void> {
    if (regioniCaricateComuni.current.has(slugRegione)) return
    regioniCaricateComuni.current.add(slugRegione)

    try {
      const url = `${SUPABASE_GEOJSON_URL}/${slugRegione}.geojson`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (mapInstanceRef.current !== map) return

      for (const feature of data.features) {
        const nomeCom = feature.properties.name
        const nomeProv = feature.properties.prov_name
        const geom = feature.geometry
        if (!geom) continue

        comuneToProvincia.current.set(nomeCom, nomeProv)

        const coords = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
        const poligoni: google.maps.Polygon[] = []

        for (const poly of coords) {
          const paths = poly.map((ring: number[][]) =>
            ring.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
          )

          const polygon = new window.google.maps.Polygon({
            paths, map,
            fillColor: COLOR_SELECTED_FILL,
            fillOpacity: 0,
            strokeColor: COLOR_BORDER,
            strokeWeight: 0.8,
            clickable: false,
            visible: false,
            zIndex: 3,
          })

          polygon.addListener('click', () => {
            const prov = comuneToProvincia.current.get(nomeCom)
            const provinciaSottostanteCoperta = prov ? provinciaCoperta(prov) : false

            if (provinciaSottostanteCoperta) {
              // La copertura viene dalla regione/provincia: il click ESCLUDE il comune
              setComuniEsclusi(prev => {
                const next = new Set(prev)
                if (next.has(nomeCom)) next.delete(nomeCom)
                else next.add(nomeCom)
                return next
              })
            } else {
              // Provincia non coperta: il click INCLUDE singolarmente il comune
              setComuniInclusi(prev => {
                const next = new Set(prev)
                if (next.has(nomeCom)) next.delete(nomeCom)
                else next.add(nomeCom)
                return next
              })
            }
          })

          polygon.addListener('mouseover', () => {
            if (layerCorrenteRef.current !== 'comuni') return
            const coperto = comuneCoperto(nomeCom)
            if (coperto) {
              // Anteprima discreta di rimozione: opacità si abbassa
              polygon.setOptions({ fillOpacity: 0.1, fillColor: COLOR_SELECTED_FILL, strokeColor: COLOR_SELECTED_STROKE })
            } else {
              // Anteprima di aggiunta: blu pieno
              polygon.setOptions({ fillOpacity: 0.35, fillColor: COLOR_SELECTED_FILL, strokeColor: COLOR_SELECTED_STROKE })
            }
          })
          polygon.addListener('mousemove', (e: google.maps.MapMouseEvent & { domEvent?: MouseEvent }) => {
            if (layerCorrenteRef.current !== 'comuni') return
            // Riga secondaria: provincia · regione (dati già in memoria)
            const prov = comuneToProvincia.current.get(nomeCom)
            const reg = prov ? provinciaToRegione.current.get(prov) : undefined
            const sub = [prov, reg].filter(Boolean).join(' · ')
            aggiornaTooltip(nomeCom, e.domEvent, sub || undefined)
          })
          polygon.addListener('mouseout', () => {
            stilizzaComune(nomeCom)
            setTooltip(null)
          })

          poligoni.push(polygon)
        }

        if (poligoniComuni.current.has(nomeCom)) {
          poligoniComuni.current.get(nomeCom)!.push(...poligoni)
        } else {
          poligoniComuni.current.set(nomeCom, poligoni)
        }
      }
    } catch (err) {
      console.error(`Errore caricamento comuni ${slugRegione}:`, err)
      regioniCaricateComuni.current.delete(slugRegione)
    }
  }

  // Caricamento on-demand dei comuni di tutte le regioni che hanno
  // poligoni nella zona attualmente inquadrata dalla mappa.
  async function caricaComuniZonaVisibile(map: google.maps.Map) {
    const bounds = map.getBounds()
    if (!bounds) return
    // Carichiamo i file dei comuni delle regioni le cui province hanno
    // almeno un vertice dentro l'area inquadrata.
    const slugsDaCaricare = new Set<string>()
    poligoniProvince.current.forEach((polys, nomeProv) => {
      const path = polys[0]?.getPath()
      if (!path || path.getLength() === 0) return
      const center = path.getAt(0)
      if (bounds.contains(center)) {
        // PROVINCE_REGIONI mappa nome-provincia → slug-regione (es. 'Roma' → 'lazio')
        // Slug è quello usato nei nomi file su Supabase Storage.
        const slug = PROVINCE_REGIONI[nomeProv]
        if (slug) slugsDaCaricare.add(slug)
      }
    })
    for (const slug of slugsDaCaricare) {
      await caricaComuniRegione(slug, map)
    }
    // Dopo caricamento, applica la visibilità corrente
    aggiornaVisibilitaLayer(map.getZoom() || 6)
  }

  // ============================================================
  // INIT MAPPA
  // ============================================================

  const layerCorrenteRef = useRef<Layer>('regioni')
  useEffect(() => { layerCorrenteRef.current = layerCorrente }, [layerCorrente])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return
    if (initStartedRef.current) return
    initStartedRef.current = true

    let cancelled = false

    loadGoogleMaps().then(() => {
      if (cancelled) return
      initMappa()
    }).catch(err => console.error('Errore caricamento Google Maps:', err))

    return () => {
      cancelled = true
      poligoniRegioni.current.forEach(polys => polys.forEach(p => p.setMap(null)))
      poligoniProvince.current.forEach(polys => polys.forEach(p => p.setMap(null)))
      poligoniComuni.current.forEach(polys => polys.forEach(p => p.setMap(null)))
      poligoniRegioni.current.clear()
      poligoniProvince.current.clear()
      poligoniComuni.current.clear()
      regioniCaricateComuni.current.clear()
      mapInstanceRef.current = null
      initStartedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Quando lo stato di selezione cambia, ricolora tutto il layer corrente
  useEffect(() => {
    poligoniRegioni.current.forEach((_, nome) => stilizzaRegione(nome))
    poligoniProvince.current.forEach((_, nome) => stilizzaProvincia(nome))
    poligoniComuni.current.forEach((_, nome) => stilizzaComune(nome))
    // Esclusioni: anche se cambiamo solo regioni/province, i comuni esclusi/inclusi
    // restano sempre visibili
    if (mapInstanceRef.current) {
      aggiornaVisibilitaLayer(mapInstanceRef.current.getZoom() || 6)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regioniSelezionate, provinceSelezionate, provinceEscluse, comuniInclusi, comuniEsclusi])

  async function initMappa() {
    if (!mapRef.current) return
    if (mapInstanceRef.current) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 42.5, lng: 12.5 },
      zoom: 6,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })
    mapInstanceRef.current = map

    // LIVELLO REGIONI
    try {
      const res = await fetch('/regioni.geojson')
      const data = await res.json()
      if (mapInstanceRef.current !== map) return

      for (const feature of data.features) {
        const nomeReg = feature.properties.reg_name
        const geom = feature.geometry
        if (!geom) continue

        const coords = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
        const poligoni: google.maps.Polygon[] = []

        for (const poly of coords) {
          const paths = poly.map((ring: number[][]) =>
            ring.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
          )
          const polygon = new window.google.maps.Polygon({
            paths, map,
            fillColor: COLOR_SELECTED_FILL,
            fillOpacity: 0,
            strokeColor: COLOR_BORDER,
            strokeWeight: 1.5,
            clickable: true,
            zIndex: 1,
          })

          polygon.addListener('click', () => {
            const eraSelezionata = regioniSelRef.current.has(nomeReg)
            setRegioniSelezionate(prev => {
              const next = new Set(prev)
              if (next.has(nomeReg)) next.delete(nomeReg)
              else next.add(nomeReg)
              return next
            })
            if (!eraSelezionata) {
              // ⭐ Assorbo le selezioni interne: ora copre TUTTA la regione,
              // quindi province selezionate singolarmente, esclusioni e comuni
              // inclusi/esclusi al suo interno sono ridondanti (e sulla mappa
              // si vedevano più scuri sopra la regione)
              const provInRegione = (p: string) => provinciaToRegione.current.get(p) === nomeReg
              const comInRegione = (c: string) => {
                const prov = comuneToProvincia.current.get(c)
                return !!prov && provinciaToRegione.current.get(prov) === nomeReg
              }
              setProvinceSelezionate(prev => {
                const next = new Set(prev)
                next.forEach(p => { if (provInRegione(p)) next.delete(p) })
                return next
              })
              setProvinceEscluse(prev => {
                const next = new Set(prev)
                next.forEach(p => { if (provInRegione(p)) next.delete(p) })
                return next
              })
              setComuniInclusi(prev => {
                const next = new Set(prev)
                next.forEach(c => { if (comInRegione(c)) next.delete(c) })
                return next
              })
              setComuniEsclusi(prev => {
                const next = new Set(prev)
                next.forEach(c => { if (comInRegione(c)) next.delete(c) })
                return next
              })
            }
          })

          polygon.addListener('mouseover', () => {
            if (layerCorrenteRef.current !== 'regioni') return
            if (regioniSelRef.current.has(nomeReg)) return
            polygon.setOptions({ fillOpacity: 0.4, fillColor: COLOR_SELECTED_FILL, strokeColor: COLOR_SELECTED_STROKE })
          })
          polygon.addListener('mousemove', (e: google.maps.MapMouseEvent & { domEvent?: MouseEvent }) => {
            if (layerCorrenteRef.current !== 'regioni') return
            aggiornaTooltip(nomeReg, e.domEvent)
          })
          polygon.addListener('mouseout', () => {
            stilizzaRegione(nomeReg)
            setTooltip(null)
          })

          poligoni.push(polygon)
        }
        poligoniRegioni.current.set(nomeReg, poligoni)
      }
    } catch (err) {
      console.error('Errore regioni:', err)
    }

    // LIVELLO PROVINCE
    try {
      const res = await fetch('/province.geojson')
      const data = await res.json()
      if (mapInstanceRef.current !== map) return

      for (const feature of data.features) {
        const nomeProv = feature.properties.prov_name
        const nomeReg = feature.properties.reg_name
        const geom = feature.geometry
        if (!geom) continue

        if (nomeReg) provinciaToRegione.current.set(nomeProv, nomeReg)

        const coords = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
        const poligoni: google.maps.Polygon[] = []

        for (const poly of coords) {
          const paths = poly.map((ring: number[][]) =>
            ring.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
          )
          const polygon = new window.google.maps.Polygon({
            paths, map,
            fillColor: COLOR_SELECTED_FILL,
            fillOpacity: 0,
            strokeColor: COLOR_BORDER,
            strokeWeight: 1.2,
            clickable: false,  // diventa cliccabile solo a zoom giusto
            visible: false,
            zIndex: 2,
          })

          polygon.addListener('click', () => {
            const reg = provinciaToRegione.current.get(nomeProv)
            const copertaDallaRegione = reg ? regioniSelRef.current.has(reg) : false
            const inEsclusioni = provinceEsclRef.current.has(nomeProv)
            const inSelezioniDirette = provinceSelRef.current.has(nomeProv)

            if (inEsclusioni) {
              // Era stata esclusa da una regione coperta → reincludo (tolgo dalle esclusioni)
              setProvinceEscluse(prev => {
                const next = new Set(prev)
                next.delete(nomeProv)
                return next
              })
            } else if (inSelezioniDirette) {
              // Selezionata direttamente → tolgo la selezione e pulisco esclusioni/inclusi dei suoi comuni
              setProvinceSelezionate(prev => {
                const next = new Set(prev)
                next.delete(nomeProv)
                return next
              })
              setComuniEsclusi(prevEx => {
                const nextEx = new Set(prevEx)
                nextEx.forEach(c => {
                  if (comuneToProvincia.current.get(c) === nomeProv) nextEx.delete(c)
                })
                return nextEx
              })
              setComuniInclusi(prevIn => {
                const nextIn = new Set(prevIn)
                nextIn.forEach(c => {
                  if (comuneToProvincia.current.get(c) === nomeProv) nextIn.delete(c)
                })
                return nextIn
              })
            } else if (copertaDallaRegione) {
              // Coperta perché la regione è selezionata → escludo la provincia
              setProvinceEscluse(prev => {
                const next = new Set(prev)
                next.add(nomeProv)
                return next
              })
              // Pulisco anche eventuali inclusi/esclusi di comuni di questa provincia
              setComuniEsclusi(prevEx => {
                const nextEx = new Set(prevEx)
                nextEx.forEach(c => {
                  if (comuneToProvincia.current.get(c) === nomeProv) nextEx.delete(c)
                })
                return nextEx
              })
              setComuniInclusi(prevIn => {
                const nextIn = new Set(prevIn)
                nextIn.forEach(c => {
                  if (comuneToProvincia.current.get(c) === nomeProv) nextIn.delete(c)
                })
                return nextIn
              })
            } else {
              // Vuota → aggiungo come selezione diretta
              setProvinceSelezionate(prev => {
                const next = new Set(prev)
                next.add(nomeProv)
                return next
              })
              // Pulisco eventuali esclusioni di comuni di questa provincia
              setComuniEsclusi(prevEx => {
                const nextEx = new Set(prevEx)
                nextEx.forEach(c => {
                  if (comuneToProvincia.current.get(c) === nomeProv) nextEx.delete(c)
                })
                return nextEx
              })
              // ⭐ Assorbo i comuni già inclusi singolarmente: ora copre tutta
              // la provincia, la selezione singola è ridondante (e sulla mappa
              // si vedeva blu più scuro sopra la provincia)
              setComuniInclusi(prevIn => {
                const nextIn = new Set(prevIn)
                nextIn.forEach(c => {
                  if (comuneToProvincia.current.get(c) === nomeProv) nextIn.delete(c)
                })
                return nextIn
              })
              // Pre-carica comuni della regione di questa provincia
              const slug = PROVINCE_REGIONI[nomeProv]
              if (slug) caricaComuniRegione(slug, map)
            }
          })

          polygon.addListener('mouseover', () => {
            if (layerCorrenteRef.current !== 'province') return
            const coperta = provinciaCoperta(nomeProv)
            if (coperta) {
              // Anteprima discreta di rimozione: opacità si abbassa (resta blu più chiaro)
              polygon.setOptions({ fillOpacity: 0.1, fillColor: COLOR_SELECTED_FILL, strokeColor: COLOR_SELECTED_STROKE })
            } else {
              // Anteprima di aggiunta: blu pieno
              polygon.setOptions({ fillOpacity: 0.35, fillColor: COLOR_SELECTED_FILL, strokeColor: COLOR_SELECTED_STROKE })
            }
          })
          polygon.addListener('mousemove', (e: google.maps.MapMouseEvent & { domEvent?: MouseEvent }) => {
            if (layerCorrenteRef.current !== 'province') return
            // Riga secondaria: regione di appartenenza
            const reg = provinciaToRegione.current.get(nomeProv)
            aggiornaTooltip(nomeProv, e.domEvent, reg || undefined)
          })
          polygon.addListener('mouseout', () => {
            stilizzaProvincia(nomeProv)
            setTooltip(null)
          })

          poligoni.push(polygon)
        }
        poligoniProvince.current.set(nomeProv, poligoni)
      }
    } catch (err) {
      console.error('Errore province:', err)
    }

    setLoading(false)

    // Listener zoom: cambia layer + carica comuni se necessario
    map.addListener('zoom_changed', () => {
      const z = map.getZoom() || 6
      aggiornaVisibilitaLayer(z)
      if (z >= ZOOM_COMUNI) {
        caricaComuniZonaVisibile(map)
      }
    })
    // Listener pan (spostamento mappa): se siamo nel layer comuni e l'utente
    // si sposta, carica i comuni della nuova zona
    map.addListener('idle', () => {
      const z = map.getZoom() || 6
      if (z >= ZOOM_COMUNI) {
        caricaComuniZonaVisibile(map)
      }
    })

    // Applica la visibilità iniziale
    aggiornaVisibilitaLayer(map.getZoom() || 6)

    // Pre-carico i file dei comuni delle regioni necessarie per visualizzare
    // i comuni inclusi/esclusi che arrivano dalla copertura iniziale (DB).
    // Per ogni comune, dobbiamo conoscere la sua provincia, ma sappiamo solo
    // la regione dalla mappa PROVINCE_REGIONI inversa. Più semplice: per ogni
    // provincia presente in coperturaIniziale, troviamo lo slug della regione
    // e carichiamo quel file. Per i comuni inclusi/esclusi NON sappiamo la
    // provincia a priori, quindi carichiamo tutte le regioni di tutte le
    // province citate, e per i comuni sciolti carichiamo TUTTE le regioni
    // se non riusciamo a determinarle (caso raro: in genere il DB ha la
    // provincia salvata anche per i comuni).
    if (coperturaIniziale && coperturaIniziale.length > 0) {
      const slugsDaCaricare = new Set<string>()
      for (const rec of coperturaIniziale) {
        if (rec.tipo === 'provincia' || rec.tipo === 'comune_incluso' || rec.tipo === 'comune_escluso') {
          // Usa la colonna provincia se valorizzata, altrimenti salta (slug ignoto)
          const slug = PROVINCE_REGIONI[rec.provincia]
          if (slug) slugsDaCaricare.add(slug)
        }
      }
      // Carica in sequenza per non sovraccaricare la rete
      ;(async () => {
        for (const slug of slugsDaCaricare) {
          await caricaComuniRegione(slug, map)
        }
        // Dopo il caricamento, ridisegna tutto
        aggiornaVisibilitaLayer(map.getZoom() || 6)
      })()
    }
  }

  // ============================================================
  // SALVATAGGIO
  // ============================================================

  function handleSalva() {
    // Costruisce la lista completa di record da salvare nel database.
    const records: CoperturaRecord[] = []

    regioniSelezionate.forEach(nome => {
      records.push({ comune: nome, provincia: '', tipo: 'regione' })
    })
    provinceSelezionate.forEach(nome => {
      records.push({ comune: nome, provincia: nome, tipo: 'provincia' })
    })
    provinceEscluse.forEach(nome => {
      records.push({ comune: nome, provincia: nome, tipo: 'provincia_esclusa' })
    })
    comuniInclusi.forEach(nome => {
      const prov = comuneToProvincia.current.get(nome) || ''
      records.push({ comune: nome, provincia: prov, tipo: 'comune_incluso' })
    })
    comuniEsclusi.forEach(nome => {
      const prov = comuneToProvincia.current.get(nome) || ''
      records.push({ comune: nome, provincia: prov, tipo: 'comune_escluso' })
    })

    onSalva(records)
  }

  // ============================================================
  // RENDER
  // ============================================================

  const labelLayer =
    layerCorrente === 'regioni' ? 'Regioni'
    : layerCorrente === 'province' ? 'Province'
    : 'Comuni'

  // La copertura è stata MODIFICATA rispetto a quella salvata?
  // Confronta una "firma" della selezione attuale con quella iniziale (dal DB).
  function firmaSets(r: Set<string>, p: Set<string>, pe: Set<string>, ci: Set<string>, ce: Set<string>): string {
    return JSON.stringify({ r: [...r].sort(), p: [...p].sort(), pe: [...pe].sort(), ci: [...ci].sort(), ce: [...ce].sort() })
  }
  const setsIniziali = (() => {
    const r = new Set<string>(), p = new Set<string>(), pe = new Set<string>(), ci = new Set<string>(), ce = new Set<string>()
    for (const rec of coperturaIniziale || []) {
      if (rec.tipo === 'regione') r.add(rec.comune)
      else if (rec.tipo === 'provincia') p.add(rec.comune)
      else if (rec.tipo === 'provincia_esclusa') pe.add(rec.comune)
      else if (rec.tipo === 'comune_incluso') ci.add(rec.comune)
      else if (rec.tipo === 'comune_escluso') ce.add(rec.comune)
    }
    return { r, p, pe, ci, ce }
  })()
  const coperturaModificata =
    firmaSets(regioniSelezionate, provinceSelezionate, provinceEscluse, comuniInclusi, comuniEsclusi) !==
    firmaSets(setsIniziali.r, setsIniziali.p, setsIniziali.pe, setsIniziali.ci, setsIniziali.ce)

  // --- Copertura parziale (SOLO visualizzazione pannello) ---
  // Una provincia è "parziale" se al suo interno ci sono comuni esclusi;
  // una regione se ha province escluse o comuni esclusi. Il calcolo legge
  // i dati già in memoria: la logica di esclusione e il salvataggio non
  // vengono toccati in alcun modo.
  function provinciaDiComuneEscluso(nomeCom: string): string {
    const daMappa = comuneToProvincia.current.get(nomeCom)
    if (daMappa) return daMappa
    // Fallback per esclusi appena ripristinati dal DB, quando il geojson
    // dei comuni non è ancora stato scaricato: la provincia è salvata nel record.
    const rec = (coperturaIniziale || []).find(r => r.comune === nomeCom && r.tipo === 'comune_escluso')
    return rec?.provincia || ''
  }
  function provinciaParziale(nomeProv: string): boolean {
    return Array.from(comuniEsclusi).some(c => provinciaDiComuneEscluso(c) === nomeProv)
  }
  function regioneParziale(nomeReg: string): boolean {
    const haProvEsclusa = Array.from(provinceEscluse).some(p => provinciaToRegione.current.get(p) === nomeReg)
    if (haProvEsclusa) return true
    return Array.from(comuniEsclusi).some(c => {
      const prov = provinciaDiComuneEscluso(c)
      return prov ? provinciaToRegione.current.get(prov) === nomeReg : false
    })
  }
  function BadgeParziale() {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: '#FEF3C7', color: '#854F0B' }}>
        parziale
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '12px', height: '600px' }}>
      <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="flex-1 overflow-y-auto p-3.5" style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 14 }}>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10.5px] font-bold uppercase" style={{ color: '#94A3B8', letterSpacing: 0.5 }}>Vista attuale</p>
            <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#DBEAFE', color: '#1E4E8C' }}>{labelLayer}</span>
          </div>

          {regioniSelezionate.size === 0 && provinceSelezionate.size === 0 && comuniInclusi.size === 0 ? (
            <div className="text-center mt-6 px-2">
              <div className="flex justify-center mb-2">
                <span style={{ width: 40, height: 40, borderRadius: 12, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-700">Nessuna zona selezionata</p>
              <p className="text-[11px] mt-1" style={{ color: '#94A3B8', lineHeight: 1.5 }}>Clicca sulla mappa per aggiungere le zone coperte</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 mt-1">
              {regioniSelezionate.size > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase mt-1" style={{ color: '#94A3B8', letterSpacing: 0.4 }}>Regioni</p>
                  {Array.from(regioniSelezionate).sort().map(r => (
                    <div key={r} className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: '#E0EDFB' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                      <span className="text-xs font-bold flex-1 truncate" style={{ color: '#1E4E8C' }}>{r}</span>
                      {regioneParziale(r) && <BadgeParziale />}
                    </div>
                  ))}
                </>
              )}
              {provinceSelezionate.size > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase mt-1" style={{ color: '#94A3B8', letterSpacing: 0.4 }}>Province</p>
                  {Array.from(provinceSelezionate).sort().map(p => (
                    <div key={p} className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: '#E0EDFB' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                      <span className="text-xs font-bold flex-1 truncate" style={{ color: '#1E4E8C' }}>{p}</span>
                      {provinciaParziale(p) && <BadgeParziale />}
                    </div>
                  ))}
                </>
              )}
              {comuniInclusi.size > 0 && (
                <>
                  <p className="text-[10px] font-bold uppercase mt-1" style={{ color: '#94A3B8', letterSpacing: 0.4 }}>Comuni inclusi</p>
                  {Array.from(comuniInclusi).sort().map(c => (
                    <div key={c} className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: '#E0EDFB' }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                      <span className="text-xs font-bold flex-1 truncate" style={{ color: '#1E4E8C' }}>{c}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ⭐ 28/07 (richiesta Davide): via il bottone "Cancella tutto" — solo
            l'icona cestino, discreta, col nome al passaggio del mouse */}
        {(regioniSelezionate.size > 0 || provinceSelezionate.size > 0 || comuniInclusi.size > 0 || comuniEsclusi.size > 0) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setRegioniSelezionate(new Set())
                setProvinceSelezionate(new Set())
                setProvinceEscluse(new Set())
                setComuniInclusi(new Set())
                setComuniEsclusi(new Set())
              }}
              title="Svuota la copertura"
              aria-label="Svuota la copertura"
              className="transition-colors hover:bg-red-50"
              style={{ width: 30, height: 30, borderRadius: 999, background: '#fff', border: '1.5px solid #F3C8C8', color: '#C0392B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          </div>
        )}

        {/* Il salvataggio appare SOLO se la copertura è stata modificata */}
        {coperturaModificata && (
          <>
            <p className="text-[11.5px] font-semibold text-center" style={{ color: '#B45309', margin: 0 }}>Modifiche non salvate</p>
            <button onClick={handleSalva} className="w-full text-white py-3 rounded-xl text-sm font-bold transition-all hover:opacity-95 active:scale-[0.99]" style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
              Salva copertura
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid #E5E7EB', boxShadow: '0 1px 3px rgba(16,24,40,0.07)' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-gray-400">Caricamento mappa...</div>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x + 12,
              top: tooltip.y + 12,
              pointerEvents: 'none',
              background: 'rgba(15, 23, 42, 0.92)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              zIndex: 20,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }}
          >
            {tooltip.name}
            {tooltip.sub && (
              <div style={{ fontSize: '10.5px', fontWeight: 400, color: '#CBD5E1', marginTop: 1 }}>
                {tooltip.sub}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}