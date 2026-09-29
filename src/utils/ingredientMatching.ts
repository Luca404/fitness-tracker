const NAME_ALIASES: Record<string, string> = {
  'olio evo': 'olio extravergine oliva',
  'olio extravergine di oliva': 'olio extravergine oliva',
  'petto di pollo': 'pollo',
  'petto pollo': 'pollo',
  'pomodoro fresco': 'pomodoro',
  'pomodori freschi': 'pomodoro',
}

export function normalizeIngredientName(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(cotto|cotta|cotti|cotte|crudo|cruda|fresco|fresca|freschi|fresche|sgocciolato)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return NAME_ALIASES[normalized] ?? normalized
}
