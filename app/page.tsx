import Link from 'next/link'
import Image from 'next/image'
import AiutoWhatsApp from './components/AiutoWhatsApp'

function Spunta() {
  return (
    <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#DCF3E4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1F7A43" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </span>
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
        <p style={{ fontSize: 13.5, color: '#6B7280', textAlign: 'center', margin: '0 0 20px' }}>Demolizione auto gratuita in tutta Italia</p>

        {/* Benefici (spunte disegnate, niente emoji) */}
        <div className="w-full flex flex-col" style={{ gap: 9, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Spunta /><span style={{ fontSize: 13.5, color: '#374151' }}>100% gratuito per te, sempre</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Spunta /><span style={{ fontSize: 13.5, color: '#374151' }}>Ritiro a casa, ovunque in Italia</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Spunta /><span style={{ fontSize: 13.5, color: '#374151' }}>Certificati di rottamazione e PRA</span>
          </div>
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

        <p style={{ fontSize: 11, color: '#9AA7B5', textAlign: 'center', margin: '16px 0 0' }}>Nessun costo nascosto · Pensiamo a tutto noi</p>

      </div>

      <AiutoWhatsApp />
    </main>
  )
}
