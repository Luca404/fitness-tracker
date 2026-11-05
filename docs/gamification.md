# Gamification: punti e costanza

Implementata il 4 novembre 2026, senza avatar. I punti sono attivi per tutti e
si calcolano automaticamente: nessun pulsante di attivazione, conferma della
giornata o dichiarazione sulle bevande. Le formule sono regole di gioco.

## Uso e tempi del calcolo

Punti totali e streak compaiono a sinistra della rotella delle impostazioni;
su desktop seguono le impostazioni nella barra laterale. Il contatore apre
`/points`, con selettore del giorno come primo elemento, con totale, streak attuale e record, giorni registrati, recap per
giorno e dettaglio delle singole voci. Lo storico si sfoglia in pagine di
30 giorni; il totale comprende tutto il periodo.

| Voce | Quando vengono conteggiati i punti |
| --- | --- |
| Attività | Appena salvata |
| Palestra | Alla conclusione di una sessione valida |
| Diario e streak | Appena raggiunti due momenti alimentari validi |
| Benessere giornaliero, incluse detrazioni | Dopo la mezzanotte nel fuso salvato |
| Legumi e pesce | Dopo la chiusura del blocco personale di sette giorni |

Durante il giorno le voci benessere mostrano **A fine giornata** e zero punti
provvisori; un checkpoint ancora aperto mostra **A fine periodo**. Le modifiche
a inserimenti passati ricalcolano automaticamente anche streak e checkpoint
interessati. Non serve alcuna azione di chiusura del diario.

Per i profili esistenti il conteggio inizia dal rilascio del 4 novembre 2026;
per quelli nuovi dalla creazione del profilo salute, mai prima del rilascio.
I giorni precedenti o futuri non danno punti. Parametri e date già salvati
vengono preservati. I profili esistenti sono inizializzati dalla migrazione;
quelli nuovi automaticamente alla prima lettura, dopo l’onboarding e i target.
Il fuso predefinito è `Europe/Rome`; i fusi già salvati restano invariati.
Gli account delle altre app Trackrs senza profilo salute non sono coinvolti.

## Diario e costanza

Una giornata vale **2 PT** appena contiene almeno due momenti distinti fra
colazione, pranzo, cena e spuntino. Ogni momento deve contenere almeno un
alimento con quantità positiva e finita; bevande, alcolici, integratori,
grassi, salse e soli condimenti non bastano. Non c’è un minimo calorico.

La presenza di due momenti è una regola automatica di completezza del gioco,
non una garanzia che tutti i consumi reali siano stati registrati.

| Traguardo nella streak | Bonus |
| --- | ---: |
| Terzo giorno consecutivo | +2 PT |
| Ogni multiplo di sette giorni consecutivi | +4 PT |
| Trentesimo giorno consecutivo | +10 PT |

Il terzo e trentesimo giorno danno un premio una volta per sequenza; quello
settimanale ricorre ai giorni 7, 14, 21, ecc. Se oggi non ha ancora due momenti,
la streak resta quella di ieri. Un giorno saltato interrompe la sequenza senza
una detrazione aggiuntiva. Correzioni o cancellazioni possono cambiare i bonus
successivi; nessuna scadenza di correzione è imposta nella prima versione.

## Benessere e detrazioni

Tutte queste voci vengono valutate **a periodo concluso**, anche i minimi.

| Voce | Riferimento | Premio |
| --- | --- | ---: |
| Verdura | almeno 400 g/giorno | +1 PT |
| Frutta | almeno 360 g/giorno | +1 PT |
| Fibre | almeno 25 g/giorno | +1 PT |
| Sale | al massimo 5 g/giorno | +1 PT |
| Zuccheri totali | 15% del target calorico iniziale ÷ 4 | +1 PT |
| Alcol | riferimento personale delle buone abitudini iniziale, in UA | +1 PT |
| Legumi | almeno 450 g nel blocco di sette giorni | +3 PT |
| Pesce | almeno 300 g nel blocco di sette giorni | +3 PT |

