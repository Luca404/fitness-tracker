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
