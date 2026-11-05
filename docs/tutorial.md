# Tour interattivo

Il tutorial usa le pagine effettive dell’app con dati temporanei. Il percorso
è composto da **22 azioni e spiegazioni**, raccolte in sei argomenti.

## Percorso

1. **Ingredienti:** l’utente apre Cucina dal menu, tocca Aggiungi ingrediente
   e legge le modalità di inserimento: codice a barre, foto con AI e manuale.
2. **Piatti:** l’utente cambia scheda, apre una ricetta di esempio e la salva
   dal modulo. Il risultato rimane visibile fino al clic su Continua.
3. **Pasti:** l’utente apre il diario, aggiunge un pasto, sceglie Pranzo e
   vede le modalità di registrazione. Apre la ricetta salvata, prepara una
   quantità da conservare e controlla il risultato prima di continuare.
   Chiude poi il pannello con la X evidenziata.
4. **Peso:** l’utente cambia pagina dal menu e salva una pesata di esempio.
   Il riepilogo resta visibile fino al clic su Continua.
5. **Fitness:** l’utente apre Fitness, crea e salva una scheda di esempio.
   La guida spiega anche Altre attività e la registrazione dei carichi.
6. **Benessere:** l’utente torna ai Pasti e apre Buone abitudini dai quadratini
   del riepilogo, poi termina la guida.

Il menu degli argomenti permette di saltare liberamente a un capitolo.
**Salta** ed Escape chiudono il tour; **Indietro** ripristina il passaggio
precedente. Se un elemento non compare entro otto secondi, **Salta passaggio**
permette di continuare: il timeout non fa avanzare il percorso.
Il tutorial rimane riavviabile da **Impostazioni → Rivedi il tutorial**.

## Clic e navigazione

Le azioni richieste si eseguono sui comandi reali dell’app: collegamenti del
menu, schede, pulsanti e campi dei moduli. La guida non simula clic e non
cambia pagina autonomamente. Le spiegazioni hanno un pulsante Ho capito;
i salvataggi mostrano il risultato e richiedono un ulteriore Continua.
Le azioni estranee al passaggio restano bloccate.

L’avanzamento dopo un clic attende la conclusione dell’evento nativo,
compresi i gestori React. Un microtask eseguito durante la cattura poteva
anticipare il gestore del comando nel browser, facendo avanzare la guida
senza eseguire l’azione.

Un MemoryRouter sostituisce il router principale durante la dimostrazione.
I comandi navigano tra le pagine della demo senza modificare l’indirizzo
reale `/tutorial` né la cronologia del browser. Il percorso normale conserva
lo stato delle pagine; Indietro e la selezione di un argomento ricostruiscono
esplicitamente la scena richiesta. Data e dati usano contesti separati.

## Grafica e scorrimento

La guida occupa uno spazio riservato: sopra l’app su telefono e tablet,
a destra da 1440 px. App e modali si adattano allo spazio rimanente, senza
sovrapporre guida e comandi. Sui display piccoli il testo della guida scorre
al suo interno, mantenendo disponibili i controlli. L’altezza segue il
viewport visibile e l’apertura della tastiera.

L’evidenziazione segue il bersaglio durante resize e scorrimento. Scorre
soltanto i pannelli interni, senza scrollIntoView sul documento. Body e
radice restano bloccati durante il tour; all’uscita lo scroll torna a zero
e vengono ripristinati stili, attributi e variabili CSS precedenti.
Le animazioni rispettano il movimento ridotto. La tastiera resta tra guida,
campi evidenziati e azione consentita.

## Isolamento e preferenza

Lo store della dimostrazione è creato a ogni avvio e scartato all’uscita.
I salvataggi di esempio non usano Supabase o localStorage. Un’operazione
non supportata viene rifiutata senza ricadere sui servizi reali.
Fotocamera e AI non vengono invocate dal percorso.

Al primo utilizzo il tour segue la configurazione di profilo e obiettivi.
Saltare o completare imposta `user_health_profiles.tutorial_seen` a true:
è l’unica scrittura reale del tour. Se fallisce, la chiusura resta possibile
e un messaggio avvisa che la guida potrebbe riapparire. La riapertura manuale
ritorna a Impostazioni, il primo utilizzo a Pasti. Il recupero password
mantiene la precedenza. Indietro del browser esce rispettando l’indirizzo
raggiunto. Non servono nuove migrazioni.

## Verifica

I test percorrono tutti i passaggi usando pagine, moduli e router reali,
con chiamate HTTP, Supabase e AI vietate durante la demo. Verificano i clic
sui comandi, l’attesa dopo i salvataggi, Indietro, cambio argomento, tastiera,
recupero di bersagli mancanti e ripristino del layout all’uscita.
Il test dell’app completa copre anche riapertura, chiusura e navigazione
successiva, mantenendo l’indirizzo reale su `/tutorial` durante la prova.

La verifica nel browser usa Chromium e dati simulati per controllare il
percorso completo su mobile e desktop, geometria dei comandi, screenshot,
console e ripristino dell’app all’uscita. Il plugin Browser non è disponibile;
la verifica usa Playwright. Gli artefatti temporanei restano fuori dal repository.

Verifica del 5 novembre 2026: **566 test in 80 file** passati, build e lint
riusciti. Percorso completo su 390×844 e 1440×900, controlli di resize su
320×568, 768×1024, 1024×768 e 1280×800, senza errori in console. Verificati
anche assenza di chiamate reali durante la prova e ripristino delle variabili
del layout dopo l’uscita. Altri browser e tastiere virtuali restano da provare.
