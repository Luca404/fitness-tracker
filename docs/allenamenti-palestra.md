# Schede e allenamenti in palestra

## Navigazione e attività — 28 ottobre 2026

La barra principale mostra **Fitness · Cucina · Pasti · Peso · Storico**.
**Peso** torna a essere una pagina autonoma; Fitness ha due schede secondarie:
**Allenamenti** e **Progressi**. I vecchi collegamenti a
`/fitness?tab=weight` vengono reindirizzati a `/weight`.

In **Allenamenti**, il pulsante **Altre attività** è subito sotto il selettore
del giorno, prima delle schede palestra. Apre una finestra con le attività:
la scelta porta al modulo di durata/distanza e salva nella data selezionata.
Le attività già registrate e le sessioni palestra del giorno restano visibili.
Una sessione ancora aperta può essere ripresa anche se iniziata in un altro
giorno. Sessioni recenti e progressi sono nella scheda dedicata.

## Progressi per esercizio

**Fitness → Progressi** legge le ultime **30 sessioni completate**, ordinate
per data dell'allenamento e orario di avvio. Le sessioni aperte non consumano
il limite. Non è uno storico completo: «Migliore nel periodo» si riferisce
soltanto a queste sessioni, non a un record assoluto su tutti gli allenamenti.
Le serie vengono lette a pagine per evitare di troncare storici con oltre
1000 serie tra le sessioni selezionate.

Il selettore distingue esercizio, attrezzo, inclinazione panca (anche vuota
rispetto a 0°), ripetizioni per lato e carico registrato rispetto al corpo
libero. Ogni sessione contribuisce con una serie di riferimento: il carico
più alto e, a pari carico, il maggior numero di ripetizioni. A corpo libero
si usa la serie con più ripetizioni. Le serie non completate o con valori
non validi non entrano nei confronti. Un peso registrato pari a zero resta
distinto dal peso non indicato.

La pagina mostra ultima sessione, migliore serie nel periodo e differenza di
carico (o ripetizioni a corpo libero) rispetto alla sessione precedente.
Il grafico usa un punto per sessione, anche quando ce ne sono due nello
stesso giorno. Con una sola sessione spiega che serve una seconda rilevazione.
Il carico dei manubri è per singolo manubrio, come nel modulo di inserimento.
Non viene calcolato un massimale stimato né un punteggio che mescola carichi
e ripetizioni diverse.

Le **Sessioni recenti** mostrano subito le ultime tre; un pulsante espande
il resto delle 30 caricate. Ogni sessione si apre nella vista dedicata e il
ritorno riapre **Progressi**. Durata totale e stima delle calorie mantengono
lo stesso calcolo delle sessioni del giorno. Gli errori di caricamento hanno
un pulsante **Riprova** e restano distinti da uno storico vuoto.

La riorganizzazione usa tabelle, permessi e dati già esistenti; non richiede
migrazioni o nuove RPC.

Verifica del 28 ottobre: **357 test in 63 file**, build e lint superati con
Node 22. I test coprono navigazione e vecchi indirizzi, apertura/ritorno dalle
sessioni, inserimento delle altre attività, serie di riferimento, varianti,
grafici a corpo libero, più sessioni nello stesso giorno, errori/retry,
richieste superate da un cambio account e caricamento oltre 1000 serie.
Le API e i grafici sono simulati nei test; il controllo visivo su telefono
resta a cura dell'utente.

## Creazione delle schede

In **Fitness → Allenamenti**, crea una scheda per ogni giornata (per esempio
Upper A, Lower A, Upper B e Lower B). Cerca un esercizio per nome italiano,
inglese o attrezzo; se manca, aggiungilo come esercizio personalizzato. Ogni
esercizio ha un numero di serie, una ripetizione minima, un massimo facoltativo
e l'opzione **Ripetizioni per lato/gamba**. Lascia vuote entrambe le ripetizioni
per una serie con obiettivo libero.

