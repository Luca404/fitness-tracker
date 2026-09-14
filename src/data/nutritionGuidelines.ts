// Linee guida nutrizionali di riferimento (sale, zuccheri liberi, alcol, prodotti
// ultra-processati, carne, verdura, frutta, legumi, pesce, fibra) da enti
// europei/sovranazionali, per adulti.
//
// Fonti:
// - LARN (Livelli di Assunzione di Riferimento di Nutrienti ed energia), SINU/CREA,
//   IV Revisione 2014, valori confermati nella V Revisione 2024.
// - EFSA (European Food Safety Authority), Dietary Reference Values for sodium
//   and chloride, EFSA Journal 2019;17(9):5778.
// - CREA, Linee guida per una sana alimentazione, edizione 2018 (piramide
//   alimentare CREA-Nut e 13 raccomandazioni pratiche). Per gli ultra-processati
//   è data solo un'indicazione qualitativa, nessuna soglia numerica pubblicata.
//
// Nota: nessuna di queste fonti pubblica una soglia SETTIMANALE ufficiale per
// sale/zuccheri/alcol (a differenza es. delle linee guida UK-NHS sull'alcol, non
// usate qui) — per quei nutrienti `period` resta 'day'. Carne, legumi e pesce
// sono invece espressi nativamente a porzioni/settimana dalla fonte CREA, quindi
// `period` è 'week'. Eventuali avvisi settimanali derivati da un valore
// giornaliero (es. x7) vanno trattati come regola applicativa, non come dato
// ufficiale a sé stante.
import type { Sex } from '../types'

export type GuidelineNutrient =
  | 'salt' | 'free_sugars' | 'alcohol' | 'ultra_processed_food'
  | 'red_meat' | 'processed_meat' | 'vegetables' | 'fruit' | 'legumes' | 'fish' | 'fiber'
export type GuidelineUnit = 'g' | 'g_ethanol' | 'percent_energy' | null
export type GuidelineDirection = 'max' | 'min'
export type GuidelinePeriod = 'day' | 'week'

export interface NutritionGuideline {
  nutrient: GuidelineNutrient
  label: string
  source: string
  sex: Sex | 'all'
  ageMin: number
  ageMax: number | null
  direction: GuidelineDirection
  period: GuidelinePeriod
  limitValue: number | null
  limitUnit: GuidelineUnit
  /** Per voci espresse nativamente a porzioni (carne, pesce, legumi). */
  portionGrams?: number
  portionsPerPeriod?: number
  notes: string
}

