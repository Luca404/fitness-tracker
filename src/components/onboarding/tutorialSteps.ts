export interface TutorialStep {
  id: string
  chapter: number
  path: string
  scene: string
  target: string
  action?: string
  waitFor?: string
  fields?: string
  resultTarget?: string
  completedTitle?: string
  completedDescription?: string
  actionLabel?: string
  title: string
  description: string
  nextLabel?: string
}

export const TUTORIAL_CHAPTERS = ['Ingredienti', 'Piatti', 'Pasti', 'Peso', 'Fitness', 'Benessere'] as const

const target = (name: string) => `[data-tour="${name}"]`
export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'welcome', chapter: 0, path: '/meals', scene: 'welcome', target: target('nav-kitchen'), action: target('nav-kitchen'),
    title: 'Partiamo dalla Cucina', description: 'Prova i pulsanti dell’app con dati temporanei. Scegli tu quando proseguire: apri Cucina dal menu.', actionLabel: 'Tocca Cucina' },
  { id: 'ingredient-add', chapter: 0, path: '/kitchen', scene: 'browse', target: target('pantry-add'), action: target('pantry-add'),
    title: 'Aggiungi un ingrediente', description: 'Apri il pulsante evidenziato per vedere i modi di inserimento.', actionLabel: 'Tocca Aggiungi ingrediente' },
  { id: 'ingredients', chapter: 0, path: '/kitchen', scene: 'ingredient-methods', target: target('ingredient-methods'),
    title: 'Ingredienti in tre modi', description: 'Codice a barre, foto della confezione o etichetta con AI, oppure inserimento manuale. Durante questa prova non accediamo alla fotocamera.', nextLabel: 'Ho capito' },
  { id: 'dishes-tab', chapter: 1, path: '/kitchen', scene: 'ingredient-methods', target: target('kitchen-dishes'), action: target('kitchen-dishes'),
    title: 'Passa ai Piatti', description: 'Gli ingredienti sono nel catalogo; i piatti sono le ricette che riutilizzi. Apri la scheda Piatti.', actionLabel: 'Tocca Piatti' },
  { id: 'dish-new', chapter: 1, path: '/kitchen?tab=dishes', scene: 'browse', target: target('dish-new'), action: target('dish-new'),
    title: 'Crea una ricetta', description: 'Apri il modulo. Troverai un esempio già compilato da provare.', actionLabel: 'Tocca Crea un nuovo piatto' },
  { id: 'dishes', chapter: 1, path: '/kitchen?tab=dishes', scene: 'dish-editor', target: target('form-save'), action: target('form-save'), fields: '[role="dialog"]', waitFor: 'dish-saved', resultTarget: target('dish-list'),
    title: 'Salva i tuoi piatti abituali', description: 'Puoi modificare nome e quantità dell’esempio, poi premi Salva piatto nel modulo.', actionLabel: 'Premi Salva piatto', completedTitle: 'Il piatto è nel ricettario', completedDescription: 'La ricetta è stata salvata solo nella dimostrazione. Guardala prima di continuare.' },
  { id: 'meals-nav', chapter: 2, path: '/kitchen?tab=dishes', scene: 'welcome', target: target('nav-meals'), action: target('nav-meals'),
    title: 'Apri il diario Pasti', description: 'Ora usiamo la ricetta appena salvata. Cambia pagina dal menu Pasti.', actionLabel: 'Tocca Pasti' },
  { id: 'meals-add', chapter: 2, path: '/meals', scene: 'welcome', target: target('meals-add'), action: target('meals-add'),
    title: 'Registra un pasto', description: 'Il diario registra quello che hai effettivamente mangiato. Apri Aggiungi pasto.', actionLabel: 'Tocca Aggiungi pasto' },
  { id: 'meal-type', chapter: 2, path: '/meals', scene: 'meal-type', target: target('meal-type-lunch'), action: target('meal-type-lunch'),
    title: 'Scegli il momento', description: 'Per questa prova scegli Pranzo.', actionLabel: 'Tocca Pranzo' },
  { id: 'meals', chapter: 2, path: '/meals', scene: 'meal-hub', target: target('meal-hub-options'),
    title: 'Registra quello che hai mangiato', description: 'Da foto stima un piatto di cui non conosci gli ingredienti; Da ingredienti permette di comporlo. Più sotto trovi le tue ricette e le porzioni già pronte.', nextLabel: 'Ho capito' },
  { id: 'saved-dish', chapter: 2, path: '/meals', scene: 'meal-hub', target: target('saved-dish'), action: target('saved-dish'),
    title: 'Scegli la tua ricetta', description: 'Apri il riso con zucchine dal ricettario.', actionLabel: 'Tocca Riso con zucchine' },
  { id: 'prepare-open', chapter: 2, path: '/meals', scene: 'dish-pick', target: target('dish-prepare'), action: target('dish-prepare'),
    title: 'Conserva una preparazione', description: 'Puoi mangiare una parte del piatto e tenere il resto per dopo. Apri Prepara e conserva il resto.', actionLabel: 'Tocca Prepara e conserva il resto' },
  { id: 'preparation', chapter: 2, path: '/meals', scene: 'dish-prepare', target: target('preparation-save'), action: target('preparation-save'), fields: '[role="dialog"]', waitFor: 'preparation-saved', resultTarget: target('prepared-dish'),
    title: 'Prepara ora, mangia quando vuoi', description: 'L’esempio lascia 0 grammi mangiati: conserverai tutto per dopo. Premi il pulsante di salvataggio nel modulo.', actionLabel: 'Salva la preparazione', completedTitle: 'La porzione è pronta per dopo', completedDescription: 'Qui ritrovi la quantità rimasta. Nessuna porzione non consumata viene aggiunta al diario.' },
  { id: 'meal-close', chapter: 2, path: '/meals', scene: 'meal-hub', target: target('meal-hub-close'), action: target('meal-hub-close'),
    title: 'Torna al diario', description: 'Chiudi il pannello con la X evidenziata.', actionLabel: 'Tocca la X del pannello' },
  { id: 'weight-nav', chapter: 3, path: '/meals', scene: 'welcome', target: target('nav-weight'), action: target('nav-weight'),
    title: 'Passa al Peso', description: 'Apri Peso dal menu per provare una misurazione.', actionLabel: 'Tocca Peso' },
  { id: 'weight', chapter: 3, path: '/weight', scene: 'weight-form', target: target('weight-save'), action: target('weight-save'), fields: target('weight-form'), waitFor: 'weight-saved', resultTarget: target('weight-summary'),
    title: 'Segui il tuo peso', description: 'Controlla data e peso di esempio, poi premi Salva. Il risultato rimarrà qui finché decidi di continuare.', actionLabel: 'Premi Salva nel modulo', completedTitle: 'Misurazione registrata', completedDescription: 'Il riepilogo mostra il valore salvato. Le tue misurazioni reali non sono state modificate.' },
  { id: 'fitness-nav', chapter: 4, path: '/weight', scene: 'weight-form', target: target('nav-fitness'), action: target('nav-fitness'),
    title: 'Apri Fitness', description: 'Cambia pagina dal menu Fitness.', actionLabel: 'Tocca Fitness' },
  { id: 'gym-new', chapter: 4, path: '/fitness', scene: 'browse', target: target('gym-plan-new'), action: target('gym-plan-new'),
    title: 'Crea una scheda', description: 'Apri una nuova scheda palestra. Per corsa, camminata e bici userai invece Altre attività.', actionLabel: 'Tocca Nuova scheda' },
  { id: 'fitness', chapter: 4, path: '/fitness', scene: 'gym-editor', target: target('gym-plan-save'), action: target('gym-plan-save'), fields: '[data-tour="gym-plan-editor"]', waitFor: 'plan-saved', resultTarget: target('gym-plans'),
    title: 'Palestra e altre attività', description: 'Prova la scheda con esercizio, serie e ripetizioni, poi salvala. I carichi si registrano durante l’allenamento.', actionLabel: 'Premi Salva scheda', completedTitle: 'La scheda è pronta', completedDescription: 'Da qui potrai iniziare un allenamento e registrare le serie. Premi Continua quando hai finito di guardare.' },
  { id: 'habits-nav', chapter: 5, path: '/fitness', scene: 'browse', target: target('nav-meals'), action: target('nav-meals'),
    title: 'Ritorna ai Pasti', description: 'Le buone abitudini si aprono dal diario. Torna ai Pasti dal menu.', actionLabel: 'Tocca Pasti' },
  { id: 'habits-open', chapter: 5, path: '/meals', scene: 'welcome', target: target('habits-open'), action: target('habits-open'),
    title: 'Apri le buone abitudini', description: 'Tocca il riepilogo con i quadratini per leggere quantità e obiettivi.', actionLabel: 'Tocca Buone abitudini' },
  { id: 'wellbeing', chapter: 5, path: '/meals/wellbeing', scene: 'habits-detail', target: target('habits-detail'),
    title: 'Uno sguardo al benessere', description: 'Qui leggi quantità e obiettivi; legumi e pesce usano gli ultimi sette giorni. Puoi rivedere questa prova dalle Impostazioni.', nextLabel: 'Termina il tutorial' },
]
