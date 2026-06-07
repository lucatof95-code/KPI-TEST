# Guida all'installazione — KPI Formazione ERP

Questa guida spiega come installare e avviare l'applicazione su un PC Windows o macOS,
sia per uso personale (sviluppo) sia per renderla accessibile ad altri PC sulla stessa rete locale.

---

## Prerequisiti

Installa questi programmi prima di iniziare. Sono gratuiti.

### 1. Node.js (versione 18 o superiore)

- Vai su **https://nodejs.org**
- Scarica la versione **LTS** (consigliata)
- Esegui l'installer e segui le istruzioni

Verifica l'installazione aprendo il Terminale (Mac) o il Prompt dei comandi (Windows):
```
node --version    # deve mostrare v18.x.x o superiore
npm --version     # deve mostrare 9.x.x o superiore
```

### 2. Git

- Vai su **https://git-scm.com/downloads**
- Scarica e installa per il tuo sistema operativo

Verifica:
```
git --version
```

---

## Installazione

### Passo 1 — Scarica il progetto

Apri il Terminale nella cartella dove vuoi installare l'app, poi esegui:

```bash
git clone https://github.com/lucatof95-code/KPI-TEST.git
cd KPI-TEST
```

Oppure scarica manualmente lo ZIP da GitHub e decomprimi la cartella.

### Passo 2 — Crea il file di configurazione

Nella cartella `server/` crea il file `.env` copiando il modello:

**Mac/Linux:**
```bash
cp .env.example server/.env
```

**Windows (Prompt dei comandi):**
```
copy .env.example server\.env
```

Apri `server/.env` con un editor di testo (es. Blocco Note) e **modifica almeno questo valore**:

```
JWT_SECRET="inserisci-qui-una-stringa-segreta-lunga-e-casuale"
```

Per generare una chiave sicura, esegui:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
e incolla il risultato al posto del valore di esempio.

### Passo 3 — Installa le dipendenze e inizializza il database

```bash
npm run setup
```

Questo comando esegue in sequenza:
1. `npm install` — scarica tutte le librerie necessarie
2. `npm run db:push` — crea il database SQLite
3. `npm run db:seed` — inserisce i dati di esempio

Al termine vedrai le credenziali di esempio:
```
Master: master@kpi.test / master123
Alice:  alice@kpi.test  / user123
...
```

---

## Avvio per sviluppo (uso personale, singolo PC)

```bash
npm run dev
```

L'app si avvia su due porte:
- **Frontend:** http://localhost:5173
- **API server:** http://localhost:3001

Apri il browser su **http://localhost:5173** e accedi con le credenziali del master.

> Premi `Ctrl+C` nel terminale per fermare l'app.

---

## Avvio in produzione (accessibile da altri PC in rete)

Questo metodo compila l'app e la serve da un singolo processo su un'unica porta,
accessibile da qualsiasi PC collegato alla stessa rete Wi-Fi o cablata.

### Passo 1 — Configura per la produzione

Apri `server/.env` e aggiungi/modifica:
```
NODE_ENV=production
APP_URL=http://IP-DEL-TUO-PC:3001
```

Per trovare l'indirizzo IP del tuo PC:
- **Mac:** Preferenze di Sistema → Rete → IP accanto a "Wi-Fi" o "Ethernet"
- **Windows:** `ipconfig` nel Prompt → cerca "Indirizzo IPv4"

Esempio: se il tuo IP è `192.168.1.50`:
```
APP_URL=http://192.168.1.50:3001
```

### Passo 2 — Compila e avvia

```bash
npm run build    # compila frontend e backend (circa 30 secondi)
npm run start    # avvia il server in produzione
```

Il terminale mostrerà:
```
🚀 Server running on http://0.0.0.0:3001
   → Rete locale: http://192.168.1.50:3001
```

Condividi l'URL `http://192.168.1.50:3001` con i colleghi: potranno accedere
dall'app, dal telefono o da qualsiasi dispositivo sulla stessa rete.

> Il PC che esegue il server **deve rimanere acceso e connesso** affinché gli
> altri utenti possano accedere.

### Tenere il server sempre attivo con PM2 (opzionale ma consigliato)

PM2 è un gestore di processi che fa ripartire il server automaticamente
se va in crash o se il PC viene riavviato.

**Installa PM2:**
```bash
npm install -g pm2
```

**Avvia l'app con PM2:**
```bash
cd /percorso/della/cartella/KPI-TEST
npm run build
pm2 start "npm run start" --name kpi-formazione
pm2 save
pm2 startup    # segui le istruzioni mostrate per avvio automatico
```

