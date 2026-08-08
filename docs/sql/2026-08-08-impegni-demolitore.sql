-- ============================================================
-- 08/08/2026 — IMPEGNI PERSONALI DEL DEMOLITORE (pagina Ritiri)
--
-- Il demolitore può aggiungere alla sua agenda anche gli impegni SUOI
-- (ritiri e commissioni fuori da NoiDemoliamo): card grigie con
-- l'etichetta PERSONALE nella pagina Ritiri, contate nella "scena
-- globale" quando fissa i ritiri delle pratiche.
--
-- Privacy: sono impegni privati del demolitore. RLS accesa e NESSUNA
-- policy per i ruoli browser: ci si arriva SOLO dall'endpoint server
-- /api/demolitore-impegni (service role), che filtra sempre per il
-- demolitore autenticato. Nemmeno l'admin li vede.
-- ============================================================

CREATE TABLE IF NOT EXISTS demolitori_impegni (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demolitore_id uuid NOT NULL REFERENCES demolitori(id) ON DELETE CASCADE,
  quando timestamptz NOT NULL,
  titolo text NOT NULL,
  luogo text,
  creato_il timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demolitori_impegni_demolitore
  ON demolitori_impegni (demolitore_id, quando);

ALTER TABLE demolitori_impegni ENABLE ROW LEVEL SECURITY;

-- Controllo finale: la tabella deve comparire con le sue colonne
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'demolitori_impegni'
ORDER BY ordinal_position;
