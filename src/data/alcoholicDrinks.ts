import type { BasicFood } from './basicFoods'

// Indicative recipes, before ice melts. Volumes, ABV and carbohydrates vary
// with the bartender and brands. These are tracker estimates, not label data.
// IBA references: https://iba-world.com/iba-cocktail/spritz/
// https://iba-world.com/iba-cocktail/negroni/
// https://iba-world.com/iba-cocktail/cuba-libre/
function drink(id: string, name: string, serving_ml: number, alcohol_abv: number,
  carbs_g: number, sugars_g = carbs_g, cocktail = true, aliases?: string[], fat_g = 0): BasicFood {
  return { id, name, serving_ml, alcohol_abv, cocktail, aliases, category: 'alcohol',
    calories: Math.round((alcohol_abv * 0.789 * 7 + carbs_g * 4 + fat_g * 9) * 100) / 100,
    protein_g: 0, carbs_g, fat_g, fiber_g: 0, sugars_g, salt_g: 0 }
}

export const ALCOHOLIC_DRINKS: BasicFood[] = [
  drink('vino-rose', 'Vino rosé', 125, 12, 2, 0.5, false, ['vino rosato']),
  drink('prosecco', 'Prosecco', 125, 11, 2, 1.5, false),
  drink('birra-ambrata', 'Birra ambrata', 330, 5.5, 4, 0.3, false),
  drink('birra-forte', 'Birra forte', 330, 8, 4, 0.3, false),
  // 90 ml prosecco (11%) + 60 ml Aperol (11%) / Campari (25%) + 30 ml soda.
  drink('aperol-spritz', 'Aperol Spritz', 180, 9.17, 9),
  drink('campari-spritz', 'Campari Spritz', 180, 13.83, 9),
  // Equal parts gin (40%), Campari (25%), vermouth (16%); prosecco replaces gin in Sbagliato.
  drink('negroni', 'Negroni', 90, 27, 10),
  drink('negroni-sbagliato', 'Negroni Sbagliato', 90, 17.33, 10, 10, true, ['sbagliato']),
  drink('gin-tonic', 'Gin Tonic', 200, 10, 6, 6, true, ['gin e tonic', 'gin & tonic']),
  drink('gin-lemon', 'Gin Lemon', 200, 10, 8),
  drink('cuba-libre', 'Cuba Libre', 180, 11.11, 7.2, 7.2, true, ['rum e cola', 'rum cola']),
  drink('mojito', 'Mojito', 200, 9, 6),
  drink('margarita', 'Margarita', 100, 26, 6),
  drink('moscow-mule', 'Moscow Mule', 180, 10, 8),
  drink('americano-cocktail', 'Americano (cocktail)', 90, 13.67, 10),
  drink('daiquiri', 'Daiquiri', 100, 24, 12),
  drink('caipirinha', 'Caipirinha', 120, 20, 10),
  drink('long-island', 'Long Island Iced Tea', 200, 15, 8, 8, true, ['long island']),
  drink('pina-colada', 'Piña Colada', 200, 10, 13, 12, true, ['pina colada'], 2.5),
  drink('whiskey-sour', 'Whiskey Sour', 120, 15, 10, 10, true, ['whisky sour']),
  drink('dry-martini', 'Dry Martini', 70, 34, 0.5, 0.2, true, ['martini cocktail']),
  drink('espresso-martini', 'Espresso Martini', 110, 20, 10),
  drink('bloody-mary', 'Bloody Mary', 150, 12, 3, 2),
  drink('sex-on-the-beach', 'Sex on the Beach', 200, 10, 12),
  drink('tequila-sunrise', 'Tequila Sunrise', 180, 10, 12),
]
