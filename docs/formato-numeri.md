# Formato dei numeri

L'app usa il punto come separatore decimale predefinito. In **Impostazioni →
Formato dei numeri** puoi scegliere la virgola. La scelta si applica subito ai
campi numerici, ai riepiloghi, alle regole dei punti e ai valori dei grafici;
resta salvata su quel dispositivo, anche dopo aver ricaricato l'app. Non è
sincronizzata tra dispositivi.

I campi accettano sia punto sia virgola, anche incollando un valore, e mostrano
subito il separatore scelto. Per esempio, con il formato predefinito `12,35`
diventa `12.35`; scegliendo la virgola, `12.35` diventa `12,35`. Non sono
previsti separatori delle migliaia nei campi o nei riepiloghi: `1200` resta
`1200`, per evitare ambiguità con i decimali.

I valori interni e inviati alle API restano numerici; gli input forniscono ai
moduli stringhe con il punto. Cambiare il formato non cambia le quantità o i
calcoli. Gli input delle misure conservano fino a due decimali supportati,
anche quando perdono il focus; le panoramiche continuano a usare numeri interi
e i riepiloghi normalmente al massimo un decimale.

`NumberInput` gestisce il testo in corso di inserimento e la conversione del
separatore. `useNumberFormat` applica la preferenza ai testi e si aggiorna anche
quando la scelta cambia in un'altra scheda. Le funzioni di calcolo restano
indipendenti dalla preferenza. Le parole nei nomi degli alimenti e gli altri
testi inseriti dall'utente non vengono riscritti.
