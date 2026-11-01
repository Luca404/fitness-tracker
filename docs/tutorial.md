# Tour interattivo

Revisione del 1 novembre 2026: **8 passaggi**, al posto dei precedenti 29.
Il tour usa le pagine effettive dell’app con dati temporanei.

## Percorso breve

1. **Cucina:** il clic sul collegamento evidenziato apre la dimostrazione
   degli ingredienti, mantenendo l’indirizzo reale `/tutorial`.
2. **Ingredienti:** codice a barre, foto della confezione/etichetta con AI
   oppure inserimento manuale. Non compare più «Cerca alimento base».
3. **Piatti:** una ricetta già compilata mostra ingredienti e quantità;
   il pulsante della guida salva l’esempio in memoria.
4. **Preparazione:** si sceglie quanto mangiare subito. L’esempio conserva
   tutto per dopo e rende disponibile il piatto pronto.
5. **Pasti:** si mostrano le modalità Da foto e Da ingredienti e si spiegano
   singoli alimenti, piatti composti, ricette salvate e porzioni pronte.
   Le foto AI sono indicate per i pasti di cui non si conoscono gli ingredienti.
6. **Peso:** si salva una pesata di esempio con la sua data.
7. **Fitness:** una scheda compilata mostra serie e ripetizioni; la spiegazione
   cita sessioni con carichi e Altre attività con durata e distanza.
8. **Benessere:** il dettaglio delle Buone abitudini e gli obiettivi degli
   ultimi sette giorni, accessibili dai quadratini in Pasti.

Il menu conserva i sei argomenti principali, selezionabili liberamente.
**Salta** ed Escape chiudono il tour; **Indietro** torna al passaggio precedente.
Se un elemento non compare entro otto secondi, **Prosegui** permette di continuare.
Il tour rimane riavviabile da **Impostazioni → Rivedi il tutorial**.

## Navigazione e scorrimento

I clic sui collegamenti guidati vengono annullati prima dell’azione nativa
ed avanzano direttamente alla scena successiva: non eseguono la navigazione
reale del browser. I salvataggi richiesti dal percorso usano invece i servizi
in memoria ed avanzano dopo l’operazione. Le altre azioni della pagina restano
bloccate, mantenendo disponibili guida e campi evidenziati.

Durante il tour un MemoryRouter sostituisce il router principale senza essere
annidato. Le pagine dimostrative non entrano nella cronologia del browser.
La data selezionata e i dati hanno contesti separati da quelli dell’app reale.

L’evidenziazione scorre soltanto i pannelli interni: non usa scrollIntoView,
che poteva spostare anche il documento. Lo scorrimento di body e radice è
bloccato durante il tour; all’uscita viene riportato a zero e gli stili
precedenti vengono ripristinati. La struttura principale dell’app rimane
ancorata al viewport, con lo scorrimento nei contenuti, così logo e impostazioni
non vengono trascinati fuori dallo schermo dopo il tour.

La spiegazione segue resize e scorrimento e resta utilizzabile anche quando
il bersaglio è ampio. Le animazioni rispettano il movimento ridotto.
La tastiera rimane tra guida, campi evidenziati e azione consentita.

## Isolamento e preferenza

Lo store della dimostrazione è creato ad ogni avvio e scartato all’uscita.
I salvataggi di esempio non usano Supabase o localStorage. Un’operazione non
supportata viene rifiutata senza ricadere sui servizi reali. Fotocamera e AI
non vengono invocate dal percorso. La ricerca degli alimenti di base resta
nei moduli per comporre pasti e piatti; gli ingredienti base già salvati nel
catalogo personale restano modificabili.

Al primo utilizzo il tour segue la configurazione di profilo e obiettivi.
Saltare o completare imposta la preferenza esistente
`user_health_profiles.tutorial_seen` a true sul profilo dell’utente: è l’unica
scrittura reale del tour. La chiusura resta possibile se il salvataggio della
preferenza fallisce; un messaggio avvisa che la guida potrebbe riapparire.
Una riapertura manuale ritorna a Impostazioni, il primo utilizzo a Pasti.
Il recupero password mantiene la precedenza. Indietro del browser esce dal
tour rispettando l’indirizzo raggiunto.

Non servono nuove migrazioni: `20261031120000_quick_tutorial.sql` rimane già
applicata al progetto ospitato e copiata in Trackr. Il database locale mantiene
il proprio schema separato.

## Verifica

Due test di regressione hanno riprodotto i difetti della versione precedente:
link evidenziato non annullato prima dell’azione nativa e scorrimento globale
non gestito all’uscita. Passano con la nuova gestione.

Il test dell’app completa usa i router e le pagine reali: Impostazioni → tour →
Cucina → Salta → Impostazioni → Pasti, poi ripete il tour e lo chiude con Escape.
Verifica indirizzo reale fermo su `/tutorial` durante la demo, pulizia degli
stili e dello scroll, presenza di logo e impostazioni e normale navigazione
successiva. Il test dell’intero percorso verifica otto passaggi e nessuna
chiamata HTTP, Supabase o AI. Gli altri test coprono tastiera, ritorno indietro,
cambio argomento, target mancanti e scorrimento limitato ai pannelli.

La verifica grafica su telefono e desktop resta manuale, secondo le istruzioni
del repository. Non è stata aperta una sessione browser dall’agente.

Verifica finale del 1 novembre 2026: **547 test in 77 file** passati con
`npm test -- --run --maxWorkers=4`. Build di produzione e lint fanno parte
dei controlli prima del push.