I minimi danno +1 PT se raggiunti e −1 PT se mancati in una giornata valida,
con dati sufficienti. Per legumi e pesce il premio è +3 PT e la mancata
riuscita costa −3 PT per voce al checkpoint di un periodo con almeno un
giorno valido. Giornate e settimane non registrate non accumulano penalità. I premi sui limiti
massimi richiedono almeno due momenti alimentari validi e dati completi per
tutti gli ingredienti. Un diario vuoto non dà premi per sale, zuccheri o alcol.
Un nutriente sconosciuto non è zero: un totale parziale può provare un minimo
raggiunto o un eccesso, ma non il rispetto di un massimo. Alcolici senza
volume/gradazione utilizzabile impediscono il premio alcol. I dati da foto
mantengono la natura di stime.

Le detrazioni si applicano dopo la fine della giornata anche se il diario è
incompleto, quando l’eccesso è già dimostrato dalle quantità note:

```text
Se valore > riferimento:
  detrazione = −max(1, floor(valore / max(riferimento, 1)))
```

Ogni superamento noto costa almeno un punto, senza arrotondamenti a zero.
Le fasce seguono i multipli interi del riferimento, coerentemente con
l’esempio richiesto di 16 g di sale → −3 PT:

| Sale registrato, riferimento 5 g | Detrazione |
| --- | ---: |
| Fino a 5 g | nessuna; +1 PT se il premio è verificabile |
| Oltre 5 g e sotto 10 g (es. 6 g) | −1 PT |
| Da 10 g a meno di 15 g | −2 PT |
| Da 15 g a meno di 20 g (es. 16 g) | −3 PT |
| Da 20 g a meno di 25 g | −4 PT |

Lo stesso rapporto si applica al riferimento personale di zuccheri e alcol.
Se il riferimento alcol è zero, qualsiasi quantità nota costa almeno un punto,
poi un punto per UA intera. Non c’è più il precedente tetto di −3 PT per voce.
Le detrazioni per eccessi dimostrati contano anche se il diario non è valido.
Un minimo non dimostrato con dati parziali resta invece incompleto e vale zero.

La stessa voce non somma premio e detrazione. Il saldo somma le voci intere,
con minimo visualizzato di zero e indicazione dell’eventuale saldo netto
negativo da compensare. I singoli giorni possono essere negativi.

I riferimenti per zuccheri e alcol e il peso usato per le stime palestra sono
fissati all’inizio del conteggio, per evitare che i cambi di profilo riscrivano
il punteggio passato. Il pannello Buone abitudini conserva invece i target
correnti e la propria finestra mobile degli ultimi sette giorni.

Legumi e pesce danno punti una volta per ciascun blocco non sovrapposto di sette
giorni dall’inizio del conteggio. Il premio è attribuito al giorno finale, ma
compare solo quando quel giorno è finito. Correggere un ingrediente del blocco
aggiorna il relativo premio senza moltiplicarlo.

## Attività e allenamenti

```text
PT attività = minuti × MET / 100 + km × coefficiente
coefficiente km: camminata 0,1 · corsa 0,2 · ciclismo 0,05 · tapis roulant 0,15
PT palestra = 0,04 × minuti + 0,003 × kcal stimate
Tetto complessivo movimento: 12 PT per giornata
```

Le attività usano le stesse stime MET e fasce di velocità di `utils/met.ts`.
Contributo limitato a 120 minuti e 100 km per attività. Distanze non valide,
velocità oltre i controlli dell’app e attività sconosciute non danno punti.
Corsa 5 km in 30 minuti → 9,3 MET → 3,79 PT → 4 PT.

La palestra richiede una sessione conclusa, di durata positiva non superiore
a quattro ore e con almeno una serie svolta con ripetizioni valide. Sessioni
aperte o senza serie svolte non danno punti. Le stime riprendono il modello
MET per esercizio di `gymSessionSummary.ts`, usando il peso fissato per il gioco.
Le calorie informative nel diario possono differire, perché usano le pesate
storiche disponibili. Contributo limitato a 120 minuti e 1.200 kcal per sessione;
il tempo include le pause.

