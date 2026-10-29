// Alimenti base italiani comuni, valori nutrizionali per 100 g
// (100 ml per le bevande).
// Per gli ingredienti da cuocere, peso e valori si riferiscono all'alimento crudo
// (o secco, nel caso di cereali e legumi), salvo diversa indicazione nel nome.
// Fonte: valori medi indicativi (uso da tracker personale, non clinico).
// Ampliamento del 29 ottobre 2026: CREA e Banca dati svizzera v7.1;
// riferimenti per ingrediente e conversioni in docs/ingredienti-base.md.
// Il peso è della parte edibile: escludere ossa, gusci e altri scarti.
import type { FoodCategory } from '../types'
import { ALCOHOLIC_DRINKS } from './alcoholicDrinks'
import { BASIC_FOOD_EXTENDED_NUTRITION } from './basicFoodExtendedNutrition'

export interface BasicFood {
  id: string
  name: string
  aliases?: string[]
  alcohol_abv?: number
  serving_ml?: number
  cocktail?: boolean
  category: FoodCategory
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sugars_g: number
  salt_g: number
}

const BASIC_FOODS_BASE: Omit<BasicFood, 'fiber_g' | 'sugars_g' | 'salt_g'>[] = [
  // Cereali e derivati
  { id: 'riso-bianco', name: 'Riso bianco', aliases: ['riso bianco crudo'], category: 'grain', calories: 360, protein_g: 6.7, carbs_g: 80, fat_g: 0.6 },
  { id: 'riso-basmati', name: 'Riso basmati', aliases: ['riso basmati crudo'], category: 'grain', calories: 356, protein_g: 8.9, carbs_g: 77.8, fat_g: 0.9 },
  { id: 'riso-integrale', name: 'Riso integrale', aliases: ['riso integrale crudo'], category: 'grain', calories: 370, protein_g: 7.9, carbs_g: 77.2, fat_g: 2.9 },
  { id: 'pasta-semola', name: 'Pasta di semola', aliases: ['pasta secca'], category: 'grain', calories: 353, protein_g: 13, carbs_g: 71.7, fat_g: 1.5 },
  { id: 'pasta-integrale', name: 'Pasta integrale', category: 'grain', calories: 348, protein_g: 14.6, carbs_g: 66.2, fat_g: 2.5 },
  { id: 'pasta-uovo', name: 'Pasta all\'uovo', category: 'grain', calories: 366, protein_g: 14.2, carbs_g: 68, fat_g: 4.2 },
  { id: 'pane-bianco', name: 'Pane bianco', category: 'bakery', calories: 265, protein_g: 9.0, carbs_g: 49, fat_g: 3.2 },
  { id: 'pane-integrale', name: 'Pane integrale', category: 'bakery', calories: 247, protein_g: 13, carbs_g: 41, fat_g: 3.4 },
  { id: 'avena-fiocchi', name: 'Avena in fiocchi', category: 'grain', calories: 389, protein_g: 17, carbs_g: 66, fat_g: 7.0 },
  { id: 'quinoa', name: 'Quinoa', category: 'grain', calories: 368, protein_g: 14.1, carbs_g: 64.2, fat_g: 6.1 },
  { id: 'farro', name: 'Farro', category: 'grain', calories: 335, protein_g: 15.1, carbs_g: 67.1, fat_g: 2.5 },
  { id: 'orzo-perlato', name: 'Orzo perlato', category: 'grain', calories: 352, protein_g: 9.9, carbs_g: 77.7, fat_g: 1.2 },
  { id: 'couscous', name: 'Couscous', category: 'grain', calories: 376, protein_g: 12.8, carbs_g: 77.4, fat_g: 0.6 },
  { id: 'grissini', name: 'Grissini', category: 'bakery', calories: 431, protein_g: 11, carbs_g: 71, fat_g: 11 },
  { id: 'fette-biscottate', name: 'Fette biscottate', category: 'bakery', calories: 408, protein_g: 10, carbs_g: 76, fat_g: 8.0 },
  { id: 'cracker', name: 'Cracker', category: 'bakery', calories: 440, protein_g: 10, carbs_g: 70, fat_g: 13 },
  { id: 'farina-00', name: 'Farina 00', category: 'grain', calories: 340, protein_g: 10, carbs_g: 76, fat_g: 1.0 },
  { id: 'patate-fritte', name: 'Patate fritte', category: 'grain', calories: 312, protein_g: 3.4, carbs_g: 41, fat_g: 15 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'riso-venere', name: 'Riso Venere', aliases: ['riso nero'], category: 'grain', calories: 355, protein_g: 7.8, carbs_g: 80.4, fat_g: 1.3 },
  { id: 'riso-parboiled', name: 'Riso parboiled', category: 'grain', calories: 338, protein_g: 7.4, carbs_g: 81.3, fat_g: 0.3 },
  { id: 'miglio', name: 'Miglio decorticato', aliases: ['miglio'], category: 'grain', calories: 342, protein_g: 11, carbs_g: 67.8, fat_g: 4.2 },
  { id: 'farina-0', name: 'Farina 0', aliases: ['farina tipo 0'], category: 'grain', calories: 321, protein_g: 11.5, carbs_g: 69.5, fat_g: 1 },
  { id: 'farina-integrale', name: 'Farina integrale di frumento', aliases: ['farina integrale'], category: 'grain', calories: 313, protein_g: 11.9, carbs_g: 61.8, fat_g: 1.9 },
  { id: 'farina-avena', name: 'Farina d\'avena', aliases: ['farina di avena'], category: 'grain', calories: 378, protein_g: 12.6, carbs_g: 66.3, fat_g: 7.1 },
  { id: 'farina-mais', name: 'Farina di mais', aliases: ['farina per polenta', 'polenta cruda'], category: 'grain', calories: 341, protein_g: 8.7, carbs_g: 73.5, fat_g: 2.7 },
  { id: 'farina-riso', name: 'Farina di riso', category: 'grain', calories: 332, protein_g: 7.3, carbs_g: 79.1, fat_g: 0.5 },
  { id: 'semola', name: 'Semola di grano duro', aliases: ['semola rimacinata'], category: 'grain', calories: 346, protein_g: 11.5, carbs_g: 76.9, fat_g: 0.5 },
  { id: 'amido-mais', name: 'Amido di mais', aliases: ['maizena'], category: 'grain', calories: 328, protein_g: 0.3, carbs_g: 87, fat_g: 0 },
  { id: 'gnocchi-patate', name: 'Gnocchi di patate, freschi', aliases: ['gnocchi crudi'], category: 'grain', calories: 164, protein_g: 3.9, carbs_g: 37.9, fat_g: 0.3 },
  { id: 'corn-flakes', name: 'Corn flakes', aliases: ['fiocchi di mais'], category: 'grain', calories: 367, protein_g: 6.6, carbs_g: 87.4, fat_g: 0.8 },
  { id: 'muesli', name: 'Muesli', category: 'grain', calories: 374, protein_g: 9.7, carbs_g: 71.7, fat_g: 6 },
  { id: 'pane-segale', name: 'Pane di segale', aliases: ['pane nero di segale'], category: 'bakery', calories: 228, protein_g: 8.3, carbs_g: 45.4, fat_g: 1.7 },
  { id: 'pangrattato', name: 'Pangrattato', aliases: ['pane grattugiato'], category: 'bakery', calories: 357, protein_g: 10.1, carbs_g: 77.8, fat_g: 2.1 },
  { id: 'cracker-integrali', name: 'Cracker integrali', aliases: ['crackers integrali'], category: 'bakery', calories: 402, protein_g: 12, carbs_g: 61.7, fat_g: 11.4 },
  { id: 'grano-saraceno', name: 'Grano saraceno', category: 'grain', calories: 341, protein_g: 13.1, carbs_g: 62.4, fat_g: 3.1 },
  { id: 'fecola-patate', name: 'Fecola di patate', category: 'grain', calories: 336, protein_g: 0.6, carbs_g: 83.1, fat_g: 0.1 },
  { id: 'pane-croccante-integrale', name: 'Pane croccante integrale', aliases: ['knackebrot'], category: 'bakery', calories: 325, protein_g: 12, carbs_g: 57.9, fat_g: 1.7 },
  { id: 'gallette-riso-integrale', name: 'Gallette di riso integrale', aliases: ['gallette di riso'], category: 'bakery', calories: 390, protein_g: 7.7, carbs_g: 81.5, fat_g: 2.8 },
  { id: 'gallette-mais', name: 'Gallette di mais', category: 'bakery', calories: 387, protein_g: 7.4, carbs_g: 83.5, fat_g: 1.9 },

  // Legumi
  { id: 'ceci-secchi', name: 'Ceci secchi', aliases: ['ceci crudi'], category: 'legume', calories: 378, protein_g: 20.5, carbs_g: 62.9, fat_g: 6.0 },
  { id: 'fagioli-borlotti-secchi', name: 'Fagioli borlotti secchi', aliases: ['borlotti crudi'], category: 'legume', calories: 335, protein_g: 23, carbs_g: 60, fat_g: 1.2 },
  { id: 'fagioli-cannellini-secchi', name: 'Fagioli cannellini secchi', aliases: ['cannellini crudi'], category: 'legume', calories: 333, protein_g: 23.4, carbs_g: 60.3, fat_g: 0.9 },
  { id: 'lenticchie-secche', name: 'Lenticchie secche', aliases: ['lenticchie crude'], category: 'legume', calories: 352, protein_g: 24.6, carbs_g: 63.4, fat_g: 1.1 },
  // CREA, valori per 100 g di prodotto in scatola scolato (non peso della lattina).
  { id: 'ceci-scatola-scolati', name: 'Ceci in scatola, scolati', aliases: ['ceci cotti', 'ceci in lattina'], category: 'legume', calories: 111, protein_g: 6.7, carbs_g: 13.9, fat_g: 2.3 },
  { id: 'fagioli-borlotti-scatola-scolati', name: 'Fagioli borlotti in scatola, scolati', aliases: ['borlotti cotti', 'borlotti in lattina'], category: 'legume', calories: 102, protein_g: 6.7, carbs_g: 15.9, fat_g: 0.5 },
  { id: 'fagioli-cannellini-scatola-scolati', name: 'Fagioli cannellini in scatola, scolati', aliases: ['cannellini cotti', 'cannellini in lattina'], category: 'legume', calories: 86, protein_g: 6, carbs_g: 12.5, fat_g: 0.6 },
  { id: 'lenticchie-scatola-scolate', name: 'Lenticchie in scatola, scolate', aliases: ['lenticchie cotte', 'lenticchie in lattina'], category: 'legume', calories: 91, protein_g: 5, carbs_g: 15.4, fat_g: 0.5 },
  { id: 'piselli', name: 'Piselli', aliases: ['piselli freschi'], category: 'legume', calories: 81, protein_g: 5.4, carbs_g: 14.5, fat_g: 0.4 },
  { id: 'fave', name: 'Fave', aliases: ['fave fresche'], category: 'legume', calories: 88, protein_g: 7.9, carbs_g: 17.6, fat_g: 0.7 },
  { id: 'hummus', name: 'Hummus', category: 'legume', calories: 166, protein_g: 7.9, carbs_g: 14, fat_g: 9.6 },
  { id: 'tofu', name: 'Tofu', category: 'legume', calories: 76, protein_g: 8.0, carbs_g: 1.9, fat_g: 4.8 },
  { id: 'seitan', name: 'Seitan, glutine di frumento secco', aliases: ['glutine vitale', 'glutine di frumento in polvere'], category: 'plant_protein', calories: 370, protein_g: 75, carbs_g: 14, fat_g: 1.9 },
  { id: 'edamame', name: 'Edamame', aliases: ['fagioli di soia verdi'], category: 'legume', calories: 121, protein_g: 11.9, carbs_g: 8.9, fat_g: 5.2 },
  { id: 'lupini-secchi', name: 'Lupini secchi', category: 'legume', calories: 371, protein_g: 36.2, carbs_g: 40.4, fat_g: 9.7 },
  { id: 'fagioli-neri-secchi', name: 'Fagioli neri secchi', category: 'legume', calories: 341, protein_g: 21.6, carbs_g: 62.4, fat_g: 1.4 },
  { id: 'fagioli-rossi-secchi', name: 'Fagioli rossi secchi', aliases: ['kidney beans'], category: 'legume', calories: 333, protein_g: 23.6, carbs_g: 60, fat_g: 0.8 },
  { id: 'fagioli-azuki-secchi', name: 'Fagioli azuki secchi', category: 'legume', calories: 329, protein_g: 19.9, carbs_g: 62.9, fat_g: 0.5 },
  { id: 'fagioli-mung-secchi', name: 'Fagioli mung secchi', aliases: ['fagioli verdi mung'], category: 'legume', calories: 347, protein_g: 23.9, carbs_g: 62.6, fat_g: 1.2 },
  { id: 'soia-gialla-secca', name: 'Soia gialla secca', category: 'legume', calories: 446, protein_g: 36.5, carbs_g: 30.2, fat_g: 19.9 },
  { id: 'lenticchie-rosse-secche', name: 'Lenticchie rosse secche', aliases: ['lenticchie decorticate'], category: 'legume', calories: 358, protein_g: 23.9, carbs_g: 63.1, fat_g: 2.2 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'piselli-scatola-scolati', name: 'Piselli in scatola, scolati', aliases: ['piselli in lattina'], category: 'legume', calories: 78, protein_g: 5.3, carbs_g: 11.1, fat_g: 0.6 },
  { id: 'piselli-surgelati', name: 'Piselli surgelati', category: 'legume', calories: 61, protein_g: 5.4, carbs_g: 6.5, fat_g: 0.3 },
  { id: 'fagioli-borlotti-freschi', name: 'Fagioli borlotti freschi', aliases: ['borlotti freschi'], category: 'legume', calories: 143, protein_g: 10.2, carbs_g: 22.7, fat_g: 0.8 },
  { id: 'fagioli-occhio-secchi', name: 'Fagioli dall\'occhio secchi', aliases: ['fagioli occhio', 'black eyed beans'], category: 'legume', calories: 318, protein_g: 22.4, carbs_g: 50.9, fat_g: 1.4 },
  { id: 'seitan-fresco', name: 'Seitan fresco', aliases: ['seitan pronto'], category: 'plant_protein', calories: 193, protein_g: 28, carbs_g: 3, fat_g: 7.2 },
  { id: 'tempeh', name: 'Tempeh al naturale', aliases: ['tempeh'], category: 'plant_protein', calories: 157, protein_g: 17.6, carbs_g: 7.9, fat_g: 4.7 },
  { id: 'tofu-setoso', name: 'Tofu setoso', aliases: ['silken tofu', 'tofu morbido'], category: 'plant_protein', calories: 53, protein_g: 5, carbs_g: 1.5, fat_g: 2.9 },

  // Verdure
  { id: 'zucchine', name: 'Zucchine', category: 'vegetable', calories: 17, protein_g: 1.2, carbs_g: 3.1, fat_g: 0.3 },
  { id: 'melanzane', name: 'Melanzane', category: 'vegetable', calories: 25, protein_g: 1.0, carbs_g: 6.0, fat_g: 0.2 },
  { id: 'pomodori', name: 'Pomodori', category: 'vegetable', calories: 18, protein_g: 0.9, carbs_g: 3.9, fat_g: 0.2 },
  { id: 'insalata-lattuga', name: 'Insalata / lattuga', category: 'vegetable', calories: 15, protein_g: 1.4, carbs_g: 2.9, fat_g: 0.2 },
  { id: 'spinaci', name: 'Spinaci', category: 'vegetable', calories: 23, protein_g: 2.9, carbs_g: 3.6, fat_g: 0.4 },
  { id: 'broccoli', name: 'Broccoli', category: 'vegetable', calories: 34, protein_g: 2.8, carbs_g: 7.0, fat_g: 0.4 },
  { id: 'carote', name: 'Carote', category: 'vegetable', calories: 41, protein_g: 0.9, carbs_g: 10, fat_g: 0.2 },
  { id: 'patate', name: 'Patate', aliases: ['patate crude'], category: 'vegetable', calories: 77, protein_g: 2.0, carbs_g: 17.5, fat_g: 0.1 },
  { id: 'peperoni', name: 'Peperoni', category: 'vegetable', calories: 31, protein_g: 1.0, carbs_g: 6.0, fat_g: 0.3 },
  { id: 'cipolla', name: 'Cipolla', category: 'vegetable', calories: 40, protein_g: 1.1, carbs_g: 9.3, fat_g: 0.1 },
  { id: 'funghi-champignon', name: 'Funghi champignon', category: 'vegetable', calories: 22, protein_g: 3.1, carbs_g: 3.3, fat_g: 0.3 },
  { id: 'zucca', name: 'Zucca', category: 'vegetable', calories: 26, protein_g: 1.0, carbs_g: 6.5, fat_g: 0.1 },
  { id: 'cavolfiore', name: 'Cavolfiore', category: 'vegetable', calories: 25, protein_g: 1.9, carbs_g: 5.0, fat_g: 0.3 },
  { id: 'finocchi', name: 'Finocchi', category: 'vegetable', calories: 31, protein_g: 1.2, carbs_g: 7.0, fat_g: 0.2 },
  { id: 'rucola', name: 'Rucola', category: 'vegetable', calories: 25, protein_g: 2.6, carbs_g: 3.7, fat_g: 0.7 },
  { id: 'cetrioli', name: 'Cetrioli', category: 'vegetable', calories: 15, protein_g: 0.7, carbs_g: 3.6, fat_g: 0.1 },
  { id: 'asparagi', name: 'Asparagi', category: 'vegetable', calories: 20, protein_g: 2.2, carbs_g: 3.9, fat_g: 0.1 },
  { id: 'cavolo-cappuccio', name: 'Cavolo cappuccio', aliases: ['cappuccio', 'cavolo bianco'], category: 'vegetable', calories: 25, protein_g: 1.3, carbs_g: 5.8, fat_g: 0.1 },
  { id: 'cavolo-rosso', name: 'Cavolo rosso', aliases: ['cavolo viola'], category: 'vegetable', calories: 31, protein_g: 1.4, carbs_g: 7.4, fat_g: 0.2 },
  { id: 'cavolo-verza', name: 'Cavolo verza', aliases: ['verza'], category: 'vegetable', calories: 27, protein_g: 2.0, carbs_g: 6.1, fat_g: 0.1 },
  { id: 'cavolo-nero', name: 'Cavolo nero', aliases: ['kale'], category: 'vegetable', calories: 49, protein_g: 4.3, carbs_g: 8.8, fat_g: 0.9 },
  { id: 'cavolini-bruxelles', name: 'Cavolini di Bruxelles', aliases: ['cavoletti di bruxelles'], category: 'vegetable', calories: 43, protein_g: 3.4, carbs_g: 9.0, fat_g: 0.3 },
  { id: 'cavolo-rapa', name: 'Cavolo rapa', aliases: ['kohlrabi'], category: 'vegetable', calories: 27, protein_g: 1.7, carbs_g: 6.2, fat_g: 0.1 },
  { id: 'broccolo-romanesco', name: 'Broccolo romanesco', aliases: ['cavolo romanesco'], category: 'vegetable', calories: 31, protein_g: 2.5, carbs_g: 4.1, fat_g: 0.3 },
  { id: 'bietole', name: 'Bietole', aliases: ['bieta', 'coste', 'bietola da costa'], category: 'vegetable', calories: 19, protein_g: 1.8, carbs_g: 3.7, fat_g: 0.2 },
  { id: 'cicoria', name: 'Cicoria', category: 'vegetable', calories: 23, protein_g: 1.7, carbs_g: 4.7, fat_g: 0.3 },
  { id: 'radicchio', name: 'Radicchio', aliases: ['radicchio rosso'], category: 'vegetable', calories: 23, protein_g: 1.4, carbs_g: 4.5, fat_g: 0.3 },
  { id: 'indivia', name: 'Indivia', aliases: ['belga', 'indivia belga'], category: 'vegetable', calories: 17, protein_g: 1.3, carbs_g: 3.4, fat_g: 0.2 },
  { id: 'scarola', name: 'Scarola', aliases: ['indivia scarola'], category: 'vegetable', calories: 17, protein_g: 1.3, carbs_g: 3.4, fat_g: 0.2 },
  { id: 'valeriana', name: 'Valeriana', aliases: ['songino', 'lattughino'], category: 'vegetable', calories: 21, protein_g: 2.0, carbs_g: 3.6, fat_g: 0.4 },
  { id: 'sedano', name: 'Sedano', category: 'vegetable', calories: 14, protein_g: 0.7, carbs_g: 3.0, fat_g: 0.2 },
  { id: 'porro', name: 'Porro', aliases: ['porri'], category: 'vegetable', calories: 61, protein_g: 1.5, carbs_g: 14, fat_g: 0.3 },
  { id: 'cipollotto', name: 'Cipollotto', aliases: ['cipolla verde'], category: 'vegetable', calories: 32, protein_g: 1.8, carbs_g: 7.3, fat_g: 0.2 },
  { id: 'carciofi', name: 'Carciofi', aliases: ['carciofo'], category: 'vegetable', calories: 47, protein_g: 3.3, carbs_g: 10.5, fat_g: 0.2 },
  { id: 'fagiolini', name: 'Fagiolini', aliases: ['cornetti', 'tegoline'], category: 'vegetable', calories: 31, protein_g: 1.8, carbs_g: 7.0, fat_g: 0.2 },
  { id: 'barbabietola', name: 'Barbabietola rossa', aliases: ['rapa rossa'], category: 'vegetable', calories: 43, protein_g: 1.6, carbs_g: 10, fat_g: 0.2 },
  { id: 'rapa-bianca', name: 'Rapa bianca', aliases: ['rape'], category: 'vegetable', calories: 28, protein_g: 0.9, carbs_g: 6.4, fat_g: 0.1 },
  { id: 'cime-rapa', name: 'Cime di rapa', aliases: ['friarielli', 'broccoletti'], category: 'vegetable', calories: 22, protein_g: 3.2, carbs_g: 2.9, fat_g: 0.5 },
  { id: 'ravanelli', name: 'Ravanelli', aliases: ['ravanello'], category: 'vegetable', calories: 16, protein_g: 0.7, carbs_g: 3.4, fat_g: 0.1 },
  { id: 'patata-dolce', name: 'Patata dolce', aliases: ['batata', 'patata americana'], category: 'vegetable', calories: 86, protein_g: 1.6, carbs_g: 20, fat_g: 0.1 },
  { id: 'topinambur', name: 'Topinambur', aliases: ['carciofo di gerusalemme'], category: 'vegetable', calories: 73, protein_g: 2.0, carbs_g: 17, fat_g: 0.0 },
  { id: 'pastinaca', name: 'Pastinaca', category: 'vegetable', calories: 75, protein_g: 1.2, carbs_g: 18, fat_g: 0.3 },
  { id: 'agretti', name: 'Agretti', aliases: ['barba di frate'], category: 'vegetable', calories: 17, protein_g: 1.8, carbs_g: 2.2, fat_g: 0.2 },
  { id: 'cardi', name: 'Cardi', aliases: ['cardo'], category: 'vegetable', calories: 17, protein_g: 0.7, carbs_g: 4.1, fat_g: 0.1 },
  { id: 'puntarelle', name: 'Puntarelle', aliases: ['cicoria catalogna'], category: 'vegetable', calories: 23, protein_g: 1.7, carbs_g: 4.7, fat_g: 0.3 },
  { id: 'taccole', name: 'Taccole', aliases: ['piselli mangiatutto'], category: 'vegetable', calories: 42, protein_g: 2.8, carbs_g: 7.6, fat_g: 0.2 },
  { id: 'mais-dolce', name: 'Mais dolce', aliases: ['granturco', 'mais in chicchi'], category: 'vegetable', calories: 86, protein_g: 3.3, carbs_g: 19, fat_g: 1.4 },
  { id: 'germogli-soia', name: 'Germogli di soia', aliases: ['germogli di fagiolo mung'], category: 'vegetable', calories: 30, protein_g: 3.0, carbs_g: 5.9, fat_g: 0.2 },
  { id: 'daikon', name: 'Daikon', aliases: ['ravanello bianco'], category: 'vegetable', calories: 18, protein_g: 0.6, carbs_g: 4.1, fat_g: 0.1 },
  { id: 'okra', name: 'Okra', aliases: ['gombo'], category: 'vegetable', calories: 33, protein_g: 1.9, carbs_g: 7.5, fat_g: 0.2 },
  { id: 'pak-choi', name: 'Pak choi', aliases: ['bok choy', 'cavolo cinese'], category: 'vegetable', calories: 13, protein_g: 1.5, carbs_g: 2.2, fat_g: 0.2 },
  { id: 'fiori-zucca', name: 'Fiori di zucca', aliases: ['fiori di zucchina'], category: 'vegetable', calories: 12, protein_g: 1.7, carbs_g: 1.8, fat_g: 0.4 },
  { id: 'funghi-porcini', name: 'Funghi porcini', aliases: ['porcini'], category: 'vegetable', calories: 34, protein_g: 3.1, carbs_g: 5.1, fat_g: 0.5 },
  { id: 'funghi-shiitake', name: 'Funghi shiitake', aliases: ['shiitake'], category: 'vegetable', calories: 34, protein_g: 2.2, carbs_g: 6.8, fat_g: 0.5 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'funghi-pleurotus', name: 'Funghi pleurotus', aliases: ['orecchioni', 'funghi ostrica'], category: 'vegetable', calories: 37, protein_g: 2.2, carbs_g: 5.6, fat_g: 0.3 },
  { id: 'mais-scatola-scolato', name: 'Mais dolce in scatola, scolato', aliases: ['mais in lattina'], category: 'vegetable', calories: 105, protein_g: 3.4, carbs_g: 20.5, fat_g: 1.3 },
  { id: 'sedano-rapa', name: 'Sedano rapa', category: 'vegetable', calories: 32, protein_g: 1.4, carbs_g: 4, fat_g: 0.3 },
  { id: 'pomodori-secchi', name: 'Pomodori secchi', category: 'vegetable', calories: 282, protein_g: 14.1, carbs_g: 43.5, fat_g: 3 },

  // Frutta
  { id: 'mela', name: 'Mela', category: 'fruit', calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2 },
  { id: 'banana', name: 'Banana', category: 'fruit', calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3 },
  { id: 'arancia', name: 'Arancia', category: 'fruit', calories: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.1 },
  { id: 'pera', name: 'Pera', category: 'fruit', calories: 57, protein_g: 0.4, carbs_g: 15, fat_g: 0.1 },
  { id: 'fragole', name: 'Fragole', category: 'fruit', calories: 32, protein_g: 0.7, carbs_g: 7.7, fat_g: 0.3 },
  { id: 'uva', name: 'Uva', category: 'fruit', calories: 69, protein_g: 0.7, carbs_g: 18, fat_g: 0.2 },
  { id: 'kiwi', name: 'Kiwi', category: 'fruit', calories: 61, protein_g: 1.1, carbs_g: 15, fat_g: 0.5 },
  { id: 'anguria', name: 'Anguria', category: 'fruit', calories: 30, protein_g: 0.6, carbs_g: 8.0, fat_g: 0.2 },
  { id: 'melone', name: 'Melone', category: 'fruit', calories: 34, protein_g: 0.8, carbs_g: 8.0, fat_g: 0.2 },
  { id: 'pesca', name: 'Pesca', category: 'fruit', calories: 39, protein_g: 0.9, carbs_g: 10, fat_g: 0.3 },
  { id: 'ananas', name: 'Ananas', category: 'fruit', calories: 50, protein_g: 0.5, carbs_g: 13, fat_g: 0.1 },
  { id: 'mandarino', name: 'Mandarino', category: 'fruit', calories: 53, protein_g: 0.8, carbs_g: 13, fat_g: 0.3 },
  { id: 'avocado', name: 'Avocado', category: 'fruit', calories: 160, protein_g: 2.0, carbs_g: 8.5, fat_g: 15 },
  { id: 'limone', name: 'Limone', category: 'fruit', calories: 29, protein_g: 1.1, carbs_g: 9.3, fat_g: 0.3 },
  { id: 'albicocche', name: 'Albicocche', aliases: ['albicocca'], category: 'fruit', calories: 48, protein_g: 1.4, carbs_g: 11, fat_g: 0.4 },
  { id: 'ciliegie', name: 'Ciliegie', aliases: ['ciliegia'], category: 'fruit', calories: 63, protein_g: 1.1, carbs_g: 16, fat_g: 0.2 },
  { id: 'susine', name: 'Susine', aliases: ['susina', 'prugne fresche', 'prugna fresca'], category: 'fruit', calories: 46, protein_g: 0.7, carbs_g: 11, fat_g: 0.3 },
  { id: 'nettarine', name: 'Nettarine', aliases: ['pesche noci', 'pesca noce'], category: 'fruit', calories: 44, protein_g: 1.1, carbs_g: 10.6, fat_g: 0.3 },
  { id: 'cachi', name: 'Cachi', aliases: ['caco', 'kaki'], category: 'fruit', calories: 70, protein_g: 0.6, carbs_g: 18.6, fat_g: 0.2 },
  { id: 'fichi', name: 'Fichi', aliases: ['fico'], category: 'fruit', calories: 74, protein_g: 0.8, carbs_g: 19, fat_g: 0.3 },
  { id: 'melograno', name: 'Melograno', aliases: ['melagrana'], category: 'fruit', calories: 83, protein_g: 1.7, carbs_g: 18.7, fat_g: 1.2 },
  { id: 'pompelmo', name: 'Pompelmo', category: 'fruit', calories: 42, protein_g: 0.8, carbs_g: 10.7, fat_g: 0.1 },
  { id: 'lime', name: 'Lime', category: 'fruit', calories: 30, protein_g: 0.7, carbs_g: 10.5, fat_g: 0.2 },
  { id: 'clementine', name: 'Clementine', aliases: ['clementina', 'mandarancio'], category: 'fruit', calories: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.2 },
  { id: 'mirtilli', name: 'Mirtilli', aliases: ['mirtillo'], category: 'fruit', calories: 57, protein_g: 0.7, carbs_g: 14.5, fat_g: 0.3 },
  { id: 'mirtilli-rossi', name: 'Mirtilli rossi', aliases: ['cranberry', 'cranberries'], category: 'fruit', calories: 46, protein_g: 0.4, carbs_g: 12.2, fat_g: 0.1 },
  { id: 'lamponi', name: 'Lamponi', aliases: ['lampone'], category: 'fruit', calories: 52, protein_g: 1.2, carbs_g: 12, fat_g: 0.7 },
  { id: 'more', name: 'More', aliases: ['mora'], category: 'fruit', calories: 43, protein_g: 1.4, carbs_g: 10, fat_g: 0.5 },
  { id: 'ribes-rosso', name: 'Ribes rosso', aliases: ['ribes'], category: 'fruit', calories: 56, protein_g: 1.4, carbs_g: 13.8, fat_g: 0.2 },
  { id: 'frutti-bosco', name: 'Frutti di bosco (misti)', aliases: ['frutti rossi'], category: 'fruit', calories: 50, protein_g: 1.0, carbs_g: 11.5, fat_g: 0.4 },
  { id: 'mango', name: 'Mango', category: 'fruit', calories: 60, protein_g: 0.8, carbs_g: 15, fat_g: 0.4 },
  { id: 'papaya', name: 'Papaya', category: 'fruit', calories: 43, protein_g: 0.5, carbs_g: 10.8, fat_g: 0.3 },
  { id: 'cocco-fresco', name: 'Cocco fresco', aliases: ['polpa di cocco'], category: 'fruit', calories: 354, protein_g: 3.3, carbs_g: 15.2, fat_g: 33.5 },
  { id: 'frutto-passione', name: 'Frutto della passione', aliases: ['maracuja', 'passion fruit'], category: 'fruit', calories: 97, protein_g: 2.2, carbs_g: 23.4, fat_g: 0.7 },
  { id: 'guava', name: 'Guava', category: 'fruit', calories: 68, protein_g: 2.6, carbs_g: 14.3, fat_g: 1.0 },
  { id: 'litchi', name: 'Litchi', aliases: ['lychee'], category: 'fruit', calories: 66, protein_g: 0.8, carbs_g: 16.5, fat_g: 0.4 },
  { id: 'fichi-india', name: 'Fichi d\'India', aliases: ['fico d india'], category: 'fruit', calories: 41, protein_g: 0.7, carbs_g: 9.6, fat_g: 0.5 },
  { id: 'nespole', name: 'Nespole', aliases: ['nespola'], category: 'fruit', calories: 47, protein_g: 0.4, carbs_g: 12, fat_g: 0.2 },
  { id: 'datteri', name: 'Datteri', aliases: ['dattero'], category: 'fruit', calories: 282, protein_g: 2.5, carbs_g: 75, fat_g: 0.4 },
  { id: 'prugne-secche', name: 'Prugne secche', category: 'fruit', calories: 240, protein_g: 2.2, carbs_g: 64, fat_g: 0.4 },
  { id: 'fichi-secchi', name: 'Fichi secchi', category: 'fruit', calories: 249, protein_g: 3.3, carbs_g: 64, fat_g: 0.9 },
  { id: 'uva-passa', name: 'Uva passa', aliases: ['uvetta', 'uva sultanina'], category: 'fruit', calories: 299, protein_g: 3.1, carbs_g: 79, fat_g: 0.5 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'amarene', name: 'Amarene fresche', aliases: ['amarene'], category: 'fruit', calories: 44, protein_g: 0.8, carbs_g: 10.2, fat_g: 0 },
  { id: 'albicocche-secche', name: 'Albicocche secche', category: 'fruit', calories: 286, protein_g: 5, carbs_g: 66.5, fat_g: 0.5 },

  // Carne
  { id: 'petto-pollo', name: 'Petto di pollo', aliases: ['pollo'], category: 'meat', calories: 120, protein_g: 22.5, carbs_g: 0, fat_g: 2.6 },
  { id: 'coscia-pollo', name: 'Coscia di pollo senza pelle', aliases: ['cosce di pollo senza pelle', 'fuso di pollo senza pelle', 'fusi di pollo senza pelle'], category: 'meat', calories: 125, protein_g: 19.7, carbs_g: 0, fat_g: 4.8 },
  { id: 'pollo-intero', name: 'Pollo intero con pelle', category: 'meat', calories: 190, protein_g: 18.1, carbs_g: 0, fat_g: 13.1 },
  { id: 'petto-tacchino', name: 'Petto di tacchino', category: 'meat', calories: 107, protein_g: 24, carbs_g: 0, fat_g: 1.2 },
  { id: 'coscia-tacchino', name: 'Coscia di tacchino senza pelle', category: 'meat', calories: 114, protein_g: 20.5, carbs_g: 0, fat_g: 3.2 },
  { id: 'manzo-magro', name: 'Manzo magro', aliases: ['bovino magro'], category: 'meat', calories: 137, protein_g: 21.4, carbs_g: 0, fat_g: 5.4 },
  { id: 'manzo-macinato-magro', name: 'Manzo macinato magro', aliases: ['macinato di manzo'], category: 'meat', calories: 172, protein_g: 21.4, carbs_g: 0, fat_g: 9.4 },
  { id: 'manzo-entrecote', name: 'Manzo, entrecôte', aliases: ['entrecote', 'costata di manzo'], category: 'meat', calories: 192, protein_g: 19.5, carbs_g: 0, fat_g: 12.7 },
  { id: 'vitello', name: 'Vitello magro', category: 'meat', calories: 107, protein_g: 20.5, carbs_g: 0, fat_g: 2.5 },
  { id: 'maiale-lonza', name: 'Maiale, lonza', aliases: ['lonza di maiale'], category: 'meat', calories: 143, protein_g: 21.3, carbs_g: 0, fat_g: 5.9 },
  { id: 'maiale-filetto', name: 'Maiale, filetto', aliases: ['filetto di maiale'], category: 'meat', calories: 120, protein_g: 21.9, carbs_g: 0, fat_g: 3.5 },
  { id: 'maiale-costoletta', name: 'Maiale, costoletta', aliases: ['braciola di maiale'], category: 'meat', calories: 202, protein_g: 19.3, carbs_g: 0, fat_g: 13.7 },
  { id: 'agnello-coscia', name: 'Agnello, coscia', aliases: ['coscia di agnello'], category: 'meat', calories: 162, protein_g: 20.6, carbs_g: 0, fat_g: 8.8 },
  { id: 'coniglio', name: 'Coniglio', category: 'meat', calories: 136, protein_g: 20, carbs_g: 0, fat_g: 5.6 },
  { id: 'cavallo', name: 'Carne di cavallo', aliases: ['cavallo'], category: 'meat', calories: 133, protein_g: 21.4, carbs_g: 0, fat_g: 4.6 },
  { id: 'anatra-petto', name: 'Petto d\'anatra con pelle', aliases: ['petto di anatra'], category: 'meat', calories: 202, protein_g: 19.9, carbs_g: 0, fat_g: 13.8 },
  { id: 'prosciutto-crudo', name: 'Prosciutto crudo', category: 'meat', calories: 268, protein_g: 25, carbs_g: 0, fat_g: 18 },
  { id: 'prosciutto-cotto', name: 'Prosciutto cotto', category: 'meat', calories: 145, protein_g: 18, carbs_g: 1.5, fat_g: 7.0 },
  { id: 'bresaola', name: 'Bresaola', category: 'meat', calories: 151, protein_g: 32, carbs_g: 0.5, fat_g: 2.6 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'coscia-pollo-con-pelle', name: 'Coscia di pollo con pelle', aliases: ['cosce di pollo con pelle', 'fuso di pollo con pelle', 'fusi di pollo con pelle'], category: 'meat', calories: 125, protein_g: 18.4, carbs_g: 0, fat_g: 5.7 },
  { id: 'sovracoscia-pollo-con-pelle', name: 'Sovracoscia di pollo con pelle', aliases: ['sovracosce di pollo con pelle'], category: 'meat', calories: 196, protein_g: 17.4, carbs_g: 0, fat_g: 14 },
  { id: 'sovracoscia-pollo-senza-pelle', name: 'Sovracoscia di pollo senza pelle', aliases: ['sovracosce di pollo senza pelle'], category: 'meat', calories: 132, protein_g: 18.7, carbs_g: 0, fat_g: 6.3 },
  { id: 'ali-pollo-con-pelle', name: 'Ali di pollo con pelle', aliases: ['ala di pollo', 'alette di pollo'], category: 'meat', calories: 196, protein_g: 16.7, carbs_g: 0, fat_g: 14.3 },
  { id: 'pollo-intero-senza-pelle', name: 'Pollo intero senza pelle', category: 'meat', calories: 110, protein_g: 19.4, carbs_g: 0, fat_g: 3.6 },
  { id: 'manzo-filetto', name: 'Filetto di manzo', aliases: ['filetto di bovino'], category: 'meat', calories: 127, protein_g: 20.5, carbs_g: 0, fat_g: 5 },
  { id: 'maiale-spalla', name: 'Spalla di maiale', aliases: ['spalla di suino'], category: 'meat', calories: 133, protein_g: 19, carbs_g: 0, fat_g: 6.3 },
  { id: 'salsiccia-suino-fresca', name: 'Salsiccia di suino fresca', aliases: ['salsiccia di maiale', 'salsicce fresche'], category: 'meat', calories: 304, protein_g: 15.4, carbs_g: 0.6, fat_g: 26.7 },
  { id: 'pancetta-tesa', name: 'Pancetta tesa', aliases: ['pancetta a cubetti'], category: 'meat', calories: 337, protein_g: 20.9, carbs_g: 0, fat_g: 28.1 },
  { id: 'fegato-bovino', name: 'Fegato di bovino', aliases: ['fegato di manzo'], category: 'meat', calories: 142, protein_g: 20, carbs_g: 5.9, fat_g: 4.4 },
  { id: 'mortadella', name: 'Mortadella', category: 'meat', calories: 306, protein_g: 15.7, carbs_g: 0.8, fat_g: 26.6 },
  { id: 'salame', name: 'Salame', category: 'meat', calories: 367, protein_g: 24.1, carbs_g: 0, fat_g: 30.1 },

  // Pesce
  { id: 'salmone', name: 'Salmone fresco', aliases: ['salmone'], category: 'fish', calories: 208, protein_g: 20.4, carbs_g: 0, fat_g: 13.4 },
  { id: 'tonno-fresco', name: 'Tonno fresco', category: 'fish', calories: 144, protein_g: 23.3, carbs_g: 0, fat_g: 4.9 },
  { id: 'tonno-naturale', name: 'Tonno al naturale (sgocciolato)', category: 'fish', calories: 116, protein_g: 26, carbs_g: 0, fat_g: 1.0 },
  { id: 'merluzzo', name: 'Merluzzo', category: 'fish', calories: 82, protein_g: 17.8, carbs_g: 0, fat_g: 0.7 },
  { id: 'nasello', name: 'Nasello', aliases: ['merluzzo europeo'], category: 'fish', calories: 71, protein_g: 16.6, carbs_g: 0, fat_g: 0.3 },
  { id: 'orata', name: 'Orata', category: 'fish', calories: 121, protein_g: 20.7, carbs_g: 0, fat_g: 3.8 },
  { id: 'branzino', name: 'Branzino', aliases: ['spigola'], category: 'fish', calories: 97, protein_g: 18.4, carbs_g: 0, fat_g: 2.3 },
  { id: 'trota', name: 'Trota', category: 'fish', calories: 148, protein_g: 20.5, carbs_g: 0, fat_g: 6.8 },
  { id: 'pesce-spada', name: 'Pesce spada', category: 'fish', calories: 144, protein_g: 19.7, carbs_g: 0, fat_g: 6.7 },
  { id: 'sgombro', name: 'Sgombro', category: 'fish', calories: 205, protein_g: 18.6, carbs_g: 0, fat_g: 13.9 },
  { id: 'sardine', name: 'Sardine', aliases: ['sarda'], category: 'fish', calories: 185, protein_g: 20.9, carbs_g: 0, fat_g: 10.5 },
  { id: 'alici', name: 'Alici fresche', aliases: ['acciughe fresche'], category: 'fish', calories: 131, protein_g: 20.4, carbs_g: 0, fat_g: 4.8 },
  { id: 'sogliola', name: 'Sogliola', category: 'fish', calories: 83, protein_g: 16.9, carbs_g: 0, fat_g: 1.4 },
  { id: 'gamberi', name: 'Gamberi', aliases: ['mazzancolle'], category: 'fish', calories: 85, protein_g: 20.1, carbs_g: 0, fat_g: 0.5 },
  { id: 'calamari', name: 'Calamari', aliases: ['calamaro'], category: 'fish', calories: 92, protein_g: 15.6, carbs_g: 3.1, fat_g: 1.4 },
  { id: 'seppie', name: 'Seppie', aliases: ['seppia'], category: 'fish', calories: 79, protein_g: 16.2, carbs_g: 0.8, fat_g: 0.7 },
  { id: 'polpo', name: 'Polpo', category: 'fish', calories: 82, protein_g: 14.9, carbs_g: 2.2, fat_g: 1.0 },
  { id: 'cozze', name: 'Cozze', aliases: ['mitili'], category: 'fish', calories: 86, protein_g: 11.9, carbs_g: 3.7, fat_g: 2.2 },
  { id: 'vongole', name: 'Vongole', category: 'fish', calories: 74, protein_g: 12.8, carbs_g: 2.6, fat_g: 1.0 },
  { id: 'salmone-affumicato', name: 'Salmone affumicato', category: 'fish', calories: 117, protein_g: 18, carbs_g: 0, fat_g: 4.3 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'tonno-olio-sgocciolato', name: 'Tonno sott\'olio, sgocciolato', aliases: ['tonno in olio', 'tonno sottolio'], category: 'fish', calories: 192, protein_g: 25.2, carbs_g: 0, fat_g: 10.1 },
  { id: 'aringa', name: 'Aringa fresca', aliases: ['aringa'], category: 'fish', calories: 216, protein_g: 16.5, carbs_g: 0, fat_g: 16.7 },
  { id: 'rombo', name: 'Rombo', category: 'fish', calories: 81, protein_g: 16.3, carbs_g: 1.2, fat_g: 1.3 },
  { id: 'dentice', name: 'Dentice', category: 'fish', calories: 101, protein_g: 16.7, carbs_g: 0.7, fat_g: 3.5 },
  { id: 'cefalo', name: 'Cefalo', aliases: ['muggine'], category: 'fish', calories: 127, protein_g: 15.8, carbs_g: 0.7, fat_g: 6.8 },
  { id: 'acciughe-olio', name: 'Acciughe sott\'olio', aliases: ['alici sott\'olio', 'acciughe sottolio'], category: 'fish', calories: 206, protein_g: 25.9, carbs_g: 0.2, fat_g: 11.3 },

  // Uova e latticini
  { id: 'uovo-intero', name: 'Uovo intero', category: 'egg', calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11 },
  { id: 'albume-uovo', name: 'Albume d\'uovo', category: 'egg', calories: 52, protein_g: 11, carbs_g: 0.7, fat_g: 0.2 },
  { id: 'latte-intero', name: 'Latte intero', category: 'dairy', calories: 61, protein_g: 3.2, carbs_g: 4.8, fat_g: 3.3 },
  { id: 'latte-parz-scremato', name: 'Latte parzialmente scremato', category: 'dairy', calories: 46, protein_g: 3.4, carbs_g: 5.0, fat_g: 1.5 },
  { id: 'yogurt-bianco-intero', name: 'Yogurt bianco intero', category: 'dairy', calories: 61, protein_g: 3.5, carbs_g: 4.7, fat_g: 3.3 },
  { id: 'yogurt-greco-0', name: 'Yogurt greco 0%', category: 'dairy', calories: 59, protein_g: 10, carbs_g: 3.6, fat_g: 0.4 },
  { id: 'yogurt-greco-intero', name: 'Yogurt greco intero', category: 'dairy', calories: 97, protein_g: 9.0, carbs_g: 4.0, fat_g: 5.0 },
  { id: 'mozzarella', name: 'Mozzarella', category: 'dairy', calories: 253, protein_g: 18, carbs_g: 2.2, fat_g: 19 },
  { id: 'mozzarella-light', name: 'Mozzarella light', category: 'dairy', calories: 173, protein_g: 22, carbs_g: 2.0, fat_g: 9.0 },
  { id: 'parmigiano', name: 'Parmigiano Reggiano', category: 'dairy', calories: 392, protein_g: 33, carbs_g: 0, fat_g: 29 },
  { id: 'grana-padano', name: 'Grana Padano', category: 'dairy', calories: 396, protein_g: 33, carbs_g: 0, fat_g: 28 },
  { id: 'ricotta', name: 'Ricotta', category: 'dairy', calories: 146, protein_g: 8.8, carbs_g: 3.5, fat_g: 10.9 },
  { id: 'formaggio-spalmabile', name: 'Formaggio spalmabile', category: 'dairy', calories: 250, protein_g: 6.0, carbs_g: 4.0, fat_g: 24 },
  // CREA and producer reference values per 100 g; sources: docs/ingredienti-formaggi.md.
  { id: 'gorgonzola', name: 'Gorgonzola', aliases: ['formaggio erborinato'], category: 'dairy', calories: 324, protein_g: 19.1, carbs_g: 1, fat_g: 27.1 },
  { id: 'taleggio', name: 'Taleggio', category: 'dairy', calories: 315, protein_g: 19, carbs_g: 0.9, fat_g: 26.2 },
  { id: 'fontina', name: 'Fontina', category: 'dairy', calories: 361, protein_g: 24.5, carbs_g: 0.8, fat_g: 28.9 },
  { id: 'pecorino-romano', name: 'Pecorino romano', aliases: ['pecorino', 'pecorino grattugiato'], category: 'dairy', calories: 409, protein_g: 26, carbs_g: 1.8, fat_g: 33.1 },
  { id: 'provolone', name: 'Provolone', category: 'dairy', calories: 374, protein_g: 28.1, carbs_g: 2, fat_g: 28.2 },
  { id: 'brie', name: 'Brie', category: 'dairy', calories: 320, protein_g: 19.3, carbs_g: 0.2, fat_g: 26.9 },
  { id: 'feta', name: 'Feta', aliases: ['formaggio greco'], category: 'dairy', calories: 250, protein_g: 15.6, carbs_g: 1.5, fat_g: 20.2 },
  { id: 'fiocchi-latte', name: 'Fiocchi di latte', aliases: ['cottage cheese', 'fiocchi di formaggio magro'], category: 'dairy', calories: 115, protein_g: 9.7, carbs_g: 3.2, fat_g: 7.1 },
  { id: 'crescenza', name: 'Crescenza', category: 'dairy', calories: 274, protein_g: 12, carbs_g: 2.5, fat_g: 24 },
  { id: 'stracchino', name: 'Stracchino', category: 'dairy', calories: 314, protein_g: 14, carbs_g: 2.6, fat_g: 27 },
  { id: 'robiola', name: 'Robiola', category: 'dairy', calories: 327, protein_g: 6.4, carbs_g: 3.1, fat_g: 32 },
  { id: 'scamorza', name: 'Scamorza', aliases: ['scamorza bianca', 'scamorza affumicata'], category: 'dairy', calories: 320, protein_g: 22, carbs_g: 1.8, fat_g: 25 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'tuorlo-uovo', name: 'Tuorlo d\'uovo', aliases: ['rosso d\'uovo', 'tuorlo'], category: 'egg', calories: 325, protein_g: 15.8, carbs_g: 0, fat_g: 29.1 },
  { id: 'latte-scremato', name: 'Latte scremato', category: 'dairy', calories: 36, protein_g: 3.6, carbs_g: 5.3, fat_g: 0.2 },
  { id: 'yogurt-bianco-magro', name: 'Yogurt bianco magro', aliases: ['yogurt scremato'], category: 'dairy', calories: 36, protein_g: 3.3, carbs_g: 4, fat_g: 0.9 },
  { id: 'ricotta-pecora', name: 'Ricotta di pecora', category: 'dairy', calories: 157, protein_g: 9.5, carbs_g: 4.2, fat_g: 11.5 },
  { id: 'mascarpone', name: 'Mascarpone', category: 'dairy', calories: 455, protein_g: 7.6, carbs_g: 0.3, fat_g: 47 },
  { id: 'cheddar', name: 'Cheddar', category: 'dairy', calories: 388, protein_g: 26.7, carbs_g: 0.5, fat_g: 31 },
  { id: 'emmental', name: 'Emmental', aliases: ['emmenthal'], category: 'dairy', calories: 403, protein_g: 28.5, carbs_g: 3.6, fat_g: 30.6 },

  // Oli e grassi
  { id: 'olio-evo', name: 'Olio extravergine d\'oliva', category: 'fat', calories: 884, protein_g: 0, carbs_g: 0, fat_g: 100 },
  { id: 'burro', name: 'Burro', category: 'fat', calories: 717, protein_g: 0.9, carbs_g: 0.1, fat_g: 81 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'olio-girasole', name: 'Olio di girasole', aliases: ['olio di semi di girasole'], category: 'fat', calories: 899, protein_g: 0, carbs_g: 0, fat_g: 99.9 },
  { id: 'olio-arachide', name: 'Olio di arachide', aliases: ['olio di semi di arachidi'], category: 'fat', calories: 899, protein_g: 0, carbs_g: 0, fat_g: 99.9 },
  { id: 'olio-cocco', name: 'Olio di cocco', category: 'fat', calories: 899, protein_g: 0, carbs_g: 0, fat_g: 99.9 },
  { id: 'strutto', name: 'Strutto', aliases: ['sugna'], category: 'fat', calories: 900, protein_g: 0, carbs_g: 0, fat_g: 100 },

  // Frutta secca, semi e creme spalmabili
  { id: 'castagne', name: 'Castagne fresche', aliases: ['castagne crude'], category: 'nuts_seeds', calories: 174, protein_g: 2.9, carbs_g: 36.7, fat_g: 1.7 },
  { id: 'mandorle', name: 'Mandorle', category: 'nuts_seeds', calories: 579, protein_g: 21, carbs_g: 22, fat_g: 50 },
  { id: 'noci', name: 'Noci', category: 'nuts_seeds', calories: 654, protein_g: 15, carbs_g: 14, fat_g: 65 },
  { id: 'arachidi', name: 'Arachidi', category: 'nuts_seeds', calories: 567, protein_g: 26, carbs_g: 16, fat_g: 49 },
  { id: 'nocciole', name: 'Nocciole', category: 'nuts_seeds', calories: 628, protein_g: 15, carbs_g: 16.7, fat_g: 60.8 },
  { id: 'pistacchi', name: 'Pistacchi', category: 'nuts_seeds', calories: 560, protein_g: 20.2, carbs_g: 27.2, fat_g: 45.3 },
  { id: 'anacardi', name: 'Anacardi', category: 'nuts_seeds', calories: 553, protein_g: 18.2, carbs_g: 30.2, fat_g: 43.9 },
  { id: 'noci-pecan', name: 'Noci pecan', aliases: ['pecan'], category: 'nuts_seeds', calories: 691, protein_g: 9.2, carbs_g: 13.9, fat_g: 72 },
  { id: 'noci-brasile', name: 'Noci del Brasile', aliases: ['noci brasiliane'], category: 'nuts_seeds', calories: 659, protein_g: 14.3, carbs_g: 11.7, fat_g: 67.1 },
  { id: 'macadamia', name: 'Noci macadamia', aliases: ['macadamia'], category: 'nuts_seeds', calories: 718, protein_g: 7.9, carbs_g: 13.8, fat_g: 75.8 },
  { id: 'pinoli', name: 'Pinoli', category: 'nuts_seeds', calories: 673, protein_g: 13.7, carbs_g: 13.1, fat_g: 68.4 },
  { id: 'semi-chia', name: 'Semi di chia', category: 'nuts_seeds', calories: 486, protein_g: 17, carbs_g: 42, fat_g: 31 },
  { id: 'semi-lino', name: 'Semi di lino', category: 'nuts_seeds', calories: 534, protein_g: 18.3, carbs_g: 28.9, fat_g: 42.2 },
  { id: 'semi-zucca', name: 'Semi di zucca', category: 'nuts_seeds', calories: 559, protein_g: 30.2, carbs_g: 10.7, fat_g: 49.1 },
  { id: 'semi-girasole', name: 'Semi di girasole', category: 'nuts_seeds', calories: 584, protein_g: 20.8, carbs_g: 20, fat_g: 51.5 },
  { id: 'semi-sesamo', name: 'Semi di sesamo', aliases: ['sesamo'], category: 'nuts_seeds', calories: 573, protein_g: 17.7, carbs_g: 23.5, fat_g: 49.7 },
  { id: 'semi-canapa', name: 'Semi di canapa', category: 'nuts_seeds', calories: 553, protein_g: 31.6, carbs_g: 8.7, fat_g: 48.8 },
  { id: 'burro-arachidi', name: 'Burro d\'arachidi', category: 'spread', calories: 588, protein_g: 25, carbs_g: 20, fat_g: 50 },
  { id: 'crema-mandorle', name: 'Crema di mandorle 100%', category: 'spread', calories: 614, protein_g: 21.1, carbs_g: 18.8, fat_g: 55.5 },
  { id: 'crema-nocciole', name: 'Crema di nocciole 100%', category: 'spread', calories: 650, protein_g: 15, carbs_g: 17, fat_g: 62 },
  { id: 'tahina', name: 'Tahina', aliases: ['crema di sesamo'], category: 'spread', calories: 595, protein_g: 17, carbs_g: 21.2, fat_g: 53.8 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'arachidi-tostate-salate', name: 'Arachidi tostate salate', category: 'nuts_seeds', calories: 631, protein_g: 26.2, carbs_g: 15, fat_g: 50 },
  { id: 'arachidi-tostate-senza-sale', name: 'Arachidi tostate senza sale', category: 'nuts_seeds', calories: 637, protein_g: 26.8, carbs_g: 11.3, fat_g: 51.9 },

  // Salse e sughi
  { id: 'passata-pomodoro', name: 'Passata di pomodoro', category: 'sauce', calories: 29, protein_g: 1.4, carbs_g: 4.8, fat_g: 0.2 },
  { id: 'polpa-pomodoro', name: 'Polpa di pomodoro', category: 'sauce', calories: 26, protein_g: 1.2, carbs_g: 4.2, fat_g: 0.2 },
  { id: 'pomodori-pelati', name: 'Pomodori pelati', category: 'sauce', calories: 24, protein_g: 1.2, carbs_g: 3.5, fat_g: 0.2 },
  { id: 'sugo-pomodoro', name: 'Sugo di pomodoro', category: 'sauce', calories: 55, protein_g: 1.5, carbs_g: 7.5, fat_g: 2.2 },
  { id: 'pesto-genovese', name: 'Pesto alla genovese', category: 'sauce', calories: 450, protein_g: 5, carbs_g: 6, fat_g: 45 },
  { id: 'ragu-carne', name: 'Ragù di carne', category: 'sauce', calories: 120, protein_g: 7, carbs_g: 6, fat_g: 7 },
  { id: 'besciamella', name: 'Besciamella', category: 'sauce', calories: 140, protein_g: 4, carbs_g: 10, fat_g: 9 },
  { id: 'panna-cucina', name: 'Panna da cucina', category: 'sauce', calories: 195, protein_g: 2.5, carbs_g: 4, fat_g: 19 },
  { id: 'maionese', name: 'Maionese', category: 'sauce', calories: 680, protein_g: 1, carbs_g: 1, fat_g: 75 },
  { id: 'ketchup', name: 'Ketchup', category: 'sauce', calories: 112, protein_g: 1.3, carbs_g: 26, fat_g: 0.2 },
  { id: 'senape', name: 'Senape', category: 'sauce', calories: 66, protein_g: 4.4, carbs_g: 5.8, fat_g: 3.3 },
  { id: 'salsa-soia', name: 'Salsa di soia', category: 'sauce', calories: 53, protein_g: 8.1, carbs_g: 4.9, fat_g: 0.6 },
  { id: 'brodo-vegetale', name: 'Brodo vegetale', category: 'sauce', calories: 7, protein_g: 0.3, carbs_g: 1, fat_g: 0.2 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'concentrato-pomodoro', name: 'Concentrato di pomodoro', aliases: ['conserva di pomodoro'], category: 'sauce', calories: 100, protein_g: 3.9, carbs_g: 20.4, fat_g: 0.4 },
  { id: 'pomodori-secchi-olio', name: 'Pomodori secchi sott\'olio, sgocciolati', aliases: ['pomodori secchi in olio'], category: 'condiment', calories: 187, protein_g: 4.3, carbs_g: 13.4, fat_g: 11.7 },
  { id: 'olive-verdi', name: 'Olive verdi in salamoia, sgocciolate', aliases: ['olive verdi'], category: 'condiment', calories: 154, protein_g: 1.3, carbs_g: 0, fat_g: 15.7 },
  { id: 'olive-nere', name: 'Olive nere', category: 'condiment', calories: 176, protein_g: 1.4, carbs_g: 0.8, fat_g: 17.2 },
  { id: 'aceto', name: 'Aceto', category: 'condiment', calories: 21, protein_g: 0.1, carbs_g: 0.7, fat_g: 0 },
  { id: 'capperi-sottaceto', name: 'Capperi sottaceto', aliases: ['capperi sotto aceto'], category: 'condiment', calories: 38, protein_g: 2.2, carbs_g: 3.5, fat_g: 0.9 },
  { id: 'cetriolini-sottaceto', name: 'Cetriolini sottaceto', aliases: ['cetriolini sotto aceto'], category: 'condiment', calories: 14, protein_g: 0.7, carbs_g: 2.1, fat_g: 0.1 },
  { id: 'latte-cocco-cucina', name: 'Latte di cocco da cucina', aliases: ['latte di cocco'], category: 'sauce', calories: 214, protein_g: 2.4, carbs_g: 3.1, fat_g: 21.3 },

  // Spezie ed erbe aromatiche
  { id: 'sale', name: 'Sale', category: 'seasoning', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  { id: 'pepe-nero', name: 'Pepe nero', category: 'seasoning', calories: 251, protein_g: 10, carbs_g: 64, fat_g: 3.3 },
  { id: 'basilico', name: 'Basilico', category: 'seasoning', calories: 23, protein_g: 3.2, carbs_g: 2.7, fat_g: 0.6 },
  { id: 'prezzemolo', name: 'Prezzemolo', category: 'seasoning', calories: 36, protein_g: 3, carbs_g: 6.3, fat_g: 0.8 },
  { id: 'origano', name: 'Origano', category: 'seasoning', calories: 265, protein_g: 9, carbs_g: 69, fat_g: 4.3 },
  { id: 'rosmarino', name: 'Rosmarino', category: 'seasoning', calories: 131, protein_g: 3.3, carbs_g: 21, fat_g: 5.9 },
  { id: 'aglio', name: 'Aglio', category: 'seasoning', calories: 149, protein_g: 6.4, carbs_g: 33, fat_g: 0.5 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'salvia', name: 'Salvia fresca', aliases: ['salvia'], category: 'seasoning', calories: 132, protein_g: 3.9, carbs_g: 15.6, fat_g: 4.6 },
  { id: 'menta', name: 'Menta fresca', aliases: ['menta'], category: 'seasoning', calories: 49, protein_g: 3.8, carbs_g: 5.3, fat_g: 0.7 },
  { id: 'peperoncino-fresco', name: 'Peperoncino fresco', aliases: ['peperoncini freschi'], category: 'seasoning', calories: 30, protein_g: 1.8, carbs_g: 3.8, fat_g: 0.5 },
  { id: 'zenzero-fresco', name: 'Zenzero fresco', aliases: ['radice di zenzero'], category: 'seasoning', calories: 33, protein_g: 1.1, carbs_g: 3.4, fat_g: 1.1 },
  { id: 'paprika', name: 'Paprika', aliases: ['paprica'], category: 'seasoning', calories: 358, protein_g: 14.8, carbs_g: 34.9, fat_g: 13 },

  // Dolci
  { id: 'cioccolato-fondente-70', name: 'Cioccolato fondente 70%', category: 'sweet', calories: 598, protein_g: 8.0, carbs_g: 45, fat_g: 43 },
  { id: 'cioccolato-latte', name: 'Cioccolato al latte', category: 'sweet', calories: 535, protein_g: 7.6, carbs_g: 59, fat_g: 30 },
  { id: 'miele', name: 'Miele', category: 'spread', calories: 304, protein_g: 0.3, carbs_g: 82, fat_g: 0 },
  { id: 'zucchero', name: 'Zucchero', category: 'sweet', calories: 400, protein_g: 0, carbs_g: 100, fat_g: 0 },
  { id: 'marmellata', name: 'Marmellata', category: 'spread', calories: 250, protein_g: 0.4, carbs_g: 63, fat_g: 0.1 },
  { id: 'gelato-crema', name: 'Gelato alla crema', category: 'sweet', calories: 207, protein_g: 3.5, carbs_g: 24, fat_g: 11 },
  { id: 'biscotti-secchi', name: 'Biscotti secchi', category: 'sweet', calories: 430, protein_g: 7.0, carbs_g: 75, fat_g: 12 },

  // Ampliamento 2026-10-29: fonti e stati in docs/ingredienti-base.md.
  { id: 'cacao-amaro', name: 'Cacao amaro in polvere', aliases: ['cacao in polvere', 'cacao amaro'], category: 'sweet', calories: 380, protein_g: 22.4, carbs_g: 11.6, fat_g: 20.6 },

  // Bevande e alcolici
  { id: 'acqua-naturale', name: 'Acqua naturale', category: 'beverage', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  { id: 'acqua-frizzante', name: 'Acqua frizzante', category: 'beverage', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  { id: 'birra-chiara', alcohol_abv: 5, serving_ml: 330, name: 'Birra chiara', category: 'alcohol', calories: 43, protein_g: 0.5, carbs_g: 3.6, fat_g: 0 },
  { id: 'vino-rosso', alcohol_abv: 13, serving_ml: 125, name: 'Vino rosso', category: 'alcohol', calories: 85, protein_g: 0.1, carbs_g: 2.6, fat_g: 0 },
  { id: 'vino-bianco', alcohol_abv: 12, serving_ml: 125, name: 'Vino bianco', category: 'alcohol', calories: 82, protein_g: 0.1, carbs_g: 2.6, fat_g: 0 },
  { id: 'spritz', alcohol_abv: 9.17, serving_ml: 180, name: 'Spritz', category: 'alcohol', calories: 90, protein_g: 0, carbs_g: 6.0, fat_g: 0 },
  { id: 'coca-cola', name: 'Coca Cola', category: 'beverage', calories: 42, protein_g: 0, carbs_g: 10.6, fat_g: 0 },
  { id: 'coca-cola-zero', name: 'Coca Cola Zero', category: 'beverage', calories: 0.2, protein_g: 0, carbs_g: 0, fat_g: 0 },
  { id: 'succo-arancia', name: 'Succo d\'arancia', category: 'beverage', calories: 45, protein_g: 0.7, carbs_g: 10, fat_g: 0.2 },
  { id: 'te-freddo', name: 'Tè freddo', category: 'beverage', calories: 28, protein_g: 0, carbs_g: 7, fat_g: 0 },
  { id: 'caffe-nero', name: 'Caffè (nero)', category: 'beverage', calories: 1, protein_g: 0.1, carbs_g: 0, fat_g: 0 },
  // Bevande vegetali: valori convertiti per 100 ml con la densità della fonte.
  { id: 'bevanda-soia', name: 'Bevanda di soia al naturale', aliases: ['latte di soia'], category: 'beverage', calories: 41.2, protein_g: 3.71, carbs_g: 1.55, fat_g: 2.16 },
  { id: 'bevanda-avena', name: 'Bevanda di avena al naturale', aliases: ['latte di avena'], category: 'beverage', calories: 49.35, protein_g: 0.53, carbs_g: 8.19, fat_g: 1.58 },
  { id: 'bevanda-mandorla', name: 'Bevanda di mandorla al naturale', aliases: ['latte di mandorla'], category: 'beverage', calories: 34.65, protein_g: 1.16, carbs_g: 1.37, fat_g: 2.73 },
  { id: 'bevanda-riso', name: 'Bevanda di riso al naturale', aliases: ['latte di riso'], category: 'beverage', calories: 56.7, protein_g: 0.21, carbs_g: 10.82, fat_g: 1.37 },
]

export const BASIC_FOODS: BasicFood[] = [...BASIC_FOODS_BASE, ...ALCOHOLIC_DRINKS].map((food) => {
  const nutrients = BASIC_FOOD_EXTENDED_NUTRITION[food.id]
  if (!nutrients) throw new Error(`Valori nutrizionali estesi mancanti per ${food.id}`)
  const [fiber_g, sugars_g, salt_g] = nutrients
  return { ...food, fiber_g, sugars_g, salt_g }
})
