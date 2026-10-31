# Tour interattivo

Aggiornamento del 31 ottobre 2026. Sostituisce la precedente guida a schermate
di testo con un percorso dimostrativo dentro le pagine effettive dell’app.

## Esperienza

Il tour oscura la pagina, evidenzia il controllo da usare e affianca una breve
spiegazione. Si può premere il pulsante reale illuminato oppure l’azione
equivalente nella guida. I salvataggi avanzano soltanto quando l’operazione
dimostrativa ha prodotto il risultato, senza usare attese artificiali.

I sei argomenti sono selezionabili dal menu della guida:

1. **Ingredienti:** catalogo, codice a barre, foto della confezione/etichetta,
   ricerca e inserimento manuale. Si salva uno yogurt di esempio e lo si vede
   comparire nell’elenco.
2. **Piatti:** creazione di una ricetta con ingredienti, quantità e categorie
   dei pasti. Si salva del riso con zucchine.
3. **Pasti:** scelta del pasto, menu per singolo alimento, composizione e
   ricette, selezione di un piatto salvato, preparazione senza consumo immediato,
   ripresa del piatto pronto e registrazione di una porzione. Il risultato
   compare nel diario, mentre il resto rimane disponibile. Si mostra anche
   il risultato di un’analisi da foto del pasto, già preparato per la demo.
4. **Peso:** registrazione di una pesata di esempio e relativo riepilogo.
5. **Fitness:** creazione di una scheda, spiegazione delle sessioni palestra
   con carichi, serie e ripetizioni e registrazione di una camminata.
6. **Benessere:** apertura dei quadratini delle Buone abitudini e del dettaglio
   con obiettivi giornalieri, finestre di sette giorni e dati incompleti.

**Salta** rimane sempre disponibile; Escape chiude il tour. **Indietro**
ricostruisce il passaggio precedente. Il menu permette di cambiare argomento
senza completare i precedenti: gli esempi necessari vengono predisposti
localmente. Se un elemento non compare entro otto secondi, la guida offre
**Prosegui** e mantiene disponibile l’uscita.

Il posizionamento segue scorrimento, ridimensionamento e viewport visiva.
La scheda di spiegazione può scorrere internamente quando lo spazio è poco.
La tastiera resta tra guida, campi evidenziati e controllo consentito;
le azioni estranee al passaggio sono bloccate. Le animazioni rispettano
la preferenza di movimento ridotto.

## Dati temporanei e isolamento

Le schermate sono gli stessi componenti di produzione, con un contesto
opzionale che sostituisce i servizi soltanto durante il tour. Un nuovo store
in memoria contiene ingredienti, ricette, preparazioni, pasti, peso, schede
ed attività dimostrative. Non si usa localStorage e non si salvano gli esempi
su Supabase. Un’operazione non supportata dalla demo viene rifiutata;
non ricade sui servizi reali.

La foto del pasto usa una stima di esempio: non apre la fotocamera, non
carica immagini e non invoca l’AI. I pulsanti di scansione e foto degli
ingredienti sono mostrati e spiegati; il percorso pratico usa l’inserimento
manuale. I valori del profilo e dei target durante il tour sono anch’essi
esempi, distinti da quelli dell’utente.

Durante il tour un MemoryRouter sostituisce il router principale, senza
annidarlo: la navigazione interna non cambia l’indirizzo `/tutorial` né
aggiunge pagine alla cronologia del browser. Anche la data selezionata ha
un contesto separato. Chiudendo, tutto lo stato dimostrativo viene eliminato.

## Avvio, riapertura e preferenza

Dopo la configurazione iniziale di profilo e obiettivi, un nuovo utente arriva
a `/tutorial`. **Impostazioni → Guida rapida → Rivedi il tutorial** lo riapre
sempre da capo. Al termine o al salto si ritorna a Impostazioni per una
riapertura manuale, oppure a Pasti per il primo utilizzo. Il tasto Indietro
del browser esce dalla dimostrazione rispettando l’indirizzo raggiunto.
Il recupero password mantiene la precedenza e interrompe il tour.

Rimane invariata la preferenza `user_health_profiles.tutorial_seen`, aggiunta
con la migrazione `20261031120000_quick_tutorial.sql`: true per i profili
preesistenti alla migrazione, false come default per quelli nuovi. Saltare
o completare salva true sul profilo corrente, con le policy di proprietà
già esistenti. Questa preferenza è l’unica scrittura reale legata al tour;
la chiusura non dipende dal successo della scrittura. Un errore avvisa che
la guida potrebbe riapparire al prossimo accesso.

Non serve una nuova migrazione per il tour interattivo. La migrazione iniziale
è già applicata al progetto ospitato e copiata identica in Trackr. Il database
applicativo locale mantiene il proprio schema separato.

## Verifica

Il test di integrazione attraversa l’intero percorso sui componenti reali,
controlla ingredienti e piatti comparsi nelle pagine e vieta chiamate HTTP,
Supabase e AI. Altri test coprono clic sul controllo illuminato, cambio
argomento, ritorno indietro, Escape, uscita dal browser, percorso di ritorno
alle impostazioni, priorità del recupero password, focus e ripristino delle
descrizioni accessibili, ricalcolo dopo lo scroll e recupero con target assente.

I test dello store verificano catalogo distinto dal consumo, porzioni e
rimanenze, ripetizione degli esempi senza duplicati, ripartenza con store
vuoto e rifiuto delle operazioni non supportate. I test geometrici verificano
la collocazione su desktop, navigazione mobile, altezza ridotta e spazio
limitato accanto al controllo.

La verifica grafica resta manuale, secondo le istruzioni del repository:
controllare su telefono e desktop che il pannello non copra i pulsanti,
che i moduli scorrano correttamente e che i testi siano leggibili anche con
l’ingrandimento attivo. In questa implementazione non è stato aperto un browser.

Validazione locale del 31 ottobre: suite completa di **542 test in 75 file**
passata; dopo la rifinitura dei bersagli evidenziati sono passati anche
**35 test mirati**, build di produzione e lint senza avvisi. La pubblicazione
del frontend segue il deploy del branch main.
