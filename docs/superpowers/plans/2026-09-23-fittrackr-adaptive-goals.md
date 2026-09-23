# fitTrackr — Goal calorici adattivi

> Stato: implementato, testato, migrazioni applicate al database remoto e codice
> pubblicato su `main`; aggiornato il 23 settembre 2026.

## Obiettivo

Mantenere calorie e macronutrienti coerenti con l'andamento reale del peso senza
farli oscillare per una singola pesata, conservando sia il ricalcolo manuale sia
la possibilità di modificare i dati del profilo dopo l'onboarding.

## Pipeline nutrizionale

- [x] BMR con formula Mifflin-St Jeor o override esplicito.
- [x] TDEE tramite moltiplicatore del livello di attività.
- [x] Mantenimento sul TDEE e surplus massa di 250 kcal/giorno.
- [x] Ricomposizione corporea con deficit del 10% del TDEE, senza richiedere
  peso o data obiettivo: il peso può rimanere stabile.
- [x] Ricomposizione con proteine a 1,9 g/kg del peso di riferimento quando si
  pratica allenamento di forza; avviso esplicito quando non lo si pratica.
- [x] Deficit dimagrimento derivato da peso/data obiettivo.
- [x] Limite del ritmo allo 0,75% del peso a settimana e del deficit al 25% del TDEE.
- [x] Soglie caloriche prudenziali configurate per sesso.
- [x] Proteine in g/kg differenziate per obiettivo e allenamento di forza.
- [x] Peso corretto per il calcolo proteico quando il BMI è elevato.
- [x] Grassi a 0,8 g/kg, riducibili a 0,6 g/kg se necessario.
- [x] Carboidrati assegnati alle calorie residue, con avviso se bassi rispetto
  al livello di attività.

I parametri sono centralizzati in `src/config/nutritionGoals.ts`; la pipeline è
implementata in `src/utils/bmr.ts`.

## Ricalcolo automatico dal peso

- [x] Finestra mobile degli ultimi 7 giorni di calendario.
- [x] Media delle pesate disponibili nella finestra.
- [x] Minimo di 2 misurazioni: una pesata isolata non attiva il ricalcolo.
- [x] Trigger quando lo scostamento assoluto dalla base dell'ultimo calcolo è
  maggiore o uguale al 2%.
- [x] Al trigger viene rieseguita l'intera pipeline: BMR → TDEE → calorie →
  proteine → grassi → carboidrati.
- [x] Controllo eseguito dopo salvataggio/eliminazione di una pesata e al
  caricamento del profilo.
- [x] Notifica all'utente quando i target vengono aggiornati automaticamente.
- [x] Un errore del ricalcolo non annulla una pesata già salvata.
- [x] Pulsante manuale “Ricalcola da TDEE” mantenuto; usa la media mobile quando
  sono presenti abbastanza misurazioni.

La decisione del trigger è isolata e testata in
`src/utils/goalRecalculation.ts`.

## Persistenza

- [x] `user_goals.calculation_weight_kg` conserva il peso usato dall'ultimo
  calcolo salvato.
- [x] Migrazione
  `20260922200000_auto_recalculate_weight_goals.sql` applicata al database remoto.
- [x] Migrazione `20260923120000_add_recomposition_objective.sql` applicata al
  database remoto per consentire il quarto obiettivo.
- [x] Backfill basato sull'ultima pesata disponibile alla data di aggiornamento
  dei goal, con fallback al peso del profilo.
- [x] RPC `complete_health_onboarding` aggiornata per salvare profilo e target
  insieme anche dal nuovo editor.

## Modifica dei dati di calcolo

- [x] Azione “Modifica dati” nella pagina Impostazioni.
- [x] Modifica di età, sesso, altezza, percentuale di grasso opzionale, livello
  di attività, allenamento regolare di forza/pesi e obiettivo.
- [x] Peso e data obiettivo disponibili quando pertinenti.
- [x] Per la ricomposizione peso e data obiettivo non sono richiesti né mostrati.
- [x] Validazione del target di dimagrimento rispetto al peso corrente e della
  data obiettivo.
- [x] Salvataggio dei dati seguito dal ricalcolo immediato dell'intera pipeline.
- [x] Allenamento di forza rimosso come controllo separato e integrato nello
  stesso passaggio di modifica profilo.

## Verifica

- [x] Test della media mobile, del minimo di campioni e della soglia esatta del 2%.
- [x] Test d'integrazione del ricalcolo automatico e del salvataggio profilo.
- [x] Suite completa: 90 test superati al 23 settembre 2026.
- [x] ESLint e build di produzione completati senza errori.
