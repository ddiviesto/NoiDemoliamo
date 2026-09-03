-- ============================================================
-- 03/09/2026 · LA VALUTAZIONE IN UNDICI PASSI
-- Il flusso /vendi-auto ora fa le stesse domande della demolizione, nello
-- stesso ordine (decisione di Davide: la valutazione è la porta d'ingresso
-- delle auto da demolire). Alla tabella veicoli_vendita servono le colonne
-- che prima stavano solo in pratiche, con gli STESSI NOMI: così quando il
-- cliente accetta la demolizione la richiesta si copia campo per campo.
--
-- Le colonne del vecchio flusso (cilindrata, cavalli, allestimento,
-- dotazioni, revisione_fino, bollo_pagato, tagliando, manutenzione_chi,
-- ricevute, difetti, note_difetti) restano ma non si compilano più.
--
-- Da lanciare nell'SQL Editor di Supabase.
-- ============================================================

alter table veicoli_vendita
  add column if not exists targhe_presenti boolean,
  add column if not exists codice_fiscale text,
  add column if not exists eredi_rinuncia boolean,
  add column if not exists societa_fallita boolean,
  add column if not exists casistica text,            -- derivata già qui, come in pratiche
  add column if not exists fermo_amministrativo text, -- si · no · non_so
  add column if not exists note_veicolo text;         -- le note del passo "Condizioni"

-- Controllo: devono comparire le sette colonne nuove
select column_name, data_type
from information_schema.columns
where table_name = 'veicoli_vendita'
  and column_name in ('targhe_presenti', 'codice_fiscale', 'eredi_rinuncia', 'societa_fallita', 'casistica', 'fermo_amministrativo', 'note_veicolo')
order by column_name;
