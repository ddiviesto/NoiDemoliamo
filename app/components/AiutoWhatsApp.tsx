'use client'

import { useEffect, useState } from 'react'

// ============================================================
// PULSANTE AIUTO WHATSAPP
// Cerchio verde fisso in basso a destra, presente su tutte le
// pagine del cliente. L'etichetta "Serve aiuto?" appare per
// qualche secondo e poi RIAPPARE ciclicamente ogni 15 secondi,
// per richiamare l'attenzione senza essere invadente.
// ============================================================

const WHATSAPP_URL = 'https://wa.me/393518280493'

// ⭐ 24/08: `alzato` = c'è la barra delle linguette in fondo allo schermo
// (scheda pratica del cliente sul telefono), quindi il tondo verde sale
// sopra la barra invece di finirci sotto. Su PC la barra non c'è: resta giù.
export default function AiutoWhatsApp({ alzato }: { alzato?: boolean } = {}) {
  const [mostraEtichetta, setMostraEtichetta] = useState(true)
  // ⭐ 29/07 (mockup approvato, giro iPhone): mentre il cliente SCRIVE il
  // bottone si fa da parte — con la tastiera aperta copriva Salva e i campi
  const [scrivendo, setScrivendo] = useState(false)

  useEffect(() => {
    let nascondi: ReturnType<typeof setTimeout>
    const mostra = () => {
      setMostraEtichetta(true)
      nascondi = setTimeout(() => setMostraEtichetta(false), 4000)
    }
    mostra() // subito all'apertura della pagina
    const ciclo = setInterval(mostra, 15000) // e poi ogni 15 secondi
    return () => { clearInterval(ciclo); clearTimeout(nascondi) }
  }, [])

  // ⭐ 29/07 (mockup B approvato): quando SCENDI il bottone sparisce (in
  // fondo pagina i bottoni blu restano liberi), quando RISALI ricompare
  const [inDiscesa, setInDiscesa] = useState(false)
  useEffect(() => {
    let ultimo = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y <= 0) setInDiscesa(false)
      else if (y > ultimo + 4) setInDiscesa(true)
      else if (y < ultimo - 4) setInDiscesa(false)
      ultimo = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Campo di scrittura a fuoco (input, textarea, contenteditable) = nascosto;
  // ricompare da solo quando la tastiera si chiude
  useEffect(() => {
    const eCampo = (el: Element | null) => {
      if (!el) return false
      const tag = el.tagName?.toLowerCase()
      return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable
    }
    const aggiorna = () => setScrivendo(eCampo(document.activeElement))
    // Piccolo respiro sull'uscita: al passaggio da un campo all'altro
    // il bottone non deve lampeggiare
    const aggiornaDopo = () => { setTimeout(aggiorna, 80) }
    document.addEventListener('focusin', aggiorna)
    document.addEventListener('focusout', aggiornaDopo)
    aggiorna()
    return () => {
      document.removeEventListener('focusin', aggiorna)
      document.removeEventListener('focusout', aggiornaDopo)
    }
  }, [])

  return (
    <div className={alzato ? 'whatsapp-alzato' : undefined} style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, opacity: scrivendo || inDiscesa ? 0 : 1, transform: scrivendo || inDiscesa ? 'scale(0.6)' : 'scale(1)', pointerEvents: scrivendo || inDiscesa ? 'none' : 'auto', transition: 'opacity 0.25s ease, transform 0.25s ease' }}>
      {mostraEtichetta && (
        <span style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 20, padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#374151', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', whiteSpace: 'nowrap' }}>
          Serve aiuto?
        </span>
      )}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chiedi aiuto su WhatsApp"
        style={{ width: 52, height: 52, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(37,211,102,0.4)' }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
          <path d="M12 2a10 10 0 0 0-8.58 15.13L2 22l4.97-1.38A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.19-1.19l-.3-.18-2.95.82.8-2.87-.2-.31A8 8 0 1 1 12 20zm4.42-5.9c-.24-.12-1.43-.7-1.65-.78s-.38-.12-.54.12-.62.78-.76.94-.28.18-.52.06a6.55 6.55 0 0 1-1.93-1.19 7.24 7.24 0 0 1-1.33-1.66c-.14-.24 0-.37.1-.49s.24-.28.36-.42a1.64 1.64 0 0 0 .24-.4.44.44 0 0 0-.02-.42c-.06-.12-.54-1.3-.74-1.78s-.39-.4-.54-.41h-.46a.88.88 0 0 0-.64.3 2.68 2.68 0 0 0-.84 2 4.65 4.65 0 0 0 .98 2.47 10.66 10.66 0 0 0 4.08 3.6 13.68 13.68 0 0 0 1.36.5 3.27 3.27 0 0 0 1.5.1 2.46 2.46 0 0 0 1.61-1.14 2 2 0 0 0 .14-1.14c-.06-.1-.22-.16-.46-.28z"/>
        </svg>
      </a>
    </div>
  )
}
