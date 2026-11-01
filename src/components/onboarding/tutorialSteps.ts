export interface TutorialStep {
  id: string
  chapter: number
  path: string
  scene: string
  target: string
  action?: string
  waitFor?: string
  title: string
  description: string
  nextLabel?: string
}

export const TUTORIAL_CHAPTERS = ['Ingredienti', 'Piatti', 'Pasti', 'Peso', 'Fitness', 'Benessere'] as const

const target = (name: string) => `[data-tour="${name}"]`
const save = target('form-save')

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: 'welcome', chapter: 0, path: '/meals', scene: 'welcome', target: target('nav-kitchen'), action: target('nav-kitchen'),
    title: 'Partiamo dalla Cucina', description: 'Qui salvi ingredienti e piatti da riutilizzare. Tocca Cucina per iniziare: questa è una dimostrazione con dati temporanei.', nextLabel: 'Apri Cucina' },
  { id: 'ingredients', chapter: 0, path: '/kitchen', scene: 'ingredient-methods', target: target('ingredient-methods'),
    title: 'Ingredienti in tre modi', description: 'Scansiona il codice a barre, fotografa la confezione o l’etichetta per far leggere i valori all’AI, oppure inseriscili a mano. Gli ingredienti salvati restano nel tuo catalogo.', nextLabel: 'Vai ai piatti' },
  { id: 'dishes', chapter: 1, path: '/kitchen?tab=dishes', scene: 'dish-editor', target: target('dish-composition'), action: save, waitFor: 'dish-saved',
    title: 'Salva i tuoi piatti abituali', description: 'Combina ingredienti e quantità in una ricetta. Questo riso con zucchine è già compilato: salvalo per ritrovarlo nei pasti.', nextLabel: 'Salva l’esempio' },
  { id: 'preparation', chapter: 2, path: '/meals', scene: 'dish-prepare', target: target('preparation-amount'), action: target('preparation-save'), waitFor: 'preparation-saved',
    title: 'Prepara ora, mangia quando vuoi', description: 'Puoi consumare solo una porzione e conservare il resto. Nell’esempio salviamo tutto per dopo: nei Pasti ritroverai il piatto pronto con la quantità rimasta.', nextLabel: 'Conserva l’esempio' },
  { id: 'meals', chapter: 2, path: '/meals', scene: 'meal-hub', target: target('meal-hub-options'),
    title: 'Registra quello che hai mangiato', description: 'Aggiungi un ingrediente, componi un piatto o scegli una ricetta salvata o già pronta. Non conosci gli ingredienti? Usa Da foto e controlla la stima AI. Nel diario conta solo la quantità consumata.', nextLabel: 'Vai al peso' },
  { id: 'weight', chapter: 3, path: '/weight', scene: 'weight-form', target: target('weight-form'), action: target('weight-save'), waitFor: 'weight-saved',
    title: 'Segui il tuo peso', description: 'Scegli la data e registra una pesata: la ritrovi nello storico e nel grafico. Proviamo con il valore di esempio già inserito.', nextLabel: 'Salva l’esempio' },
  { id: 'fitness', chapter: 4, path: '/fitness', scene: 'gym-editor', target: target('gym-plan-reps'), action: target('gym-plan-save'), waitFor: 'plan-saved',
    title: 'Palestra e altre attività', description: 'Crea schede con esercizi, serie e ripetizioni; durante la sessione registri anche i carichi. Da Altre attività aggiungi camminate, corsa, bici e altro, con durata e distanza quando prevista.', nextLabel: 'Salva la scheda di esempio' },
  { id: 'wellbeing', chapter: 5, path: '/meals/wellbeing', scene: 'habits-detail', target: target('habits-detail'),
    title: 'Uno sguardo al benessere', description: 'Apri Buone abitudini dai quadratini in Pasti. Qui trovi quantità e obiettivi; legumi e pesce usano gli ultimi sette giorni. Puoi rivedere questa guida dalle Impostazioni.', nextLabel: 'Inizia a usare l’app' },
]
