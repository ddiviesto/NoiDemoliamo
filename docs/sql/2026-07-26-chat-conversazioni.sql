-- ============================================================
-- CHAT A TRE CANALI (26/07/2026)
-- Ogni messaggio appartiene a UNA conversazione:
--   cliente_noidemoliamo    → cliente ↔ NoiDemoliamo (admin)
--   cliente_demolitore      → cliente ↔ demolitore
--   demolitore_noidemoliamo → demolitore ↔ NoiDemoliamo (NUOVO canale)
--
-- I messaggi VECCHI restano con conversazione NULL: le interfacce li
-- mostrano col vecchio criterio dei mittenti (nessuna migrazione azzardata:
-- un messaggio del cliente non si può attribuire con certezza a un canale).
-- ============================================================

ALTER TABLE messaggi_chat ADD COLUMN IF NOT EXISTS conversazione text;

ALTER TABLE messaggi_chat DROP CONSTRAINT IF EXISTS messaggi_chat_conversazione_check;
ALTER TABLE messaggi_chat ADD CONSTRAINT messaggi_chat_conversazione_check
  CHECK (conversazione IS NULL OR conversazione IN ('cliente_noidemoliamo', 'cliente_demolitore', 'demolitore_noidemoliamo'));

CREATE INDEX IF NOT EXISTS idx_messaggi_chat_conversazione
  ON messaggi_chat (pratica_id, conversazione);

-- ============================================================
-- PRIVACY: il canale demolitore↔NoiDemoliamo NON deve essere leggibile
-- dal cliente. Policy RESTRITTIVA in SELECT: si somma (in AND) alle
-- policy esistenti senza toccarle. L'admin è riconosciuto dall'email;
-- il demolitore legge tramite il server (service role, bypassa la RLS).
-- ============================================================

DROP POLICY IF EXISTS messaggi_chat_canale_riservato ON messaggi_chat;
CREATE POLICY messaggi_chat_canale_riservato ON messaggi_chat
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    conversazione IS DISTINCT FROM 'demolitore_noidemoliamo'
    OR (auth.jwt() ->> 'email') = 'ddiviesto@gmail.com'
  );

-- Ricarica la cache dello schema di PostgREST
NOTIFY pgrst, 'reload schema';
