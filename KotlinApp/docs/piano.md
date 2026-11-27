# fitTrackr mobile

## Obiettivo

Portare su Android tutte le aree di fitTrackr con un’interfaccia nativa e un diario utilizzabile offline. Web e mobile condividono lo stesso account, lo stesso progetto Supabase e i dati già presenti. Dopo il primo caricamento, sul telefono si possono consultare i dati personali, registrarne di nuovi e ritrovare sul web le modifiche sincronizzate. Il futuro client iPhone potrà usare lo stesso modulo dati con un’interfaccia SwiftUI.

Per vedere dove si entra nell’app, come si raggiunge ogni pagina e quali funzioni introdurre nella beta, consulta la [mappa delle schermate e dei percorsi](schermate-e-navigazione.md).

## Struttura prevista

Il progetto Gradle si apre dalla radice `KotlinApp/`. La base attuale permette di esplorare le schermate Android e scegliere la lingua. Le tappe più sotto descrivono il successivo collegamento ai dati. [Avvio e organizzazione dei sorgenti](sviluppo.md)

| Directory | Responsabilità |
| --- | --- |
| `androidApp/` | App Android in Kotlin e Jetpack Compose. Schermate, navigazione, gesti e integrazioni di sistema. |
| `shared/` | Modulo Kotlin Multiplatform. Modelli, regole del diario, accesso ai dati locali, comunicazione con Supabase e sincronizzazione. |
| `docs/` | Documentazione di sviluppo, mappa delle schermate e proposte di stile. |

Il futuro client SwiftUI avrà sede in `iosApp/` quando inizierà lo sviluppo per iPhone.

Le schermate osservano Room su SQLite. Il modulo condiviso acquisisce i dati dell’account da Supabase e invia le operazioni in attesa attraverso le API di fitTrackr. Il progetto dei dati specifica la copertura per ogni area e il comportamento in caso di interruzioni o conflitti. [Database locale e sincronizzazione](dati-offline.md)

## Tappe e criteri di verifica

| Tappa | Risultato previsto | Criterio di accettazione |
| --- | --- | --- |
| Contratto dati | Mappare dati personali, dipendenze, letture e operazioni del web in ciascuna area. Individuare le estensioni necessarie sul Supabase attuale. | Ogni dato usato da una schermata ha una fonte, una regola di aggiornamento e un comportamento offline. |
| Accesso e primo download | Collegare Supabase Auth con email e Google. Scaricare in Room i dati dell’account già esistente e completare lo storico a pagine. | Il telefono mostra i dati inseriti sul web. Si distingue un periodo ancora da scaricare da uno scaricato e vuoto. Ogni account vede il proprio archivio. |
| Scritture e aggiornamenti | Collegare le operazioni delle diverse aree a una coda persistente e ricevere anche correzioni e cancellazioni dal web. | Una pesata, una porzione e un’attività registrate offline compaiono una sola volta sul web. Una correzione dal web aggiorna anche lo storico sul telefono. |
| Pagine e parità funzionale | Collegare le cinque sezioni, profilo, impostazioni dell’account, punti e servizi online al livello dati condiviso. | Ogni flusso rispetta gli stessi vincoli e produce gli stessi effetti della webapp. I dati calcolati dal server indicano quando sono stati aggiornati. |

Eventuali estensioni al database condiviso devono preservare i client esistenti e rispettare le autorizzazioni dell’account. Per le nuove RPC si applicano le regole del progetto sui permessi espliciti e sulla revisione delle migrazioni. [Accesso Trackrs](../../docs/autenticazione.md) · [Procedura Supabase](../../supabase/README.md)

Per preparare iPhone, appena disponibile un ambiente macOS con Xcode, la prima verifica sarà compilare il modulo condiviso e leggere dati locali da una schermata SwiftUI.
