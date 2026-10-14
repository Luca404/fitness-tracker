# Distanza delle attività e calorie nello storico

In **Fitness → Allenamenti**, Camminata, Corsa, Ciclismo e Tapis roulant
permettono di inserire anche la **Distanza (km, facoltativa)**. La durata resta
obbligatoria; lasciando vuoti i chilometri si usa la stima precedente basata
sul tipo di attività, sulla durata e sul peso corporeo.

Con i chilometri, l'app mostra la velocità media e sceglie un MET dalla fascia
di velocità corrispondente. Per esempio, una camminata di 60 minuti e 5 km usa
la fascia di 5 km/h. La formula resta `MET × peso (kg) × durata (ore)`,
arrotondata alle calorie intere. La distanza viene salvata e mostrata accanto
alla durata nell'elenco. I workout precedenti restano validi senza distanza;
le calorie già registrate non vengono ricalcolate.

Le fasce derivano dal Compendio 2024 per
[camminata](https://pacompendium.com/walking/),
[corsa](https://pacompendium.com/running/) e
[bicicletta](https://pacompendium.com/bicycling/), con soglie convertite e
arrotondate in km/h. Il tapis roulant usa le fasce di camminata senza pendenza
e quelle di corsa da 9,7 km/h. Sono stime su percorso pianeggiante: dislivello,
carichi, resistenza e differenze individuali non sono misurati. L'app segnala
distanze non valide o velocità medie oltre i limiti di inserimento previsti.

In **Storico**, sia il grafico a 7 giorni sia quello a 30 giorni includono
nelle calorie **Bruciato** le attività registrate e le sessioni di palestra
completate. Anche la media giornaliera comprende entrambe. Le sessioni ancora
aperte non contribuiscono. Il calcolo palestra è lo stesso della panoramica
quotidiana: usa serie completate, durata totale e ultima pesata disponibile
entro il giorno della sessione, con il peso corrente come ripiego. Vedi
[la guida palestra](allenamenti-palestra.md). Le calorie bruciate non aumentano
il budget alimentare.

## Verifiche del 14 ottobre 2026

La migrazione `20261014120000_workout_distance` aggiunge soltanto
`workouts.distance_km`, nullable con vincolo `0 < km <= 1000`. È stata applicata
al database online dopo un dry-run che elencava solo questa migrazione, e al
database locale dopo un backup privato. È identica nei due repository che
condividono il database. Non aggiorna il resto dello schema locale più vecchio.

I controlli automatici coprono stime con e senza distanza, dati incoerenti,
errori di salvataggio, reset del modulo, caricamento delle serie palestra e
somma nello storico con peso storico. Il test SQL è passato in un database
isolato: verifica distanza decimale, compatibilità con NULL e rifiuto di zero,
negativi, valori oltre il limite, NaN e infinito. Nessun dato applicativo è
stato usato come fixture.

Per richiesta dell'utente, non sono state aperte pagine nel browser per
verificare la grafica. Il controllo visivo resta all'utente.
