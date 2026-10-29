# Ampliamento degli ingredienti di base

Il 29 ottobre 2026 il catalogo locale aggiunge **84 ingredienti in 17 categorie**.
Sono disponibili nella ricerca di Cucina, pasti e ricette. L'ampliamento
include cosce e sovracosce di pollo con pelle, sovracosce senza pelle e ali,
oltre a cereali, farine, legumi, verdure, frutta, carni, pesci, uova, latticini,
oli, frutta secca, basi da cucina, condimenti, spezie e bevande vegetali.

## Quantità e varianti

I valori sono per **100 g di parte edibile**: escludere ossa, gusci, noccioli
e altri scarti. Pelle inclusa solo quando indicato nel nome. Per gli
ingredienti da cuocere il riferimento è crudo o secco; il nome segnala
invece ingredienti freschi, in scatola, ammollati o sgocciolati. Per le
bevande vegetali il riferimento è **100 ml**.

Coscia (fuso) e sovracoscia hanno voci separate. L'ID storico `coscia-pollo`
e i suoi valori restano disponibili; l'alias generico «sovracoscia di pollo»
è rimosso da quella voce perché ora esistono due riferimenti specifici.
Le ricerche riconoscono anche cosce, fusi, sovracosce e alette.

La voce storica `seitan`, da 370 kcal e 75 g di proteine, è ora denominata
«Seitan, glutine di frumento secco», nella categoria Proteine vegetali.
Il nuovo «Seitan fresco» ha un proprio ID e profilo per il prodotto idratato.
Gli ID e i valori nutrizionali delle voci esistenti sono conservati;
l'ampliamento non riscrive ingredienti già salvati, ricette o pasti.

I prodotti in salamoia, sott'olio e trasformati sono riferimenti generici:
il sale può variare molto tra marche. Per il prodotto acquistato usare
l'etichetta o il codice a barre. Gli alias aiutano la ricerca, senza
promettere la composizione esatta di ogni prodotto o lavorazione.

## Fonti e conversioni

Fonti consultate il **29 ottobre 2026**:

