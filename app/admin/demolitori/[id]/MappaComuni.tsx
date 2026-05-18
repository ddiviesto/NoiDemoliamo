'use client'

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from 'react'

interface Props {
  onSalva: (comuni: { comune: string; provincia: string; fee_comune?: number; distanza_km?: number }[]) => void
  comuniSalvati: string[]
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
  const poligoniComuni = useRef<Map<string, google.maps.Polygon>>(new Map())

  useEffect(() => {
    provinceSelRef.current = provinceSelezionate
  }, [provinceSelezionate])

  useEffect(() => {
    comuniEsclusiRef.current = comuniEsclusi
  }, [comuniEsclusi])

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return

    if (window.google?.maps) {
      initMappa()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&language=it&region=IT`
    script.async = true
    script.onload = initMappa
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [])

  async function initMappa() {
    if (!mapRef.current) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 42.5, lng: 12.5 },
      zoom: 6,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeId: 'roadmap',
    })

    mapInstanceRef.current = map

    // Carica GeoJSON province
    try {
      const res = await fetch('https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_provinces.geojson')
      const data = await res.json()

      for (const feature of data.features) {
        const nomeProv = feature.properties.prov_name
        const geom = feature.geometry
        const poligoni: google.maps.Polygon[] = []

        const coords = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates

        for (const poly of coords) {
          const paths = poly.map((ring: number[][]) =>
            ring.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
          )

          const polygon = new window.google.maps.Polygon({
            paths,
            map,
            fillColor: '#3b82f6',
            fillOpacity: 0,
            strokeColor: '#1d4ed8',
            strokeWeight: 1.5,
            clickable: true,
          })

          polygon.addListener('click', () => {
            setProvinceSelezionate(prev => {
              const next = new Set(prev)
              if (next.has(nomeProv)) {
                next.delete(nomeProv)
                poligoniProvince.current.get(nomeProv)?.forEach(p => p.setOptions({ fillOpacity: 0 }))
              } else {
                next.add(nomeProv)
                poligoniProvince.current.get(nomeProv)?.forEach(p => p.setOptions({ fillOpacity: 0.4 }))
              }
              return next
            })
          })

          polygon.addListener('mouseover', () => {
            if (!provinceSelRef.current.has(nomeProv)) {
              polygon.setOptions({ fillOpacity: 0.15 })
            }
          })

          polygon.addListener('mouseout', () => {
            if (!provinceSelRef.current.has(nomeProv)) {
              polygon.setOptions({ fillOpacity: 0 })
            }
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

    // Zoom alto — carica comuni per regione
    map.addListener('zoom_changed', async () => {
      const z = map.getZoom() || 6

      if (z >= 9) {
        const bounds = map.getBounds()
        if (!bounds) return

        // Carica comuni visibili usando geocoding al click
        map.addListener('click', async (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return
          const currentZ = map.getZoom() || 6
          if (currentZ < 9) return

          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode(
            { location: e.latLng, language: 'it', region: 'IT' },
            (results, status) => {
              if (status !== 'OK' || !results) return

              let nomeComune = ''
              let nomeProvincia = ''

              for (const result of results) {
                for (const comp of result.address_components) {
                  if (comp.types.includes('administrative_area_level_3') && !nomeComune) {
                    nomeComune = comp.long_name
                  }
                  if (comp.types.includes('administrative_area_level_2') && !nomeProvincia) {
                    nomeProvincia = comp.long_name
                  }
                }
                if (nomeComune && nomeProvincia) break
              }

              if (!nomeComune || !provinceSelRef.current.has(nomeProvincia)) return

              const key = nomeComune

              setComuniEsclusi(prev => {
                const next = new Set(prev)
                if (next.has(key)) {
                  next.delete(key)
                  // Rimuovi marker
                  const marker = poligoniComuni.current.get(key)
                  if (marker) {
                    marker.setMap(null)
                    poligoniComuni.current.delete(key)
                  }
                } else {
                  next.add(key)
                  // Aggiungi cerchio rosso sul comune
                  const circle = new window.google.maps.Circle({
                    center: e.latLng!,
                    radius: 3000,
                    map,
                    fillColor: '#ef4444',
                    fillOpacity: 0.4,
                    strokeColor: '#dc2626',
                    strokeWeight: 2,
                    clickable: false,
                  })
                  poligoniComuni.current.set(key, circle as unknown as google.maps.Polygon)
                }
                return next
              })
            }
          )
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
          <p className="text-xs text-blue-500 leading-relaxed mt-1">Ingrandisci e clicca su un comune per escluderlo</p>
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