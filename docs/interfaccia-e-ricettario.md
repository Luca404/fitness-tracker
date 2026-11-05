# Interfaccia e ricettario

Aggiornamento del 5 novembre 2026.

## Tipografia

I titoli restano in Georgia. Testi, numeri, etichette e controlli usano
**Source Serif 4**, con peso variabile e dimensionamento ottico automatico.
I file WOFF2 normale/corsivo sono inclusi in `src/assets/fonts`, con la
[licenza OFL](../public/fonts/source-serif-4-OFL.txt), senza richieste a servizi font esterni.
La variante normale è precaricata; entrambe sono nella cache PWA per l’uso
offline. Fonte: [repository ufficiale Adobe](https://github.com/adobe-fonts/source-serif).

## Categorie dei piatti

I momenti del giorno (colazione/pranzo/cena/spuntino) restano indipendenti dal
**Tipo di piatto**. Una ricetta può avere più tipi: Pasta, Riso, Verdure,
Carne, Pesce, Secondo piatto vegano, Toast, Yogurt, Zuppe, Dolci e Bevande.
Le etichette sono facoltative e si scelgono nell’editor della ricetta,
sia da Cucina sia durante l’inserimento di un pasto.

Le ricette senza categorie restano visibili e si possono classificare
modificandole. Le vecchie etichette Pizza, Legumi, Uova e Latticini vengono
rimosse senza eliminare ricette o cambiare ingredienti. Non si deduce
automaticamente che una ricetta sia vegana o a base di yogurt. Il filtro
**Senza categoria** aiuta a trovare quelle rimaste senza etichette.
Le preparazioni collegate usano le categorie correnti della ricetta sorgente.

La barra **Cerca un piatto** e il filtro **Tipo di piatto** funzionano sia nel
ricettario sia nel selettore dei pasti, inclusi i piatti pronti. La ricerca
ignora maiuscole e accenti, combina tutte le parole e cerca nel nome e nei
tipi assegnati. I filtri si combinano con il momento della giornata e si
conservano quando si apre un piatto e si torna alla lista. Il filtro è una
fila di pillole scorrevoli, coerente con gli ingredienti in Cucina, sotto
la ricerca. Tutte le categorie restano disponibili; cambia solo la priorità:

| Pasto | Prime categorie |
| --- | --- |
| Colazione | Bevande, Toast |
| Pranzo e cena | Riso, Pasta, Carne, Pesce |
| Spuntino | Bevande, Yogurt |

## Ordine durante l’inserimento

Le ricette salvate sono ordinate prima per numero di registrazioni negli
ultimi **30 giorni di diario**, incluso oggi nel fuso Europe/Rome. A parità
di frequenza, decide l’ultimo giorno di utilizzo; poi il nome in ordine
alfabetico. Restano disponibili anche le ricette mai usate. I piatti già
pronti rimangono nella sezione iniziale della lista.

Il conteggio usa le registrazioni effettive, comprese le porzioni di una
preparazione collegata alla ricetta. Esclude date future e altre utenze.
Eliminare o correggere il diario ricalcola gli utilizzi: non si memorizzano
contatori nel browser. Dopo una registrazione la lista viene riletta.

## Persistenza e verifiche

La migrazione `20261105210000_dish_secondary_categories_and_usage` aggiunge
`dishes.categories`, due overload con cinque parametri per il salvataggio
atomico e la RPC autenticata `get_recent_dish_usage()`. Le firme precedenti
restano operative e un vecchio aggiornamento non cancella le nuove categorie.
Le funzioni mantengono i permessi del chiamante e le RLS esistenti; i grant
di esecuzione autenticata sono espliciti.

La successiva `20261105220000_refine_dish_categories` riduce i tipi a 11 e
normalizza i valori precedenti. I vecchi client possono ancora inviare
etichette ritirate: vengono scartate dal salvataggio, mentre valori
sconosciuti restano errori. I client con quattro parametri conservano le
categorie già assegnate. Il test autonomo `refine_dish_categories.sql`
verifica pulizia, preservazione delle ricette, nuovi tipi, compatibilità,
vincoli e isolamento nello stesso tipo di database temporaneo.

Il test SQL autonomo `supabase/tests/dish_secondary_categories_and_usage.sql`
richiede un database vuoto `fittrackr_dish_test_*` e usa dati sintetici in
rollback. Verifica categorie multiple, compatibilità, errori atomici,
limite di 30 giorni, porzioni preparate, cancellazioni e isolamento utenti.
I test frontend coprono filtri combinati, ricerca, ordine, salvataggio e
recupero da errore; le prove browser usano risposte simulate, senza toccare
ricette o diari reali.
