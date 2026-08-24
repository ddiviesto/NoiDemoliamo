'use client'

// ============================================================
// LA SCENA DELLA HOME — "la 500 va dove scegli"
// ⭐ 25/08 (mockup approvato da Davide, illustrazioni sue):
// al centro la 500 ferma, a sinistra il carro attrezzi col pianale
// abbassato e la rampa rivolta verso di lei, a destra chi la compra coi
// contanti in mano. Le due mete stanno in disparte e smorte finché non si
// sceglie: la protagonista è la 500.
//
// LA MANOVRA (chiesta da Davide, si fa per davvero, niente salti):
//   verso il carro          la 500 si gira, imbocca la rampa e ci sale
//   dal carro ai contanti   scende in RETROMARCIA fino al centro,
//                           si gira e va dall'acquirente
//
// ⚠️ SI ACCENDE COL MOUSE SOPRA LA PORTA, non al clic: il clic deve aprire
// subito il modulo, e la manovra dura più di due secondi. Chi passa sopra
// la vede, chi ha fretta non aspetta nulla.
// ⚠️ Sul TELEFONO la scena non c'è: le due porte si incolonnano e non
// resterebbe spazio. Chi ha chiesto "riduci il movimento" nelle
// impostazioni vede tutto fermo.
// ============================================================

import { useEffect, useRef } from 'react'
import Image from 'next/image'

// Il pianale del carro attrezzi è una riga inclinata dentro il disegno:
// misurata sul file, va da (190, 375) a (900, 152) su un'immagine larga 1332.
const PIANALE = { m: -0.3139, q: 434.4, daX: 190, aX: 900, larghezzaDisegno: 1332 }
const GRADI = -Math.atan(PIANALE.m) * 180 / Math.PI   // +17,4°: col carro ribaltato la rampa sale a sinistra

type Meta = 'centro' | 'carro' | 'acquirente'
interface Posa { x: number; y: number; giro: number }
const CENTRO: Posa = { x: 0, y: 0, giro: 0 }

