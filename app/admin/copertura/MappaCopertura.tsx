'use client'

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from 'react'

// ============================================================
// TIPI
// ============================================================

export interface RecordCopertura {
  demolitore_id: string
  comune: string
  provincia: string
  tipo: 'regione' | 'provincia' | 'provincia_esclusa' | 'comune_incluso' | 'comune_escluso'
}

interface Props {
  recordCopertura: RecordCopertura[]
}

// ============================================================
// COSTANTI
// ============================================================

const SUPABASE_GEOJSON_URL =
  'https://egsufeczoroxqnagzqfq.supabase.co/storage/v1/object/public/geojson-comuni'

const ZOOM_PROVINCE = 7
const ZOOM_COMUNI = 9

const COLOR_BORDER = '#94a3b8'
const COLOR_UNCOVERED_FILL = '#ef4444'
const COLOR_UNCOVERED_STROKE = '#dc2626'
const COLOR_COVERED_1 = '#93c5fd'
const COLOR_COVERED_2 = '#3b82f6'
const COLOR_COVERED_3PLUS = '#1d4ed8'
const COLOR_COVERED_STROKE = '#1e40af'

// ============================================================
// SINGLETON GOOGLE MAPS
// ============================================================

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

// ============================================================
// MAPPA PROVINCIA → SLUG REGIONE
// ============================================================

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

type CoperturaDemolitore = {
  regioniSel: Set<string>
  provinceSel: Set<string>
  provinceEsc: Set<string>
  comuniIncl: Set<string>
  comuniEsc: Set<string>
}