Salvando una scheda, gli esercizi personalizzati entrano automaticamente nel
catalogo personale: nelle schede successive puoi cercarli per nome o attrezzo.
Restano disponibili anche eliminando la scheda originale e sono sincronizzati
tra dispositivi. Il recupero iniziale include i personalizzati già presenti
nelle schede e nelle sessioni salvate; nomi e attrezzi uguali, salvo maiuscole
e spazi esterni, non creano duplicati. Per riutilizzare un esercizio, seleziona
il risultato della ricerca; ogni scheda mantiene i propri obiettivi.

Il campo **Serie** può essere cancellato completamente mentre cambi il numero,
senza che compaia uno zero. Per salvare serve un numero intero da 1 a 20.

Con **Usa una panca** puoi aggiungere l'**Inclinazione panca (°)**, facoltativa,
con valori interi da −90° a 90°: 0° indica la panca piana, i valori positivi
quella inclinata e i negativi quella declinata. Il campo viene mostrato subito
per gli esercizi con «panca»/«bench» nel nome e per la shoulder press con
manubri; puoi attivarlo anche per un esercizio personalizzato. L'angolo viene
conservato nella sessione, mostrato durante l'allenamento e copiato nelle
serie aggiuntive. Lasciandolo vuoto l'inclinazione resta non specificata.

Nell’elenco delle schede, le frecce **↑ / ↓** spostano una scheda di una
posizione. L’ordine viene salvato per account e mantenuto tornando alla pagina
o accedendo da un altro dispositivo. Le nuove schede vengono aggiunte in fondo;
modificare una scheda ne conserva la posizione. Con una sola scheda le frecce
non compaiono. Durante il salvataggio i controlli sono disabilitati; se il
salvataggio fallisce, viene ripristinato l’ordine precedente.

Avviando una scheda, l'app crea le serie da registrare. Per ciascuna puoi
modificare peso e ripetizioni effettive e premere **Fatto**. Il peso può restare
vuoto per gli esercizi a corpo libero. L'ultimo peso e le ultime ripetizioni
registrati per lo stesso esercizio, attrezzo e inclinazione vengono proposti
alla sessione successiva. Anche i progressi separano le diverse inclinazioni;
un angolo non specificato rimane distinto da uno 0° esplicito.
Puoi aggiungere o rimuovere serie, riprendere una sessione iniziata e consultare
le sessioni recenti. Modificare o eliminare una scheda non riscrive le sessioni
già registrate.

La sessione si apre in una schermata dedicata all'allenamento: durante
l'esecuzione non compaiono le schede Allenamenti/Progressi, il selettore del giorno
e l'elenco delle altre attività. Viene mostrato un esercizio alla volta. Le
frecce portano all'esercizio precedente o successivo; il riposo parte dopo
ogni serie segnata come fatta, anche dopo l'ultima. Puoi scegliere 1, 1½, 2 o 3
minuti per le serie successive. Il conto alla rovescia resta visibile passando a un altro
esercizio e riprendendo la sessione sullo stesso dispositivo. Puoi terminare
l'allenamento, anche con serie ancora da completare, oppure eliminare la
sessione da qualsiasi esercizio.

