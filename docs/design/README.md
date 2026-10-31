# fitTrackr — diario personale

La direzione visiva è un diario editoriale scuro: titoli serif, controlli essenziali,
verde salvia e superfici piatte. Il riferimento principale è `fittrackr-desktop.png`.

## Sistema

- Colori: pagina `#161c17`, navigazione `#131813`, superficie `#1d241d`,
  bordo `#343c34`, testo `#f3f4ec`, secondario `#aab4a5`, accento `#d4e6a3`.
  Macronutrienti: salvia, terracotta `#c79278`, grano `#d5bd75`.
- Titoli: Georgia; interfaccia: system sans. Titolo pagina 56 px desktop / 36 px
  mobile, titoli sezione 24 px, controlli 14–18 px, note 12 px. Numeri tabulari.
- Spazi: 4, 8, 12, 16, 24, 32, 48 px. Raggio controlli 10 px, pannelli 18 px.
- Icone: SVG outline, viewBox 24, tratto 1.7, estremità arrotondate, currentColor.
  Le emoji sono riservate ai dati alimentari e alle attività già esistenti.
- Desktop da 1024 px: barra laterale 252 px, contenitore massimo 1350 px,
  margini 32–48 px, energia e macro affiancati. Mobile: testata compatta,
  navigazione in basso, riepilogo verticale, nessun contenuto coperto dai comandi.
- Componenti: navigazione, PageHeader, DaySelector, NutritionSummary,
  righe del diario, banda delle abitudini, pulsanti e campi condivisi.
  Liste aperte con separatori; pannelli solo per gruppi di dati e form.
- Nessuna foto decorativa, gradiente, bagliore o ombra pesante. Il prodotto
  usa dati reali; i valori del concept sono esclusivamente esemplificativi.
- Stati hover/focus visibili, target touch almeno 44 px, movimento ridotto
  rispettato. Non cambiano calcoli nutrizionali o contratti dei servizi.

## Superfici e testo

Pasti: «Pasti», «Il tuo diario alimentare.», selettore data, «Energia di oggi»,
«Consumate», «Obiettivo», «Rimanenti», «Macronutrienti», «Proteine»,
«Carboidrati», «Grassi», «Buone abitudini», conteggio reale delle abitudini,
«Legumi e pesce: media degli ultimi 7 giorni», «I pasti di oggi»,
«Aggiungi pasto», pasti registrati e «Nutrienti extra».

Navigazione: Pasti, Benessere, Fitness, Cucina, Peso, Storico, Impostazioni.
Su mobile Benessere è raggiungibile dalla banda nel diario.
Fitness e Cucina conservano le rispettive tab e tutti i flussi esistenti.
Le schermate secondarie e i dialoghi ereditano gli stessi token e controlli.

Le differenze intenzionali rispetto ai dati disegnati sono data selezionata,
valori calcolati, contenuto del diario e stati vuoti. Il dettaglio delle abitudini
mantiene categorie, soglie e stato accessibile reali invece dei glifi decorativi
inventati nel concept. L’ordine del diario resta dal più recente, come nel
prodotto esistente; i piatti conservano le icone scelte dall’utente. Le
lievi variazioni pittoriche dei concept sono rese con superfici piatte,
come richiesto dal brief. La voce «Nutrienti extra» espone i dati già disponibili.
