-- ============================================================
-- NOTE DEL DEMOLITORE (23/07/2026, nuova area demolitore)
-- Il demolitore può scrivere note cronologiche sulla pratica
-- ("chiamato, non risponde"): finiscono nella STESSA cronologia
-- che l'admin vede nel dettaglio pratica, marcate con l'autore.
-- Il demolitore vede SOLO le proprie note (mai quelle dell'admin);
-- scrive tramite endpoint dedicato (service role), le RLS non cambiano.
-- ============================================================

ALTER TABLE pratiche_note
  ADD COLUMN IF NOT EXISTS autore text NOT NULL DEFAULT 'admin';

-- Controllo finale
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'pratiche_note'
ORDER BY ordinal_position;