**Comandi utili PM2:**
```bash
pm2 status              # stato dei processi
pm2 logs kpi-formazione # visualizza i log in tempo reale
pm2 restart kpi-formazione
pm2 stop kpi-formazione
```

---

## Configurazione email (opzionale)

Le notifiche email si configurano dalla pagina **Impostazioni** nell'app
(accessibile solo al Master). Non è necessario modificare file di testo.

I dati richiesti sono:
- **Host SMTP** (es. `smtp.gmail.com` per Gmail)
- **Porta** (587 per TLS, 465 per SSL)
- **Email e password** del mittente
- **URL dell'app** (il link che appare nel pulsante delle email)

### Gmail

1. Attiva la verifica in due passaggi sul tuo account Google
2. Vai su **https://myaccount.google.com/apppasswords**
3. Crea una "App password" per "Posta"
4. Usa quella password (16 caratteri) nel campo Password SMTP dell'app
5. Impostazioni: host `smtp.gmail.com`, porta `587`, TLS attivo

### Outlook / Microsoft 365

- Host: `smtp.office365.com`
- Porta: `587`
- TLS: attivo
- Utente: tua email aziendale
- Password: password dell'account (o App Password se hai MFA attivo)

> Se SMTP non è configurato, le email vengono stampate nella console del server
> (modalità sviluppo) e non vengono inviate realmente.

---

## Aggiornamento dell'app

Quando viene rilasciata una nuova versione:

```bash
git pull                 # scarica gli aggiornamenti da GitHub
npm install              # installa eventuali nuove dipendenze
npm run db:push          # applica eventuali modifiche al database
npm run build            # ricompila (solo se si usa la modalità produzione)
npm run start            # o: pm2 restart kpi-formazione
```

> I dati nel database **non vengono mai cancellati** durante un aggiornamento.
> Solo `npm run db:seed` reimposta i dati di esempio (da non eseguire in produzione).

---

## Backup del database

Il database è un singolo file: `server/prisma/dev.db`

Per fare un backup manuale, copia questo file in una posizione sicura:
```bash
cp server/prisma/dev.db backup/dev_$(date +%Y%m%d).db
```

Su Windows:
```
copy server\prisma\dev.db backup\dev_%date:~-4,4%%date:~-10,2%%date:~-7,2%.db
```

---

## Problemi comuni

### "node: command not found" o "npm: command not found"
Node.js non è installato o non è nel PATH. Reinstalla da https://nodejs.org.

### "Porta 3001 già in uso"
Un altro processo usa la porta. Cambia la porta in `server/.env`:
```
PORT=3002
```
E aggiorna anche `APP_URL` di conseguenza.

### Gli altri PC non riescono a connettersi
1. Verifica che il firewall di Windows/Mac consenta le connessioni sulla porta 3001
   - **Windows:** Pannello di controllo → Windows Defender Firewall → Consenti app → aggiungi Node.js
   - **Mac:** Preferenze di Sistema → Sicurezza → Firewall → Opzioni → aggiungi Node
2. Assicurati che tutti i dispositivi siano sulla stessa rete Wi-Fi o cablata
3. Verifica l'IP del server con `ipconfig` (Windows) o `ifconfig` (Mac)

### "Database is locked" o errori SQLite
Assicurati che non siano in esecuzione due istanze del server contemporaneamente.
Usa `pm2 status` o controlla il Task Manager per processi Node.js attivi.

### Password dimenticata del master
Esegui questo comando per reimpostare la password del master a `master123`:
```bash
cd server
node -e "
const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcryptjs');
const p=new PrismaClient();
bcrypt.hash('nuova-password',12).then(h=>p.user.update({where:{email:'master@kpi.test'},data:{passwordHash:h}})).then(u=>{ console.log('Password aggiornata per',u.email); p.\$disconnect() })
"
```

---

## Struttura del progetto

```
KPI-TEST/
├── client/          Frontend React (Vite + Tailwind)
├── server/
│   ├── prisma/
│   │   └── dev.db   ← DATABASE (non eliminare!)
│   └── src/         Codice server Express
├── package.json     Script principali
├── .env.example     Modello configurazione
└── GUIDA_SETUP.md   Questa guida
```

---

## Credenziali di esempio (dopo il seed)

| Ruolo  | Email              | Password  |
|--------|--------------------|-----------|
| Master | master@kpi.test    | master123 |
| Utente | alice@kpi.test     | user123   |
| Utente | bob@kpi.test       | user123   |
| Utente | cara@kpi.test      | user123   |

> Cambia le password dalla pagina **Utenti** dopo il primo accesso.
