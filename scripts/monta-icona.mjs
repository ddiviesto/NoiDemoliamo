// ============================================================
// MONTA L'ICONA A3 (05/10): prende lo strato delle lettere (PNG trasparente
// da 1024 disegnato nel browser con le Outfit vere, public/icona-a3.html),
// ci mette sotto il lilla con gli aloni e gli angoli tondi, e scrive:
//   public/icona-app.png (1024) · app/icon.png (512) · app/apple-icon.png (180)
// Uso: node scripts/monta-icona.mjs <strato-1024.png>
// ============================================================
import sharp from 'sharp'

const strato = process.argv[2]
if (!strato) { console.error('Manca il file dello strato'); process.exit(1) }
const S = 1024, r = Math.round(S * 0.22)

// Il fondo: lilla #F5F3FE con i tre aloni della scena della home
const fondo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <radialGradient id="a" cx="15%" cy="5%" r="60%"><stop offset="0" stop-color="#E4ECFF"/><stop offset="0.7" stop-color="#E4ECFF" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="90%" cy="30%" r="55%"><stop offset="0" stop-color="#E9E3FF"/><stop offset="0.7" stop-color="#E9E3FF" stop-opacity="0"/></radialGradient>
    <radialGradient id="c" cx="30%" cy="100%" r="60%"><stop offset="0" stop-color="#DED6FB"/><stop offset="0.72" stop-color="#DED6FB" stop-opacity="0"/></radialGradient>
    <clipPath id="tondo"><rect width="${S}" height="${S}" rx="${r}" ry="${r}"/></clipPath>
  </defs>
  <g clip-path="url(#tondo)">
    <rect width="${S}" height="${S}" fill="#F5F3FE"/>
    <rect width="${S}" height="${S}" fill="url(#a)"/>
    <rect width="${S}" height="${S}" fill="url(#b)"/>
    <rect width="${S}" height="${S}" fill="url(#c)"/>
  </g>
</svg>`)

// La maschera degli angoli tondi vale anche per le lettere (che stanno al centro, ma per sicurezza)
const maschera = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" rx="${r}" ry="${r}" fill="#fff"/></svg>`)

const grande = await sharp(fondo).composite([{ input: strato }]).png().toBuffer()
const conAngoli = await sharp(grande).composite([{ input: maschera, blend: 'dest-in' }]).png().toBuffer()

await sharp(conAngoli).toFile('public/icona-app.png')
await sharp(conAngoli).resize(512, 512, { kernel: 'lanczos3' }).png().toFile('app/icon.png')
await sharp(conAngoli).resize(180, 180, { kernel: 'lanczos3' }).png().toFile('app/apple-icon.png')
for (const f of ['public/icona-app.png', 'app/icon.png', 'app/apple-icon.png']) {
  const m = await sharp(f).metadata(); console.log(f, m.width + 'x' + m.height, m.hasAlpha ? 'alpha' : '')
}
