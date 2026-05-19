'use client'

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from 'react'

interface Props {
  onSalva: (comuni: { comune: string; provincia: string; fee_comune?: number; distanza_km?: number }[]) => void
  comuniSalvati: string[]
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

// Singleton: previene doppio caricamento dello script Google Maps in dev (StrictMode).
let googleMapsScriptPromise: Promise<void> | null = null

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleMapsScriptPromise) return googleMapsScriptPromise
  if (typeof window !== 'undefined' && window.google?.maps) {
    googleMapsScriptPromise = Promise.resolve()
    return googleMapsScriptPromise
  }
  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gmaps-loader="1"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed')))
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=it&region=IT`
    script.async = true
    script.defer = true
    script.dataset.gmapsLoader = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps script failed'))
    document.head.appendChild(script)
  })
  return googleMapsScriptPromise
}

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

export default function MappaComuni({ onSalva, comuniSalvati }: Props) {
  // --- Refs DOM e mappa ---
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const initStartedRef = useRef(false)
  const [loading, setLoading] = useState(true)

  // --- Stato selezione (visibile in pannello laterale) ---
  // Cosa l'utente ha cliccato direttamente: regioni, province, comuni inclusi singolarmente.
  // Le esclusioni sono i "buchi" puntuali nella copertura.
  const [regioniSelezionate, setRegioniSelezionate] = useState<Set<string>>(new Set())
  const [provinceSelezionate, setProvinceSelezionate] = useState<Set<string>>(new Set())
  const [comuniInclusi, setComuniInclusi] = useState<Set<string>>(new Set())
  const [comuniEsclusi, setComuniEsclusi] = useState<Set<string>>(new Set())
  const [layerCorrente, setLayerCorrente] = useState<Layer>('regioni')

  // Tooltip: nome dell'unità sotto il mouse + posizione (in pixel relativi al container mappa)
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null)

  // --- Ref-mirror dello stato (per usarlo dentro i listener di Google Maps) ---
  const regioniSelRef = useRef<Set<string>>(new Set())
  const provinceSelRef = useRef<Set<string>>(new Set())
  const comuniInclRef = useRef<Set<string>>(new Set())
  const comuniEsclRef = useRef<Set<string>>(new Set())
  useEffect(() => { regioniSelRef.current = regioniSelezionate }, [regioniSelezionate])
  useEffect(() => { provinceSelRef.current = provinceSelezionate }, [provinceSelezionate])
  useEffect(() => { comuniInclRef.current = comuniInclusi }, [comuniInclusi])
  useEffect(() => { comuniEsclRef.current = comuniEsclusi }, [comuniEsclusi])

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
    const coperta = regioneCoperta(nomeReg)
    polys.forEach(p => p.setOptions({
      fillColor: COLOR_SELECTED_FILL,
      fillOpacity: coperta ? 0.4 : 0,
      strokeColor: coperta ? COLOR_SELECTED_STROKE : COLOR_BORDER,
      strokeWeight: 1.5,
    }))
  }

  function stilizzaProvincia(nomeProv: string) {
    const polys = poligoniProvince.current.get(nomeProv)
    if (!polys) return
    const coperta = provinciaCoperta(nomeProv)
    polys.forEach(p => p.setOptions({
      fillColor: COLOR_SELECTED_FILL,
      fillOpacity: coperta ? 0.35 : 0,
      strokeColor: coperta ? COLOR_SELECTED_STROKE : COLOR_BORDER,
      strokeWeight: 1.2,
    }))
  }

  function stilizzaComune(nomeCom: string) {
    const polys = poligoniComuni.current.get(nomeCom)
    if (!polys) return
    const escluso = comuniEsclRef.current.has(nomeCom)
    const coperto = comuneCoperto(nomeCom)
    polys.forEach(p => p.setOptions({
      fillColor: escluso ? COLOR_EXCLUDED_FILL : COLOR_SELECTED_FILL,
      fillOpacity: escluso ? 0.55 : (coperto ? 0.3 : 0),
      strokeColor: escluso ? COLOR_EXCLUDED_STROKE : COLOR_BORDER,
      strokeWeight: 0.8,
    }))
  }

  // Aggiorna il tooltip in base alla posizione del mouse (in coordinate
  // del container della mappa). domEvent ci dà clientX/clientY relativi
  // alla finestra, sottraiamo il bounding del container per ottenere il
  // posizionamento corretto dentro al div della mappa.
  function aggiornaTooltip(nome: string, domEvent?: MouseEvent) {
    if (!domEvent || !mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    setTooltip({
      name: nome,
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

    // REGIONI: visibili solo nel layer regioni. Le esclusioni puntuali no
    // (le regioni non si "escludono" puntualmente, sono il livello più alto).
    poligoniRegioni.current.forEach((polys, nomeReg) => {
      const visible = layer === 'regioni'
      polys.forEach(p => p.setOptions({ visible, clickable: visible }))
      if (visible) stilizzaRegione(nomeReg)
    })

    // PROVINCE: visibili solo nel layer province
    poligoniProvince.current.forEach((polys, nomeProv) => {
      const visible = layer === 'province'
      polys.forEach(p => p.setOptions({ visible, clickable: visible }))
      if (visible) stilizzaProvincia(nomeProv)
    })

    // COMUNI: visibili in 2 casi
    // - siamo nel layer comuni → tutti i comuni della zona inquadrata visibili
    // - in QUALSIASI layer, se il comune è ESCLUSO (rosso) o INCLUSO SINGOLARMENTE
    //   deve essere sempre visibile come riferimento, indipendentemente dallo zoom
    poligoniComuni.current.forEach((polys, nomeCom) => {
      const escluso = comuniEsclRef.current.has(nomeCom)
      const inclusoSingolarmente = comuniInclRef.current.has(nomeCom)
      const visible = layer === 'comuni' || escluso || inclusoSingolarmente
      // Cliccabili solo nel layer comuni (altrimenti si rischia di cliccarli
      // per sbaglio mentre si sta navigando regioni/province)
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
            // Non cambiare hover se il comune è già escluso (rosso) o coperto
            if (comuniEsclRef.current.has(nomeCom)) return
            polygon.setOptions({ fillOpacity: 0.3, fillColor: COLOR_SELECTED_FILL, strokeColor: COLOR_SELECTED_STROKE })
          })
          polygon.addListener('mousemove', (e: google.maps.MapMouseEvent & { domEvent?: MouseEvent }) => {
            if (layerCorrenteRef.current !== 'comuni') return
            aggiornaTooltip(nomeCom, e.domEvent)
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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return
    if (initStartedRef.current) return
    initStartedRef.current = true

    let cancelled = false

    loadGoogleMaps(apiKey).then(() => {
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
  }, [regioniSelezionate, provinceSelezionate, comuniInclusi, comuniEsclusi])

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
            setRegioniSelezionate(prev => {
              const next = new Set(prev)
              if (next.has(nomeReg)) next.delete(nomeReg)
              else next.add(nomeReg)
              return next
            })
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
            setProvinceSelezionate(prev => {
              const next = new Set(prev)
              if (next.has(nomeProv)) {
                // Deseleziono la provincia: pulisco anche le esclusioni di comuni
                // appartenenti a questa provincia (reset locale)
                next.delete(nomeProv)
                setComuniEsclusi(prevEx => {
                  const nextEx = new Set(prevEx)
                  nextEx.forEach(c => {
                    if (comuneToProvincia.current.get(c) === nomeProv) nextEx.delete(c)
                  })
                  return nextEx
                })
              } else {
                next.add(nomeProv)
                // Quando si seleziona una provincia, puliamo le esclusioni di
                // suoi comuni (rendere "tutta" la provincia coperta da zero)
                setComuniEsclusi(prevEx => {
                  const nextEx = new Set(prevEx)
                  nextEx.forEach(c => {
                    if (comuneToProvincia.current.get(c) === nomeProv) nextEx.delete(c)
                  })
                  return nextEx
                })
                // Pre-carica comuni della regione di questa provincia, così
                // se l'utente zooma sono già pronti
                const slug = PROVINCE_REGIONI[nomeProv]
                if (slug) caricaComuniRegione(slug, map)
              }
              return next
            })
          })

          polygon.addListener('mouseover', () => {
            if (layerCorrenteRef.current !== 'province') return
            if (provinciaCoperta(nomeProv)) return
            polygon.setOptions({ fillOpacity: 0.35, fillColor: COLOR_SELECTED_FILL, strokeColor: COLOR_SELECTED_STROKE })
          })
          polygon.addListener('mousemove', (e: google.maps.MapMouseEvent & { domEvent?: MouseEvent }) => {
            if (layerCorrenteRef.current !== 'province') return
            aggiornaTooltip(nomeProv, e.domEvent)
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
  }

  // ============================================================
  // SALVATAGGIO
  // ============================================================

  function handleSalva() {
    // Costruisce la lista di "unità coperte" da inviare al backend.
    // Mandiamo: regioni, province e comuni inclusi singolarmente.
    // Le esclusioni dovrebbero essere gestite a parte (struttura backend più avanti).
    const tuttiNomi = new Set<string>([
      ...regioniSelezionate,
      ...provinceSelezionate,
      ...comuniInclusi,
    ])
    const result = Array.from(tuttiNomi).map(p => ({
      comune: p,
      provincia: p.substring(0, 2).toUpperCase(),
    }))
    onSalva(result)
  }

  // ============================================================
  // RENDER
  // ============================================================

  const labelLayer =
    layerCorrente === 'regioni' ? 'Regioni'
    : layerCorrente === 'province' ? 'Province'
    : 'Comuni'

  return (
    <div style={{ display: 'flex', gap: '12px', height: '580px' }}>
      <div style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vista</p>
            <span className="text-xs font-bold text-blue-600">{labelLayer}</span>
          </div>

          {regioniSelezionate.size === 0 && provinceSelezionate.size === 0 && comuniInclusi.size === 0 ? (
            <p className="text-xs text-gray-300 text-center mt-4">Clicca sulla mappa per selezionare l'area di copertura</p>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              {regioniSelezionate.size > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Regioni</p>
                  {Array.from(regioniSelezionate).sort().map(r => (
                    <div key={r} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-blue-800 flex-1">{r}</span>
                    </div>
                  ))}
                </>
              )}
              {provinceSelezionate.size > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">Province</p>
                  {Array.from(provinceSelezionate).sort().map(p => (
                    <div key={p} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-blue-800 flex-1">{p}</span>
                    </div>
                  ))}
                </>
              )}
              {comuniInclusi.size > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">Comuni inclusi</p>
                  {Array.from(comuniInclusi).sort().map(c => (
                    <div key={c} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-blue-800 flex-1">{c}</span>
                    </div>
                  ))}
                </>
              )}
              {comuniEsclusi.size > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mt-1">Comuni esclusi</p>
                  {Array.from(comuniEsclusi).sort().map(c => (
                    <div key={c} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-2 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-red-700 flex-1">{c}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-600 font-medium mb-1">Come usare:</p>
          <p className="text-xs text-blue-500 leading-relaxed">Zoom basso: clicca le regioni</p>
          <p className="text-xs text-blue-500 leading-relaxed">Zoom medio: clicca le province</p>
          <p className="text-xs text-blue-500 leading-relaxed">Zoom alto: clicca i comuni per includerli/escluderli</p>
        </div>

        {(regioniSelezionate.size > 0 || provinceSelezionate.size > 0 || comuniInclusi.size > 0 || comuniEsclusi.size > 0) && (
          <button
            onClick={() => {
              setRegioniSelezionate(new Set())
              setProvinceSelezionate(new Set())
              setComuniInclusi(new Set())
              setComuniEsclusi(new Set())
            }}
            className="w-full bg-white border border-red-200 text-red-600 py-2.5 rounded-xl text-xs font-semibold hover:bg-red-50 transition-all"
          >
            🗑️ Cancella tutto
          </button>
        )}

        {(regioniSelezionate.size > 0 || provinceSelezionate.size > 0 || comuniInclusi.size > 0) && (
          <button onClick={handleSalva} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all">
            Salva copertura
          </button>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
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
          </div>
        )}
      </div>
    </div>
  )
}