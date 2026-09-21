# fitTrackr Phase 3 — Barcode + Dispensa

> Stato: implementata e poi rifinita nella pagina **Cucina**. La dispensa è oggi il
> tab `/kitchen?tab=pantry`; `/pantry` resta solo un redirect compatibile. Le ricette
> suggerite in base alle scorte, inizialmente rimandate, sono ora disponibili nel tab
> Piatti insieme al ricettario curato. Dal 20 settembre 2026, l'inserimento di un
> piatto nel diario aggiorna anche le scorte in modo transazionale.

**Goal:** tracciare gli alimenti acquistati (dispensa), popolabili via scansione barcode o inserimento manuale, e farli emergere per primi nella ricerca ingredienti quando si compone un pasto.

**Decisioni concordate con l'utente:**
- Quantità in dispensa: numero + unità (`g` | `ml` | `pz`), non solo grammi — più realistico per uova/confezioni.
- Il collegamento automatico "usa dalla dispensa → riduci scorte", inizialmente
  rimandato, è ora attivo. La quantità consumata è tracciata sul singolo
  `meal_item`, così modifica ed eliminazione di un piatto possono riconciliare le
  scorte senza doppi decrementi.

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

## Sincronizzazione pasti → dispensa

- [x] Migration `20260920000000_sync_meals_with_pantry.sql`, applicata anche al
  database remoto: `meal_items` conserva `pantry_item_id` e
  `pantry_quantity_used`; `dish_items` conserva il riferimento alla voce scelta.
- [x] `add_meal_entry` scala la quantità disponibile nella stessa transazione che
  registra il piatto. Il match preferisce la voce selezionata, poi `food_key`,
  `off_food_id` e infine il nome normalizzato.
- [x] Le unità devono essere compatibili (`g` con `g`, `ml` con `ml`); le scorte
  espresse in pezzi non vengono convertite automaticamente in grammi o millilitri.
- [x] La quantità si ferma a zero e gli articoli esauriti non compaiono nella
  ricerca ingredienti.
- [x] `update_meal_entry` ripristina il consumo precedente e applica quello nuovo;
  `delete_meal_entry` restituisce alla dispensa solo la quantità effettivamente
  scalata dalla registrazione eliminata.
- [x] Verifica transazionale: con 500 g iniziali, inserimento di 120 g → 380 g,
  modifica a 80 g → 420 g, eliminazione → 500 g.

## Import da foto dell'etichetta

- [x] Acquisizione o scelta di una foto dalla dispensa, con anteprima e
  compressione JPEG lato client (lato lungo massimo 1600 px, payload massimo 4 MB).
- [x] Edge Function autenticata `analyze-nutrition-label`: valida sessione,
  MIME, Base64 e dimensione prima di chiamare OpenAI.
- [x] OpenAI Responses API con input immagine, `store: false` e schema JSON
  rigoroso per prodotto, confezione, ingredienti, allergeni, categoria e nutrienti
  trascritti per colonna e normalizzati server-side per 100 g/ml. Modello
  predefinito `gpt-4.1-mini`, configurabile con
  `OPENAI_VISION_MODEL`.
- [x] Revisione editabile dei campi estratti e degli avvisi di confidenza prima
  del salvataggio con sorgente `ai_photo`; la foto non viene persistita.

## Catalogo barcode condiviso

- [x] Tabella RLS `barcode_products`, univoca per `barcode`, con dati descrittivi
  e nutrizionali condivisi. Gli utenti autenticati possono leggerla, mentre le
  scritture sono riservate alle Edge Functions con credenziali server.
- [x] La scansione chiama `resolve-barcode-product`, che interroga prima il
  catalogo condiviso e poi Open Food Facts, salvando server-side i risultati.
  Se entrambi non hanno il prodotto, propone direttamente la foto dell'etichetta
  mantenendo il barcode appena letto.
- [x] Le foto selezionate vengono analizzate localmente anche da ZXing: quando il
  barcode è leggibile e già in cache, OpenAI non viene chiamata.
- [x] L'analisi non scrive direttamente nel catalogo: emette un token breve e i
  valori AI entrano nel catalogo solo dopo revisione e conferma dell'utente via
  `confirm-barcode-product`. Controlli server confrontano kJ/kcal, colonne per
  100/porzione e plausibilità dei macro. I dati Open Food Facts hanno priorità.

## Non in scope ora (rimandato)

- ~~Ricette suggerite in base agli ingredienti disponibili.~~ Implementate nel tab Piatti con ricette curate e verifica disponibilità.
- La stima di un piatto già impiattato resta una funzionalità separata e
  successiva, perché introduce incertezza su ingredienti e porzioni.
- "Buone abitudini" OMS.
