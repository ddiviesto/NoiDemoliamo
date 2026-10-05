// ============================================================
// LE ICONE PER LINGUETTA E INSTALLAZIONE (05/10, mockup "installa" C)
//   app/icon.png (64)            → la LINGUETTA del browser: solo la fogliolina
//                                  sul quadratino lilla (a 16px la scritta
//                                  non si legge, la foglia sì)
//   public/icone/icona-192.png · icona-512.png → il manifesto (icona intera)
//   public/icone/icona-maskable-512.png → Android "maskable": lilla a tutto
//                                  quadrato (niente angoli trasparenti) e
//                                  scritta ridotta nella zona sicura
// Uso: node scripts/monta-icone-pwa.mjs <strato-1024.png>
// (lo strato delle lettere viene da docs/mockup/icona-a3.html)
// ============================================================
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const strato = process.argv[2]
if (!strato) { console.error('Manca il file dello strato'); process.exit(1) }
mkdirSync('public/icone', { recursive: true })

const C = 'M216-176q-45-45-70.5-104T120-402q0-63 24-124.5T222-642q60-60 169.5-91T675-759q26 1 48 11t39 27q17 17 27 39.5t11 48.5q2 82-4.5 151.5t-21 125.5q-14.5 56-37 99.5T684-182q-53 53-112.5 77.5T450-80q-65 0-127-25.5T216-176Zm112-16q29 17 59.5 24.5T450-160q46 0 91-18.5t86-59.5q18-18 36.5-50.5t32-85Q709-426 716-500.5t2-177.5q-49-2-110.5-1.5T485-670q-61 9-116 29t-90 55q-45 45-62 89t-17 85q0 59 22.5 103.5T262-246q42-80 111-153.5T534-520q-72 63-125.5 142.5T328-192Z'
const P = 'M216-176q-45-45-70.5-104T120-402q0-63 24-124.5T222-642q60-60 169.5-91T675-759q26 1 48 11t39 27q17 17 27 39.5t11 48.5q2 82-4.5 151.5t-21 125.5q-14.5 56-37 99.5T684-182q-53 53-112.5 77.5T450-80q-65 0-127-25.5T216-176Z'

// 1 · la linguetta: foglia sul quadratino lilla, A FILO (94%, mockup C2 del 05/10: a 16px deve arrivare alla grandezza della M di Gmail)
const linguetta = (S) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#EDE9FE"/>
  <g transform="translate(3 3) scale(0.0979)"><g transform="translate(0 960)"><path d="${P}" fill="#fff"/><path d="${C}" fill="#16A34A"/></g></g>
</svg>`)
await sharp(linguetta(64)).png().toFile('app/icon.png')
await sharp(linguetta(32)).png().toFile('public/icone/linguetta-32.png')

// 2 · il manifesto: l'icona intera (dalla copia a 1024 già montata)
await sharp('public/icona-app.png').resize(192, 192, { kernel: 'lanczos3' }).png().toFile('public/icone/icona-192.png')
await sharp('public/icona-app.png').resize(512, 512, { kernel: 'lanczos3' }).png().toFile('public/icone/icona-512.png')

// 3 · maskable: fondo lilla a tutto quadrato + scritta all'80% (zona sicura)
const S = 1024
const fondo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <radialGradient id="a" cx="15%" cy="5%" r="60%"><stop offset="0" stop-color="#E4ECFF"/><stop offset="0.7" stop-color="#E4ECFF" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="90%" cy="30%" r="55%"><stop offset="0" stop-color="#E9E3FF"/><stop offset="0.7" stop-color="#E9E3FF" stop-opacity="0"/></radialGradient>
    <radialGradient id="c" cx="30%" cy="100%" r="60%"><stop offset="0" stop-color="#DED6FB"/><stop offset="0.72" stop-color="#DED6FB" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="#F5F3FE"/>
  <rect width="${S}" height="${S}" fill="url(#a)"/><rect width="${S}" height="${S}" fill="url(#b)"/><rect width="${S}" height="${S}" fill="url(#c)"/>
</svg>`)
const lettere = await sharp(strato).resize(Math.round(S * 0.8), Math.round(S * 0.8), { kernel: 'lanczos3' }).png().toBuffer()
const maskable = await sharp(fondo).composite([{ input: lettere, gravity: 'centre' }]).png().toBuffer()
await sharp(maskable).resize(512, 512, { kernel: 'lanczos3' }).png().toFile('public/icone/icona-maskable-512.png')

for (const f of ['app/icon.png', 'public/icone/linguetta-32.png', 'public/icone/icona-192.png', 'public/icone/icona-512.png', 'public/icone/icona-maskable-512.png']) {
  const m = await sharp(f).metadata(); console.log(f, m.width + 'x' + m.height)
}
