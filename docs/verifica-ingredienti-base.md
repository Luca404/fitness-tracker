# Verifica nutrizionale dell'ampliamento — 29 ottobre 2026

Revisione di **86 voci**: le **84 aggiunte** del commit `6f91a65`, la coscia
senza pelle e il glutine secco, le due voci preesistenti modificate durante
questo lavoro. Il controllo copre energia, proteine, carboidrati, grassi,
fibre, zuccheri e sale, oltre a nome, taglio, stato e unità di riferimento.
Le altre voci del catalogo preesistente non rientrano in questa verifica.

## Metodo e fonti

Il confronto è stato rifatto partendo dalle **schede originali**, non dai
valori del codice: tabelle HTML CREA, file Excel ufficiale USAV v7.1 e
[record USDA SR Legacy 168147](https://fdc.nal.usda.gov/food-details/168147/nutrients).
I 56 profili CREA sono per 100 g edibili; i 29 profili USAV sono riletti dal
[file originale v7.1](https://naehrwertdaten.ch/wp-content/uploads/2026/07/Banca_dati_svizzera_dei_valori_nutritivi.xlsx),
con intestazioni, ID e unità verificati. Il profilo USDA è stato acquisito
dall'[API ufficiale](https://api.nal.usda.gov/fdc/v1/food/168147?api_key=DEMO_KEY).

- Stesso alimento e stato della scheda: crudo/secco, fresco, in scatola
  scolato, sott'olio sgocciolato, con o senza pelle.
- Tutti i nutrienti di una voce provengono dalla stessa scheda, con le sole
  conversioni esplicite qui sotto. I campi mancanti non diventano zero;
  le tracce indicate dalla fonte sono arrotondate a zero.
  La fixture conserva anche gli indici dei nutrienti indicati come tracce:
  lo zero in quei campi è un'approssimazione, non un'assenza analitica.
- Sale CREA/USDA: sodio (mg) × 2,5 / 1000; sale USAV usato direttamente.
  Arrotondamento decimale alla seconda cifra, con i mezzi arrotondati in su.
- Bevande vegetali: la fonte USAV è per 100 g. Ogni nutriente, energia
  compresa, è moltiplicato per la densità della stessa riga: soia 1,03 g/ml;
  avena, mandorla e riso 1,05 g/ml. Il risultato è per 100 ml.
- Glutine USDA: carboidrati disponibili = carboidrati totali 13,79 − fibre
  0,60 = **13,19 g**. La conversione segue la distinzione tra carboidrati
  totali e disponibili descritta da [FAO](https://www.fao.org/4/y5022e/y5022e03.htm)
  e dalla [documentazione USDA](https://fdc.nal.usda.gov/docs/Foundation_Foods_Documentation_Apr2024.pdf).

È stato controllato anche il bilancio energetico, rispettando i fattori
originali. [CREA](https://www.alimentinutrizione.it/presentazione-dati)
esprime i carboidrati disponibili come equivalenti di monosaccaridi e
usa 3,75 kcal/g, con 4 per le proteine, 9 per i grassi e 2 per le fibre.
[USAV](https://www.naehrwertdaten.ch/it/sostanze_nutritive/)
usa 4/4/9 più 2 per le fibre; considera anche alcol, acidi organici e
polialcoli nel calcolo dell'energia, con alcuni valori non pubblicati.
Su **84 profili** il ricalcolo con i fattori della fonte differisce di
al massimo **0,60 kcal/100 g**, compatibile con gli arrotondamenti.

Per aceto (acidi organici e alcol) e glutine USDA (energia fornita dal
produttore, derivazione MC nella scheda, senza fattori pubblicati) si
conserva l'energia ufficiale. Non si ricavano calorie nuove
forzando la sola somma 4/4/9. Queste differenze di convenzione sono
esplicite; i riferimenti generici non sostituiscono l'etichetta di una marca.

## Correzioni trovate

| Voce | Prima | Dopo la verifica |
| --- | --- | --- |
| Coscia di pollo senza pelle | 125 kcal, 19,7 g proteine, 4,8 g grassi | 107 kcal, 18,5 g proteine, 3,7 g grassi; stesso taglio crudo CREA della variante con pelle |
| Glutine secco, ID `seitan` | 75 g proteine, 14 g carboidrati, 1,9 g grassi | 75,16 g proteine, 13,19 g carboidrati disponibili, 1,85 g grassi; energia invariata a 370 kcal |
| Piselli in scatola, scolati | Sale 0,60 g | 0,61 g da 242 mg di sodio |
| Pollo intero senza pelle | Sale 0,17 g | 0,18 g da 70 mg di sodio |
| Yogurt bianco magro | Sale 0,14 g | 0,15 g da 58 mg di sodio |
| Mascarpone | Sale 0,21 g | 0,22 g da 86 mg di sodio |
| Cheddar | Sale 1,52 g | 1,53 g da 610 mg di sodio |
| Emmental | Sale 1,12 g | 1,13 g da 450 mg di sodio |

Le **calorie e i macro delle 84 nuove voci corrispondono alle schede**.
Le sei differenze di sale derivavano dall'arrotondamento ai mezzi del
precedente script di importazione. Le due voci preesistenti corrette
mantengono il loro ID. Ingredienti personali, ricette e pasti già salvati
non vengono riscritti automaticamente.

## Profili verificati

Valori finali per 100 g edibili, oppure 100 ml dove indicato. Proteine,
carboidrati, grassi, fibre, zuccheri e sale sono espressi in grammi.
La fonte è identificata per riga; USAV fa riferimento al file v7.1 sopra.

| Ingrediente | Base | kcal | Proteine | Carboidrati | Grassi | Fibre | Zuccheri | Sale | Fonte |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Riso Venere | 100 g | 355 | 7,8 | 80,4 | 1,3 | 5,1 | 2,2 | 0 | [CREA 000140](https://www.alimentinutrizione.it/tabelle-nutrizionali/000140) |
| Riso parboiled | 100 g | 338 | 7,4 | 81,3 | 0,3 | 0,5 | 0,3 | 0,02 | [CREA 000120](https://www.alimentinutrizione.it/tabelle-nutrizionali/000120) |
| Miglio decorticato | 100 g | 342 | 11 | 67,8 | 4,2 | 3,1 | 4,9 | 0 | [CREA 000081](https://www.alimentinutrizione.it/tabelle-nutrizionali/000081) |
| Farina 0 | 100 g | 321 | 11,5 | 69,5 | 1 | 2,9 | 1,8 | 0,01 | [CREA 000230](https://www.alimentinutrizione.it/tabelle-nutrizionali/000230) |
| Farina integrale di frumento | 100 g | 313 | 11,9 | 61,8 | 1,9 | 8,4 | 2,1 | 0,01 | [CREA 000240](https://www.alimentinutrizione.it/tabelle-nutrizionali/000240) |
| Farina d'avena | 100 g | 378 | 12,6 | 66,3 | 7,1 | 7,6 | 1,2 | 0,08 | [CREA 000200](https://www.alimentinutrizione.it/tabelle-nutrizionali/000200) |
| Farina di mais | 100 g | 341 | 8,7 | 73,5 | 2,7 | 3,1 | 1,5 | 0 | [CREA 000260](https://www.alimentinutrizione.it/tabelle-nutrizionali/000260) |
| Farina di riso | 100 g | 332 | 7,3 | 79,1 | 0,5 | 1 | 0 | 0,01 | [CREA 000270](https://www.alimentinutrizione.it/tabelle-nutrizionali/000270) |
| Semola di grano duro | 100 g | 346 | 11,5 | 76,9 | 0,5 | 3,6 | 1,9 | 0,03 | [CREA 000310](https://www.alimentinutrizione.it/tabelle-nutrizionali/000310) |
| Amido di mais | 100 g | 328 | 0,3 | 87 | 0 | 0 | 1,5 | 0 | [CREA 000300](https://www.alimentinutrizione.it/tabelle-nutrizionali/000300) |
| Gnocchi di patate, freschi | 100 g | 164 | 3,9 | 37,9 | 0,3 | 1,9 | 1,4 | 0,02 | [CREA 006590](https://www.alimentinutrizione.it/tabelle-nutrizionali/006590) |
| Corn flakes | 100 g | 367 | 6,6 | 87,4 | 0,8 | 2,8 | 10,4 | 1,25 | [CREA 003020](https://www.alimentinutrizione.it/tabelle-nutrizionali/003020) |
| Muesli | 100 g | 374 | 9,7 | 71,7 | 6 | 6,4 | 26,2 | 0,95 | [CREA 003040](https://www.alimentinutrizione.it/tabelle-nutrizionali/003040) |
| Pane di segale | 100 g | 228 | 8,3 | 45,4 | 1,7 | 4,6 | 1,8 | 1,45 | [CREA 000510](https://www.alimentinutrizione.it/tabelle-nutrizionali/000510) |
| Pangrattato | 100 g | 357 | 10,1 | 77,8 | 2,1 | 3,2 | 5 | 1 | [CREA 000570](https://www.alimentinutrizione.it/tabelle-nutrizionali/000570) |
| Cracker integrali | 100 g | 402 | 12 | 61,7 | 11,4 | 10 | 2,1 | 1,76 | [CREA 001030](https://www.alimentinutrizione.it/tabelle-nutrizionali/001030) |
| Piselli in scatola, scolati | 100 g | 78 | 5,3 | 11,1 | 0,6 | 5,1 | 3,9 | 0,61 | [CREA 004720](https://www.alimentinutrizione.it/tabelle-nutrizionali/004720) |
| Piselli surgelati | 100 g | 61 | 5,4 | 6,5 | 0,3 | 6,3 | 4 | 0,32 | [CREA 004730](https://www.alimentinutrizione.it/tabelle-nutrizionali/004730) |
| Fagioli borlotti freschi | 100 g | 143 | 10,2 | 22,7 | 0,8 | 4,8 | 1,2 | 0,01 | [CREA 004110](https://www.alimentinutrizione.it/tabelle-nutrizionali/004110) |
| Fagioli dall'occhio secchi | 100 g | 318 | 22,4 | 50,9 | 1,4 | 12,7 | 4 | 0,04 | [CREA 004220](https://www.alimentinutrizione.it/tabelle-nutrizionali/004220) |
| Funghi pleurotus | 100 g | 37 | 2,2 | 5,6 | 0,3 | 2,4 | 5,6 | 0,02 | [CREA 006010](https://www.alimentinutrizione.it/tabelle-nutrizionali/006010) |
| Mais dolce in scatola, scolato | 100 g | 105 | 3,4 | 20,5 | 1,3 | 1,4 | 5,3 | 0,68 | [CREA 000070](https://www.alimentinutrizione.it/tabelle-nutrizionali/000070) |
| Castagne fresche | 100 g | 174 | 2,9 | 36,7 | 1,7 | 4,7 | 8,9 | 0,02 | [CREA 008520](https://www.alimentinutrizione.it/tabelle-nutrizionali/008520) |
| Amarene fresche | 100 g | 44 | 0,8 | 10,2 | 0 | 1,1 | 10,2 | 0,01 | [CREA 007700](https://www.alimentinutrizione.it/tabelle-nutrizionali/007700) |
| Albicocche secche | 100 g | 286 | 5 | 66,5 | 0,5 | 6 | 66,5 | 0,07 | [CREA 007030](https://www.alimentinutrizione.it/tabelle-nutrizionali/007030) |
| Coscia di pollo con pelle | 100 g | 125 | 18,4 | 0 | 5,7 | 0 | 0 | 0,22 | [CREA 106400](https://www.alimentinutrizione.it/tabelle-nutrizionali/106400) |
| Sovracoscia di pollo con pelle | 100 g | 196 | 17,4 | 0 | 14 | 0 | 0 | 0,18 | [CREA 106600](https://www.alimentinutrizione.it/tabelle-nutrizionali/106600) |
| Sovracoscia di pollo senza pelle | 100 g | 132 | 18,7 | 0 | 6,3 | 0 | 0 | 0,17 | [CREA 106610](https://www.alimentinutrizione.it/tabelle-nutrizionali/106610) |
| Ali di pollo con pelle | 100 g | 196 | 16,7 | 0 | 14,3 | 0 | 0 | 0,25 | [CREA 106270](https://www.alimentinutrizione.it/tabelle-nutrizionali/106270) |
| Pollo intero senza pelle | 100 g | 110 | 19,4 | 0 | 3,6 | 0 | 0 | 0,18 | [CREA 106210](https://www.alimentinutrizione.it/tabelle-nutrizionali/106210) |
| Filetto di manzo | 100 g | 127 | 20,5 | 0 | 5 | 0 | 0 | 0,1 | [CREA 101170](https://www.alimentinutrizione.it/tabelle-nutrizionali/101170) |
| Spalla di maiale | 100 g | 133 | 19 | 0 | 6,3 | 0 | 0 | 0,18 | [CREA 105220](https://www.alimentinutrizione.it/tabelle-nutrizionali/105220) |
| Salsiccia di suino fresca | 100 g | 304 | 15,4 | 0,6 | 26,7 | 0 | 0,6 | 2,75 | [CREA 110710](https://www.alimentinutrizione.it/tabelle-nutrizionali/110710) |
| Pancetta tesa | 100 g | 337 | 20,9 | 0 | 28,1 | 0 | 0 | 2,54 | [CREA 110310](https://www.alimentinutrizione.it/tabelle-nutrizionali/110310) |
| Fegato di bovino | 100 g | 142 | 20 | 5,9 | 4,4 | 0 | 5,9 | 0,2 | [CREA 115320](https://www.alimentinutrizione.it/tabelle-nutrizionali/115320) |
| Tonno sott'olio, sgocciolato | 100 g | 192 | 25,2 | 0 | 10,1 | 0 | 0 | 0,79 | [CREA 123610](https://www.alimentinutrizione.it/tabelle-nutrizionali/123610) |
| Aringa fresca | 100 g | 216 | 16,5 | 0 | 16,7 | 0 | 0 | 0,24 | [CREA 120300](https://www.alimentinutrizione.it/tabelle-nutrizionali/120300) |
| Rombo | 100 g | 81 | 16,3 | 1,2 | 1,3 | 0 | 1,2 | 0,32 | [CREA 122300](https://www.alimentinutrizione.it/tabelle-nutrizionali/122300) |
| Dentice | 100 g | 101 | 16,7 | 0,7 | 3,5 | 0 | 0,7 | 0,32 | [CREA 120910](https://www.alimentinutrizione.it/tabelle-nutrizionali/120910) |
| Cefalo | 100 g | 127 | 15,8 | 0,7 | 6,8 | 0 | 0,7 | 0,17 | [CREA 120510](https://www.alimentinutrizione.it/tabelle-nutrizionali/120510) |
| Acciughe sott'olio | 100 g | 206 | 25,9 | 0,2 | 11,3 | 0 | 0,2 | 1,2 | [CREA 120020](https://www.alimentinutrizione.it/tabelle-nutrizionali/120020) |
| Tuorlo d'uovo | 100 g | 325 | 15,8 | 0 | 29,1 | 0 | 0 | 0,11 | [CREA 183010](https://www.alimentinutrizione.it/tabelle-nutrizionali/183010) |
| Latte scremato | 100 g | 36 | 3,6 | 5,3 | 0,2 | 0 | 5,3 | 0,13 | [CREA 135030](https://www.alimentinutrizione.it/tabelle-nutrizionali/135030) |
| Yogurt bianco magro | 100 g | 36 | 3,3 | 4 | 0,9 | 0 | 4 | 0,15 | [CREA 152000](https://www.alimentinutrizione.it/tabelle-nutrizionali/152000) |
| Ricotta di pecora | 100 g | 157 | 9,5 | 4,2 | 11,5 | 0 | 4,2 | 0,21 | [CREA 166810](https://www.alimentinutrizione.it/tabelle-nutrizionali/166810) |
| Mascarpone | 100 g | 455 | 7,6 | 0,3 | 47 | 0 | 0,3 | 0,22 | [CREA 164800](https://www.alimentinutrizione.it/tabelle-nutrizionali/164800) |
| Cheddar | 100 g | 388 | 26,7 | 0,5 | 31 | 0 | 0,5 | 1,53 | [CREA 160880](https://www.alimentinutrizione.it/tabelle-nutrizionali/160880) |
| Emmental | 100 g | 403 | 28,5 | 3,6 | 30,6 | 0 | 3,6 | 1,13 | [CREA 161610](https://www.alimentinutrizione.it/tabelle-nutrizionali/161610) |
| Olio di girasole | 100 g | 899 | 0 | 0 | 99,9 | 0 | 0 | 0 | [CREA 009650](https://www.alimentinutrizione.it/tabelle-nutrizionali/009650) |
| Olio di arachide | 100 g | 899 | 0 | 0 | 99,9 | 0 | 0 | 0 | [CREA 009610](https://www.alimentinutrizione.it/tabelle-nutrizionali/009610) |
| Olio di cocco | 100 g | 899 | 0 | 0 | 99,9 | 0 | 0 | 0 | [CREA 009620](https://www.alimentinutrizione.it/tabelle-nutrizionali/009620) |
| Concentrato di pomodoro | 100 g | 100 | 3,9 | 20,4 | 0,4 | 2 | 20,4 | 1,9 | [CREA 006660](https://www.alimentinutrizione.it/tabelle-nutrizionali/006660) |
| Salvia fresca | 100 g | 132 | 3,9 | 15,6 | 4,6 | 8,2 | 15,6 | 0,01 | [CREA 006860](https://www.alimentinutrizione.it/tabelle-nutrizionali/006860) |
| Menta fresca | 100 g | 49 | 3,8 | 5,3 | 0,7 | 3,8 | 5,3 | 0,04 | [CREA 006810](https://www.alimentinutrizione.it/tabelle-nutrizionali/006810) |
| Peperoncino fresco | 100 g | 30 | 1,8 | 3,8 | 0,5 | 2 | 1,5 | 0,02 | [CREA 006830](https://www.alimentinutrizione.it/tabelle-nutrizionali/006830) |
| Grano saraceno | 100 g | 341 | 13,1 | 62,4 | 3,1 | 5,8 | 0,9 | 0 | USAV 421 |
| Fecola di patate | 100 g | 336 | 0,6 | 83,1 | 0,1 | 0,1 | 0 | 0 | USAV 497 |
| Pane croccante integrale | 100 g | 325 | 12 | 57,9 | 1,7 | 14,8 | 1,1 | 1,5 | USAV 918 |
| Gallette di riso integrale | 100 g | 390 | 7,7 | 81,5 | 2,8 | 4,2 | 1,5 | 0,8 | USAV 802 |
| Gallette di mais | 100 g | 387 | 7,4 | 83,5 | 1,9 | 3 | 0,7 | 0,4 | USAV 14298 |
| Sedano rapa | 100 g | 32 | 1,4 | 4 | 0,3 | 3,8 | 1,6 | 0,1 | USAV 357 |
| Pomodori secchi | 100 g | 282 | 14,1 | 43,5 | 3 | 12,3 | 37,6 | 5,3 | USAV 13463 |
| Pomodori secchi sott'olio, sgocciolati | 100 g | 187 | 4,3 | 13,4 | 11,7 | 5,6 | 6,5 | 2,6 | USAV 13490 |
| Olive verdi in salamoia, sgocciolate | 100 g | 154 | 1,3 | 0 | 15,7 | 3,6 | 0 | 3,2 | USAV 492 |
| Olive nere | 100 g | 176 | 1,4 | 0,8 | 17,2 | 6,2 | 0,8 | 1,8 | USAV 493 |
| Aceto | 100 g | 21 | 0,1 | 0,7 | 0 | 0 | 0,3 | 0 | USAV 1693 |
| Capperi sottaceto | 100 g | 38 | 2,2 | 3,5 | 0,9 | 3,6 | 0,4 | 4,1 | USAV 14282 |
| Cetriolini sottaceto | 100 g | 14 | 0,7 | 2,1 | 0,1 | 1 | 1,9 | 1,8 | USAV 491 |
| Mortadella | 100 g | 306 | 15,7 | 0,8 | 26,6 | 0 | 0,8 | 2,1 | USAV 819 |
| Salame | 100 g | 367 | 24,1 | 0 | 30,1 | 0 | 0 | 3,9 | USAV 1091 |
| Seitan fresco | 100 g | 193 | 28 | 3 | 7,2 | 2,3 | 0,7 | 1,3 | USAV 14118 |
| Tempeh al naturale | 100 g | 157 | 17,6 | 7,9 | 4,7 | 6,2 | 0,2 | 0,1 | USAV 14251 |
| Tofu setoso | 100 g | 53 | 5 | 1,5 | 2,9 | 0,6 | 1,1 | 0 | USAV 13438 |
| Strutto | 100 g | 900 | 0 | 0 | 100 | 0 | 0 | 0 | USAV 594 |
| Arachidi tostate salate | 100 g | 631 | 26,2 | 15 | 50 | 8 | 4,2 | 1,3 | USAV 14092 |
| Arachidi tostate senza sale | 100 g | 637 | 26,8 | 11,3 | 51,9 | 8,7 | 2,5 | 0 | USAV 14238 |
| Latte di cocco da cucina | 100 g | 214 | 2,4 | 3,1 | 21,3 | 0,1 | 1,7 | 0 | USAV 13458 |
| Zenzero fresco | 100 g | 33 | 1,1 | 3,4 | 1,1 | 2,7 | 1 | 0 | USAV 14239 |
| Paprika | 100 g | 358 | 14,8 | 34,9 | 13 | 20,9 | 33,2 | 0,1 | USAV 663 |
| Cacao amaro in polvere | 100 g | 380 | 22,4 | 11,6 | 20,6 | 29,5 | 0,9 | 0,1 | USAV 581 |
| Bevanda di soia al naturale | 100 ml | 41,2 | 3,71 | 1,55 | 2,16 | 0,62 | 1,44 | 0,1 | USAV 72 |
| Bevanda di avena al naturale | 100 ml | 49,35 | 0,53 | 8,19 | 1,58 | 0,21 | 3,78 | 0,11 | USAV 14114 |
| Bevanda di mandorla al naturale | 100 ml | 34,65 | 1,16 | 1,37 | 2,73 | 0,32 | 1,37 | 0,11 | USAV 14113 |
| Bevanda di riso al naturale | 100 ml | 56,7 | 0,21 | 10,82 | 1,37 | 0,11 | 2,94 | 0 | USAV 13450 |
| Coscia di pollo senza pelle | 100 g | 107 | 18,5 | 0 | 3,7 | 0 | 0 | 0,22 | [CREA 106410](https://www.alimentinutrizione.it/tabelle-nutrizionali/106410) |
| Seitan, glutine di frumento secco | 100 g | 370 | 75,16 | 13,19 | 1,85 | 0,6 | 0 | 0,07 | [USDA 168147](https://fdc.nal.usda.gov/food-details/168147/nutrients) |

## Regressioni e limiti

`src/data/fixtures/basicFoodNutritionAudit.ts` conserva gli **86 profili
originali**, con nome e codice della fonte, nutrienti prima delle
conversioni e densità delle bevande. È una fixture per i test, esclusa dal
bundle dell'app. `src/data/basicFoodNutritionAudit.test.ts` confronta
ogni profilo con il risultato della ricerca e verifica le conversioni,
la copertura e il bilancio energetico applicabile. Le altre regressioni
coprono la distinzione con/senza pelle e il calcolo delle porzioni.

Questo conferma la corrispondenza ai riferimenti scelti. Varietà, marca,
ricetta, quantità di pelle e lavorazione possono cambiare i valori reali;
per un prodotto specifico resta valido il riferimento della sua etichetta.

Verifica finale con Node 22: **472 test in 64 file**, build di produzione
e lint superati. Il confronto indipendente dei sette valori con le fonti
originali non rileva differenze dopo le conversioni documentate.