export const NUTRITION_GUIDELINES: NutritionGuideline[] = [
  {
    nutrient: 'salt',
    label: 'Sale',
    source: 'LARN 2014 (IV Rev.) + EFSA 2019',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'max',
    period: 'day',
    limitValue: 5,
    limitUnit: 'g',
    notes: 'Soglia massima di sicurezza LARN (SDT) = 5g sale/die (2g sodio/die); AI di riferimento LARN più prudente = 3.75g sale/die (1500mg sodio). EFSA 2019 converge sullo stesso valore pratico: AI = 2.0g sodio/die (~5g sale) + 3.1g cloruro/die. Nessuna distinzione per sesso negli adulti.',
  },
  {
    nutrient: 'free_sugars',
    label: 'Zuccheri liberi',
    source: 'LARN (IV Rev. 2014, confermato V Rev. 2024)',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'max',
    period: 'day',
    limitValue: 15,
    limitUnit: 'percent_energy',
    notes: 'Obiettivo nutrizionale: zuccheri semplici (inclusi quelli naturalmente presenti in latte e frutta, oltre a quelli aggiunti) non oltre il 15% dell\'energia totale giornaliera. Nota: l\'OMS raccomanda un valore più stringente (<10%, idealmente <5%), non usato qui perché la fonte scelta per questo dataset è LARN/EFSA.',
  },
  {
    nutrient: 'alcohol',
    label: 'Alcol (uomo adulto)',
    source: 'LARN / Ministero della Salute',
    sex: 'male',
    ageMin: 18,
    ageMax: 64,
    direction: 'max',
    period: 'day',
    limitValue: 36,
    limitUnit: 'g_ethanol',
    notes: 'Consumo moderato: fino a 2-3 Unità Alcoliche/die (1 UA ≈ 12g etanolo, es. un bicchiere piccolo di vino da 125ml o una birra da 330ml a media gradazione).',
  },
  {
    nutrient: 'alcohol',
    label: 'Alcol (donna adulta)',
    source: 'LARN / Ministero della Salute',
    sex: 'female',
    ageMin: 18,
    ageMax: 64,
    direction: 'max',
    period: 'day',
    limitValue: 24,
    limitUnit: 'g_ethanol',
    notes: 'Consumo moderato: fino a 1-2 Unità Alcoliche/die (1 UA ≈ 12g etanolo).',
  },
  {
    nutrient: 'alcohol',
    label: 'Alcol (anziano, 65+)',
    source: 'LARN / Ministero della Salute',
    sex: 'all',
    ageMin: 65,
    ageMax: null,
    direction: 'max',
    period: 'day',
    limitValue: 12,
    limitUnit: 'g_ethanol',
    notes: 'Consumo moderato: fino a 1 Unità Alcolica/die (1 UA ≈ 12g etanolo), stesso limite per entrambi i sessi dopo i 65 anni.',
  },
  {
    nutrient: 'ultra_processed_food',
    label: 'Prodotti ultra-processati/confezionati',
    source: 'CREA, Linee guida per una sana alimentazione 2018',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'max',
    period: 'day',
    limitValue: null,
    limitUnit: null,
    notes: 'Nessuna soglia numerica ufficiale pubblicata: la raccomandazione CREA è puramente qualitativa ("consumo da limitare a occasioni saltuarie, non quotidiano"). Un eventuale avviso applicativo dovrà quindi basarsi su una regola arbitraria definita in fase di design, non su un valore di riferimento ufficiale.',
  },
  {
    nutrient: 'red_meat',
    label: 'Carne rossa',
    source: 'CREA, piramide alimentare CREA-Nut 2018',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'max',
    period: 'week',
    limitValue: 200,
    limitUnit: 'g',
    portionGrams: 100,
    portionsPerPeriod: 2,
    notes: 'Non più di 2 porzioni da 100g a settimana (200g/settimana totali). Coerente con la classificazione IARC/OMS della carne rossa come probabile cancerogeno in eccesso.',
  },
  {
    nutrient: 'processed_meat',
    label: 'Carne trasformata / salumi',
    source: 'CREA, piramide alimentare CREA-Nut 2018',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'max',
    period: 'week',
    limitValue: 50,
    limitUnit: 'g',
    portionGrams: 50,
    portionsPerPeriod: 1,
    notes: 'Non più di 1 porzione da 50g a settimana. Categoria distinta dalla carne rossa fresca: include salumi, affettati, insaccati, würstel.',
  },
  {
    nutrient: 'vegetables',
    label: 'Verdura',
    source: 'CREA, Linee guida per una sana alimentazione 2018',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'min',
    period: 'day',
    limitValue: 400,
    limitUnit: 'g',
    notes: 'Almeno 400g/giorno (range raccomandato CREA 400-500g/giorno), come parte delle "5 porzioni al giorno" di frutta e verdura combinate.',
  },
  {
    nutrient: 'fruit',
    label: 'Frutta',
    source: 'CREA, Linee guida per una sana alimentazione 2018',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'min',
    period: 'day',
    limitValue: 360,
    limitUnit: 'g',
    notes: 'Almeno 360g/giorno (range raccomandato CREA 360-450g/giorno), come parte delle "5 porzioni al giorno" di frutta e verdura combinate.',
  },
  {
    nutrient: 'legumes',
    label: 'Legumi',
    source: 'CREA, Linee guida per una sana alimentazione 2018',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'min',
    period: 'week',
    limitValue: 450,
    limitUnit: 'g',
    portionGrams: 150,
    portionsPerPeriod: 3,
    notes: 'Almeno 3 porzioni da 150g (legumi cotti/freschi/surgelati/in scatola) a settimana = 450g/settimana. Equivalente da secchi: 50g a porzione (150g/settimana secchi).',
  },
  {
    nutrient: 'fish',
    label: 'Pesce',
    source: 'CREA, Linee guida per una sana alimentazione 2018',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'min',
    period: 'week',
    limitValue: 300,
    limitUnit: 'g',
    portionGrams: 150,
    portionsPerPeriod: 2,
    notes: 'Almeno 2 porzioni da 150g di pesce fresco/surgelato (inclusi molluschi/crostacei) a settimana = 300g/settimana. Equivalente in scatola: 50g a porzione, 1 volta a settimana.',
  },
  {
    nutrient: 'fiber',
    label: 'Fibra alimentare',
    source: 'LARN 2014 (IV Rev.)',
    sex: 'all',
    ageMin: 18,
    ageMax: null,
    direction: 'min',
    period: 'day',
    limitValue: 25,
    limitUnit: 'g',
    notes: 'Assunzione Adeguata (AI) minima 25g/giorno; il range di riferimento LARN è 12.6-16.7g ogni 1000kcal assunte, quindi il fabbisogno reale scala con il dispendio energetico individuale.',
  },
]

export function getGuideline(
  nutrient: GuidelineNutrient,
  sex: Sex,
  age: number
): NutritionGuideline | undefined {
  return NUTRITION_GUIDELINES.find(g =>
    g.nutrient === nutrient &&
    (g.sex === 'all' || g.sex === sex) &&
    age >= g.ageMin &&
    (g.ageMax === null || age <= g.ageMax)
  )
}
