import Link from 'next/link'
import Image from 'next/image'
import AiutoWhatsApp from './components/AiutoWhatsApp'

function Beneficio({ bg, colore, icona, testo }: { bg: string; colore: string; icona: React.ReactNode; testo: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colore} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icona}</svg>
      </span>
      <span style={{ fontSize: 13.5, color: '#374151' }}>{testo}</span>
    </div>
  )
}

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #ddd6fe 100%)' }}
    >
      <div className="bg-white w-full max-w-md flex flex-col items-center" style={{ borderRadius: 26, boxShadow: '0 12px 34px rgba(30,64,175,0.16)', padding: '28px 22px' }}>

        {/* Logo NoiDemoliamo */}
        <Image
          src="/NoiDemoliamoLogo.png"
          alt="NoiDemoliamo"
          width={96}
          height={96}
          className="rounded-2xl"
          style={{ boxShadow: '0 6px 16px rgba(37,99,235,0.18)' }}
          priority
        />

        {/* Titolo e payoff */}
        <h1 style={{ fontSize: 25, fontWeight: 600, color: '#111827', margin: '16px 0 4px', letterSpacing: '-0.5px' }}>NoiDemoliamo</h1>
        <p style={{ fontSize: 13.5, color: '#6B7280', textAlign: 'center', margin: '0 0 20px' }}>Demolizione Auto Gratuita in tutta Italia</p>

        {/* Benefici: lista con icone colorate (SVG Tabler inline, niente emoji) */}
        <div className="w-full flex flex-col" style={{ gap: 10, marginBottom: 22 }}>
          <Beneficio
            bg="#DCF3E4" colore="#1F7A43" testo="Servizio 100% gratuito"
            icona={<>
              <rect x="3" y="8" width="18" height="4" rx="1" />
              <path d="M12 8v13" />
              <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
              <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5a2.5 2.5 0 0 1 0 5" />
            </>}
          />
          <Beneficio
            bg="#CCFBF1" colore="#0F766E" testo="Zero costi di burocrazia"
            icona={<>
              <path d="M5 21v-16a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-3-2l-2 2l-2-2l-2 2l-2-2l-3 2" />
              <path d="M14 8h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3H10" />
            </>}
          />
          <Beneficio
            bg="#DBEAFE" colore="#1D4ED8" testo="Ritiro a domicilio gratuito in tutta Italia"
            icona={<>
              <circle cx="7" cy="17" r="2" />
              <circle cx="17" cy="17" r="2" />
              <path d="M5 17H3V6a1 1 0 0 1 1-1h9v12m-4 0h6m4 0h2v-6h-8m0-5h5l3 5" />
            </>}
          />
          <Beneficio
            bg="#EDE9FE" colore="#6D28D9" testo="Certificato di rottamazione e PRA"
            icona={<>
              <circle cx="15" cy="15" r="3" />
              <path d="M13 17.5V22l2-1.5l2 1.5v-4.5" />
              <path d="M10 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-1 1.73" />
              <path d="M6 9h12M6 12h3M6 15h2" />
            </>}
          />
          <Beneficio
            bg="#FEF3C7" colore="#B45309" testo="Servizio rapido"
            icona={<path d="M13 3v7h6l-8 11v-7H5l8-11" />}
          />
        </div>

        {/* Bottoni */}
        <Link
          href="/inizia"
          className="w-full text-white text-center hover:bg-blue-700 transition-colors active:scale-[0.99]"
          style={{ background: '#2563eb', fontSize: 15.5, fontWeight: 600, padding: '15px 10px', borderRadius: 16, boxShadow: '0 6px 16px rgba(37,99,235,0.28)', lineHeight: 1.25 }}
        >
          Richiedi la demolizione gratuita
        </Link>
        <Link
          href="/login"
          className="w-full text-center hover:bg-blue-50 transition-colors"
          style={{ fontSize: 14, fontWeight: 600, color: '#2563eb', padding: '13px 10px', borderRadius: 16, border: '1.5px solid #C7D6EC', marginTop: 10, boxSizing: 'border-box' }}
        >
          Accedi al mio account
        </Link>

        <p style={{ fontSize: 11, color: '#9AA7B5', textAlign: 'center', margin: '16px 0 0' }}>Nessun costo nascosto Pensiamo a tutto Noi</p>

      </div>

      <AiutoWhatsApp />
    </main>
  )
}
