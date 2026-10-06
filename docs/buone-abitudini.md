# Buone abitudini

Revisione del 6 ottobre 2026.

## Recap nella pagina Pasti

Il recap mostra otto quadratini: verdura, frutta, legumi, pesce, fibre,
zuccheri totali, unità alcoliche e sale. Dentro ogni quadratino compaiono solo
l’icona e il simbolo di stato, senza quantità, medie o moltiplicatori numerici.
Toccando il recap si apre il dettaglio in **Benessere**.

Il colore riempie il quadratino dal basso, in proporzione al rapporto tra
valore registrato e target, fino al riempimento completo. Questo vale sia
per gli obiettivi minimi `≥` sia per i limiti massimi `≤`.

- **Obiettivo minimo:** il riempimento aumenta avvicinandosi al target;
  raggiungerlo o superarlo dà la spunta verde.
- **Limite massimo:** il riempimento mostra quanto del limite è già stato
  utilizzato, anche quando il valore è ancora entro la soglia. Superare il
  limite rende il quadratino pieno e arancione, con il simbolo `×`.
- **Dato incompleto:** il simbolo `–` indica che i dati disponibili non
  permettono di stabilire lo stato. Un totale parziale conosciuto può comunque
  contribuire al riempimento.

Per esempio, con un limite di 5 g, un valore di 2,5 g riempie metà quadratino;
5 g lo riempiono completamente mantenendo la spunta; oltre 5 g diventa
arancione. Il rapporto è rappresentato dal colore, senza numeri nel quadratino.
Un limite pari a zero resta vuoto a zero e diventa pieno se il valore è positivo.

## Dettaglio in Benessere

La pagina dedicata mostra quantità, unità, target e barre di avanzamento.
Per un limite superato indica anche il rapporto rispetto alla soglia:
`1.2x`, `2x`, `3x`, ecc. Un valore di 10 g rispetto a un limite di 5 g vale
`2x`. Un piccolo superamento che arrotonderebbe a `1x` appare come `>1x`;
un limite pari a zero usa un indicatore di superamento senza divisione.

I nutrienti sconosciuti non diventano zero. Se solo alcuni ingredienti hanno
valori disponibili, il totale è indicato come parziale: può già dimostrare
che un limite è stato superato o un obiettivo minimo raggiunto, ma negli altri
casi lo stato rimane incompleto.

## Legumi e pesce: ultimi 7 giorni

Legumi e pesce mantengono il target settimanale, confrontato con il totale dei
**sette giorni di calendario che terminano nella data selezionata**, compresa
quella data. Il conteggio non riparte da zero il lunedì e non include pasti
successivi alla data selezionata.

Per esempio, selezionando lunedì 5 ottobre 2026, la finestra va da martedì
29 settembre a lunedì 5 ottobre inclusi. Il dettaglio mostra sia il totale
rispetto al target settimanale sia la **media giornaliera = totale / 7**.
Anche i giorni senza registrazioni entrano nel divisore: la media rappresenta
quanto è stato registrato nel diario.

Il recap usa lo stesso totale per il riempimento e mantiene i quadratini senza
numeri. Durante il caricamento o se la lettura dello storico fallisce, legumi
e pesce restano incompleti; i valori giornalieri già disponibili continuano
a essere mostrati tramite il colore. Modifiche ai pasti e correzioni del peso
dei piatti preparati aggiornano anche il calcolo degli ultimi sette giorni.