export default function MappaCopertura({ recordCopertura }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const initStartedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const [layerCorrente, setLayerCorrente] = useState<Layer>('regioni')
  const [tooltip, setTooltip] = useState<{ name: string; count: number; x: number; y: number } | null>(null)

  const coperturaPerDemolitore = useRef<Map<string, CoperturaDemolitore>>(new Map())
  const conteggiPerRegione = useRef<Map<string, number>>(new Map())
  const conteggiPerProvincia = useRef<Map<string, number>>(new Map())
  const conteggiPerComune = useRef<Map<string, number>>(new Map())

  const poligoniRegioni = useRef<Map<string, google.maps.Polygon[]>>(new Map())
  const poligoniProvince = useRef<Map<string, google.maps.Polygon[]>>(new Map())
  const poligoniComuni = useRef<Map<string, google.maps.Polygon[]>>(new Map())
  const provinciaToRegione = useRef<Map<string, string>>(new Map())
  const comuneToProvincia = useRef<Map<string, string>>(new Map())
  const regioniCaricateComuni = useRef<Set<string>>(new Set())

  const layerCorrenteRef = useRef<Layer>('regioni')
  useEffect(() => { layerCorrenteRef.current = layerCorrente }, [layerCorrente])

  // STEP 1: Preprocessa i record per demolitore
  useEffect(() => {
    const map = new Map<string, CoperturaDemolitore>()
    for (const r of recordCopertura) {
      let dem = map.get(r.demolitore_id)
      if (!dem) {
        dem = {
          regioniSel: new Set(),
          provinceSel: new Set(),
          provinceEsc: new Set(),
          comuniIncl: new Set(),
          comuniEsc: new Set(),
        }
        map.set(r.demolitore_id, dem)
      }
      if (r.tipo === 'regione') dem.regioniSel.add(r.comune)
      else if (r.tipo === 'provincia') dem.provinceSel.add(r.comune)
      else if (r.tipo === 'provincia_esclusa') dem.provinceEsc.add(r.comune)
      else if (r.tipo === 'comune_incluso') dem.comuniIncl.add(r.comune)
      else if (r.tipo === 'comune_escluso') dem.comuniEsc.add(r.comune)
    }
    coperturaPerDemolitore.current = map
    conteggiPerRegione.current.clear()
    conteggiPerProvincia.current.clear()
    conteggiPerComune.current.clear()
    if (mapInstanceRef.current) ricoloraTutto()
  }, [recordCopertura])

  // CALCOLO COPERTURA
  // Per una regione: distingue tra "totalmente coperta" e "parzialmente coperta".
  // Totalmente = il demolitore ha selezionato la regione esplicitamente
  //              (senza esclusioni di province/comuni al suo interno)
  // Parzialmente = il demolitore copre alcune province/comuni della regione ma non tutta
  function demolitoreCopreRegioneTotalmente(dem: CoperturaDemolitore, n: string): boolean {
    if (!dem.regioniSel.has(n)) return false
    // Controlla che NON abbia esclusioni interne
    let haEsclusioni = false
    dem.provinceEsc.forEach(nomeProv => {
      if (haEsclusioni) return
      if (provinciaToRegione.current.get(nomeProv) === n) haEsclusioni = true
    })
    if (haEsclusioni) return false
    dem.comuniEsc.forEach(nomeCom => {
      if (haEsclusioni) return
      const prov = comuneToProvincia.current.get(nomeCom)
      if (!prov) return
      if (provinciaToRegione.current.get(prov) === n) haEsclusioni = true
    })
    return !haEsclusioni
  }

  function demolitoreCopreRegione(dem: CoperturaDemolitore, n: string): boolean {
    // Diretta: regione selezionata
    if (dem.regioniSel.has(n)) return true
    // Indiretta: il demolitore ha selezionato almeno una provincia di questa regione
    let trovato = false
    dem.provinceSel.forEach(nomeProv => {
      if (trovato) return
      if (provinciaToRegione.current.get(nomeProv) === n) trovato = true
    })
    if (trovato) return true
    // Indiretta: il demolitore ha incluso almeno un comune di questa regione
    dem.comuniIncl.forEach(nomeCom => {
      if (trovato) return
      const prov = comuneToProvincia.current.get(nomeCom)
      if (!prov) return
      const reg = provinciaToRegione.current.get(prov)
      if (reg === n) trovato = true
    })
    return trovato
  }
  function demolitoreCopreProvincia(dem: CoperturaDemolitore, n: string): boolean {
    if (dem.provinceEsc.has(n)) return false
    if (dem.provinceSel.has(n)) return true
    const reg = provinciaToRegione.current.get(n)
    if (reg && dem.regioniSel.has(reg)) return true
    // Indiretta: il demolitore ha incluso almeno un comune di questa provincia
    let trovato = false
    dem.comuniIncl.forEach(nomeCom => {
      if (trovato) return
      if (comuneToProvincia.current.get(nomeCom) === n) trovato = true
    })
    return trovato
  }

  // Distingue se un demolitore copre TUTTA la provincia (senza comuni esclusi)
  // oppure solo parzialmente (alcuni comuni inclusi singolarmente, o provincia
  // selezionata ma con esclusioni interne).
  function demolitoreCopreProvinciaTotalmente(dem: CoperturaDemolitore, n: string): boolean {
    if (dem.provinceEsc.has(n)) return false
    const reg = provinciaToRegione.current.get(n)
    const copertaTramiteRegione = !!(reg && dem.regioniSel.has(reg))
    const copertaTramiteProvincia = dem.provinceSel.has(n)
    if (!copertaTramiteRegione && !copertaTramiteProvincia) {
      // Solo comuni inclusi singolarmente → parziale per definizione
      return false
    }
    // Controlla che non ci siano comuni esclusi al suo interno
    let haEsclusi = false
    dem.comuniEsc.forEach(nomeCom => {
      if (haEsclusi) return
      if (comuneToProvincia.current.get(nomeCom) === n) haEsclusi = true
    })
    return !haEsclusi
  }
  function demolitoreCopreComune(dem: CoperturaDemolitore, n: string): boolean {
    if (dem.comuniEsc.has(n)) return false
    if (dem.comuniIncl.has(n)) return true
    const prov = comuneToProvincia.current.get(n)
    if (!prov) return false
    return demolitoreCopreProvincia(dem, prov)
  }
  function contaDemolitoriRegione(n: string): number {
    if (conteggiPerRegione.current.has(n)) return conteggiPerRegione.current.get(n)!
    let count = 0
    coperturaPerDemolitore.current.forEach(dem => { if (demolitoreCopreRegione(dem, n)) count++ })
    conteggiPerRegione.current.set(n, count)
    return count
  }

  // Conta solo i demolitori che coprono TUTTA la regione (senza esclusioni interne).
  // Usata per decidere se colorare la regione "piena" o "parziale" (a chiazze).
  function contaDemolitoriRegioneTotale(n: string): number {
    let count = 0
    coperturaPerDemolitore.current.forEach(dem => { if (demolitoreCopreRegioneTotalmente(dem, n)) count++ })
    return count
  }
  function contaDemolitoriProvincia(n: string): number {
    if (conteggiPerProvincia.current.has(n)) return conteggiPerProvincia.current.get(n)!
    let count = 0
    coperturaPerDemolitore.current.forEach(dem => { if (demolitoreCopreProvincia(dem, n)) count++ })
    conteggiPerProvincia.current.set(n, count)
    return count
  }

  // Conta solo i demolitori che coprono TUTTA la provincia (senza esclusioni di comuni).
  function contaDemolitoriProvinciaTotale(n: string): number {
    let count = 0
    coperturaPerDemolitore.current.forEach(dem => { if (demolitoreCopreProvinciaTotalmente(dem, n)) count++ })
    return count
  }
  function contaDemolitoriComune(n: string): number {
    if (conteggiPerComune.current.has(n)) return conteggiPerComune.current.get(n)!
    let count = 0
    coperturaPerDemolitore.current.forEach(dem => { if (demolitoreCopreComune(dem, n)) count++ })
    conteggiPerComune.current.set(n, count)
    return count
  }

  // STILE
  function coloreCopertura(count: number) {
    if (count === 0) return { fill: COLOR_UNCOVERED_FILL, stroke: COLOR_UNCOVERED_STROKE, opacity: 0.35 }
    if (count === 1) return { fill: COLOR_COVERED_1, stroke: COLOR_COVERED_STROKE, opacity: 0.45 }
    if (count === 2) return { fill: COLOR_COVERED_2, stroke: COLOR_COVERED_STROKE, opacity: 0.5 }
    return { fill: COLOR_COVERED_3PLUS, stroke: COLOR_COVERED_STROKE, opacity: 0.55 }
  }
  function stilizzaRegione(n: string) {
    const polys = poligoniRegioni.current.get(n)
    if (!polys) return
    const totIntera = contaDemolitoriRegioneTotale(n)
    const tot = contaDemolitoriRegione(n)
    if (totIntera > 0) {
      // Almeno un demolitore copre la regione intera → blu
      const c = coloreCopertura(totIntera)
      polys.forEach(p => p.setOptions({ fillColor: c.fill, fillOpacity: c.opacity, strokeColor: c.stroke, strokeWeight: 1.5 }))
    } else {
      // Copertura parziale O nessuna → rossa (le aree coperte appariranno come
      // macchie blu sopra grazie alla visibilità delle province coperte)
      const c = coloreCopertura(0)
      polys.forEach(p => p.setOptions({ fillColor: c.fill, fillOpacity: c.opacity, strokeColor: c.stroke, strokeWeight: 1.5 }))
    }
    // tot è già calcolato per future espansioni (es. badge col numero)
    void tot
  }
  function stilizzaProvincia(n: string) {
    const polys = poligoniProvince.current.get(n)
    if (!polys) return
    const totIntera = contaDemolitoriProvinciaTotale(n)
    if (totIntera > 0) {
      // Almeno un demolitore copre la provincia intera → blu
      const c = coloreCopertura(totIntera)
      polys.forEach(p => p.setOptions({ fillColor: c.fill, fillOpacity: c.opacity, strokeColor: c.stroke, strokeWeight: 1.2 }))
    } else {
      // Parziale o scoperta → rossa (i comuni coperti appariranno come macchie blu sopra)
      const c = coloreCopertura(0)
      polys.forEach(p => p.setOptions({ fillColor: c.fill, fillOpacity: c.opacity, strokeColor: c.stroke, strokeWeight: 1.2 }))
    }
  }
  function stilizzaComune(n: string) {
    const polys = poligoniComuni.current.get(n)
    if (!polys) return
    const c = coloreCopertura(contaDemolitoriComune(n))
    polys.forEach(p => p.setOptions({ fillColor: c.fill, fillOpacity: c.opacity, strokeColor: c.stroke, strokeWeight: 0.8 }))
  }
  function ricoloraTutto() {
    conteggiPerRegione.current.clear()
    conteggiPerProvincia.current.clear()
    conteggiPerComune.current.clear()
    poligoniRegioni.current.forEach((_, n) => stilizzaRegione(n))
    poligoniProvince.current.forEach((_, n) => stilizzaProvincia(n))
    poligoniComuni.current.forEach((_, n) => stilizzaComune(n))
  }

  function aggiornaVisibilitaLayer(zoom: number) {
    let layer: Layer
    if (zoom < ZOOM_PROVINCE) layer = 'regioni'
    else if (zoom < ZOOM_COMUNI) layer = 'province'
    else layer = 'comuni'
    setLayerCorrente(layer)

    poligoniRegioni.current.forEach((polys, n) => {
      const visible = layer === 'regioni'
      polys.forEach(p => p.setOptions({ visible, clickable: visible }))
      if (visible) stilizzaRegione(n)
    })

    // Province: visibili sempre nel layer province. Nel layer regioni visibili
    // SOLO quelle coperte di una regione "parziale" (così appaiono come
    // macchie blu sopra la regione rossa).
    poligoniProvince.current.forEach((polys, nomeProv) => {
      let visibileInRegioni = false
      if (layer === 'regioni') {
        const nomeReg = provinciaToRegione.current.get(nomeProv)
        if (nomeReg) {
          const totIntera = contaDemolitoriRegioneTotale(nomeReg)
          if (totIntera === 0 && contaDemolitoriProvincia(nomeProv) > 0) {
            visibileInRegioni = true
          }
        }
      }
      const visible = layer === 'province' || visibileInRegioni
      const clickable = layer === 'province'
      polys.forEach(p => p.setOptions({ visible, clickable }))
      if (visible) stilizzaProvincia(nomeProv)
    })

    // Comuni: visibili sempre nel layer comuni. Nel layer province visibili
    // SOLO i comuni coperti di una provincia "parziale".
    poligoniComuni.current.forEach((polys, nomeCom) => {
      let visibileInProvince = false
      if (layer === 'province') {
        const prov = comuneToProvincia.current.get(nomeCom)
        if (prov) {
          const totIntera = contaDemolitoriProvinciaTotale(prov)
          if (totIntera === 0 && contaDemolitoriComune(nomeCom) > 0) {
            visibileInProvince = true
          }
        }
      }
      const visible = layer === 'comuni' || visibileInProvince
      const clickable = layer === 'comuni'
      polys.forEach(p => p.setOptions({ visible, clickable }))
      if (visible) stilizzaComune(nomeCom)
    })
  }

  async function caricaComuniRegione(slug: string, map: google.maps.Map) {
    if (regioniCaricateComuni.current.has(slug)) return
    regioniCaricateComuni.current.add(slug)
    try {
      const url = `${SUPABASE_GEOJSON_URL}/${slug}.geojson`
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
            fillColor: COLOR_BORDER,
            fillOpacity: 0,
            strokeColor: COLOR_BORDER,
            strokeWeight: 0.8,
            clickable: false,
            visible: false,
            zIndex: 3,
          })
          polygon.addListener('mousemove', (e: google.maps.MapMouseEvent & { domEvent?: MouseEvent }) => {
            if (layerCorrenteRef.current !== 'comuni') return
            aggiornaTooltip(nomeCom, contaDemolitoriComune(nomeCom), e.domEvent)
          })
          polygon.addListener('mouseout', () => setTooltip(null))
          poligoni.push(polygon)
        }
        if (poligoniComuni.current.has(nomeCom)) poligoniComuni.current.get(nomeCom)!.push(...poligoni)
        else poligoniComuni.current.set(nomeCom, poligoni)
      }
      aggiornaVisibilitaLayer(map.getZoom() || 6)
    } catch (err) {
      console.error(`Errore caricamento comuni ${slug}:`, err)
      regioniCaricateComuni.current.delete(slug)
    }
  }

  async function caricaComuniZonaVisibile(map: google.maps.Map) {
    const bounds = map.getBounds()
    if (!bounds) return
    const slugs = new Set<string>()
    poligoniProvince.current.forEach((polys, nomeProv) => {
      const path = polys[0]?.getPath()
      if (!path || path.getLength() === 0) return
      if (bounds.contains(path.getAt(0))) {
        const slug = PROVINCE_REGIONI[nomeProv]
        if (slug) slugs.add(slug)
      }
    })
    for (const slug of slugs) await caricaComuniRegione(slug, map)
  }

  function aggiornaTooltip(nome: string, count: number, domEvent?: MouseEvent) {
    if (!domEvent || !mapRef.current) return
    const rect = mapRef.current.getBoundingClientRect()
    setTooltip({ name: nome, count, x: domEvent.clientX - rect.left, y: domEvent.clientY - rect.top })
  }

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return
    if (initStartedRef.current) return
    initStartedRef.current = true

    let cancelled = false
    loadGoogleMaps(apiKey).then(() => {
      if (cancelled) return
      initMappa()
    }).catch(err => console.error('Errore Google Maps:', err))

    return () => {
      cancelled = true
      poligoniRegioni.current.forEach(p => p.forEach(x => x.setMap(null)))
      poligoniProvince.current.forEach(p => p.forEach(x => x.setMap(null)))
      poligoniComuni.current.forEach(p => p.forEach(x => x.setMap(null)))
      poligoniRegioni.current.clear()
      poligoniProvince.current.clear()
      poligoniComuni.current.clear()
      regioniCaricateComuni.current.clear()
      mapInstanceRef.current = null
      initStartedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            fillColor: COLOR_BORDER,
            fillOpacity: 0,
            strokeColor: COLOR_BORDER,
            strokeWeight: 1.5,
            clickable: true,
            zIndex: 1,
          })
          polygon.addListener('mousemove', (e: google.maps.MapMouseEvent & { domEvent?: MouseEvent }) => {
            if (layerCorrenteRef.current !== 'regioni') return
            aggiornaTooltip(nomeReg, contaDemolitoriRegione(nomeReg), e.domEvent)
          })
          polygon.addListener('mouseout', () => setTooltip(null))
          poligoni.push(polygon)
        }
        poligoniRegioni.current.set(nomeReg, poligoni)
      }
    } catch (err) {
      console.error('Errore regioni:', err)
    }

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
            fillColor: COLOR_BORDER,
            fillOpacity: 0,
            strokeColor: COLOR_BORDER,
            strokeWeight: 1.2,
            clickable: false,
            visible: false,
            zIndex: 2,
          })
          polygon.addListener('mousemove', (e: google.maps.MapMouseEvent & { domEvent?: MouseEvent }) => {
            if (layerCorrenteRef.current !== 'province') return
            aggiornaTooltip(nomeProv, contaDemolitoriProvincia(nomeProv), e.domEvent)
          })
          polygon.addListener('mouseout', () => setTooltip(null))
          poligoni.push(polygon)
        }
        poligoniProvince.current.set(nomeProv, poligoni)
      }
    } catch (err) {
      console.error('Errore province:', err)
    }

    setLoading(false)
    aggiornaVisibilitaLayer(map.getZoom() || 6)
    ricoloraTutto()

    map.addListener('zoom_changed', () => {
      const z = map.getZoom() || 6
      aggiornaVisibilitaLayer(z)
      if (z >= ZOOM_COMUNI) caricaComuniZonaVisibile(map)
    })
    map.addListener('idle', () => {
      const z = map.getZoom() || 6
      if (z >= ZOOM_COMUNI) caricaComuniZonaVisibile(map)
    })
  }

  const labelLayer = layerCorrente === 'regioni' ? 'Regioni' : layerCorrente === 'province' ? 'Province' : 'Comuni'
  const totDemolitori = coperturaPerDemolitore.current.size

  return (
    <div style={{ display: 'flex', gap: '12px', height: '680px' }}>
      <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Statistiche</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold text-gray-800">{totDemolitori}</span>
            <span className="text-xs text-gray-500">demolitori</span>
          </div>
          <p style={{ fontSize: '11px' }} className="text-gray-400">Vista: <span className="font-semibold text-blue-600">{labelLayer}</span></p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Legenda</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: COLOR_UNCOVERED_FILL, opacity: 0.6 }} />
              <span style={{ fontSize: '11px' }} className="text-gray-700">Scoperto</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: COLOR_COVERED_1, opacity: 0.7 }} />
              <span style={{ fontSize: '11px' }} className="text-gray-700">1 demolitore</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: COLOR_COVERED_2, opacity: 0.7 }} />
              <span style={{ fontSize: '11px' }} className="text-gray-700">2 demolitori</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: COLOR_COVERED_3PLUS, opacity: 0.8 }} />
              <span style={{ fontSize: '11px' }} className="text-gray-700">3+ demolitori</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs text-blue-700 font-semibold mb-1">Come usare</p>
          <p style={{ fontSize: '11px' }} className="text-blue-600 leading-relaxed">
            Zoom <strong>basso</strong>: vedi le regioni.<br/>
            Zoom <strong>medio</strong>: vedi le province.<br/>
            Zoom <strong>alto</strong>: vedi i comuni.<br/>
            <strong>Rosso</strong> = zone scoperte, dove vale la pena reclutare.
          </p>
        </div>
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
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              zIndex: 20,
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ marginBottom: '2px' }}>{tooltip.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.75 }}>
              {tooltip.count === 0 ? 'Nessun demolitore' : `${tooltip.count} demolitor${tooltip.count === 1 ? 'e' : 'i'}`}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}