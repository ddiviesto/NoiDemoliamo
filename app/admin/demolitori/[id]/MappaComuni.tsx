'use client'

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from 'react'

interface Props {
  onSalva: (comuni: { comune: string; provincia: string; fee_comune?: number; distanza_km?: number }[]) => void
  comuniSalvati: string[]
}

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

export default function MappaComuni({ onSalva, comuniSalvati }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [provinceSelezionate, setProvinceSelezionate] = useState<Set<string>>(new Set())
  const [comuniEsclusi, setComuniEsclusi] = useState<Set<string>>(new Set())
  const provinceSelRef = useRef<Set<string>>(new Set())
  const comuniEsclusiRef = useRef<Set<string>>(new Set())
  const poligoniProvince = useRef<Map<string, google.maps.Polygon[]>>(new Map())
  const poligoniComuni = useRef<Map<string, google.maps.Polygon[]>>(new Map())
  const regioniCaricate = useRef<Set<string>>(new Set())

  useEffect(() => { provinceSelRef.current = provinceSelezionate }, [provinceSelezionate])
  useEffect(() => { comuniEsclusiRef.current = comuniEsclusi }, [comuniEsclusi])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return

    if (window.google?.maps) { initMappa(); return }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=it&region=IT`
    script.async = true
    script.onload = initMappa
    document.head.appendChild(script)

    return () => { if (document.head.contains(script)) document.head.removeChild(script) }
  }, [])

  async function caricaComuniRegione(regione: string, map: google.maps.Map) {
    if (regioniCaricate.current.has(regione)) return
    regioniCaricate.current.add(regione)

    try {
      const url = `https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_R_${regione}_municipalities.geojson`
      const res = await fetch(url)
      if (!res.ok) throw new Error('File non trovato')
      const data = await res.json()

      for (const feature of data.features) {
        const nomeComune = feature.properties.name
        const nomeProv = feature.properties.prov_name
        const geom = feature.geometry
        if (!geom) continue

        const coords = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
        const poligoni: google.maps.Polygon[] = []

        for (const poly of coords) {
          const paths = poly.map((ring: number[][]) =>
            ring.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
          )

          const isEscluso = comuniEsclusiRef.current.has(nomeComune)
          const isProvSel = provinceSelRef.current.has(nomeProv)

          const polygon = new window.google.maps.Polygon({
            paths,
            map,
            fillColor: isEscluso ? '#ef4444' : '#3b82f6',
            fillOpacity: isEscluso ? 0.5 : (isProvSel ? 0.1 : 0),
            strokeColor: isEscluso ? '#dc2626' : '#16a34a',
            strokeWeight: 0.8,
            clickable: true,
            zIndex: 2,
          })

          polygon.addListener('click', () => {
            if (!provinceSelRef.current.has(nomeProv)) return

            setComuniEsclusi(prev => {
              const next = new Set(prev)
              if (next.has(nomeComune)) {
                next.delete(nomeComune)
                poligoniComuni.current.get(nomeComune)?.forEach(p =>
                  p.setOptions({ fillColor: '#3b82f6', fillOpacity: 0.1, strokeColor: '#16a34a' })
                )
              } else {
                next.add(nomeComune)
                poligoniComuni.current.get(nomeComune)?.forEach(p =>
                  p.setOptions({ fillColor: '#ef4444', fillOpacity: 0.5, strokeColor: '#dc2626' })
                )
              }
              return next
            })
          })

          polygon.addListener('mouseover', () => {
            if (!comuniEsclusiRef.current.has(nomeComune) && provinceSelRef.current.has(nomeProv)) {
              polygon.setOptions({ fillOpacity: 0.3 })
            }
          })

          polygon.addListener('mouseout', () => {
            if (!comuniEsclusiRef.current.has(nomeComune)) {
              polygon.setOptions({ fillOpacity: provinceSelRef.current.has(nomeProv) ? 0.1 : 0 })
            }
          })

          poligoni.push(polygon)
        }

        if (poligoniComuni.current.has(nomeComune)) {
          poligoniComuni.current.get(nomeComune)!.push(...poligoni)
        } else {
          poligoniComuni.current.set(nomeComune, poligoni)
        }
      }
    } catch (err) {
      console.error(`Errore caricamento comuni ${regione}:`, err)
      regioniCaricate.current.delete(regione)
    }
  }

  async function initMappa() {
    if (!mapRef.current) return

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
      const res = await fetch('https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_provinces.geojson')
      const data = await res.json()

      for (const feature of data.features) {
        const nomeProv = feature.properties.prov_name
        const geom = feature.geometry
        const coords = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates
        const poligoni: google.maps.Polygon[] = []

        for (const poly of coords) {
          const paths = poly.map((ring: number[][]) =>
            ring.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
          )

          const polygon = new window.google.maps.Polygon({
            paths, map,
            fillColor: '#3b82f6',
            fillOpacity: 0,
            strokeColor: '#1d4ed8',
            strokeWeight: 1.5,
            clickable: true,
            zIndex: 1,
          })

          polygon.addListener('click', async () => {
            setProvinceSelezionate(prev => {
              const next = new Set(prev)
              if (next.has(nomeProv)) {
                next.delete(nomeProv)
                poligoniProvince.current.get(nomeProv)?.forEach(p => p.setOptions({ fillOpacity: 0 }))
                poligoniComuni.current.forEach((polys, nome) => {
                  const provComune = [...data.features].find((f: {properties: {name: string}}) => f.properties.name === nome)?.properties?.prov_name
                  if (provComune === nomeProv) {
                    polys.forEach(p => p.setOptions({ fillOpacity: 0 }))
                  }
                })
              } else {
                next.add(nomeProv)
                poligoniProvince.current.get(nomeProv)?.forEach(p => p.setOptions({ fillOpacity: 0.3 }))
                // Carica comuni regione
                const regione = PROVINCE_REGIONI[nomeProv]
                if (regione && map.getZoom()! >= 8) {
                  caricaComuniRegione(regione, map)
                }
              }
              return next
            })
          })

          polygon.addListener('mouseover', () => {
            if (!provinceSelRef.current.has(nomeProv)) polygon.setOptions({ fillOpacity: 0.1 })
          })
          polygon.addListener('mouseout', () => {
            if (!provinceSelRef.current.has(nomeProv)) polygon.setOptions({ fillOpacity: 0 })
          })

          poligoni.push(polygon)
        }

        poligoniProvince.current.set(nomeProv, poligoni)
      }

      setLoading(false)
    } catch (err) {
      console.error('Errore province:', err)
      setLoading(false)
    }

    // Carica comuni quando zoom >= 8
    map.addListener('zoom_changed', () => {
      const z = map.getZoom() || 6
      if (z >= 8) {
        provinceSelRef.current.forEach(prov => {
          const regione = PROVINCE_REGIONI[prov]
          if (regione) caricaComuniRegione(regione, map)
        })
      }
    })
  }

  function handleSalva() {
    const result = Array.from(provinceSelezionate).map(p => ({
      comune: p,
      provincia: p.substring(0, 2).toUpperCase(),
    }))
    onSalva(result)
  }

  return (
    <div style={{ display: 'flex', gap: '12px', height: '580px' }}>
      <div style={{ width: '200px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Area selezionata</p>
          {provinceSelezionate.size === 0 ? (
            <p className="text-xs text-gray-300 text-center mt-4">Clicca sulla mappa per selezionare province</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {Array.from(provinceSelezionate).sort().map(p => (
                <div key={p} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-blue-800 flex-1">{p}</span>
                </div>
              ))}
              {comuniEsclusi.size > 0 && (
                <>
                  <p className="text-xs font-semibold text-red-500 mt-2 mb-1">Comuni esclusi:</p>
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
          <p className="text-xs text-blue-500 leading-relaxed">Clicca province per selezionare</p>
          <p className="text-xs text-blue-500 leading-relaxed mt-1">Ingrandisci zoom 8+ e clicca comuni per escludere</p>
        </div>

        {provinceSelezionate.size > 0 && (
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
      </div>
    </div>
  )
}