-- ============================================================
-- 12/08/2026 — SPIA DELLE NOTE NON LETTE (Cronologia e Note)
--
-- Il numerino grigio della linguetta "Demolitore" (quantità) è stato
-- tolto: al suo posto una SPIA ROSSA che conta solo le NOTE SCRITTE
-- dall'altra parte non ancora lette (gli eventi automatici non contano):
--   · lato admin: note del demolitore → spia sulla linguetta Demolitore,
--     si azzera aprendo la linguetta
--   · lato demolitore: note di NoiDemoliamo → spia sulla riga della
--     pratica, si azzera aprendo la tendina
--
-- Serve una colonnina: "letta" = il DESTINATARIO l'ha vista.
-- Lo storico viene marcato tutto letto: niente spie finte al via.
-- ============================================================

ALTER TABLE pratiche_note
  ADD COLUMN IF NOT EXISTS letta boolean NOT NULL DEFAULT false;

-- Lo storico parte "già letto"
UPDATE pratiche_note SET letta = true WHERE letta = false;

CREATE INDEX IF NOT EXISTS idx_pratiche_note_lette
  ON pratiche_note (pratica_id, letta);

-- Controllo finale: deve comparire la colonna letta
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pratiche_note'
ORDER BY ordinal_position;