export default function ScenaHome() {
  const palco = useRef<HTMLDivElement>(null)
  const auto = useRef<HTMLImageElement>(null)
  const dove = useRef<Meta>('centro')
  const inMoto = useRef(false)
  const voluta = useRef<Meta>('centro')

  useEffect(() => {
    const nodo = palco.current
    if (!nodo) return
    const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ⚠️ La posizione FERMA della 500 non si legge dalla 500 (se sta
    // viaggiando si leggerebbe dov'è ADESSO e il conto sarebbe sbagliato):
    // si legge dal suo posto sul palco, che non si muove mai.
    const posoFermo = () => nodo.querySelector<HTMLElement>('[data-posto="centro"]')!.getBoundingClientRect()

    function postoSulCarro(): Posa {
      const carro = nodo!.querySelector<HTMLImageElement>('[data-posto="sx"] img')!
      const R = posoFermo(), c = carro.getBoundingClientRect()
      const k = c.width / PIANALE.larghezzaDisegno
      // il disegno è ribaltato, quindi si legge da destra a sinistra
      const xSchermo = (ix: number) => c.right - ix * k
      const ySchermo = (ix: number) => c.top + (PIANALE.m * ix + PIANALE.q) * k
      const th = GRADI * Math.PI / 180, cos = Math.cos(th), sin = Math.sin(th)
      const cx = R.left + R.width / 2, cy = R.top + R.height / 2
      const px = cx, py = R.top + R.height - 4          // dove le ruote toccano
      const rx = cx + (px - cx) * cos - (py - cy) * sin
      const ry = cy + (px - cx) * sin + (py - cy) * cos
      const mezzeria = (PIANALE.daX + PIANALE.aX) / 2
      return { x: Math.round(xSchermo(mezzeria) - rx), y: Math.round(ySchermo(mezzeria) - ry), giro: +GRADI.toFixed(1) }
    }

    function postoDallAcquirente(): Posa {
      const persona = nodo!.querySelector<HTMLImageElement>('[data-posto="dx"] img')!
      const R = posoFermo(), p = persona.getBoundingClientRect()
      // ⭐ 25/08 (Davide): il muso arriva quasi a toccare i contanti
      return { x: Math.round(p.left - 10 - R.right), y: 0, giro: 0 }
    }

    const scrivi = (p: Posa, specchiata: boolean, durata: number) => {
      const el = auto.current!
      el.style.transitionDuration = (fermo ? 0 : durata) + 'ms'
      el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.giro}deg) scaleX(${specchiata ? -1 : 1})`
    }
    const aspetta = (ms: number) => new Promise(r => setTimeout(r, fermo ? 0 : ms))

    async function manovra() {
      if (inMoto.current) return
      inMoto.current = true
      while (voluta.current !== dove.current) {
        const meta = voluta.current
        const partenza = dove.current

        // 1. se sono fermo altrove, torno al centro come si deve
        if (partenza === 'carro') { scrivi(CENTRO, true, 1100); await aspetta(1150) }        // giù in retromarcia
        else if (partenza === 'acquirente') { scrivi(CENTRO, false, 900); await aspetta(950) }

        // 2. al centro mi giro, se devo
        const specchiata = meta === 'carro'
        if (specchiata || partenza !== 'centro') { scrivi(CENTRO, specchiata, 340); await aspetta(380) }

        // 3. parto verso la meta
        if (meta === 'carro') { scrivi(postoSulCarro(), true, 1200); await aspetta(1240) }
        else if (meta === 'acquirente') { scrivi(postoDallAcquirente(), false, 1000); await aspetta(1040) }
        else { scrivi(CENTRO, false, 600); await aspetta(640) }

        dove.current = meta
      }
      inMoto.current = false
    }

    function vaiA(meta: Meta) {
      voluta.current = meta
      nodo!.dataset.scelta = meta === 'centro' ? '' : meta
      manovra()
    }

    // le due porte della home si presentano con data-meta
    const porte = Array.from(document.querySelectorAll<HTMLElement>('[data-meta]'))
    let ritorno: ReturnType<typeof setTimeout>
    const pulisci: Array<() => void> = []
    for (const porta of porte) {
      const meta = porta.dataset.meta === 'demolizione' ? 'carro' : 'acquirente'
      const entra = () => { clearTimeout(ritorno); vaiA(meta as Meta) }
      const esce = () => { ritorno = setTimeout(() => vaiA('centro'), 450) }
      porta.addEventListener('mouseenter', entra)
      porta.addEventListener('focusin', entra)
      porta.addEventListener('mouseleave', esce)
      porta.addEventListener('focusout', esce)
      pulisci.push(() => {
        porta.removeEventListener('mouseenter', entra)
        porta.removeEventListener('focusin', entra)
        porta.removeEventListener('mouseleave', esce)
        porta.removeEventListener('focusout', esce)
      })
    }
    return () => { clearTimeout(ritorno); pulisci.forEach(f => f()) }
  }, [])

  return (
    <div ref={palco} className="scena-home hidden sm:block" aria-hidden="true">
      {/* ⚠️ 25/08 (Davide): niente riga di terra sotto i mezzi, tagliava le
          ruote a metà. A tenere a terra la 500 basta la sua ombra. */}
      <span className="scena-posto scena-sx" data-posto="sx">
        <span className="scena-meta">
          <Image src="/carro-attrezzi.png" alt="" width={1200} height={477} priority />
        </span>
      </span>

      <span className="scena-posto scena-centro" data-posto="centro">
        <span className="scena-ombra" />
        <Image ref={auto} src="/auto-500.png" alt="" width={700} height={329} priority className="scena-auto" />
      </span>

      <span className="scena-posto scena-dx" data-posto="dx">
        <span className="scena-meta">
          <Image src="/acquirente.png" alt="" width={371} height={683} priority />
        </span>
      </span>
    </div>
  )
}
