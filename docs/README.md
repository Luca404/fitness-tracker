# Documentazione fitTrackr

Revisione del 4 ottobre 2026, riferita al codice su `main` e alle migrazioni condivise già applicate. L'app usa un ID di build generato da Vite per gli aggiornamenti PWA; non ha una versione applicativa numerica da incrementare nelle guide.

| Documento | Contenuto |
| --- | --- |
| [README del progetto](../README.md) | Funzioni attuali, Node 22, variabili, controlli e deploy |
| [Note per lo sviluppo](../CLAUDE.md) | Architettura, tabelle, RPC e convenzioni correnti |
| [Database condiviso](../supabase/README.md) | Distinzione locale/remoto, storico, grant e test isolati |
| [Aggiornamento della sicurezza](../supabase/README-trackr-security-sync.md) | Migrazioni già applicate, correzione meal-item e commit pubblicato |
| [Ordine del diario](meal-diary-order.md) | Registrazioni, ingredienti, icone e posizioni |
| [Peso dei piatti preparati](peso-piatti-preparati.md) | Scelte di cottura, stime e peso misurato |
| [Allenamenti in palestra](allenamenti-palestra.md) | Schede, riordino, sessioni, calorie stimate ed esempi |
| [Rapporto di revisione](rapporto-semplificazione-2026-09-29.md) | Cambiamenti implementati, verifiche datate e aggiornamenti successivi |

I documenti sotto `superpowers/plans/` e `superpowers/specs/` conservano i piani alle rispettive date. Il vecchio nome CalTrackr, gli scaffold iniziali, le funzioni di scorte/suggerimenti e gli esempi SQL storici possono differire dall'app attuale. La Cucina corrente usa un catalogo di ingredienti; le quantità di confezione sono metadati, mentre i piatti preparati mantengono porzioni atomiche. Per schema e setup usare le migrazioni versionate e le guide sopra.
