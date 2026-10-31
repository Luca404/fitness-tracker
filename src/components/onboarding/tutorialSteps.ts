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
    title: 'Scopri l’app, un clic alla volta', description: 'Partiamo dalla Cucina: qui salvi gli ingredienti e i piatti da riutilizzare. Tocca il pulsante illuminato per entrare.', nextLabel: 'Apri Cucina' },
  { id: 'ingredient-add', chapter: 0, path: '/kitchen', scene: 'ingredient-list', target: target('pantry-add'), action: target('pantry-add'),
    title: 'Il tuo catalogo di ingredienti', description: 'Gli alimenti che aggiungi restano disponibili per i tuoi piatti e pasti. Proviamo a inserirne uno.', nextLabel: 'Aggiungi ingrediente' },
  { id: 'ingredient-methods', chapter: 0, path: '/kitchen', scene: 'ingredient-methods', target: target('ingredient-methods'), action: target('ingredient-manual'),
    title: 'Codice a barre, foto o a mano', description: 'Puoi scansionare un prodotto, far leggere all’AI la foto della confezione o dell’etichetta, cercare un alimento base oppure inserirlo a mano. In questa prova scegliamo l’ultima opzione.', nextLabel: 'Prova a mano' },
  { id: 'ingredient-save', chapter: 0, path: '/kitchen', scene: 'ingredient-review', target: target('pantry-nutrition'), action: `${target('pantry-review')} ${save}`, waitFor: 'ingredient-saved',
    title: 'Controlla i valori e salva', description: 'Ecco uno yogurt di esempio già compilato. Lo stesso controllo serve dopo una scansione o una foto AI: verifica nome, valori per 100 g/ml e categoria.', nextLabel: 'Salva l’esempio' },
  { id: 'ingredient-result', chapter: 0, path: '/kitchen', scene: 'ingredient-result', target: target('pantry-items'),
    title: 'Eccolo nel tuo catalogo', description: 'Lo yogurt è comparso tra gli ingredienti. Puoi ritrovarlo e riutilizzarlo; il catalogo non è una scorta da consumare.', nextLabel: 'Passa ai piatti' },
  { id: 'dish-new', chapter: 1, path: '/kitchen?tab=dishes', scene: 'dishes-list', target: target('dish-new'), action: target('dish-new'),
    title: 'Crea un piatto da riutilizzare', description: 'Nella scheda Piatti combini ingredienti e quantità in una ricetta. Così non devi ricomporla ogni volta.', nextLabel: 'Crea un piatto' },
  { id: 'dish-save', chapter: 1, path: '/kitchen?tab=dishes', scene: 'dish-editor', target: target('dish-composition'), action: save, waitFor: 'dish-saved',
    title: 'Ingredienti e quantità, una volta sola', description: 'Abbiamo composto del riso con zucchine e scelto Pranzo e Cena. Salva la ricetta: sarà disponibile nei pasti selezionati.', nextLabel: 'Salva il piatto' },
  { id: 'meal-add', chapter: 2, path: '/meals', scene: 'meals-list', target: target('meals-add'), action: target('meals-add'),
    title: 'Qui registri ciò che mangi', description: 'Pasti è il diario del cibo effettivamente consumato. Il giorno selezionato determina dove verrà registrato il pasto.', nextLabel: 'Aggiungi pasto' },
  { id: 'meal-type', chapter: 2, path: '/meals', scene: 'meal-type', target: target('meal-type-lunch'), action: target('meal-type-lunch'),
    title: 'Scegli il momento della giornata', description: 'Colazione, pranzo, cena, spuntino o bevande: scegliamo Pranzo per questa dimostrazione.', nextLabel: 'Scegli Pranzo' },
  { id: 'meal-ingredients', chapter: 2, path: '/meals', scene: 'meal-hub', target: target('meal-ingredients'), action: target('meal-ingredients'),
    title: 'Scegli come aggiungere il cibo', description: 'Puoi partire dagli ingredienti, scegliere un piatto della tua cucina o usare una foto. Apriamo prima Da ingredienti.', nextLabel: 'Mostra le opzioni' },
  { id: 'meal-ingredient-options', chapter: 2, path: '/meals', scene: 'meal-ingredient-options', target: target('meal-ingredient-options'),
    title: 'Un alimento o un piatto composto', description: 'Un alimento registra un singolo ingrediente con la sua quantità. Componi un piatto unisce più ingredienti per questo pasto; Crea una ricetta lo salva anche in Cucina. Ora proviamo invece un piatto già salvato.', nextLabel: 'Prova un piatto salvato' },
  { id: 'meal-hub', chapter: 2, path: '/meals', scene: 'meal-hub', target: target('saved-dish'), action: target('saved-dish'),
    title: 'Un ingrediente, un piatto nuovo o uno salvato', description: 'Da ingredienti puoi registrare un singolo alimento o comporre un piatto nuovo. Qui sotto ritrovi anche i piatti salvati e quelli già pronti. Apriamo la ricetta appena creata.', nextLabel: 'Apri il piatto salvato' },
  { id: 'dish-prepare', chapter: 2, path: '/meals', scene: 'dish-pick', target: target('dish-prepare'), action: target('dish-prepare'),
    title: 'Preparare non significa mangiare tutto', description: 'Puoi registrare tutto il piatto oppure prepararlo e conservarne una parte. Proviamo a tenerlo pronto per dopo.', nextLabel: 'Prepara e conserva' },
  { id: 'preparation-save', chapter: 2, path: '/meals', scene: 'dish-prepare', target: target('preparation-save'), action: target('preparation-save'), waitFor: 'preparation-saved',
    title: 'Scegli quanto consumare subito', description: 'La preparazione considera la cottura e il peso finale. Nell’esempio la porzione immediata è zero: salviamo tutto per mangiarlo più tardi.', nextLabel: 'Conserva l’esempio' },
  { id: 'prepared-list', chapter: 2, path: '/meals', scene: 'prepared-list', target: target('prepared-dish'), action: target('prepared-dish'),
    title: 'Il resto ti aspetta tra i piatti pronti', description: 'La quantità conservata ora compare qui. Non è ancora nel diario: aprila quando ne mangi una porzione.', nextLabel: 'Apri il piatto pronto' },
  { id: 'portion-save', chapter: 2, path: '/meals', scene: 'prepared-pick', target: target('portion-save'), action: target('portion-save'), waitFor: 'portion-saved',
    title: 'Registra soltanto la tua porzione', description: 'Abbiamo scelto 200 g di esempio. Vengono registrati solo questi; la quantità rimasta resta disponibile per i prossimi pasti.', nextLabel: 'Registra la porzione' },
  { id: 'meal-result', chapter: 2, path: '/meals', scene: 'meal-result', target: target('meal-diary'),
    title: 'La porzione è nel diario', description: 'Ora vedi il piatto consumato e i valori della sua porzione. Il resto è ancora tra i piatti pronti, senza essere contato come mangiato.', nextLabel: 'Prova un pasto da foto' },
  { id: 'photo-method', chapter: 2, path: '/meals', scene: 'photo-method', target: target('meal-photo'), action: target('meal-photo'),
    title: 'Quando non conosci gli ingredienti', description: 'Per un piatto al ristorante o un pasto occasionale puoi usare una foto analizzata dall’AI. Apriamo un risultato dimostrativo, senza usare la fotocamera.', nextLabel: 'Mostra la stima da foto' },
  { id: 'photo-save', chapter: 2, path: '/meals', scene: 'photo-review', target: target('meal-photo-estimate'), action: save, waitFor: 'meal-saved',
    title: 'Controlla la stima e la porzione', description: 'L’AI propone ingredienti, quantità e valori approssimativi. Puoi correggerli e indicare quanto hai mangiato. Questa è la foto di un pasto; la foto dell’etichetta serve invece per gli ingredienti.', nextLabel: 'Registra il pasto di esempio' },
  { id: 'weight-save', chapter: 3, path: '/weight', scene: 'weight-form', target: target('weight-form'), action: target('weight-save'), waitFor: 'weight-saved',
    title: 'Aggiungi una pesata', description: 'Scegli la data e inserisci il peso in kg. Proviamo a salvare il valore di esempio già compilato.', nextLabel: 'Salva la pesata' },
  { id: 'weight-result', chapter: 3, path: '/weight', scene: 'weight-result', target: target('weight-summary'),
    title: 'Una misura nel tuo andamento', description: 'La pesata compare nel riepilogo e nello storico. Con più misurazioni vedrai il grafico; i dati del profilo e gli obiettivi si aggiornano dalle Impostazioni.', nextLabel: 'Passa a Fitness' },
  { id: 'gym-new', chapter: 4, path: '/fitness', scene: 'fitness', target: target('gym-plan-new'), action: target('gym-plan-new'),
    title: 'Organizza la palestra e i pesi', description: 'Crea una scheda per gli allenamenti che ripeti. Ogni scheda raccoglie esercizi, serie e ripetizioni.', nextLabel: 'Crea una scheda' },
  { id: 'gym-save', chapter: 4, path: '/fitness', scene: 'gym-editor', target: target('gym-plan-save'), action: target('gym-plan-save'), waitFor: 'plan-saved',
    title: 'La tua scheda, pronta da seguire', description: 'L’esempio contiene la panca piana, con tre serie da dieci ripetizioni. Puoi usare gli esercizi del catalogo o aggiungerne di personali.', nextLabel: 'Salva la scheda' },
  { id: 'gym-result', chapter: 4, path: '/fitness', scene: 'gym-result', target: target('gym-plans'),
    title: 'Dalla scheda alla sessione', description: 'Da Inizia allenamento avvii una sessione: registri carichi, ripetizioni e serie completate. L’andamento degli allenamenti svolti si ritrova in Progressi.', nextLabel: 'Scopri le altre attività' },
  { id: 'activity-new', chapter: 4, path: '/fitness', scene: 'activities', target: target('activity-new'), action: target('activity-new'),
    title: 'Anche fuori dalla palestra', description: 'Altre attività raccoglie camminate, corsa, bici e altro. Ogni registrazione ha una durata e, quando prevista, una distanza.', nextLabel: 'Apri le attività' },
  { id: 'activity-pick', chapter: 4, path: '/fitness', scene: 'activity-picker', target: target('activity-walking'), action: target('activity-walking'),
    title: 'Scegli cosa hai fatto', description: 'Proviamo con una camminata: il modulo successivo ti chiederà i dettagli dell’attività.', nextLabel: 'Scegli Camminata' },
  { id: 'activity-save', chapter: 4, path: '/fitness', scene: 'activity-form', target: target('activity-save'), action: target('activity-save'), waitFor: 'activity-saved',
    title: 'Durata e distanza', description: 'La camminata di esempio dura 30 minuti. I chilometri sono facoltativi; quando li aggiungi, la stima considera anche la velocità media.', nextLabel: 'Salva l’attività' },
  { id: 'habits-open', chapter: 5, path: '/meals', scene: 'habits', target: target('habits-open'), action: target('habits-open'),
    title: 'Non solo calorie', description: 'Da Pasti apri Buone abitudini: i quadratini riassumono verdura, frutta, legumi, pesce, fibre, zuccheri, alcol e sale.', nextLabel: 'Apri Buone abitudini' },
  { id: 'habits-detail', chapter: 5, path: '/meals/wellbeing', scene: 'habits-detail', target: target('habits-detail'),
    title: 'Il benessere, nel dettaglio', description: 'Qui trovi quantità e obiettivi. Legumi e pesce sono valutati sugli ultimi sette giorni; un trattino segnala dati incompleti. Puoi rivedere il tour da Impostazioni → Rivedi il tutorial.', nextLabel: 'Termina il tutorial' },
]
