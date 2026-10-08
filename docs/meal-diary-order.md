# Ordine delle registrazioni in Pasti

La lista giornaliera usa `meal_entries.created_at`: è l'orario in cui una
registrazione viene salvata, non necessariamente quello in cui il cibo è stato
consumato. Non serve una nuova colonna o una migrazione.

Colazione, pranzo, cena e bevande mantengono il loro ordine abituale anche se
vengono registrati in ritardo. Ogni spuntino viene collocato dopo la
registrazione non-spuntino più recente al momento del suo inserimento. Perciò
uno spuntino salvato prima della cena compare prima della cena, mentre uno
salvato dopo compare dopo; gli spuntini possono anche separare due
registrazioni dello stesso pasto.

Le registrazioni contigue dello stesso tipo condividono un'intestazione. Se
gli spuntini dividono un pasto in due blocchi, ogni blocco mostra solo le
calorie delle proprie registrazioni. Modificare un piatto non ne cambia la
posizione; aggiunta ed eliminazione aggiornano la lista immediatamente.

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

Dal diario, **Occasionale → Da foto** apre l'analisi del piatto già pronto.
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
