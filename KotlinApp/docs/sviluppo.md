# Aprire la base Android

In Android Studio aprire `KotlinApp/`, attendere la sincronizzazione Gradle, scegliere la configurazione **androidApp** e premere **Run** con il Pixel 8 avviato. Il progetto compila con SDK 37 e supporta da Android 8.0 (API 26). Da terminale, nella stessa directory e con l’SDK configurato, usare `./gradlew :androidApp:assembleDebug`. L’APK viene scritto in `androidApp/build/outputs/apk/debug/`.

Al primo avvio compare **Accedi**. Dopo l’accesso si apre **Pasti**, con storico, riepilogo nutrizionale e ingredienti letti da Room. La barra inferiore porta alle cinque sezioni. [Configurazione dell’accesso](accesso-android.md) · [Database locale](dati-offline.md) · [Mappa delle pagine](schermate-e-navigazione.md)

## Dove intervenire

| Percorso | Responsabilità |
| --- | --- |
| `androidApp/src/main/kotlin/it/trackrs/fittrackr/navigation/` | Destinazioni, navigazione Android e barre comuni. |
| `androidApp/src/main/kotlin/it/trackrs/fittrackr/features/` | Percorsi e contenuti per area. Quando una pagina acquista un comportamento proprio, il suo composable vive qui accanto alla funzione che lo usa. |
| `androidApp/src/main/kotlin/it/trackrs/fittrackr/auth/` | Accesso Supabase, ripristino della sessione e conservazione protetta su Android. |
| `androidApp/src/main/kotlin/it/trackrs/fittrackr/ui/` | Tema e componenti riutilizzati dalle schermate. |
| `androidApp/src/main/res/` | Testi traducibili, lingue supportate e icone riprese dalla navigazione web. |
| `shared/src/commonMain/` | Tipi indipendenti dalla piattaforma, a partire dai momenti del pasto. Le etichette appartengono al client. |

## Aggiungere una lingua

I testi predefiniti sono in italiano in `res/values/strings.xml`. Per introdurre, per esempio, l’inglese, aggiungere le traduzioni con le stesse chiavi in `res/values-en/strings.xml` e dichiarare `en` in `res/xml/app_locales.xml`. Il selettore in **Impostazioni → Lingua** legge questo elenco e mostra ogni lingua nel suo nome originale. Android conserva la scelta dell’utente e su Android 13 e successivi la espone anche nelle impostazioni di sistema.

Verificare il cambio lingua, il riavvio e il ritorno a **Lingua del dispositivo**. Date e quantità da visualizzare usano la lingua dell’interfaccia, mentre chiavi di navigazione e valori scambiati con il backend rimangono stabili. Per i nuovi testi con conteggi o parametri usare le risorse Android per plurali e segnaposto.

## Stili dell’app

In **Impostazioni → Aspetto** la scelta si applica subito e viene salvata sul dispositivo.

- **Diario** è il predefinito, con blu notte e accenti menta.
- **Essenziale** usa toni neutri e righe del diario più compatte.
- **Vivace** usa accenti rosati e aggiunge emoji ai titoli dei momenti del pasto.
- **Quaderno** usa fondo avorio e verde salvia.

Tutti gli stili usano **Source Serif 4** per titoli, testi, numeri e controlli. È il carattere principale della web app. I TTF variabili Adobe 4.005, tondo e corsivo, sono in `androidApp/src/main/res/font/` e sono disponibili offline. La licenza SIL OFL è inclusa nell’APK in `assets/licenses/`. [Tipografia della web app](../../docs/interfaccia-e-ricettario.md#tipografia) · [Release ufficiale di Adobe](https://github.com/adobe-fonts/source-serif/releases/tag/4.005R)

## Buone abitudini

Il recap di Pasti e la pagina di dettaglio usano il diario in Room. La data selezionata determina sia i valori giornalieri sia la finestra di sette giorni per legumi e pesce. Per aggiornare la copia Android di soglie, categorie e gradazioni usate dal web, dalla radice del repository eseguire `node KotlinApp/tools/export-habit-catalog.ts` con Node 22.18 o successivo e includere il JSON rigenerato. La build Android legge il file incluso nel progetto. [Regole delle buone abitudini](../../docs/buone-abitudini.md)
