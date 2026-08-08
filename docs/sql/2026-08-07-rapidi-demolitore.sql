-- ============================================================
-- 07/08/2026 — MESSAGGI RAPIDI DEL DEMOLITORE (chat col cliente)
--
-- Ogni demolitore ha le SUE frasi rapide, modificabili dalla sua chat
-- (bottone "Gestisci", come nella chat admin). Vivono nella stessa
-- tabella delle frasi dell'admin, distinte da:
--   · categoria = 'chat_demolitore'
--   · demolitore_id = il demolitore proprietario
-- Le frasi dell'admin restano quelle senza demolitore_id (categoria
-- 'chat' / 'rifiuto') e le sue viste le filtrano già per categoria.
--
-- Niente nuove policy RLS: il demolitore non tocca il DB direttamente,
-- passa SOLO dall'endpoint server /api/demolitore-rapidi (service role)
-- che filtra sempre per il suo demolitore_id.
--
-- Le 4 frasi di partenza le semina da solo l'endpoint alla prima
-- apertura della chat di ogni demolitore.
-- ============================================================

ALTER TABLE messaggi_preimpostati
  ADD COLUMN IF NOT EXISTS demolitore_id uuid REFERENCES demolitori(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_messaggi_preimpostati_demolitore
  ON messaggi_preimpostati (demolitore_id);

-- Controllo finale: deve comparire la colonna demolitore_id
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messaggi_preimpostati'
ORDER BY ordinal_position;
