**Bug**:  

1) Quanto registri un piatto e devi inserire la quantità ( "1/4" "1/2" "3/4" "Tutto il resto"), la casella "Tutto il resto" sembra già selezionata. (Poi in realtà il colore della selezione è pure diverso)  
2) Quando non consumi tutto un piatto in un pasto solo, (ad esempio la **Cena**) a **Pranzo** del giorno dopo non è possibile aggiungerlo dalla sezione *Pasti*>*Aggiungi pasto* (Invece è possibile inserirlo manualmente nella sezione *Cucina*>*Piatti*).  
 Questo perché, nella sezione problematica ti consiglia solo i piatti avanzati della stessa finestra temporale (**Pranzo**--**Pranzo**).

**Feature mancanti/consigli**:
1) Rendere consistente l'utilizzo del "." e della "," nell'applicazione  
2) Rendere più ricca l'interfaccia *Modifica*

## Aggiornamento del 10 novembre 2026

I due bug sono stati verificati e corretti. I consigli sono stati implementati
con le precisazioni seguenti.

### Bug 1 — Selezione delle porzioni: corretto

“Tutto il resto” aveva un colore diverso anche quando non era selezionato.
Ora tutte le scorciatoie hanno lo stesso stile a riposo e viene evidenziata
soltanto quella corrispondente ai grammi effettivi, con uno stato accessibile
`aria-pressed`. Con quantità zero non c'è selezione; se una frazione coincide
con tutto il resto, viene evidenziato solo “Tutto il resto”. Le frazioni
superiori alla quantità disponibile restano disabilitate.

### Bug 2 — Avanzi disponibili in un altro pasto: corretto

La causa era il filtro sulle categorie della preparazione, non il cambio di
giorno: un avanzo classificato solo come cena veniva nascosto scegliendo pranzo.
In **Pasti → Aggiungi pasto** vengono ora mostrati tutti gli avanzi disponibili,
indipendentemente dal momento della giornata associato alla ricetta. Il pasto
scelto indica dove registrare il consumo. Ricerca e filtro per tipo di piatto
restano attivi; in **Cucina** resta disponibile il filtro per momento del giorno
scelto esplicitamente. Non è stata necessaria una migrazione del database.

### Consiglio 1 — Formato dei numeri: implementato

Il separatore predefinito è il **punto** in tutta l'app. Digitando o incollando
una virgola in un campo numerico, questa viene convertita subito in punto.
In **Impostazioni → Formato dei numeri** si può scegliere la **virgola**:
campi, riepiloghi, grafici e testi numerici seguono subito la preferenza,
convertendo anche il punto digitato nel separatore scelto. La scelta viene
salvata sul dispositivo, senza modificare i valori interni o i calcoli.

I campi delle misure mantengono i due decimali supportati anche uscendo dal
campo: per esempio, `12.35` non viene più mostrato come `12.4` durante la
modifica. I riepiloghi mantengono la propria precisione di visualizzazione.
Vedi [Formato dei numeri](docs/formato-numeri.md).

### Consiglio 2 — Interfaccia Modifica: implementato per le porzioni preparate

L'editor ordinario consentiva già di modificare nome, ingredienti e quantità.
È stata arricchita la modifica di una porzione preparata: ora mostra porzione
precedente, nuovo peso, avanzo risultante e anteprima in tempo reale di calorie,
proteine, carboidrati e grassi. **Annulla** torna al dettaglio senza salvare;
**Salva porzione** usa il flusso atomico già esistente. Ricetta e altri pasti
non vengono modificati da questa operazione.
Vedi [Peso dei piatti preparati](docs/peso-piatti-preparati.md).

### Verifiche

- **623 test passati** in 88 file, compresi i casi cena → pranzo del giorno
  dopo, selezione delle porzioni, conversione e persistenza del separatore,
  precisione dei campi, anteprima, annullamento e salvataggio della porzione.
- **Lint e build di produzione riusciti** con Node 22.
- La verifica grafica nel browser resta da eseguire; i controlli automatici
  non attestano la resa visiva sui dispositivi reali.
