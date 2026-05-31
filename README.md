# KPI Formazione ERP

Web app per gestire, assegnare e valutare le attività di formazione e test legate all'adozione di un nuovo gestionale aziendale.

## Stack tecnico

- **Frontend**: React + TypeScript + Vite · TanStack Query · Tailwind CSS · Recharts
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (dev) via Prisma ORM — basta cambiare `DATABASE_URL` per passare a PostgreSQL
- **Auth**: JWT (7 giorni) · ruoli MASTER / USER · password con bcrypt (cost 12)
- **Validazione**: Zod lato API e lato form

## Setup rapido

```bash
# 1. Clona e installa tutto
npm run setup

# 2. Avvia frontend + backend in parallelo
npm run dev
```

L'app sarà disponibile su `http://localhost:5173`.  
Il server API gira su `http://localhost:3001`.

## Setup manuale (step by step)

```bash
npm install                        # installa dipendenze di tutti i workspace
npm run db:push                    # crea il DB SQLite e applica lo schema
npm run db:seed                    # popola il DB con dati di esempio
npm run dev                        # avvia server (tsx watch) + client (vite)
```

## Credenziali di esempio

| Ruolo  | Email              | Password   |
|--------|--------------------|------------|
| Master | master@kpi.test    | master123  |
| Utente | alice@kpi.test     | user123    |
| Utente | bob@kpi.test       | user123    |
| Utente | cara@kpi.test      | user123    |

## Struttura progetto

```
├── client/            # React + Vite
│   └── src/
│       ├── api/       # Fetch wrapper + chiamate per ogni risorsa
│       ├── components/# UI base, layout, slider, badge…
│       ├── contexts/  # AuthContext (JWT in localStorage)
│       ├── pages/     # master/ e user/
│       └── types/     # TypeScript types condivisi
└── server/            # Express
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts
    └── src/
        ├── lib/       # Prisma client, JWT utils
        ├── middleware/ # auth, requireMaster
        └── routes/    # auth, areas, sessions, activities, users,
                       # assignments, reports, kpi, problems
```

## Variabili d'ambiente

Copia `.env.example` e crea `server/.env` e `client/.env`:

```env
# server/.env
DATABASE_URL="file:./dev.db"
JWT_SECRET="cambia-in-produzione"
PORT=3001

# client/.env
VITE_API_URL=http://localhost:3001
```

> **Nota**: in sviluppo il proxy Vite (`/api` e `/auth`) inoltra al server, quindi `VITE_API_URL` viene usato solo come fallback.

## Scelte implementative

| Tema | Scelta |
|------|--------|
| DB enums | Stringhe su SQLite (Prisma non supporta `enum` nativo su SQLite) |
| `invertiComplessita` | Flag query-string sul KPI endpoint (`?invertiComplessita=true`); toggle UI in Dashboard |
| Problematiche | Salvate come campo `statoRisoluzione` sul `Report` (no tabella separata) |
| Sblocco sessioni | Calcolato lato server ad ogni GET `/api/assignments/my` |
| Auth | Access token JWT 7gg in localStorage; redirect a `/login` su 401 |
| CORS | `localhost:5173` whitelistato; in produzione aggiungere il dominio reale |

## API principali

```
POST /auth/login            → { token, user }
GET  /auth/me               → { user }

GET/POST/PUT/DELETE /api/competency-areas/:id
GET/POST/PUT/DELETE /api/sessions/:id
GET/POST/PUT/DELETE /api/activities/:id
GET/POST/PUT/DELETE /api/users/:id
GET/POST/DELETE     /api/assignments/:id
GET                 /api/assignments/my   (utente corrente)
GET/POST            /api/reports
GET                 /api/kpi?userId=&areaId=&invertiComplessita=
GET                 /api/problems
PATCH               /api/problems/:id/stato
```
