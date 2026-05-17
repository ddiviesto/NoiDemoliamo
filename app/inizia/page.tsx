'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { DatiPratica, datiPraticaIniziali } from '../../types/pratica'
import { Step3Veicolo } from './steps/Step3Veicolo'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function SkipButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all">
      🕐 {label}
    </button>
  )
}

function OptionButton({ icon, label, sub, selected, onClick }: { icon: string; label: string; sub: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${selected ? 'bg-blue-100' : 'bg-gray-100'}`}>{icon}</div>
      <div className="flex-1">
        <div className={`font-medium text-sm ${selected ? 'text-blue-700' : 'text-gray-800'}`}>{label}</div>
        <div className={`text-xs mt-0.5 ${selected ? 'text-blue-500' : 'text-gray-400'}`}>{sub}</div>
      </div>
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
        {selected && <span className="text-white text-xs">✓</span>}
      </div>
    </button>
  )
}

function WarnBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
      <span className="flex-shrink-0 mt-0.5">⚠️</span>
      <span>{children}</span>
    </div>
  )
}

function InfoBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
      <span className="flex-shrink-0 mt-0.5">ℹ️</span>
      <span>{children}</span>
    </div>
  )
}

function getSteps(dati: DatiPratica) {
  const base = ['indirizzo', 'targa', 'cf', 'veicolo', 'foto', 'ruolo', 'libretto', 'cdc', 'anagrafica', 'account']
  if (dati.ruolo === 'deceduto') {
    const idx = base.indexOf('libretto')
    base.splice(idx, 0, 'eredita')
  }
  return base
}

export default function IniziaPage() {
  const router = useRouter()
  const [dati, setDati] = useState<DatiPratica>(datiPraticaIniziali)
  const [curIdx, setCurIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [indirizzoConfermato, setIndirizzoConfermato] = useState(false)
  const [foto, setFoto] = useState<File[]>([])
  const indirizzoRef = useRef<HTMLInputElement>(null)
  const fotoCameraRef = useRef<HTMLInputElement>(null)
  const fotoGalleriaRef = useRef<HTMLInputElement>(null)

  const steps = getSteps(dati)
  const curStep = steps[curIdx]
  const total = steps.length
  const pct = Math.round((curIdx / (total - 1)) * 100)

  function update(partial: Partial<DatiPratica>) {
    setDati(prev => ({ ...prev, ...partial }))
  }

  function next() {
    if (curIdx < steps.length - 1) setCurIdx(i => i + 1)
    else handleSubmit()
  }

  function back() {
    if (curIdx > 0) setCurIdx(i => i - 1)
  }

  function confermaIndirizzo() {
    const val = indirizzoRef.current?.value || ''
    if (!val.trim()) return
    update({ indirizzo: val, indirizzoSkipped: false })
    setIndirizzoConfermato(true)
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const nuove = Array.from(e.target.files)
      setFoto(prev => [...prev, ...nuove])
    }
  }

  function rimuoviFoto(idx: number) {
    setFoto(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dati.email,
        password: dati.password,
      })
      if (authError) throw authError
      const userId = authData.user?.id
      if (!userId) throw new Error('Utente non creato')
      const { error: dbError } = await supabase.from('pratiche').insert({
        user_id: userId,
        indirizzo_ritiro: dati.indirizzoSkipped ? null : dati.indirizzo,
        targa: dati.targaSkipped ? null : dati.targa,
        codice_fiscale: dati.cfSkipped ? null : dati.cf,
        tipo_mezzo: dati.veicolo.tipo,
        tipo_mezzo_altro: dati.veicolo.tipoAltro || null,
        anno: dati.veicolo.anno ? parseInt(dati.veicolo.anno) : null,
        km: dati.veicolo.km ? parseInt(dati.veicolo.km) : null,
        marca: dati.veicolo.marca,
        modello: dati.veicolo.modello,
        incidentato: dati.veicolo.incidentato === 'si',
        marciante: dati.veicolo.marciante === 'si',
        va_in_moto: dati.veicolo.vaInMoto === 'si',
        parti_mancanti: dati.veicolo.partiMancanti === 'si',
        note_veicolo: dati.veicolo.note || null,
        ruolo_richiedente: dati.ruolo,
        eredita: dati.eredita,
        libretto: dati.libretto,
        certificato_proprieta: dati.cdc,
        nome_richiedente: dati.nome,
        telefono: dati.telefono,
        stato: 'in_attesa_documenti',
      })
      if (dbError) throw dbError
      await supabase.from('utenti').insert({
  id: userId,
  nome: dati.nome,
  email: dati.email,
  telefono: dati.telefono,
  tipo: 'cliente',
  stato: 'attivo',
})
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f0f4f8] flex items-start justify-center p-4 pt-8">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-sm p-7">

        {curIdx > 0 && (
          <button onClick={back} className="inline-flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-all mb-5">
            ← Indietro
          </button>
        )}

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 bg-[#0d2144] rounded-xl flex items-center justify-center overflow-hidden">
            <Image src="/NoiDemoliamoLogo.png" alt="NoiDemoliamo" width={36} height={36} className="rounded-xl" />
          </div>
          <span className="text-sm font-medium text-gray-800">NoiDemoliamo</span>
        </div>

        <div className="h-1 bg-gray-100 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>

        <div className="text-xs text-gray-400 uppercase tracking-widest mb-3">
          Passo {curIdx + 1} di {total}
        </div>

        {curStep === 'indirizzo' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Dove si trova il veicolo?</h1>
            <p className="text-sm text-gray-500 mb-4">Inserisci l&apos;indirizzo esatto dove si trova fisicamente il veicolo.</p>
            <WarnBadge><strong>Attenzione:</strong> inserisci dove si trova il veicolo, non la tua residenza. Il demolitore verrà lì a ritirarlo.</WarnBadge>
            <div className="mt-4 flex flex-col gap-3">
              {indirizzoConfermato ? (
                <>
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">✓</div>
                    <div className="flex-1 text-sm font-medium text-green-800">{dati.indirizzo}</div>
                    <button onClick={() => { update({ indirizzo: '' }); setIndirizzoConfermato(false) }} className="text-xs text-green-600 underline">Cambia</button>
                  </div>
                  <button onClick={next} className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 transition-all">Continua →</button>
                </>
              ) : (
                <>
                  <input ref={indirizzoRef} type="text" placeholder="Es. Via Garibaldi 8, Roma" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all" onKeyDown={e => e.key === 'Enter' && confermaIndirizzo()} />
                  <button onClick={confermaIndirizzo} className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 transition-all">Verifica copertura →</button>
                  <SkipButton onClick={() => { update({ indirizzo: '', indirizzoSkipped: true }); next() }} label="Al momento non ricordo — lo inserisco dopo" />
                </>
              )}
            </div>
          </>
        )}

        {curStep === 'targa' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Qual è la targa del veicolo?</h1>
            <p className="text-sm text-gray-500 mb-4">Ci serve per verificare eventuali fermi amministrativi.</p>
            <div className="flex flex-col gap-3">
              {dati.targaSkipped && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <span>🕐</span><span>Hai saltato questo campo — puoi completarlo dalla tua area personale.</span>
                </div>
              )}
              <input type="text" defaultValue={dati.targa} onChange={e => update({ targa: e.target.value.toUpperCase(), targaSkipped: false })} placeholder="Es. AB 123 CD" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all uppercase" />
              <button onClick={next} disabled={!dati.targa && !dati.targaSkipped} className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${dati.targa || dati.targaSkipped ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Continua →</button>
              {!dati.targaSkipped && <SkipButton onClick={() => { update({ targa: '', targaSkipped: true }); next() }} label="Non ricordo, la inserisco dopo" />}
            </div>
          </>
        )}

        {curStep === 'cf' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Codice fiscale dell&apos;intestatario</h1>
            <p className="text-sm text-gray-500 mb-4">Deve essere il CF di chi risulta proprietario al PRA.</p>
            <div className="flex flex-col gap-3">
              {dati.cfSkipped && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <span>🕐</span><span>Hai saltato questo campo — puoi completarlo dalla tua area personale.</span>
                </div>
              )}
              <input type="text" defaultValue={dati.cf} onChange={e => update({ cf: e.target.value.toUpperCase(), cfSkipped: false })} placeholder="Es. RSSMRA80A01H501Z" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all uppercase tracking-wider" maxLength={16} />
              <button onClick={next} disabled={!dati.cf && !dati.cfSkipped} className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${dati.cf || dati.cfSkipped ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Continua →</button>
              {!dati.cfSkipped && <SkipButton onClick={() => { update({ cf: '', cfSkipped: true }); next() }} label="Non ricordo, lo inserisco dopo" />}
            </div>
          </>
        )}

        {curStep === 'veicolo' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Dati del veicolo</h1>
            <p className="text-sm text-gray-500 mb-4">Seleziona il tipo di mezzo e compila le informazioni.</p>
            <Step3Veicolo
              dati={dati.veicolo}
              onUpdate={v => setDati(prev => ({ ...prev, veicolo: { ...prev.veicolo, ...v } }))}
              onNext={next}
            />
          </>
        )}

        {curStep === 'foto' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Foto del veicolo</h1>
            <p className="text-sm text-gray-500 mb-3">Le foto ci aiutano a capire le condizioni del veicolo e a scegliere il mezzo di trasporto più adatto per il ritiro. Più foto carichi, più veloce sarà il processo.</p>
            <InfoBadge>Scatta foto da diverse angolazioni: frontale, posteriore, laterali e abitacolo. Non serve che siano perfette!</InfoBadge>
            <div className="mt-4 flex flex-col gap-3">
              <input ref={fotoCameraRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFoto} className="hidden" />
              <input ref={fotoGalleriaRef} type="file" accept="image/*" multiple onChange={handleFoto} className="hidden" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => fotoCameraRef.current?.click()} className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50 hover:bg-blue-100 transition-all text-blue-700">
                  <span className="text-3xl">📷</span>
                  <span className="text-sm font-medium">Scatta foto</span>
                  <span className="text-xs text-blue-500">Apre la fotocamera</span>
                </button>
                <button onClick={() => fotoGalleriaRef.current?.click()} className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all text-gray-600">
                  <span className="text-3xl">🖼️</span>
                  <span className="text-sm font-medium">Carica foto</span>
                  <span className="text-xs text-gray-400">Dal telefono o PC</span>
                </button>
              </div>
              {foto.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">{foto.length} foto caricate</p>
                  <div className="grid grid-cols-3 gap-2">
                    {foto.map((f, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                        <img src={URL.createObjectURL(f)} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button onClick={() => rimuoviFoto(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={next} className="w-full py-4 rounded-xl font-semibold text-base bg-blue-600 text-white hover:bg-blue-700 transition-all">
                {foto.length > 0 ? `Continua con ${foto.length} foto →` : 'Al momento non le ho, aggiungo più tardi'}
              </button>
            </div>
          </>
        )}

        {curStep === 'ruolo' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Qual è la tua posizione rispetto al veicolo?</h1>
            <p className="text-sm text-gray-500 mb-4">Seleziona la situazione corretta per determinare i documenti necessari.</p>
            {dati.ruolo === 'delegato' && <InfoBadge>Nella tua area personale troverai la delega da scaricare, compilare e riconsegnare al demolitore.</InfoBadge>}
            <div className="flex flex-col gap-2 mt-2">
              <OptionButton icon="👤" label="Sono il proprietario" sub="Il veicolo è intestato a me" selected={dati.ruolo === 'proprietario'} onClick={() => update({ ruolo: 'proprietario' })} />
              <OptionButton icon="📋" label="Sono un delegato" sub="Il proprietario mi ha autorizzato per iscritto" selected={dati.ruolo === 'delegato'} onClick={() => update({ ruolo: 'delegato' })} />
              <OptionButton icon="⚰️" label="Il proprietario è deceduto" sub="Gestisco la pratica come erede o avente diritto" selected={dati.ruolo === 'deceduto'} onClick={() => update({ ruolo: 'deceduto' })} />
            </div>
            <button onClick={next} disabled={!dati.ruolo} className={`w-full py-4 rounded-xl font-semibold text-base mt-4 transition-all ${dati.ruolo ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Continua →</button>
          </>
        )}

        {curStep === 'eredita' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Gli eredi accettano o rinunciano all&apos;eredità?</h1>
            <p className="text-sm text-gray-500 mb-4">Questo determina quale modulo notarile va allegato alla pratica.</p>
            <WarnBadge>In base alla scelta verrà generato il modulo notarile corretto da scaricare nell&apos;area personale.</WarnBadge>
            <div className="flex flex-col gap-2 mt-3">
              <OptionButton icon="✅" label="Gli eredi accettano l'eredità" sub="Serve atto notarile di accettazione firmato" selected={dati.eredita === 'accetta'} onClick={() => update({ eredita: 'accetta' })} />
              <OptionButton icon="❌" label="Gli eredi rinunciano all'eredità" sub="Serve documentazione di rinuncia" selected={dati.eredita === 'rinuncia'} onClick={() => update({ eredita: 'rinuncia' })} />
            </div>
            <button onClick={next} disabled={!dati.eredita} className={`w-full py-4 rounded-xl font-semibold text-base mt-4 transition-all ${dati.eredita ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Continua →</button>
          </>
        )}

        {curStep === 'libretto' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Hai il libretto di circolazione?</h1>
            <p className="text-sm text-gray-500 mb-4">Il libretto originale va consegnato al demolitore al momento del ritiro. Così riceverai il primo documento per bloccare o spostare l&apos;assicurazione.</p>
            <div className="flex flex-col gap-2">
              <OptionButton icon="📗" label="Sì, ho il libretto originale" sub="Documento disponibile e integro" selected={dati.libretto === 'si'} onClick={() => update({ libretto: 'si' })} />
              <OptionButton icon="🔍" label="Ho la denuncia di smarrimento" sub="Emessa da autorità pubblica" selected={dati.libretto === 'denuncia'} onClick={() => update({ libretto: 'denuncia' })} />
              <OptionButton icon="❓" label="Non ho nessuno dei due" sub="Ti spieghiamo come procedere" selected={dati.libretto === 'no'} onClick={() => update({ libretto: 'no' })} />
            </div>
            <button onClick={next} disabled={!dati.libretto} className={`w-full py-4 rounded-xl font-semibold text-base mt-4 transition-all ${dati.libretto ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Continua →</button>
          </>
        )}

        {curStep === 'cdc' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Certificato di proprietà</h1>
            <p className="text-sm text-gray-500 mb-4">Il certificato è necessario per la radiazione al PRA.</p>
            <div className="flex flex-col gap-2">
              <OptionButton icon="💻" label="Digitale — nel fascicolo elettronico" sub="Non serve consegnarlo fisicamente" selected={dati.cdc === 'digitale'} onClick={() => update({ cdc: 'digitale' })} />
              <OptionButton icon="📄" label="Cartaceo — ce l'ho" sub="Lo consegno al demolitore" selected={dati.cdc === 'cartaceo'} onClick={() => update({ cdc: 'cartaceo' })} />
              <OptionButton icon="🔴" label="Smarrito" sub="Serve denuncia di smarrimento" selected={dati.cdc === 'smarrito'} onClick={() => update({ cdc: 'smarrito' })} />
            </div>
            <button onClick={next} disabled={!dati.cdc} className={`w-full py-4 rounded-xl font-semibold text-base mt-4 transition-all ${dati.cdc ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Continua →</button>
          </>
        )}

        {curStep === 'anagrafica' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">I tuoi dati di contatto</h1>
            <p className="text-sm text-gray-500 mb-3">Ci servono per aggiornare sulla pratica e fissare il ritiro.</p>
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 mb-4">
              <span className="flex-shrink-0">🎁</span>
              <span><strong>Ritiro completamente gratuito</strong> — nessun costo nascosto, nessuna sorpresa.</span>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome e cognome</label>
                <input type="text" defaultValue={dati.nome} onChange={e => update({ nome: e.target.value })} placeholder="Mario Rossi" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Numero di telefono</label>
                <input type="tel" defaultValue={dati.telefono} onChange={e => update({ telefono: e.target.value })} placeholder="+39 333 1234567" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all" />
              </div>
              <button onClick={next} disabled={!dati.nome || !dati.telefono} className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${dati.nome && dati.telefono ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Quasi fatto →</button>
            </div>
          </>
        )}

        {curStep === 'account' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">Crea il tuo account</h1>
            <p className="text-sm text-gray-500 mb-4">Potrai seguire la pratica, caricare i documenti e scaricare il certificato di rottamazione direttamente dall&apos;app.</p>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-3">⚠️ {error}</div>}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">La tua email</label>
                <input type="email" defaultValue={dati.email} onChange={e => update({ email: e.target.value })} placeholder="mario@email.it" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Scegli una password</label>
                <input type="password" defaultValue={dati.password} onChange={e => update({ password: e.target.value })} placeholder="••••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all" />
              </div>
              <button onClick={handleSubmit} disabled={!dati.email || !dati.password || loading} className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${dati.email && dati.password && !loading ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {loading ? 'Invio in corso...' : 'Invia richiesta 🚀'}
              </button>
            </div>
          </>
        )}

      </div>
    </main>
  )
}