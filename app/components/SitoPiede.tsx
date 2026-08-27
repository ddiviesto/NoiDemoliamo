// ============================================================
// PIEDE DEL SITO PUBBLICO — FASCIA COL BLU DEL MARCHIO
// ⭐ 18/08 (scelta di Davide sul mockup, pelle n.2): fascia a tutta
// larghezza con gli ANGOLI ALTI TONDI (non più il muro squadrato) nel
// blu del marchio che vira al viola, con un alone luminoso in alto a
// destra. A sinistra il nome grande e la frase, a destra tre colonne.
// ⚠️ Niente link alle domande: dove metterle si decide dopo.
// ⚠️ Ragione sociale, P.IVA e sede mancano ancora: andranno nella riga
// in fondo, insieme a /privacy e /termini.
// ============================================================

import Link from 'next/link'
import { WHATSAPP_NUMERO } from './SitoPezzi'
import Marchio from './Marchio'

function Colonna({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#A9C4FF', marginBottom: 13 }}>{titolo}</div>
      {children}
    </div>
  )
}

const stileVoce: React.CSSProperties = { display: 'block', fontSize: 13.5, color: '#E8EFFF', marginBottom: 10 }
const classeVoce = 'transition-colors hover:text-white'

export default function SitoPiede() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{
        marginTop: 64, borderRadius: '40px 40px 0 0', padding: '48px 0 26px',
        background: 'linear-gradient(140deg, #1B2E6B 0%, #2563EB 65%, #4F46E5 100%)',
        color: '#D3E0FF',
      }}
    >
      {/* alone luminoso in alto a destra */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          right: -80, top: -120, width: 380, height: 380, borderRadius: 999,
          background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0) 68%)',
        }}
      />

      <div className="relative mx-auto px-[22px]" style={{ maxWidth: 1160 }}>
        <div className="flex flex-wrap justify-between gap-9" style={{ paddingBottom: 30, borderBottom: '1px solid rgba(255,255,255,0.16)' }}>
          <div>
            <Link href="/" style={{ display: 'block', marginBottom: 12 }}>
              <Marchio misura={34} chiaro />
            </Link>
            <p style={{ fontSize: 13.5, lineHeight: 1.68, maxWidth: 340 }}>
              Ti togliamo il peso di un veicolo da demolire: ritiro a domicilio, burocrazia e certificati.
              Attivi in tutta Italia.
            </p>
          </div>

          <div className="flex flex-wrap" style={{ gap: '38px 58px' }}>
            <Colonna titolo="Servizio">
              <Link href="/inizia" style={stileVoce} className={classeVoce}>Richiedi la demolizione</Link>
              <Link href="/#come-funziona" style={stileVoce} className={classeVoce}>Come funziona</Link>
            </Colonna>
            <Colonna titolo="Contatti">
              <a href="https://wa.me/393518280493" target="_blank" rel="noopener" style={stileVoce} className={classeVoce}>
                WhatsApp {WHATSAPP_NUMERO}
              </a>
              <Link href="/login" style={stileVoce} className={classeVoce}>Accedi alla tua area</Link>
            </Colonna>
            <Colonna titolo="Legale">
              <Link href="/privacy" style={stileVoce} className={classeVoce}>Privacy</Link>
              <Link href="/termini" style={stileVoce} className={classeVoce}>Termini</Link>
            </Colonna>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-3" style={{ paddingTop: 20, fontSize: 12.5, color: '#A9C4FF' }}>
          <div><Marchio misura={15} chiaro /></div>
          <div>Demolizione auto gratuita in tutta Italia</div>
        </div>
      </div>
    </footer>
  )
}
