-- ============================================================
-- FRASI PRONTE PER IL RIFIUTO DOCUMENTI (27/07/2026)
-- La tabella messaggi_preimpostati prende una CATEGORIA:
--   'chat'    → frasi rapide della chat admin (quelle di sempre)
--   'rifiuto' → frasi del rifiuto documento (nuvoletta del visore)
-- Le frasi esistenti restano 'chat'. Si parte con 4 frasi di rifiuto
-- di serie (solo se non ce ne sono già: niente doppioni ai riavvii).
-- ============================================================

ALTER TABLE messaggi_preimpostati
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'chat';

INSERT INTO messaggi_preimpostati (testo, ordine, categoria)
SELECT v.testo, v.ordine, 'rifiuto'
FROM (VALUES
  ('Foto sfocata, rifalla con buona luce', 1),
  ('Il documento non si legge bene, rifai la foto più da vicino', 2),
  ('Manca il retro: carica anche l''altro lato', 3),
  ('Non è il documento richiesto: controlla e ricarica quello giusto', 4)
) AS v(testo, ordine)
WHERE NOT EXISTS (SELECT 1 FROM messaggi_preimpostati WHERE categoria = 'rifiuto');

-- Ricarica la cache dello schema di PostgREST
NOTIFY pgrst, 'reload schema';
