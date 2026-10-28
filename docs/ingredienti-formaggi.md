# Formaggi negli ingredienti di base

Il catalogo locale include 12 nuovi formaggi: gorgonzola, taleggio, fontina,
pecorino romano, provolone, brie, feta, fiocchi di latte, crescenza,
stracchino, robiola e scamorza. Sono disponibili nella ricerca sia in Cucina
sia nei pasti, senza una richiesta online o una migrazione del database.

I valori sono riferimenti per **100 g**, modificati in proporzione alla
quantità scelta. Le schede dei produttori rappresentano un prodotto di
riferimento: altre marche e stagionature possono avere valori diversi.
Per un prodotto specifico usare l'etichetta o il codice a barre.

## Fonti consultate il 28 ottobre 2026

| Ingrediente | Riferimento |
| --- | --- |
| Gorgonzola | [CREA, codice 162400](https://www.alimentinutrizione.it/tabelle-nutrizionali/162400) |
| Taleggio | [CREA, codice 167600](https://www.alimentinutrizione.it/tabelle-nutrizionali/167600) |
| Fontina | [CREA, codice 162020](https://www.alimentinutrizione.it/tabelle-nutrizionali/162020) |
| Pecorino romano | [CREA, codice 166060](https://www.alimentinutrizione.it/tabelle-nutrizionali/166060) |
| Provolone | [CREA, codice 166100](https://www.alimentinutrizione.it/tabelle-nutrizionali/166100) |
| Brie | [CREA, codice 160410](https://www.alimentinutrizione.it/tabelle-nutrizionali/160410) |
| Feta | [CREA, codice 162000](https://www.alimentinutrizione.it/tabelle-nutrizionali/162000) |
| Fiocchi di latte | [CREA, fiocchi di formaggio magro, codice 170010](https://www.alimentinutrizione.it/tabelle-nutrizionali/170010) |
| Crescenza | [Galbani, Certosa 250 g](https://www.galbani.it/prodotti/certosa/certosa-250g) |
| Stracchino | [Nonno Nanni, stracchino](https://www.nonnonanni.it/formaggio-nonno-nanni/stracchino/) |
| Robiola | [Fattorie Osella, robiola](https://www.fattorieosella.it/it/formaggi-osella/robiola-osella/) |
| Scamorza | [Auricchio / Giovanni Colombo, scamorza](https://www.auricchio.it/marchi-e-prodotti/giovanni-colombo/scamorza) |

Per CREA (Centro di ricerca Alimenti e Nutrizione), il sale è ricavato dal
sodio: **sale (g) = sodio (mg) × 2,5 / 1000**, arrotondato a due decimali.
Gli zuccheri sono quelli solubili e le fibre sono zero nelle schede CREA.
Anche per i quattro formaggi da schede dei produttori si assumono fibre zero,
trattandosi di formaggi senza ingredienti vegetali. Macro, zuccheri e sale
provengono tutti dalla stessa scheda per ciascun alimento.

Gli alias permettono di trovare anche «pecorino grattugiato», «cottage cheese»,
«formaggio greco», «formaggio erborinato» e «scamorza affumicata». Non indicano
un valore esatto per ogni variante. I riferimenti sono in `basicFoods.ts` e
`basicFoodExtendedNutrition.ts`; i test del catalogo verificano unicità,
completezza, nutrienti non negativi e zuccheri non superiori ai carboidrati.
