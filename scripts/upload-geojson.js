// ============================================================
// Script: upload-geojson.js
// Scopo: Scarica i 20 file GeoJSON dei comuni italiani (uno per
//        regione) dal repo openpolis su GitHub, li ottimizza
//        riducendo la precisione decimale, e li carica su
//        Supabase Storage nel bucket "geojson-comuni".
//
// Uso:   node scripts/upload-geojson.js
// ============================================================

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'geojson-comuni';

if (!SUPABASE_URL) {
  console.error('❌ ERRORE: NEXT_PUBLIC_SUPABASE_URL non trovata in .env.local');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERRORE: SUPABASE_SERVICE_ROLE_KEY non trovata in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Le 20 regioni italiane con codice ISTAT numerico (1-20, senza zero davanti).
const REGIONI = [
  { codice: 1,  slug: 'piemonte',              nome: 'Piemonte' },
  { codice: 2,  slug: 'valle-d-aosta',         nome: 'Valle d\'Aosta' },
  { codice: 3,  slug: 'lombardia',             nome: 'Lombardia' },
  { codice: 4,  slug: 'trentino-alto-adige',   nome: 'Trentino-Alto Adige' },
  { codice: 5,  slug: 'veneto',                nome: 'Veneto' },
  { codice: 6,  slug: 'friuli-venezia-giulia', nome: 'Friuli-Venezia Giulia' },
  { codice: 7,  slug: 'liguria',               nome: 'Liguria' },
  { codice: 8,  slug: 'emilia-romagna',        nome: 'Emilia-Romagna' },
  { codice: 9,  slug: 'toscana',               nome: 'Toscana' },
  { codice: 10, slug: 'umbria',                nome: 'Umbria' },
  { codice: 11, slug: 'marche',                nome: 'Marche' },
  { codice: 12, slug: 'lazio',                 nome: 'Lazio' },
  { codice: 13, slug: 'abruzzo',               nome: 'Abruzzo' },
  { codice: 14, slug: 'molise',                nome: 'Molise' },
  { codice: 15, slug: 'campania',              nome: 'Campania' },
  { codice: 16, slug: 'puglia',                nome: 'Puglia' },
  { codice: 17, slug: 'basilicata',            nome: 'Basilicata' },
  { codice: 18, slug: 'calabria',              nome: 'Calabria' },
  { codice: 19, slug: 'sicilia',               nome: 'Sicilia' },
  { codice: 20, slug: 'sardegna',              nome: 'Sardegna' }
];

const BASE_URL = 'https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_R_';

function ottimizzaGeoJSON(geojson, decimali = 5) {
  function arrotonda(coord) {
    if (typeof coord === 'number') {
      return parseFloat(coord.toFixed(decimali));
    }
    if (Array.isArray(coord)) {
      return coord.map(arrotonda);
    }
    return coord;
  }
  for (const feature of geojson.features || []) {
    if (feature.geometry && feature.geometry.coordinates) {
      feature.geometry.coordinates = arrotonda(feature.geometry.coordinates);
    }
  }
  return geojson;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function main() {
  console.log('🚀 Avvio upload GeoJSON regioni italiane su Supabase Storage');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🌐 Fonte: github.com/openpolis/geojson-italy\n`);

  let successi = 0;
  let fallimenti = 0;
  const errori = [];

  for (let i = 0; i < REGIONI.length; i++) {
    const regione = REGIONI[i];
    const indice = `[${String(i + 1).padStart(2, ' ')}/${REGIONI.length}]`;
    const urlFile = `${BASE_URL}${regione.codice}_municipalities.geojson`;
    const nomeFileSupabase = `${regione.slug}.geojson`;

    process.stdout.write(`${indice} ${regione.nome.padEnd(25)} `);

    try {
      const response = await fetch(urlFile);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const geojson = await response.json();
      const sizeOriginale = JSON.stringify(geojson).length;

      const ottimizzato = ottimizzaGeoJSON(geojson, 5);
      const jsonStringa = JSON.stringify(ottimizzato);
      const sizeOttimizzato = jsonStringa.length;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(nomeFileSupabase, jsonStringa, {
          contentType: 'application/json',
          upsert: true
        });

      if (error) {
        throw new Error(`Supabase: ${error.message}`);
      }

      const risparmio = ((1 - sizeOttimizzato / sizeOriginale) * 100).toFixed(0);
      console.log(`✅ ${formatBytes(sizeOttimizzato)} (-${risparmio}%)`);
      successi++;

    } catch (err) {
      console.log(`❌ ${err.message}`);
      errori.push({ regione: regione.nome, errore: err.message });
      fallimenti++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Caricati: ${successi}/${REGIONI.length}`);
  if (fallimenti > 0) {
    console.log(`❌ Falliti:  ${fallimenti}`);
    console.log('\nDettaglio errori:');
    for (const e of errori) {
      console.log(`  - ${e.regione}: ${e.errore}`);
    }
  }
  console.log('='.repeat(50));

  if (successi === REGIONI.length) {
    console.log('\n🎉 Tutto caricato con successo!');
    console.log(`📍 I file sono pubblici a: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/{slug}.geojson`);
  }
}

main().catch(err => {
  console.error('\n💥 Errore fatale:', err);
  process.exit(1);
});
