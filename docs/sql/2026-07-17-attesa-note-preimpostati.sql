-- ============================================================
-- 17/07/2026 — PRATICA "IN ATTESA" + CRONOLOGIA NOTE + MESSAGGI RAPIDI
-- (redesign dettaglio pratica admin, variante A approvata su mockup)
--
-- 1. L'attesa è una PAUSA sopra lo stato (non uno stato del workflow):
--    quando si riprende, la pratica riparte esattamente da dov'era.
-- 2. pratiche_note: cronologia/note della pratica, SOLO ADMIN.
-- 3. messaggi_preimpostati: frasi rapide della chat admin.
-- ============================================================

-- 1) Colonne attesa su pratiche
ALTER TABLE pratiche
  ADD COLUMN IF NOT EXISTS in_attesa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attesa_motivo text,
  ADD COLUMN IF NOT EXISTS attesa_dal timestamptz;

-- 2) Cronologia e note della pratica (solo admin)
CREATE TABLE IF NOT EXISTS pratiche_note (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pratica_id uuid NOT NULL REFERENCES pratiche(id) ON DELETE CASCADE,
  testo text NOT NULL,
  creato_il timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pratiche_note ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestisce note pratiche" ON pratiche_note;
CREATE POLICY "Admin gestisce note pratiche" ON pratiche_note
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'ddiviesto@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'ddiviesto@gmail.com');

-- 3) Messaggi rapidi della chat admin (solo admin)
CREATE TABLE IF NOT EXISTS messaggi_preimpostati (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  testo text NOT NULL,
  ordine int NOT NULL DEFAULT 0,
  creato_il timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messaggi_preimpostati ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestisce messaggi preimpostati" ON messaggi_preimpostati;
CREATE POLICY "Admin gestisce messaggi preimpostati" ON messaggi_preimpostati
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'ddiviesto@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'ddiviesto@gmail.com');

-- Frasi di partenza (modificabili poi da "Gestisci" nella chat)
INSERT INTO messaggi_preimpostati (testo, ordine)
SELECT * FROM (VALUES
  ('Ciao! Abbiamo ricevuto la tua richiesta: carica i documenti dalla tua area personale e ci pensiamo noi.', 1),
  ('Documenti approvati! Stiamo scegliendo il demolitore migliore per il ritiro.', 2),
  ('Il demolitore ti contatterà entro 8 ore lavorative per fissare il ritiro.', 3),
  ('C''è un documento da sistemare: apri la tua area personale e controlla la nota in rosso.', 4)
) AS v(testo, ordine)
WHERE NOT EXISTS (SELECT 1 FROM messaggi_preimpostati);

-- Controllo finale
SELECT 'pratiche' AS tabella, count(*) FILTER (WHERE in_attesa) AS in_attesa FROM pratiche
UNION ALL
SELECT 'pratiche_note', count(*) FROM pratiche_note
UNION ALL
SELECT 'messaggi_preimpostati', count(*) FROM messaggi_preimpostati;
