# Inserimento di ingredienti e piatti

La scelta tra ricerca, codice a barre, foto dell'etichetta e inserimento
manuale usa gli stessi nomi e pulsanti in **Cucina → Ingredienti** e nei
moduli dei pasti. La ricerca è già visibile nei pasti. Quando crei una ricetta,
puoi creare un ingrediente manuale direttamente nel modulo: viene salvato
nel catalogo personale e poi selezionato per la ricetta.

Gli ingredienti del catalogo passano da un'unica schermata di revisione e
salvataggio, indipendentemente dalla fonte. L'inserimento manuale non richiede
più un passaggio «Continua» seguito da una seconda conferma con campi ripetuti.
Nome, categoria e valori si modificano nella stessa schermata. Le foto delle
etichette mantengono la conferma esplicita di aver controllato l'analisi.

I moduli nutrizionali mostrano prima calorie, proteine, carboidrati e grassi.
Zuccheri, grassi saturi dove previsti, fibre e sale sono nei dettagli
**Altri valori nutrizionali (facoltativi)**, inizialmente chiusi. La base è
esplicita: valori per 100 g/ml per il catalogo, valori della porzione per
l'inserimento manuale occasionale. Un campo facoltativo vuoto resta sconosciuto;
zero significa che il valore è noto. Zuccheri e saturi non possono superare
rispettivamente carboidrati e grassi.

La composizione e modifica dei piatti, gli ingredienti aggiunti alle ricette e
la modifica di un singolo alimento riusano la stessa scheda: nome, calorie,
macro, quantità, unità ed eventuali porzioni stimate. Fibre, zuccheri e sale
sono espandibili. Bevande e ingredienti in millilitri mantengono la loro unità;
le porzioni stimate in pezzi restano disponibili per gli alimenti supportati.
Una quantità cancellata o non valida impedisce il salvataggio finché viene
corretta. Rimuovere un altro ingrediente non cancella il valore in modifica.

Dopo aver aggiunto un ingrediente a un piatto, la ricerca torna pronta per il
successivo senza ricaricare il catalogo. I risultati di una ricerca online
superata non sostituiscono quelli della ricerca corrente. I pulsanti di
annullamento e salvataggio sono condivisi tra i principali editor, inclusa
la revisione dei [pasti da foto](pasti-da-foto.md).

## Inserimento dal diario

Nel diario il pulsante fisso **Aggiungi pasto** apre prima la scelta del
momento della giornata, poi due modalità: **Da foto** e **Da ingredienti**.
La seconda riunisce **Un alimento**, **Componi un piatto** e **Crea una ricetta**,
con la stessa grafica e una descrizione di ciò che verrà salvato. Le ricette
già salvate e i piatti pronti sono accessibili direttamente. Il catalogo
include anche [12 nuovi formaggi con fonti](ingredienti-formaggi.md).
L'[ampliamento degli ingredienti di base](ingredienti-base.md) aggiunge altre
84 voci in 17 categorie, incluse cosce e sovracosce di pollo con pelle,
con riferimenti nutrizionali e varianti distinte.

## Shot, distillati e digestivi

Il catalogo bevande include vodka e tequila in shot da 40 ml, gin, rum, whisky,
grappa, brandy, amaro alle erbe, fernet, limoncello, sambuca, amaretto, mirto,
liquore al caffè e crema di whisky. Le porzioni iniziali sono 40 ml, tranne il
limoncello (30 ml); volume e gradazione si possono correggere prima di registrare.
Calorie e macro vengono scalati dal riferimento per 100 ml e le calorie
includono l’energia dell’alcol. I valori sono indicativi: gli alias di marca
aiutano la ricerca del tipo di liquore, senza rappresentarne l’etichetta esatta.

## Note per lo sviluppo e verifica

`IngredientEntryActions`, `NutritionFields`, `IngredientPortionCard` e
`FormActions` sono i componenti comuni. `IngredientQuantityInput` gestisce
quantità, unità, porzioni e validità; `nutritionValidationError` centralizza
i controlli sui nutrienti. Conservare la distinzione tra valori della porzione
e valori per 100 g/ml anche quando si riusano i componenti.

Il 14 ottobre 2026 sono passati 268 test in 56 file, build e lint, insieme
al test SQL isolato della distanza. Le verifiche includono importazione,
nutrienti facoltativi, quantità vuote, bevande, porzioni, modifiche e reset
della ricerca. I test dei moduli usano dati simulati; non verificano la grafica
su dispositivi reali. L'utente esegue il controllo visivo, senza sessioni di
browser aperte dall'agente.
