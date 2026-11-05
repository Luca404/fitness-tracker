# Grafici

Peso, Storico e Progressi palestra usano una scala Y comune, con tacche
equidistanti e leggibili. La densità si adatta all’altezza misurata del
grafico; su desktop i grafici più alti mostrano più riferimenti quando
la scala lo consente. Le etichette non si sovrappongono.

- Peso include misurazioni e obiettivo, con valori al decimo di kg.
- Storico parte da zero e include calorie mangiate, bruciate e target.
- Palestra usa il carico o le ripetizioni della serie di riferimento;
  le ripetizioni hanno solo tacche intere.

Serie costanti, valori nulli e periodi vuoti mantengono limiti validi.
Le misure non vengono modificate o interpolate dal calcolo della scala.

I bordi bianchi al click provenivano dal focus nativo delle superfici SVG.
Mouse e touch non mostrano quei bordi; la navigazione da tastiera mantiene
un contorno verde. I tooltip restano disponibili, con sfondo scuro coerente
su tutti i grafici, insieme alla navigazione con i tasti freccia.

Le utilità sono in `src/utils/chartAxis.ts` e `src/hooks/useChartAxis.ts`.
I test verificano copertura dei valori, passo regolare, densità responsiva,
ripetizioni intere e casi degeneri. Le prove nel browser usano fixture
sintetiche e controllano click, tastiera e dimensioni mobile/desktop.
