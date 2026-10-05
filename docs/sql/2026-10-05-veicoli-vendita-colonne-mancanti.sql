-- ============================================================
-- 05/10/2026 · LE COLONNE MANCANTI DI veicoli_vendita
-- Trovato dopo la pausa di Supabase: la tabella esisteva già PRIMA della
-- SQL del 19/08 (che diceva "create table if not exists" e quindi non ha
-- toccato niente). Qui ci sono SOLO le colonne che il codice usa davvero
-- (modulo in dieci passi, lista Valutazioni in admin, card del cliente,
-- nascita della pratica). Le colonne del vecchio modulo da compravendita
-- (cilindrata, cavalli, allestimento, dotazioni, revisione, bollo,
-- tagliando, manutenzione, ricevute, difetti, prezzo desiderato, quando
-- vendere) NON si creano: nessuno le scrive e nessuno le legge.
-- Da lanciare nell'SQL Editor.
-- ============================================================

alter table veicoli_vendita
  -- il veicolo (passi 1, 3 e 4)
  add column if not exists tipo_mezzo text,
  add column if not exists tipo_mezzo_altro text,
  add column if not exists tipo_cambio text,          -- manuale · automatico
  add column if not exists alimentazione text,        -- benzina · diesel · gpl · metano · ibrida · elettrica
  add column if not exists incidentato boolean,
  add column if not exists va_in_moto boolean,
  add column if not exists marciante boolean,
  add column if not exists parti_mancanti boolean,
  -- dove si trova (passo 5)
  add column if not exists indirizzo text,
  add column if not exists comune text,
  add column if not exists provincia text,
  add column if not exists cap text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  -- intestazione e cliente (passi 2 e 10)
  add column if not exists intestazione text,         -- me · deceduto · altra_persona · societa · associazione · targhe_straniere
  add column if not exists nome_richiedente text,
  add column if not exists telefono text,
  -- la proposta dell'admin e la risposta del cliente
  add column if not exists offerta_tipo text,         -- demolizione · acquisto
  add column if not exists offerta_importo int,       -- solo per acquisto
  add column if not exists offerta_messaggio text,
  add column if not exists offerta_inviata_il timestamptz,
  add column if not exists risposta_cliente text,     -- accettata · rifiutata
  add column if not exists risposta_il timestamptz,
  add column if not exists pratica_id uuid references pratiche(id) on delete set null,
  add column if not exists note_admin text,
  add column if not exists aggiornato_il timestamptz not null default now();

-- Controllo: le colonne della tabella, in ordine
select column_name, data_type
from information_schema.columns
where table_name = 'veicoli_vendita'
order by ordinal_position;
