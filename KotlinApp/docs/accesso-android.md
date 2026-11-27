# Accesso Android

L’app mostra **Accedi** al primo avvio, dopo **Impostazioni → Account → Esci** e quando la sessione deve essere rinnovata con un nuovo accesso. Dopo l’autenticazione si apre **Pasti**. **Crea account** e **Recupera password** sono disponibili dalla schermata iniziale.

## Configurazione Supabase

In `KotlinApp/local.properties` aggiungere queste proprietà accanto a `sdk.dir`, oppure fornire le stesse variabili d’ambiente a Gradle.

```properties
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<chiave pubblica del progetto>
```

Usare i valori di produzione della webapp (`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`). La chiave deve essere quella pubblicabile del client. La build la incorpora nell’APK. Il file `.env.local` della webapp può invece puntare all’istanza di sviluppo. Quando i valori mancano, Android mostra il modulo con l’invio disabilitato.

La conferma email e il cambio password proseguono nel browser sul sito fitTrackr. Dopo aver aperto il link o cambiato la password, si può tornare al modulo Android. Per un ambiente di prova con un proprio sito HTTPS, impostare anche `FITTRACKR_WEB_URL` e usare un’origine e un percorso `/reset-password` autorizzati da Supabase. [Accesso web e redirect già configurati](../../docs/autenticazione.md)

In produzione Supabase Auth invia le email di conferma e recupero tramite Brevo con mittente `Trackrs <support@trackrs.org>`. Le risposte vengono inoltrate da Cloudflare alla casella Gmail di Trackrs. Web e Android usano la configurazione SMTP del progetto Supabase condiviso. [Mittente e inoltro delle risposte](../../docs/autenticazione.md#mittente-trackrs-e-inoltro-delle-risposte)

## Accesso con Google

**Continua con Google** apre il selettore nativo di Android sia in accesso sia in registrazione. Credential Manager ottiene un ID token e Supabase lo verifica prima di aprire la sessione Trackrs. Per chi ha già un account con la stessa email verificata, Supabase collega l’identità Google all’account esistente. [Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation) · [Come Supabase collega le identità](https://supabase.com/docs/guides/auth/identities)

1. In **Google Auth Platform → Clients**, creare o riusare un client **Web application**. Per supportare anche il sito, aggiungere l’origine di produzione e il **Callback URL** mostrato nel provider Google di Supabase. Il callback ha forma `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Nello stesso progetto Google creare un client **Android** per `it.trackrs.fittrackr`, con lo SHA-1 del certificato che firma l’APK. Da `KotlinApp/` si può leggere l’impronta con `./gradlew :androidApp:signingReport`. Per la distribuzione con Play App Signing usare anche lo SHA-1 indicato nella Play Console.
3. In **Supabase → Authentication → Sign In / Providers → Google**, abilitare Google e inserire i due Client ID separati da virgola, con quello Web per primo. Inserire il **Client Secret del client Web** nella dashboard Supabase e lasciare attivo il controllo del nonce. [Configurazione Google per Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) · [Certificati Android](https://developers.google.com/android/guides/client-auth)
4. Aggiungere il solo **Client ID Web pubblico** a `KotlinApp/local.properties` come `GOOGLE_WEB_CLIENT_ID` e ricompilare. Il pulsante compare quando questo valore e la configurazione Supabase sono presenti. Per la prova su emulatore usare un’immagine con Google Play Services.

## Sessione e inattività

L’access token segue la durata configurata in Supabase e il client tenta di rinnovarlo automaticamente. Android conserva la sessione, inclusi i token, in un file cifrato con una chiave Android Keystore. Il file è escluso dal backup. La password si usa per inviare il modulo e resta solo nella memoria della schermata.

Dopo **30 giorni di inattività** il telefono chiede un nuovo accesso alla successiva apertura. Il periodo si misura dall’ultima volta in cui si è usata l’app in primo piano. Il rinnovo del token in background è indipendente. La soglia è una regola del client Android. **Esci** prova a revocare la sessione corrente su Supabase e chiude la sessione locale anche offline. [Durata delle sessioni Supabase](https://supabase.com/docs/guides/auth/sessions)

Se l’access token scade durante una perdita di rete entro il periodo di inattività, l’app rimane aperta sull’account già riconosciuto e il client riprova il rinnovo. Quando sarà collegato Room, le operazioni locali seguiranno lo stesso account e gli invii attenderanno una sessione server valida. Dopo l’inattività o l’uscita esplicita, l’archivio dell’account tornerà accessibile con il successivo accesso allo stesso account. [Database locale e sincronizzazione](dati-offline.md)