Gli intervalli sovrapposti tra sessioni palestra della stessa data contano una
sola volta. Le attività manuali non hanno orari di inizio/fine: non è possibile
riconoscere duplicazioni fra attività e palestra; ogni sessione va registrata
una sola volta. Il tetto resta comune. Non c’è una base per voce: suddividere
una sessione non crea un premio fisso aggiuntivo. Gli arrotondamenti sono
attribuiti sul cumulato e ogni voce mostra il contributo effettivo dopo il tetto.

Nessun punto per perdita di peso, calorie mangiate in meno o assenza di pasti;
nessuna penalità per il riposo. Il movimento non è richiesto per la streak.

## Persistenza e accesso

Migrazioni, da applicare nell’ordine:

1. `20261104120000_fitness_gamification.sql`: tabelle, formule e accesso iniziali.
2. `20261104130000_fitness_points_by_default.sql`: inizializzazione automatica.
3. `20261104140000_automatic_fitness_points.sql`: regole versione 2, diario e
   streak automatici, benessere a fine periodo, revoca della conferma manuale.
4. `20261104150000_scale_fitness_points.sql`: versione 3, punti divisi per dieci
   con arrotondamento intero e ricalcolo dello storico. Le soglie nutrizionali,
   i giorni di streak e le unità fisiche rimangono invariati.
5. `20261105120000_fitness_points_goals_and_penalties.sql`: versione 4, minimo
   di due momenti, −1 per minimi giornalieri mancati, −3 per quelli settimanali
   e penalità per multipli del limite
   con almeno −1 per qualunque eccesso noto.

`fitness_points_settings` conserva data iniziale, fuso e riferimenti personali.
`get_fitness_points` inizializza i nuovi profili e restituisce il riepilogo.
`fitness_points_summary` e `fitness_points_days` sono helper interni senza grant
per utenti/anonimi. Il campo pubblico `registered` indica il minimo di due
momenti; il nome interno SQL `confirmed` è mantenuto per compatibilità della
firma della funzione e non richiede né legge una conferma.

`fitness_points_confirmations` conserva eventuali dichiarazioni storiche senza
partecipare al calcolo. L’RPC precedente `confirm_fitness_points_day` non è più
eseguibile dai client. Il vecchio `enable_fitness_points` rimane idempotente
per compatibilità, ma non viene chiamato dal frontend e non può resettare date,
parametri o punti esistenti.

Il punteggio è una proiezione deterministica dei dati salvati: non c’è un
ledger incrementale né un job che deve assegnare i premi. Superata la mezzanotte
nel fuso salvato, la lettura include automaticamente il periodo appena finito,
anche se l’app era chiusa. Invii ripetuti o simultanei non riaccreditano nulla.
La lettura include tutte le correzioni ai dati e ai periodi successivi.

Tabelle con RLS del proprietario e nessuna scrittura diretta del browser.
RPC con grant esplicito per `authenticated`, `auth.uid()`, `search_path` vuoto e
filtro utente su ogni sorgente. Nessun dato finanziario partecipa al calcolo.
Il frontend evita risposte stale fra account/date e aggiorna al cambiare dei
dati, alla navigazione, al ritorno all’app e ogni minuto per il passaggio di
periodo. La navigazione ordinaria non forza nuove richieste: i due contatori
restano nella cache in memoria anche durante il cambio del giorno, le letture
in background e il ritorno da una sessione palestra. Una lettura fallita conserva
l’ultimo dato valido. La cache è associata all’account e non mostra i valori del
precedente utente. Non viene scritta nello storage persistente del browser.
Il tutorial non usa servizi reali né guadagna punti.

## Verifiche

I test SQL self-contained richiedono un database separato
`fittrackr_gamification_test_*` e creano/annullano fixture sintetiche; non vanno
eseguiti su database applicativi o ospitati.

- `fitness_gamification.sql`: formule originali, grant, dati parziali, distanza,
  arrotondamenti/tetti, sessioni aperte/vuote/sovrapposte e isolamento utenti.
- `fitness_points_by_default.sql`: utenti esistenti/nuovi, inizializzazione
  idempotente, preservazione dei parametri e isolamento dagli altri Trackrs.
- `automatic_fitness_points.sql`: nessuna conferma, punti immediati, chiusura
  del giorno e del checkpoint in fusi diversi, streak automatiche e correzioni.
