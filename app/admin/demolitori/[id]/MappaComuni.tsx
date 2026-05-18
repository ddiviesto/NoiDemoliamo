'use client'
/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from 'react'

interface Comune {
  nome: string
  provincia: string
  lat: number
  lng: number
  selezionato: boolean
  escluso: boolean
}

interface Props {
  onSalva: (comuni: { comune: string; provincia: string; fee_comune?: number; distanza_km?: number }[]) => void
  comuniSalvati: string[]
}

declare global {
  interface Window {
    google: typeof google
    initMap: () => void
  }
}

export default function MappaComuni({ onSalva, comuniSalvati }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const [province, setProvince] = useState<string[]>([])
  const [provinceSelezionate, setProvinceSelezionate] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!apiKey) return

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=it&region=IT`
    script.async = true
    script.onload = () => {
      initMappa()
    }
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  function initMappa() {
    if (!mapRef.current) return

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 42.5, lng: 12.5 },
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#1a56db' }, { weight: 2 }] },
        { featureType: 'administrative.locality', elementType: 'geometry.stroke', stylers: [{ color: '#93c5fd' }, { weight: 1 }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bfdbfe' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f0fdf4' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ visibility: 'simplified' }, { color: '#e2e8f0' }] },
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      ],
    })

    mapInstanceRef.current = map
    setLoading(false)

    // Aggiungi layer province italiane
    const italyLayer = new window.google.maps.Data()
    
    // Usa il Data Layer per le province
    fetch('https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_provinces.geojson')
      .then(r => r.json())
      .then(data => {
        italyLayer.addGeoJson(data)
        italyLayer.setStyle({
          fillColor: '#dbeafe',
          fillOpacity: 0.3,
          strokeColor: '#1a56db',
          strokeWeight: 1.5,
          clickable: true,
        })
        italyLayer.setMap(map)

        const prov: string[] = []
        italyLayer.forEach(f => {
          const nome = f.getProperty('prov_name') as string
          if (nome && !prov.includes(nome)) prov.push(nome)
        })
        setProvince(prov.sort())

        italyLayer.addListener('click', (e: google.maps.Data.MouseEvent) => {
          const feature = e.feature
          const nome = feature.getProperty('prov_name') as string
          
          setProvinceSelezionate(prev => {
            const next = new Set(prev)
            if (next.has(nome)) {
              next.delete(nome)
              italyLayer.overrideStyle(feature, { fillColor: '#dbeafe', fillOpacity: 0.3 })
            } else {
              next.add(nome)
              italyLayer.overrideStyle(feature, { fillColor: '#1a56db', fillOpacity: 0.6 })
            }
            return next
          })
        })
      })
      .catch(() => {
        console.error('Errore caricamento GeoJSON province')
      })
  }

  function handleSalva() {
    const comuni = Array.from(provinceSelezionate).map(p => ({
      comune: p,
      provincia: p.substring(0, 2).toUpperCase(),
    }))
    onSalva(comuni)
  }

  return (
    <div className="flex flex-col gap-3">
      {loading && (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
          <div className="text-sm text-gray-400">Caricamento mappa...</div>
        </div>
      )}
      
      <div ref={mapRef} style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', display: loading ? 'none' : 'block' }} />

      {provinceSelezionate.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-medium text-blue-700 mb-2">Province selezionate ({provinceSelezionate.size}):</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(provinceSelezionate).map(p => (
              <span key={p} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg">{p}</span>
            ))}
          </div>
          <button
            onClick={handleSalva}
            className="mt-3 w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all"
          >
            Salva area di copertura ({provinceSelezionate.size} province)
          </button>
        </div>
      )}
    </div>
  )
}