- [CREA, Centro di ricerca Alimenti e Nutrizione](https://www.alimentinutrizione.it/),
  con collegamento alla scheda specifica nella tabella seguente.
- [Banca dati svizzera dei valori nutritivi, USAV, v7.1 (01.07.2026)](https://www.naehrwertdaten.ch/it/downloads/),
  con ID della riga nel [file ufficiale in italiano](https://naehrwertdaten.ch/wp-content/uploads/2026/07/Banca_dati_svizzera_dei_valori_nutritivi.xlsx).

Tutti e sette i valori (energia, proteine, carboidrati disponibili, grassi,
fibre, zuccheri e sale) di ciascuna nuova voce derivano dalla stessa scheda.
Le schede incomplete sono escluse o sostituite da un riferimento completo;
non si trasformano valori mancanti in zero. Nelle nuove voci non sono usati
valori sotto una soglia di rilevazione. Le tracce indicate dalla fonte
sono arrotondate a zero alla precisione del catalogo.

Per CREA: **sale (g) = sodio (mg) × 2,5 / 1000**, arrotondato a due decimali;
gli zuccheri sono quelli solubili. Per USAV si usa direttamente il sale.
Le bevande USAV sono espresse originariamente per 100 g: ogni nutriente
è moltiplicato per la densità della stessa riga (soia **1,03 g/ml**;
avena, mandorla e riso **1,05 g/ml**) e arrotondato a due decimali,
per ottenere valori coerenti con l'inserimento in millilitri.

## Riferimenti per ingrediente

| Categoria | Ingrediente | Fonte |
| --- | --- | --- |
| Cereali e farine | Riso Venere | [CREA 000140](https://www.alimentinutrizione.it/tabelle-nutrizionali/000140) |
| Cereali e farine | Riso parboiled | [CREA 000120](https://www.alimentinutrizione.it/tabelle-nutrizionali/000120) |
| Cereali e farine | Miglio decorticato | [CREA 000081](https://www.alimentinutrizione.it/tabelle-nutrizionali/000081) |
| Cereali e farine | Farina 0 | [CREA 000230](https://www.alimentinutrizione.it/tabelle-nutrizionali/000230) |
| Cereali e farine | Farina integrale di frumento | [CREA 000240](https://www.alimentinutrizione.it/tabelle-nutrizionali/000240) |
| Cereali e farine | Farina d'avena | [CREA 000200](https://www.alimentinutrizione.it/tabelle-nutrizionali/000200) |
| Cereali e farine | Farina di mais | [CREA 000260](https://www.alimentinutrizione.it/tabelle-nutrizionali/000260) |
| Cereali e farine | Farina di riso | [CREA 000270](https://www.alimentinutrizione.it/tabelle-nutrizionali/000270) |
| Cereali e farine | Semola di grano duro | [CREA 000310](https://www.alimentinutrizione.it/tabelle-nutrizionali/000310) |
| Cereali e farine | Amido di mais | [CREA 000300](https://www.alimentinutrizione.it/tabelle-nutrizionali/000300) |
| Cereali e farine | Gnocchi di patate, freschi | [CREA 006590](https://www.alimentinutrizione.it/tabelle-nutrizionali/006590) |
| Cereali e farine | Corn flakes | [CREA 003020](https://www.alimentinutrizione.it/tabelle-nutrizionali/003020) |
| Cereali e farine | Muesli | [CREA 003040](https://www.alimentinutrizione.it/tabelle-nutrizionali/003040) |
| Cereali e farine | Grano saraceno | USAV v7.1, ID 421 (Grano saraceno, decorticato) |
| Cereali e farine | Fecola di patate | USAV v7.1, ID 497 |
| Pane e prodotti da forno | Pane di segale | [CREA 000510](https://www.alimentinutrizione.it/tabelle-nutrizionali/000510) |
| Pane e prodotti da forno | Pangrattato | [CREA 000570](https://www.alimentinutrizione.it/tabelle-nutrizionali/000570) |
| Pane e prodotti da forno | Cracker integrali | [CREA 001030](https://www.alimentinutrizione.it/tabelle-nutrizionali/001030) |
| Pane e prodotti da forno | Pane croccante integrale | USAV v7.1, ID 918 (Pane croccante (Knäckebrot), integrale) |
| Pane e prodotti da forno | Gallette di riso integrale | USAV v7.1, ID 802 (Galletta di riso integrale) |
| Pane e prodotti da forno | Gallette di mais | USAV v7.1, ID 14298 (Gallette di mais, naturali) |
| Legumi | Piselli in scatola, scolati | [CREA 004720](https://www.alimentinutrizione.it/tabelle-nutrizionali/004720) |
| Legumi | Piselli surgelati | [CREA 004730](https://www.alimentinutrizione.it/tabelle-nutrizionali/004730) |
| Legumi | Fagioli borlotti freschi | [CREA 004110](https://www.alimentinutrizione.it/tabelle-nutrizionali/004110) |
| Legumi | Fagioli dall'occhio secchi | [CREA 004220](https://www.alimentinutrizione.it/tabelle-nutrizionali/004220) |
| Verdure | Funghi pleurotus | [CREA 006010](https://www.alimentinutrizione.it/tabelle-nutrizionali/006010) |
| Verdure | Mais dolce in scatola, scolato | [CREA 000070](https://www.alimentinutrizione.it/tabelle-nutrizionali/000070) |
| Verdure | Sedano rapa | USAV v7.1, ID 357 (Sedano rapa, crudo) |
| Verdure | Pomodori secchi | USAV v7.1, ID 13463 (Pomodoro, secco) |
| Frutta | Amarene fresche | [CREA 007700](https://www.alimentinutrizione.it/tabelle-nutrizionali/007700) |
| Frutta | Albicocche secche | [CREA 007030](https://www.alimentinutrizione.it/tabelle-nutrizionali/007030) |
| Carne | Coscia di pollo con pelle | [CREA 106400](https://www.alimentinutrizione.it/tabelle-nutrizionali/106400) |
| Carne | Sovracoscia di pollo con pelle | [CREA 106600](https://www.alimentinutrizione.it/tabelle-nutrizionali/106600) |
| Carne | Sovracoscia di pollo senza pelle | [CREA 106610](https://www.alimentinutrizione.it/tabelle-nutrizionali/106610) |
| Carne | Ali di pollo con pelle | [CREA 106270](https://www.alimentinutrizione.it/tabelle-nutrizionali/106270) |
| Carne | Pollo intero senza pelle | [CREA 106210](https://www.alimentinutrizione.it/tabelle-nutrizionali/106210) |
| Carne | Filetto di manzo | [CREA 101170](https://www.alimentinutrizione.it/tabelle-nutrizionali/101170) |
| Carne | Spalla di maiale | [CREA 105220](https://www.alimentinutrizione.it/tabelle-nutrizionali/105220) |
| Carne | Salsiccia di suino fresca | [CREA 110710](https://www.alimentinutrizione.it/tabelle-nutrizionali/110710) |
| Carne | Pancetta tesa | [CREA 110310](https://www.alimentinutrizione.it/tabelle-nutrizionali/110310) |
| Carne | Fegato di bovino | [CREA 115320](https://www.alimentinutrizione.it/tabelle-nutrizionali/115320) |
| Carne | Mortadella | USAV v7.1, ID 819 |
| Carne | Salame | USAV v7.1, ID 1091 |
| Pesce | Tonno sott'olio, sgocciolato | [CREA 123610](https://www.alimentinutrizione.it/tabelle-nutrizionali/123610) |
| Pesce | Aringa fresca | [CREA 120300](https://www.alimentinutrizione.it/tabelle-nutrizionali/120300) |
| Pesce | Rombo | [CREA 122300](https://www.alimentinutrizione.it/tabelle-nutrizionali/122300) |
| Pesce | Dentice | [CREA 120910](https://www.alimentinutrizione.it/tabelle-nutrizionali/120910) |
| Pesce | Cefalo | [CREA 120510](https://www.alimentinutrizione.it/tabelle-nutrizionali/120510) |
| Pesce | Acciughe sott'olio | [CREA 120020](https://www.alimentinutrizione.it/tabelle-nutrizionali/120020) |
| Uova | Tuorlo d'uovo | [CREA 183010](https://www.alimentinutrizione.it/tabelle-nutrizionali/183010) |
| Latticini | Latte scremato | [CREA 135030](https://www.alimentinutrizione.it/tabelle-nutrizionali/135030) |
| Latticini | Yogurt bianco magro | [CREA 152000](https://www.alimentinutrizione.it/tabelle-nutrizionali/152000) |
| Latticini | Ricotta di pecora | [CREA 166810](https://www.alimentinutrizione.it/tabelle-nutrizionali/166810) |
| Latticini | Mascarpone | [CREA 164800](https://www.alimentinutrizione.it/tabelle-nutrizionali/164800) |
| Latticini | Cheddar | [CREA 160880](https://www.alimentinutrizione.it/tabelle-nutrizionali/160880) |
| Latticini | Emmental | [CREA 161610](https://www.alimentinutrizione.it/tabelle-nutrizionali/161610) |
| Oli e grassi | Olio di girasole | [CREA 009650](https://www.alimentinutrizione.it/tabelle-nutrizionali/009650) |
| Oli e grassi | Olio di arachide | [CREA 009610](https://www.alimentinutrizione.it/tabelle-nutrizionali/009610) |
| Oli e grassi | Olio di cocco | [CREA 009620](https://www.alimentinutrizione.it/tabelle-nutrizionali/009620) |
| Oli e grassi | Strutto | USAV v7.1, ID 594 |
| Frutta secca | Arachidi tostate salate | USAV v7.1, ID 14092 (Arachide, tostata, salata) |
| Frutta secca | Castagne fresche | [CREA 008520](https://www.alimentinutrizione.it/tabelle-nutrizionali/008520) |
| Frutta secca | Arachidi tostate senza sale | USAV v7.1, ID 14238 (Arachide, tostata, senza sale) |
| Basi da cucina | Concentrato di pomodoro | [CREA 006660](https://www.alimentinutrizione.it/tabelle-nutrizionali/006660) |
| Basi da cucina | Latte di cocco da cucina | USAV v7.1, ID 13458 (Latte di cocco) |
| Condimenti | Pomodori secchi sott'olio, sgocciolati | USAV v7.1, ID 13490 (Pomodoro, secco, sott'olio, sgocciolato) |
| Condimenti | Olive verdi in salamoia, sgocciolate | USAV v7.1, ID 492 (Oliva, verde, in salamoia, sgocciolata) |
| Condimenti | Olive nere | USAV v7.1, ID 493 (Olive, nere) |
| Condimenti | Aceto | USAV v7.1, ID 1693 |
| Condimenti | Capperi sottaceto | USAV v7.1, ID 14282 (Capperi, sottaceto) |
| Condimenti | Cetriolini sottaceto | USAV v7.1, ID 491 (Cetriolini, sott'aceto) |
| Proteine vegetali | Seitan fresco | USAV v7.1, ID 14118 (Seitan) |
| Proteine vegetali | Tempeh al naturale | USAV v7.1, ID 14251 (Tempeh, al naturale) |
| Proteine vegetali | Tofu setoso | USAV v7.1, ID 13438 (Tofu, setoso (morbido), al naturale) |
| Spezie ed erbe | Salvia fresca | [CREA 006860](https://www.alimentinutrizione.it/tabelle-nutrizionali/006860) |
| Spezie ed erbe | Menta fresca | [CREA 006810](https://www.alimentinutrizione.it/tabelle-nutrizionali/006810) |
| Spezie ed erbe | Peperoncino fresco | [CREA 006830](https://www.alimentinutrizione.it/tabelle-nutrizionali/006830) |
| Spezie ed erbe | Zenzero fresco | USAV v7.1, ID 14239 (Zenzero, radice, crudo) |
| Spezie ed erbe | Paprika | USAV v7.1, ID 663 (Paprica) |
| Dolci | Cacao amaro in polvere | USAV v7.1, ID 581 (Cacao in polvere, senza zucchero) |
| Bevande | Bevanda di soia al naturale | USAV v7.1, ID 72 (Bevanda a base di soia, naturale) |
| Bevande | Bevanda di avena al naturale | USAV v7.1, ID 14114 (Bevanda a base di avena, naturale) |
| Bevande | Bevanda di mandorla al naturale | USAV v7.1, ID 14113 (Bevanda a base di mandorla, naturale) |
| Bevande | Bevanda di riso al naturale | USAV v7.1, ID 13450 (Bevanda a base di riso, naturale) |

## Integrazione e verifiche

I riferimenti sono in `src/data/basicFoods.ts` e
`src/data/basicFoodExtendedNutrition.ts`. Non serve una migrazione Supabase:
il catalogo è incluso nel frontend. Le ricerche conservano i `food_key`
`basic:<id>` e proporzionano tutti i nutrienti alla quantità scelta.

La stima del peso cotto riconosce anche miglio, grano saraceno e gnocchi.
Riso Venere (2,10), riso parboiled (2,36), gnocchi freschi (1,06) e
pleurotus in padella (0,85) usano i fattori ricavati dai pesi della
[Tabella C CREA](https://www.alimentinutrizione.it/presentazione-dati).
Per i cereali senza un fattore specifico rimane la stima generica esistente.
Tonno e pomodori sgocciolati, acciughe sott'olio, salumi e seitan fresco
mantengono il peso inserito per impostazione iniziale; si può comunque
scegliere la cottura. Il peso misurato del piatto resta preferibile alla stima.

I controlli del catalogo verificano unicità degli ID, corrispondenza dei
profili estesi, valori finiti e non negativi, zuccheri entro i carboidrati,
ricerca delle varianti, unità e proporzioni. Le regressioni sul peso cotto
coprono i nuovi cereali e i prodotti già pronti.

Verifica del 29 ottobre 2026 con Node 22: **384 test in 63 file**, build
di produzione e lint superati. Il confronto con i riferimenti scaricati
ha verificato tutti e sette i nutrienti delle 84 aggiunte e la conservazione
di tutti gli ID precedenti. La pubblicazione del frontend segue il normale
deploy automatico dopo il push su `main`.
