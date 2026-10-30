# Accesso, registrazione e recupero password

La pagina usa la grafica scura e verde di fitTrackr, con un modulo compatto su
telefono e una presentazione affiancata su desktop. L’account è condiviso con
le altre app Trackrs: chi ne possiede uno può già accedere con le stesse credenziali.

La registrazione e il recupero chiedono due volte la nuova password, con un
minimo di 8 caratteri nell’interfaccia. Le password esistenti più corte continuano
a funzionare in accesso. I pulsanti con l’occhio mostrano e nascondono il testo;
i campi supportano i gestori di password. Eventuali requisiti più restrittivi di
Supabase restano applicati dal server.

Gli errori di compilazione sono vicini ai campi e portano il focus sul primo
campo da correggere. Errori del servizio, connessione, credenziali non valide,
email da confermare, limiti di invio e password rifiutate hanno messaggi in
italiano. Le richieste in corso disabilitano i controlli e gli invii ripetuti.

## Email già registrate

Il client presenta lo stesso messaggio per una registrazione in attesa di
conferma, una risposta anonima di Supabase e un errore esplicito di account già
esistente. Offre poi **Torna ad accedere** e **Recupera password**. Non viene
aggiunto un servizio pubblico per cercare indirizzi registrati.

Questo evita di rivelare l’esistenza di un account nell’interfaccia. Non rende
anonime le risposte HTTP del server: con conferma email disabilitata, l’API può
ancora distinguere una nuova registrazione da un indirizzo esistente. Per
proteggere anche questo livello, verificare **Confirm email** nella configurazione
Auth del progetto. Il client non distingue le identità fittizie di Supabase.
Il messaggio di recupero resta condizionale: «Se esiste un account associato a
questa email…». [OWASP spiega il rischio di enumerazione degli account](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#authentication-and-error-messages).

Al controllo del 30 ottobre 2026 l’istanza **locale** indicata da `.env.local`
restituiva `mailer_autoconfirm: true`: la conferma email era disabilitata.
Sul progetto **ospitato**, verificato tramite API usando la sessione della CLI,
`mailer_autoconfirm` era invece `false`: la conferma email era già attiva.
Le impostazioni Auth sono condivise con le altre app Trackrs; la conferma
email non è stata modificata.

## Recupero via email

**Password dimenticata?** invoca `resetPasswordForEmail` con destinazione
`<origine dell’app>/reset-password`. Il client Supabase gestisce la sessione dal
link; `PASSWORD_RECOVERY` apre il modulo prima del caricamento del profilo e
dell’onboarding. La pagina resta raggiungibile dopo un ricaricamento. Dopo
`updateUser({ password })`, la conferma resta visibile fino a **Vai a fitTrackr**.
La nuova password vale per tutte le app Trackrs.

Link scaduti o non validi offrono direttamente un nuovo invio. Un errore nel
callback impedisce di cambiare la password usando una precedente sessione.

Per ogni ambiente servono questi URL nella configurazione Auth:

- la Site URL appropriata al progetto condiviso;
- `<dominio-fitTrackr>/` per il ritorno dalla conferma email e da Google;
- `<dominio-fitTrackr>/reset-password` per il recupero;
- gli equivalenti locali o gli URL di anteprima effettivamente utilizzati.

Aggiungere gli indirizzi fitTrackr alla lista esistente, preservando quelli delle
altre app. `supabase/config.toml` include gli URL Vite sulla porta 5173 solo per
lo sviluppo; modificarlo non aggiorna un’istanza già avviata né quella ospitata.
Non usare un push globale della configurazione locale sul progetto condiviso.

Il 30 ottobre 2026 sono stati aggiunti e riletti tramite Management API i due
redirect di produzione, sul dominio indicato nella homepage del repository:

- `https://fitness-tracker-delta-kohl.vercel.app/`
- `https://fitness-tracker-delta-kohl.vercel.app/reset-password`

La lista conserva `https://trackr-dusky.vercel.app/**`; la Site URL condivisa
resta `https://trackr-dusky.vercel.app/`. La modifica remota ha aggiornato solo
`uri_allow_list`. Nessuna migrazione o modifica ai dati era necessaria.

Il template **Reset password** deve mantenere il collegamento di verifica
Supabase (`{{ .ConfirmationURL }}`), che rispetta il redirect indicato. Un
template che costruisce direttamente un link alla sola Site URL va aggiornato.
Vercel serve anche `/reset-password` tramite la riscrittura SPA e senza cache HTML.

Per inviare a utenti reali verificare il servizio **SMTP**: quello predefinito
Supabase è limitato agli indirizzi autorizzati del team e non è un servizio
di produzione. In locale le email vengono catturate dall’inbox di sviluppo.
Non servono un nuovo endpoint email o chiavi amministrative nel frontend.
Sul progetto ospitato, al controllo da terminale del 30 ottobre 2026, SMTP
personalizzato non era configurato, il Send Email hook era disabilitato e il
limite email era 2 invii all’ora. La documentazione limita il servizio predefinito
agli indirizzi del team; questo controllo della configurazione non dimostra
un blocco di consegna effettivo. Il proprietario segnala conferme di registrazione
ricevute anche da utenti esterni al team. Prima di introdurre un servizio esterno,
verificare il recupero con un invio autorizzato a un indirizzo di test: non è stato
eseguito un test di consegna durante questa modifica.
[Configurazione SMTP](https://supabase.com/docs/guides/auth/auth-smtp) e
[API di recupero](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

### Brevo collegato — 30 ottobre 2026

Dopo la verifica iniziale è stato configurato **Brevo** sul progetto ospitato:
`smtp-relay.brevo.com`, porta `587` con STARTTLS, nome mittente **Trackrs**.
Il login, la chiave SMTP e il mittente verificato provengono dal file privato
`.env.smtp.local`, escluso da Git e leggibile solo dal proprietario. La
configurazione locale Supabase continua a usare l’inbox di sviluppo.

Il limite condiviso di Supabase è ora **30 email all’ora**, il valore iniziale
documentato per SMTP personalizzato; restano applicabili i limiti del piano
Brevo. Site URL, redirect, conferma email e Google sono stati preservati e
riletti dopo l’aggiornamento.

Una richiesta di recupero al destinatario autorizzato ha restituito HTTP 200.
Una verifica in sola lettura ha confermato l’account e la registrazione
dell’invio; il destinatario ha poi confermato la ricezione. Il test non ha
usato il link per cambiare password e non ha creato nuovi account.

Il controllo SMTP dal computer locale era stato rifiutato con `525` per il
filtro IP di Brevo. Il filtro non è stato modificato: la successiva richiesta
dal servizio Auth ospitato è stata accettata e l’email ricevuta. Se un invio
futuro viene bloccato, verificare l’IP effettivo del server di invio nella
sezione **Security → Authorized IPs** di Brevo; l’IP del computer locale non
identifica quello di Supabase. Vedere la
[guida Brevo al filtro IP](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security).

L’attivazione SMTP è distinta dal rilascio del frontend: la ricezione di questa
email non verifica la schermata di reset sulla versione online precedente.

## Login con Google

L’integrazione è implementata con `signInWithOAuth({ provider: 'google' })`.
Il pulsante **Continua con Google** appare in accesso e registrazione solo se
`GET /auth/v1/settings` restituisce `external.google: true`. Se la lettura fallisce,
resta disponibile l’accesso email. Non serve una variabile Vite aggiuntiva.

Per abilitarlo, creare un client OAuth **Web application** in Google Cloud,
configurare origini autorizzate e consenso, e registrare come redirect Google
il callback mostrato da Supabase:
`https://<project-ref>.supabase.co/auth/v1/callback`. Client ID e Client Secret
vanno nel provider Google della dashboard Supabase; il Secret non deve finire
nel repository o in variabili `VITE_`. Aggiungere poi l’URL di ritorno fitTrackr
alla lista Supabase. Il browser gestisce il ritorno con il client Auth esistente.

Al controllo del 30 ottobre 2026 Google era disabilitato sia nell’istanza **locale**
sia nel progetto **ospitato**. Quest’ultimo non aveva Client ID o Client Secret
Google configurati. Le credenziali e il provider non sono stati modificati;
l’accesso reale richiede quel passaggio. Vedere la
[guida ufficiale Google con Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).

## Verifica

I test coprono validazione, conferma password, messaggi neutrali, errori di rete,
invii doppi, callback scaduti con una sessione già presente, modalità di recupero,
redirect, aggiornamento password e disponibilità di Google. Non creano utenti,
non inviano email e non cambiano password reali. La consegna email ospitata è
stata verificata separatamente con Brevo e confermata dal destinatario, come
descritto sopra. L’accesso Google e il flusso completo sulla nuova versione del
frontend restano da verificare prima del rilascio.