- `fitness_points_scale.sql`: scala ridotta, arrotondamenti positivi/negativi,
  coerenza fra singole voci e giorni, bonus, storico e tetto movimento a 12 PT.
- `fitness_points_goals_and_penalties.sql`: due momenti e streak, minimi mancati,
  obiettivi settimanali, dati incompleti, alcol con target zero e fasce del sale
  a 5/5,001/6/10/15/16/20/40 g.

Frontend: API di sola lettura, aggiornamento da pasti/attività e timer, errori,
storico, account diversi e risposte stale. Browser con risposte fittizie a
320/390/768/1440 px: salvataggio reale del form corsa → contatore aggiornato,
passaggio di giornata simulato → premi/detrazioni benessere, selezione giorno,
nessuna chiamata di attivazione/conferma, errore e nuovo tentativo.
Stato di rilascio in [`supabase/README.md`](../supabase/README.md).

## Avatar: proposta per una fase successiva


### Creazione

Il personaggio è umano stilizzato in 2D, con selezione di volto, capelli,
pelle, abbigliamento e proporzioni. Altezza e peso possono suggerire una
silhouette iniziale modificabile prima della conferma. Si può scegliere
anche una silhouette indipendente dai dati personali.

Non stimerei automaticamente muscoli e grasso dal solo rapporto fra peso
e altezza: il BMI non distingue le diverse componenti della massa corporea.
Questo limite è descritto dal [CDC](https://www.cdc.gov/bmi/about/index.html).
La conseguenza progettuale proposta è trattare la silhouette come una
personalizzazione, non come una scansione del corpo dell’utente.

### Cambiamenti graduali

Separerei tre dimensioni, così sono controllabili e comprensibili:

| Dimensione | Segnali di gioco | Cambiamento visivo |
| --- | --- | --- |
| Allenamento | Costanza delle sessioni concluse su più settimane | Postura, animazioni, definizione stilizzata opzionale |
| Alimentazione | Regolarità degli obiettivi verificabili su più settimane | Espressione e vitalità del personaggio |
| Corporatura | Medie del peso registrato, solo se l’utente attiva la sincronizzazione | Variazione lenta delle proporzioni, entro limiti concordati |

La prima versione dell’avatar potrebbe usare vestiti, espressioni e pose,
rimandando le trasformazioni del corpo a una fase successiva. Per
l’evoluzione corporea proporrei finestre di 28 giorni, pochi stati visivi
interpolati e una variazione massima per settimana. I valori esatti vanno
decisi con un prototipo e prove visive.

Una pesata isolata o un singolo pasto non trasformano il personaggio.
Nessuna registrazione significa stato sconosciuto: l’avatar mantiene il suo
ultimo aspetto, senza diventare automaticamente meno in forma. Un cambiamento
di obiettivo, per esempio da mantenimento a massa, non deve far sembrare
negativa una crescita del peso desiderata. Riposo, giorni liberi e infortuni
non azzerano gli sblocchi già ottenuti.

### Stati temporanei, incluso l’alcol

Si possono aggiungere animazioni «Dopo l’allenamento», «A riposo» e uno stato
caricaturale dopo una registrazione di alcol: espressione assonnata o lieve
ondeggiamento, disattivabile. Non cambia permanentemente corporatura o livello
e non dà premi per avere bevuto. Le animazioni rispettano la preferenza
di movimento ridotto.

Lo stato relativo all’alcol va mostrato come **rappresentazione del diario**:
non indica il tasso alcolemico, non certifica sobrietà e non mostra un conto
alla rovescia «puoi guidare». Quantità e peso non bastano a conoscere lo stato
reale, che dipende anche da tempi, alimentazione e altri fattori descritti
dalla [NHTSA](https://www.nhtsa.gov/risky-driving/drunk-driving).

L’app attuale registra le bevande per giorno e pasto, senza un orario reale
di assunzione. Prima di rendere questo stato «live» occorre decidere se
aggiungere un orario facoltativo. Nel frattempo, l’animazione può accompagnare
il giorno selezionato e la dicitura «Alcol registrato», senza pretendere di
rappresentare come sta l’utente in questo momento. Una registrazione di ieri
non attiva un effetto oggi.
