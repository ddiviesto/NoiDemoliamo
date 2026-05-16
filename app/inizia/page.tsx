import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md flex flex-col items-center gap-6">
        
        <Image
          src="/NoiDemoliamoLogo.png"
          alt="NoiDemoliamo"
          width={120}
          height={120}
          className="rounded-xl"
        />

        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">NoiDemoliamo</h1>
          <p className="text-gray-500 text-sm">Demolizione auto gratuita in tutta Italia</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Link
            href="/inizia"
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-center text-lg hover:bg-blue-700 transition"
          >
            Inizia — è gratuito 🚀
          </Link>
          <Link
            href="/login"
            className="w-full border border-blue-600 text-blue-600 py-3 rounded-xl font-semibold text-center hover:bg-blue-50 transition"
          >
            Accedi
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Sei un demolitore o un collaboratore? Accedi con le credenziali ricevute.
        </p>

      </div>
    </main>
  )
}