import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/NoiDemoliamoLogo.png"
            alt="NoiDemoliamo Logo"
            width={160}
            height={160}
            className="rounded-xl"
          />
        </div>
        <p className="text-gray-500 mb-8">Demolizione auto gratuita in tutta Italia</p>
        
        <div className="space-y-3">
          <Link href="/login" className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition">
            Accedi
          </Link>
          <Link href="/registrati" className="block w-full border border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition">
            Registrati — è gratuito
          </Link>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          Sei un demolitore o un collaboratore? Accedi con le credenziali ricevute.
        </p>
      </div>
    </main>
  )
}