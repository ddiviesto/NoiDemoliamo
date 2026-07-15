-- ============================================================
-- LEGGE 26/01/2026 n. 14 — Attestazione di inutilizzabilità
-- Nuovo documento nel catalogo per chi ha il fermo amministrativo
-- (casistiche 1-7, condizione fermo_si): foto da caricare +
-- originale da consegnare al ritiro. NON è un modulo nostro:
-- la rilascia il Comune o la Polizia locale.
--
-- Da incollare nel SQL Editor di Supabase.
-- Vale per le pratiche NUOVE (trigger) e per il bottone fermo
-- dell'admin (/api/pratica-dati legge il catalogo al volo).
-- ============================================================

INSERT INTO casistiche_documenti
  (id, casistica, codice, nome, descrizione, richiede_upload, richiede_consegna, template_pdf, per_erede, condizione, obbligatorio, ordine)
SELECT
  gen_random_uuid(),
  c,
  'ATTESTAZIONE_INUTILIZZABILITA',
  'Attestazione di inutilizzabilità del veicolo',
  'La rilascia il tuo Comune o la Polizia locale (Legge 14/2026). Fotografala o carica il PDF: l''originale va consegnato al ritiro.',
  true,   -- richiede_upload: foto/PDF nell'area personale
  true,   -- richiede_consegna: originale al ritiro
  NULL,   -- non è un template nostro
  false,  -- non si moltiplica per erede
  'fermo_si',
  true,
  96      -- subito dopo la dichiarazione del fermo
FROM unnest(ARRAY[
  'persona_fisica', 'eredi_accettato', 'eredi_rinuncia',
  'societa', 'societa_fallita', 'associazione', 'non_intestatario'
]) AS c
-- non inserire doppioni se lo script viene lanciato due volte
WHERE NOT EXISTS (
  SELECT 1 FROM casistiche_documenti d
  WHERE d.casistica = c AND d.codice = 'ATTESTAZIONE_INUTILIZZABILITA'
);

-- Controllo: deve restituire 7 righe
SELECT casistica, codice, nome, condizione, richiede_upload, richiede_consegna
FROM casistiche_documenti
WHERE codice = 'ATTESTAZIONE_INUTILIZZABILITA'
ORDER BY casistica;
