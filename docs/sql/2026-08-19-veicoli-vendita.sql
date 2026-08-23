-- ============================================================
-- 19/08/2026 — RICHIESTE DI VALUTAZIONE (flusso D: "Voglio sapere quanto vale")
--
-- La seconda porta della home. NON sono pratiche: una richiesta di
-- valutazione vive per conto suo finché non diventa una demolizione
-- (allora nasce la riga in `pratiche` e qui si scrive il collegamento).
--
-- Il giro: il cliente compila /vendi-auto → admin la vede in "Valutazioni"
-- → l'admin fa un'offerta oppure PROPONE LA DEMOLIZIONE GRATUITA →
-- il cliente accetta o rifiuta dalla sua area → se accetta, la richiesta
-- si trasforma in pratica di demolizione.
--
-- ⚠️ Le domande burocratiche (codice fiscale, libretto, certificato di
-- proprietà, chi consegna, fermo) NON stanno qui: si chiedono al cliente
-- solo DOPO che ha accettato la demolizione. Qui c'è solo `intestazione`,
-- perché serve già a valutare (e decide la casistica dopo).
-- ============================================================

CREATE TABLE IF NOT EXISTS veicoli_vendita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,

  -- stato della richiesta (le caselle della lista in admin)
  --   da_valutare · offerta_inviata · in_vendita · passata_demolizione · chiusa
  stato text NOT NULL DEFAULT 'da_valutare',

  -- il veicolo
  tipo_mezzo text,
  tipo_mezzo_altro text,
  marca text,
  modello text,
  anno int,
  km int,
  tipo_cambio text,
  alimentazione text,           -- benzina · diesel · gpl · metano · ibrida · elettrica
  cilindrata int,
  cavalli int,
  allestimento text,
  dotazioni text[],             -- aria condizionata, cerchi in lega, gancio traino…

  -- come è messo
  incidentato boolean,
  va_in_moto boolean,
  marciante boolean,
  parti_mancanti boolean,
  revisione_fino date,          -- si salva col giorno 1 del mese scelto
  bollo_pagato boolean,
  tagliando text,               -- meno_anno · piu_anno · non_so
  manutenzione_chi text,        -- casa · fiducia · da_solo
  ricevute boolean,
  difetti text[],               -- carrozzeria, motore, gomme…
  note_difetti text,

  -- dove si trova
  indirizzo text,
  comune text,
  provincia text,
  cap text,
  lat double precision,
  lng double precision,

  targa text,
  intestazione text,            -- a_me · societa · deceduto · altra_persona

  -- cosa vuole il cliente
  prezzo_desiderato int,        -- null se ha scelto "valutate voi"
  valutate_voi boolean NOT NULL DEFAULT true,
  quando_vendere text,          -- subito · entro_mese · nessuna_fretta

  nome_richiedente text,
  telefono text,

  -- la proposta dell'admin e la risposta del cliente
  offerta_tipo text,            -- demolizione · acquisto
  offerta_importo int,          -- solo per l'acquisto
  offerta_messaggio text,
  offerta_inviata_il timestamptz,
  risposta_cliente text,        -- accettata · rifiutata
  risposta_il timestamptz,

  pratica_id uuid REFERENCES pratiche(id) ON DELETE SET NULL,

  note_admin text,
  creato_il timestamptz NOT NULL DEFAULT now(),
  aggiornato_il timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_veicoli_vendita_stato ON veicoli_vendita (stato, creato_il DESC);
CREATE INDEX IF NOT EXISTS idx_veicoli_vendita_utente ON veicoli_vendita (user_id, creato_il DESC);

-- Le foto della richiesta (davanti, dietro, lati, interni, cruscotto).
-- Stessa logica di foto_pratiche, ma tabella sua: una richiesta di
-- valutazione non è una pratica.
CREATE TABLE IF NOT EXISTS foto_veicoli_vendita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veicolo_vendita_id uuid NOT NULL REFERENCES veicoli_vendita(id) ON DELETE CASCADE,
  url text NOT NULL,
  posizione text,               -- davanti · dietro · destro · sinistro · interni · cruscotto · altro
  creato_il timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_foto_veicoli_vendita ON foto_veicoli_vendita (veicolo_vendita_id);

-- ============================================================
-- RLS: il cliente vede e crea SOLO le sue richieste.
-- Le modifiche che contano (offerta, cambio di stato, trasformazione in
-- pratica) passano dagli endpoint server con service role, come per
-- l'area demolitore: dal browser non si tocca lo stato.
-- L'unica cosa che il cliente può cambiare è la RISPOSTA alla proposta.
-- ============================================================
ALTER TABLE veicoli_vendita ENABLE ROW LEVEL SECURITY;
ALTER TABLE foto_veicoli_vendita ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cliente vede le sue richieste" ON veicoli_vendita;
CREATE POLICY "cliente vede le sue richieste" ON veicoli_vendita
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "cliente crea la sua richiesta" ON veicoli_vendita;
CREATE POLICY "cliente crea la sua richiesta" ON veicoli_vendita
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cliente vede le sue foto" ON foto_veicoli_vendita;
CREATE POLICY "cliente vede le sue foto" ON foto_veicoli_vendita
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM veicoli_vendita v WHERE v.id = veicolo_vendita_id AND v.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "cliente carica le sue foto" ON foto_veicoli_vendita;
CREATE POLICY "cliente carica le sue foto" ON foto_veicoli_vendita
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM veicoli_vendita v WHERE v.id = veicolo_vendita_id AND v.user_id = auth.uid())
  );

-- Aggiornamento in tempo reale (come le altre tabelle condivise)
ALTER PUBLICATION supabase_realtime ADD TABLE veicoli_vendita;

-- Controllo finale: devono comparire le due tabelle con le loro colonne
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('veicoli_vendita', 'foto_veicoli_vendita')
ORDER BY table_name, ordinal_position;
