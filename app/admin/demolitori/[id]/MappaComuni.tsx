'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface Props {
  onSalva: (comuni: { comune: string; provincia: string; fee_comune?: number; distanza_km?: number }[]) => void
  comuniSalvati: string[]
}

export default function MappaComuni({ onSalva, comuniSalvati }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [provinceSelezionate, setProvinceSelezionate] = useState<Set<string>>(new Set())
  const [comuniEsclusi, setComuniEsclusi] = useState<Set<string>>(new Set())
  const provinceSelRef = useRef<Set<string>>(new Set())
  const comuniLoadedRef = useRef(false)

  useEffect(() => {
    provinceSelRef.current = provinceSelezionate
  }, [provinceSelezionate])

  useEffect(() => {
    if (!mapRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [12.5, 42.0],
      zoom: 5.5,
      scrollZoom: true,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
    mapInstanceRef.current = map

    map.on('load', async () => {
      try {
        const res = await fetch('https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_provinces.geojson')
        const data = await res.json()

        map.addSource('province', { type: 'geojson', data })

        map.addLayer({
          id: 'province-fill',
          type: 'fill',
          source: 'province',
          paint: {
            'fill-color': [
              'case',
              ['in', ['get', 'prov_name'], ['literal', []]],
              '#3b82f6',
              'rgba(0,0,0,0)'
            ],
            'fill-opacity': 0.5,
          },
        })

        map.addLayer({
          id: 'province-border',
          type: 'line',
          source: 'province',
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 1.5,
          },
        })

        map.addLayer({
          id: 'province-label',
          type: 'symbol',
          source: 'province',
          maxzoom: 9,
          layout: {
            'text-field': ['get', 'prov_name'],
            'text-size': 11,
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
          },
          paint: {
            'text-color': '#1e40af',
            'text-halo-color': 'white',
            'text-halo-width': 1.5,
          },
        })

        map.on('click', 'province-fill', (e) => {
          if (!e.features?.[0]) return
          const nome = e.features[0].properties?.prov_name as string
          if (!nome) return

          setProvinceSelezionate(prev => {
            const next = new Set(prev)
            if (next.has(nome)) next.delete(nome)
            else next.add(nome)

            map.setPaintProperty('province-fill', 'fill-color', [
              'case',
              ['in', ['get', 'prov_name'], ['literal', Array.from(next)]],
              '#3b82f6',
              'rgba(0,0,0,0)'
            ])
            return next
          })
        })

        map.on('mouseenter', 'province-fill', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'province-fill', () => { map.getCanvas().style.cursor = '' })

        // Carica comuni quando zoom >= 9
        map.on('zoomend', async () => {
          if (map.getZoom() >= 9 && !comuniLoadedRef.current) {
            comuniLoadedRef.current = true
            try {
              const res2 = await fetch('https://cdn.jsdelivr.net/gh/openpolis/geojson-italy@master/geojson/limits_IT_municipalities.geojson')
              const data2 = await res2.json()

              map.addSource('comuni', { type: 'geojson', data: data2 })

              map.addLayer({
                id: 'comuni-fill',
                type: 'fill',
                source: 'comuni',
                paint: {
                  'fill-color': [
                    'case',
                    ['in', ['get', 'name'], ['literal', []]],
                    '#ef4444',
                    'rgba(0,0,0,0)'
                  ],
                  'fill-opacity': 0.5,
                },
              })

              map.addLayer({
                id: 'comuni-border',
                type: 'line',
                source: 'comuni',
                paint: {
                  'line-color': '#16a34a',
                  'line-width': 0.8,
                },
              })

              map.addLayer({
                id: 'comuni-label',
                type: 'symbol',
                source: 'comuni',
                layout: {
                  'text-field': ['get', 'name'],
                  'text-size': 10,
                  'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Regular'],
                },
                paint: {
                  'text-color': '#166534',
                  'text-halo-color': 'white',
                  'text-halo-width': 1,
                },
              })

              map.on('click', 'comuni-fill', (e) => {
                if (!e.features?.[0]) return
                const nome = e.features[0].properties?.name as string
                const prov = e.features[0].properties?.prov_name as string
                if (!nome || !provinceSelRef.current.has(prov)) return

                setComuniEsclusi(prev => {
                  const next = new Set(prev)
                  if (next.has(nome)) next.delete(nome)
                  else next.add(nome)

                  map.setPaintProperty('comuni-fill', 'fill-color', [
                    'case',
                    ['in', ['get', 'name'], ['literal', Array.from(next)]],
                    '#ef4444',
                    'rgba(0,0,0,0)'
                  ])
                  return next
                })
              })

              map.on('mouseenter', 'comuni-fill', () => { map.getCanvas().style.cursor = 'pointer' })
              map.on('mouseleave', 'comuni-fill', () => { map.getCanvas().style.cursor = '' })
            } catch (err) {
              console.error('Errore caricamento comuni:', err)
              comuniLoadedRef.current = false
            }
          }
        })

        setLoading(false)
      } catch (err) {
        console.error('Errore caricamento province:', err)
        setLoading(false)
      }
    })

    return () => map.remove()
  }, [])

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
          <p className="text-xs text-blue-500 leading-relaxed mt-1">Ingrandisci e clicca comuni per escludere</p>
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