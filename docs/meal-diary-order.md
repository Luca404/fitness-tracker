# Ordine delle registrazioni in Pasti

La lista giornaliera usa `meal_entries.created_at`: è l'orario in cui una
registrazione viene salvata, non necessariamente quello in cui il cibo è stato
consumato. Non serve una nuova colonna o una migrazione.

La lista mostra prima i momenti più recenti della giornata: bevande, cena,
pranzo e colazione, con gli spuntini nella posizione relativa al pasto.
All'interno di ogni sezione, i piatti sono ordinati dal più recente al più
vecchio. I pasti principali mantengono questo ordine anche se registrati in
ritardo.

Ogni pasto principale ha una sola intestazione e il totale di tutti i suoi
piatti. Gli spuntini si agganciano alla **prima registrazione** del pasto
principale iniziato più di recente al momento dello spuntino. Uno spuntino
post-cena compare sopra la cena; aggiungere un altro piatto alla cena lo
inserisce in testa alla stessa cena, senza spezzarla e senza spostare lo
spuntino. Gli spuntini prima e dopo cena possono avere sezioni distinte.
Modificare un piatto non ne cambia il timestamp; aggiunta ed eliminazione
aggiornano la lista immediatamente. Non cambia l'ordine degli ingredienti.

La scheda **Pasti** è al centro della barra inferiore. **Aggiungi pasto** resta
fisso sopra la barra, con spazio sotto il diario per non coprire gli ultimi
piatti; tiene conto dell'area sicura del telefono. Dopo la scelta del pasto,
**Da foto** apre direttamente l'analisi; **Da ingredienti** riunisce alimento
singolo, composizione e nuova ricetta in righe con la stessa grafica e una
spiegazione del risultato. I piatti salvati e pronti restano selezionabili
nella schermata iniziale. Si chiude con **✕**: il pulsante «Fatto» è rimosso.

La logica è in `src/utils/mealTimeline.ts` ed è coperta da
`src/utils/mealTimeline.test.ts`.

## Ordine degli ingredienti e icona automatica

L’ordine delle registrazioni descritto sopra è distinto da quello degli
ingredienti all’interno di un piatto. Gli ingredienti del diario usano
`meal_items.position`, introdotta dalla migration
`20261004153000_preserve_diary_ingredient_order.sql`. Gli RPC di inserimento e
modifica conservano l’ordine dell’array ricevuto; le letture usano la posizione
registrata, anche quando gli ingredienti hanno lo stesso timestamp.

Questo mantiene coerente l’icona automatica basata sul primo ingrediente tra
Cucina e Pasti. Un’icona personalizzata ha la precedenza su quella automatica.
La migration riallinea gli ingredienti storici collegati a una ricetta al suo
ordine; per i record senza riferimenti l’ordine originario non è recuperabile
con certezza.

I controlli sono in `src/services/api.test.ts` e `supabase/tests/ordering.sql`.

## Pasti occasionali da foto

Dal diario, **Aggiungi pasto → scegli il pasto → Da foto** apre l'analisi del piatto già pronto.
La registrazione usa le stesse RPC e lo stesso ordine degli ingredienti degli
altri pasti; non crea una ricetta o una preparazione. Il riepilogo mostra
calorie e macro, con **Ingredienti e quantità** inizialmente chiuso sia nella
revisione sia nella consultazione del pasto salvato.

Le voci stimate conservano `source: ai_meal_photo`. Il diario mostra
**Stimato da foto** quando ne è presente almeno una; la provenienza `ai_photo`
delle etichette nutrizionali non attiva questo indicatore. Modificare il pasto
mantiene la sua posizione e permette di correggere le quantità già mangiate
senza riapplicare una percentuale. Dettagli e pubblicazione:
[pasti occasionali da foto](pasti-da-foto.md).
