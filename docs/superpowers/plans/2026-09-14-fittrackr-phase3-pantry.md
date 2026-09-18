# fitTrackr Phase 3 — Barcode + Dispensa

> Stato: implementata e poi rifinita nella pagina **Cucina**. La dispensa è oggi il
> tab `/kitchen?tab=pantry`; `/pantry` resta solo un redirect compatibile. Le ricette
> suggerite in base alle scorte, inizialmente rimandate, sono ora disponibili nel tab
> Piatti insieme al ricettario curato.

**Goal:** tracciare gli alimenti acquistati (dispensa), popolabili via scansione barcode o inserimento manuale, e farli emergere per primi nella ricerca ingredienti quando si compone un pasto.

**Decisioni concordate con l'utente:**
- Quantità in dispensa: numero + unità (`g` | `ml` | `pz`), non solo grammi — più realistico per uova/confezioni.
- Nessun collegamento automatico "usa dalla dispensa → riduci scorte" per ora: gli articoli della dispensa compaiono come sorgente di ricerca prioritaria quando aggiungi un ingrediente a un pasto, ma la quantità in dispensa non si decrementa (arriverà più avanti, insieme alle ricette suggerite).

---

## Schema

- [x] Tabella `pantry_items` (append a `supabase/schema.sql`, applicata anche al DB locale): `id, user_id, name, quantity, unit ('g'|'ml'|'pz'), calories_100g, protein_100g, carbs_100g, fat_100g, category, source, off_food_id, off_data, structured OFF nutrition fields, created_at`. RLS come le altre tabelle utente.
- [x] `types/index.ts`: `PantryUnit`, `PantryItem`; `FoodSource` esteso con `'pantry'`; `FoodResult.source` esteso con `'pantry'`.

## Barcode scanning

- [x] Dipendenza `@zxing/browser` (v0.1.x, non 0.2.x — quella richiede `@zxing/library` con `engines.node >= 24`, incompatibile con l'ambiente di sviluppo attuale su Node 20).
- [x] `src/components/pantry/BarcodeScanner.tsx`: apre la fotocamera (`BrowserMultiFormatReader.decodeFromVideoDevice`), decodifica in continuo, richiama `onScan(code)` al primo risultato e ferma lo stream.
- [x] `nutrition.ts`: `lookupBarcode(barcode)` → lookup barcode su Open Food Facts, conserva il payload completo e normalizza nome, quantità, ingredienti, macro, fibre, zuccheri, grassi saturi/insaturi, sale, Nutri-Score, NOVA ed Eco-Score.
- [x] Categoria `plant_protein` / “Proteine vegetali” per tofu, tempeh, seitan, veggie balls e sostituti della carne.
- [x] Classificazione OFF migliorata con nomi generici/localizzati, `categories_tags`, `categories_hierarchy`, `main_category`, `food_groups_tags` e `pnns_groups`.

## Pagina Dispensa

- [x] `api.ts`: `getPantryItems()`, `addPantryItem()`, `updatePantryItemQuantity()`, `deletePantryItem()`.
- [x] `src/pages/PantryPage.tsx`, tab Dispensa dentro `/kitchen` (con redirect legacy da `/pantry`).
- [x] Flusso di aggiunta: scegli tra 📷 scansiona barcode / 🔍 cerca alimento base / ✏️ inserisci a mano → poi specifichi quantità + unità → salvi in `pantry_items`.
- [x] Elenco dispensa con modifica di nome, quantità, unità e categoria, oltre a eliminazione articolo.

## Integrazione con la ricerca ingredienti

- [x] `FoodSearch.tsx`: fetch della dispensa dell'utente all'apertura; sezione "La tua dispensa" mostrata **per prima**, sopra "Alimenti base" e prima della ricerca OFF, quando ci sono corrispondenze sul nome.

## Non in scope ora (rimandato)

- Decremento automatico delle quantità in dispensa quando un ingrediente viene usato in un pasto.
- ~~Ricette suggerite in base agli ingredienti disponibili.~~ Implementate nel tab Piatti con ricette curate e verifica disponibilità.
- Foto + AI stima calorie: **prossima attività**, tramite Supabase Edge Function e OpenAI API.
- "Buone abitudini" OMS.