Le sessioni completate mostrano la **durata totale** tra avvio e termine
(pause incluse) e le **calorie stimate**. Per il peso corporeo si usa l'ultima
misurazione disponibile entro il giorno della sessione; se manca, si usa il
peso corrente disponibile nell'app. Il calcolo ricava un MET medio dalle sole
serie completate, considerando esercizi e carichi registrati, e lo applica
all'intera durata della sessione, pause incluse. Parte dai valori MET del
[Compendio 2024 per l'allenamento di resistenza](https://pacompendium.com/conditioning-exercise/)
e applica un piccolo correttivo limitato per il carico: i chilogrammi sollevati
da soli non misurano lo sforzo individuale. La stima segue la convenzione
`MET × peso corporeo (kg) × durata (ore)` e non è una misura diretta del
consumo energetico.

Le calorie delle sessioni completate rientrano nella voce **Bruciate** della
panoramica del giorno e nella linea **Bruciato** e nelle medie dello **Storico**
a 7 e 30 giorni, insieme a quelle delle altre attività registrate. Le sessioni
ancora aperte non contribuiscono. Vedi [attività e storico](attivita-e-storico.md)
per i chilometri facoltativi e le verifiche.

## Migrazione e verifiche del 15 ottobre 2026

La migrazione `20261015120000_gym_exercise_catalog_and_bench.sql` crea
`gym_custom_exercises` con accesso limitato al proprietario, recupera i
personalizzati esistenti e aggiunge `bench_angle` alle schede e alle serie.
Il salvataggio della scheda aggiorna il catalogo nella stessa transazione.
Le sessioni precedenti conservano un angolo non specificato. La migrazione
è stata verificata in un database isolato e applicata al Supabase ospitato
il 15 ottobre 2026, dopo un dry-run che elencava soltanto questa migrazione.
L’istanza locale più vecchia non è stata aggiornata. Vedi il
[workflow condiviso](../supabase/README.md).

I 282 test frontend, la compilazione e il controllo del codice sono passati.
I test dell'interfaccia coprono cancellazione e sostituzione delle serie,
ricerca e riuso dei personalizzati, ricaricamento del catalogo, errori di
caricamento e inclinazioni piane/inclinate/declinate. Il test SQL autonomo
`supabase/tests/gym_exercise_catalog_and_bench.sql` richiede un database vuoto
`fittrackr_gym_test_*` e verifica recupero, duplicati, salvataggio atomico,
snapshot, suggerimenti per attrezzo/angolo, compatibilità con i vecchi client,
isolamento degli utenti e permessi.

## Esempio: quattro schede Upper/Lower

Questi sono esempi da inserire nell'editor: non vengono creati automaticamente
nel proprio account. Le alternative separate da «oppure» sono esercizi distinti;
scegli quello che esegui davvero.

### Upper A

| Esercizio cercabile | Serie | Ripetizioni |
|---|---:|---:|
| Barbell Bench Press | 3 | 6–8 |
| Wide-Grip Lat Pulldown | 3 | 8–12 |
| Incline Dumbbell Bench Press | 3 | 8–12 |
| Seated Cable Row | 3 | 8–12 |
| Dumbbell Lateral Raise | 3 | 12–20 |
| Dumbbell Curl | 2 | 10–15 |
| Cable Triceps Pushdown | 2 | 10–15 |

### Lower A

| Esercizio cercabile | Serie | Ripetizioni |
|---|---:|---:|
| Back Squat | 3 | 6–8 |
| Romanian Deadlift | 3 | 8–10 |
| Bulgarian Split Squat | 3 | 8–12 per gamba |
| Leg Extension | 3 | 10–15 |
| Lying Leg Curl | 3 | 10–15 |
| Hanging Knee Raise oppure Reverse Crunch | 3 | Libere |

### Upper B

| Esercizio cercabile | Serie | Ripetizioni |
|---|---:|---:|
| Incline Barbell Bench Press | 3 | 6–10 |
| Lat Machine / Lat Pulldown | 3 | 8–12 |
| Shoulder Press | 3 | 8–12 |
| One-Arm Dumbbell Row oppure One-Arm Cable Row | 3 | 8–12 per lato |
| Dumbbell Lateral Raise | 3 | 12–20 |
| Hammer Curl | 2 | 10–15 |
| Triceps Extension | 2 | 10–15 |

### Lower B

| Esercizio cercabile | Serie | Ripetizioni |
|---|---:|---:|
| Back Squat (carico più leggero) | 3 | 8–10 |
| Romanian Deadlift | 3 | 8–12 |
| Dumbbell Lunges | 3 | 10–12 per gamba |
| Leg Extension | 3 | 12–15 |
| Lying Leg Curl | 3 | 10–15 |
| Hanging Knee Raise oppure Reverse Crunch | 3 | Libere |

Per **Back Squat** di Lower B usa lo stesso esercizio della scheda A e imposta
un obiettivo di ripetizioni diverso: il carico effettivo si inserisce durante
l'allenamento. Per **Shoulder Press** e **Triceps Extension** scegli la variante
di attrezzo che usi. Le sessioni palestra tengono traccia delle serie e dei
carichi e mostrano durata totale e calorie stimate dopo la chiusura; le altre
attività registrano durata e calorie stimate separatamente.
