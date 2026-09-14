# fitTrackr Phase 2 — Piatti salvati + Dataset alimenti base

**Goal:** risolvere la ricerca alimenti "casuale" introducendo un dataset locale di alimenti base, e permettere di salvare piatti composti per riutilizzarli scalando solo il peso totale.

**Contesto:** `nutrition.ts` interroga solo Open Food Facts (`search.pl`, legacy, nessun ordinamento per rilevanza), che è un database di prodotti confezionati con barcode — scarsamente utile per alimenti generici (riso, petto di pollo, banana). Questo verrà mantenuto come fallback per prodotti confezionati, non più come unica fonte.

---

## Parte A — Dataset alimenti base ✅

- [x] `src/data/basicFoods.ts`: ~115 alimenti comuni (cucina italiana), ciascuno con:
  `{ id, name, calories, protein_g, carbs_g, fat_g }` (per 100g) + `category` (`vegetable | fruit | legume | grain | meat | fish | dairy | egg | fat | alcohol | sweet | beverage | other`) — la category serve da base per la Fase "buone abitudini" futura, non usata attivamente ora.
- [x] `nutrition.ts`: nuova funzione `searchBasicFoods(query): FoodResult[]` — match locale (substring case-insensitive), nessuna chiamata di rete.
- [x] Tipo unificato `FoodResult` in `types/index.ts` per non duplicare la UI tra risultati locali e OFF.
- [x] `FoodSearch.tsx`: la ricerca interroga prima `searchBasicFoods` (istantanea, mentre digiti), mostrata come sezione "Alimenti base"; la ricerca OFF resta un'azione esplicita separata ("Cerca prodotti confezionati") sotto, non più il default.
- [x] `nutrition.ts`: `searchFood` migrato a OFF API v2 (`/api/v2/search`) con `sort_by=popularity_key` e filtro `countries_tags_en=italy`.

## Parte B — Piatti salvati ✅

- [x] Migrazione SQL (append a `supabase/schema.sql`, applicata anche al DB locale): tabelle `dishes` e `dish_items` — stesso pattern RLS di `meals`/`meal_items`.
- [x] `types/index.ts`: `Dish`, `DishItem`.
- [x] `api.ts`: `getDishes()` (già hydrated con items), `createDish(userId, name, items)`, `updateDish(id, name, items)`, `deleteDish(id)`.
- [x] UI — nuova sezione "I miei piatti" raggiungibile dal flusso di aggiunta pasto in `MealsPage` (tab accanto a "Cerca"):
  - Lista piatti salvati con nome + kcal totali + peso di riferimento (`SavedDishes.tsx`).
  - Selezione piatto → campo "peso totale" (default = peso salvato) → scala proporzionalmente tutti gli ingredienti → aggiunge ciascun ingrediente come `meal_item` del pasto corrente.
  - Icona ingranaggio per piatto → apre `DishEditor.tsx` (rinomina, aggiungi/rimuovi/modifica quantità ingredienti tramite `FoodSearch` riutilizzato) → salva su `dishes`/`dish_items`.
  - Da un pasto già composto: azione "💾 Salva come piatto" per ogni sezione pasto → snapshot degli ingredienti correnti in un nuovo `dish`.

## Iterazione UX — hub unico per pasto ✅

Feedback dopo la prima versione: la UX andava resa "più incentrata sui piatti", con un'unica schermata per pasto invece delle tab "Cerca"/"I miei piatti".

- [x] `SavedDishes.tsx` rimosso, sostituito da `MealHub.tsx`: un'unica schermata per pasto con due azioni in evidenza ("🍳 Nuovo piatto" — lo cucini e lo salvi; "🍽️ Piatto occasionale" — solo per oggi, es. ristorante) sopra la lista dei piatti salvati selezionabili.
- [x] `DishEditor.tsx`: aggiunto `requireName?: boolean` — il "piatto occasionale" non richiede un nome (nessuna persistenza su `dishes`), riusando lo stesso editor ingredienti di "nuovo piatto"/modifica.
- [x] Una bevuta singola (es. birra, vino) si registra come "piatto occasionale" con un solo ingrediente — nessuna scorciatoia dedicata necessaria, il dataset base già copre gli alcolici.
- [x] "Nuovo piatto" ora salva su `dishes` **e** logga subito gli ingredienti nel pasto corrente in un solo passaggio (prima richiedeva "cerca" + poi "salva come piatto" separatamente).

## Iterazione UX 2 — meno navigazione innestata + nuovo pasto "alcolico" ✅

Feedback: la creazione/modifica di un piatto passava per una vista separata solo per cercare l'ingrediente (`addingIngredient` in `DishEditor`), sentita come troppo "innestata"; inoltre mancava un modo ovvio per loggare alcolici bevuti fuori pasto (serata).

- [x] `DishEditor.tsx`: rimossa la vista `FoodSearch` a schermo intero che sostituiva il resto della pagina; `FoodSearch` ora è sempre visibile inline sotto il nome del piatto, sulla stessa pagina di nome + lista ingredienti + totali + salva. Si resetta con un `key` incrementale dopo ogni aggiunta invece di essere smontata/rimontata da un toggle di vista.
- [x] Nuovo `MealType`: `'drinks'` → "🍸 Spuntino alcolico" nella selezione iniziale pasto (`MEAL_TYPES` in `MealsPage.tsx`), per registrare alcolici senza doverli infilare in uno spuntino normale. Aggiornato il check constraint su `meals.meal_type` (schema.sql + DB locale).

## Non in scope ora (rimandato)

- Foto + AI stima calorie
- Barcode scanner + dispensa (Fase 3)
- Buone abitudini OMS (dipende dalla `category` introdotta in Parte A, ma l'implementazione arriva dopo)
