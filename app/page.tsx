import Link from 'next/link'
import Image from 'next/image'
import AiutoWhatsApp from './components/AiutoWhatsApp'

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f4f8 100%)' }}
    >
      <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 w-full max-w-md flex flex-col items-center gap-6">

        {/* Logo NoiDemoliamo */}
        <Image
          src="/NoiDemoliamoLogo.png"
          alt="NoiDemoliamo"
          width={120}
          height={120}
          className="rounded-2xl"
          priority
        />

        {/* Titolo e payoff */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2 tracking-tight">NoiDemoliamo</h1>
          <p className="text-gray-500 text-sm">Demolizione auto gratuita in tutta Italia</p>
        </div>

        {/* Benefit pills (rassicurano il cliente prima della call to action) */}
        <div className="flex gap-1.5 flex-wrap justify-center">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-[11px] font-medium">
            ✓ 100% gratuito
          </div>
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[11px] font-medium">
            ✓ Ritiro a domicilio
          </div>
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-[11px] font-medium">
            ✓ Certificato PRA
          </div>
        </div>

        {/* Bottoni */}
        <div className="w-full flex flex-col gap-2.5">
          <Link
            href="/inizia"
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-center text-base hover:bg-blue-700 transition leading-tight"
          >
            Richiedi la demolizione gratuita ora
          </Link>
          <Link
            href="/login"
            className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-2xl font-semibold text-center text-sm hover:bg-blue-50 transition"
          >
            Accedi al mio account
          </Link>
        </div>

      </div>

      <AiutoWhatsApp />
    </main>
  )
}