# Documentazione fitTrackr

Il 28 ottobre 2026 la navigazione diventa **Fitness · Cucina · Pasti · Peso ·
Storico**. Le buone abitudini sono un dettaglio aperto dal recap di Pasti;
Fitness ha le schede Allenamenti e Progressi, con attività accessibili in
alto e grafici delle prestazioni delle ultime 30 sessioni completate.

Revisione del 16 ottobre 2026: Storico esclude il giorno corrente da grafici e medie e segnala i giorni mancanti, oltre ai miglioramenti all'editor delle schede palestra (catalogo personale, serie cancellabili e inclinazione panca), distanza delle attività, palestra nello storico e moduli ingredienti condivisi. La migrazione palestra è stata verificata in isolamento e applicata al database online il 15 ottobre; l’istanza locale resta separata. L'app usa un ID di build generato da Vite per gli aggiornamenti PWA; non ha una versione applicativa numerica da incrementare nelle guide.

| Documento | Contenuto |
| --- | --- |
| [README del progetto](../README.md) | Funzioni attuali, Node 22, variabili, controlli e deploy |
| [Note per lo sviluppo](../CLAUDE.md) | Architettura, tabelle, RPC e convenzioni correnti |
| [Database condiviso](../supabase/README.md) | Distinzione locale/remoto, storico, grant e test isolati |
| [Autenticazione](autenticazione.md) | Accesso, registrazione, email già usate, recupero password e configurazione Google/SMTP |
| [Aggiornamento della sicurezza](../supabase/README-trackr-security-sync.md) | Migrazioni già applicate, correzione meal-item e commit pubblicato |
| [Ordine del diario](meal-diary-order.md) | Registrazioni, ingredienti, icone e posizioni |
| [Pasti da foto](pasti-da-foto.md) | Uso, ingredienti espandibili, porzione mangiata, configurazione e pubblicazione verificata |
| [Buone abitudini](buone-abitudini.md) | Quadratini a riempimento, limiti e media sugli ultimi 7 giorni |
| [Peso dei piatti preparati](peso-piatti-preparati.md) | Cottura, stime, peso misurato e ricalcolo delle porzioni passate |
| [Allenamenti in palestra](allenamenti-palestra.md) | Schede, riordino, sessioni, calorie stimate ed esempi |
| [Attività e storico](attivita-e-storico.md) | Chilometri facoltativi, fasce di velocità e palestra nei grafici |
| [Inserimento ingredienti](inserimento-ingredienti.md) | Moduli comuni, revisione unica, dettagli espandibili e quantità |
| [Formaggi di base](ingredienti-formaggi.md) | Dodici nuovi formaggi, fonti CREA/produttori e conversione del sodio in sale |
| [Ampliamento ingredienti di base](ingredienti-base.md) | 84 ingredienti in 17 categorie, tagli con/senza pelle e fonti CREA/USAV |
| [Verifica nutrizionale dell'ampliamento](verifica-ingredienti-base.md) | Confronto di 86 profili con le fonti originali, correzioni, unità e tabella completa di calorie e macro |
| [Rapporto di revisione](rapporto-semplificazione-2026-09-29.md) | Cambiamenti implementati, verifiche datate e aggiornamenti successivi |

I documenti sotto `superpowers/plans/` e `superpowers/specs/` conservano i piani alle rispettive date. Il vecchio nome CalTrackr, gli scaffold iniziali, le funzioni di scorte/suggerimenti e gli esempi SQL storici possono differire dall'app attuale. La Cucina corrente usa un catalogo di ingredienti; le quantità di confezione sono metadati, mentre i piatti preparati mantengono porzioni atomiche. Per schema e setup usare le migrazioni versionate e le guide sopra.
