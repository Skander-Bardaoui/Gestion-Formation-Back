# StirForma

Plateforme de gestion de formations professionnelles avec authentification, catalogues, inscriptions, évaluations, signatures électroniques et génération de documents.

---

## Architecture

| Couche | Technologie |
|---|---|
| Frontend | TanStack Start + React 19 + Tailwind CSS v4 + shadcn/ui |
| Backend | NestJS + TypeORM + PostgreSQL |
| Auth | JWT (access 15min + refresh 7 jours) |

---

## Prérequis

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14
- **npm** (backend) + **bun** (frontend)

---

## Backend (`Gestion-Formation-Back/`)

### Installation

```bash
cd Gestion-Formation-Back
npm install
cp .env.example .env
```

### Configuration

Éditer `.env` :
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=gestion_formations
JWT_SECRET=votre_secret
JWT_REFRESH_SECRET=votre_refresh_secret
```

### Lancement

```bash
npm run start:dev          # développement (port 3001)
npm run build              # production
```

### Peupler la base

```bash
npx ts-node src/seed/seed.ts
```

Crée 3 utilisateurs (email : `admin@formapro.fr`, `formateur@formapro.fr`, `participant@formapro.fr`, mot de passe : `admin123`, `formateur123`, `participant123`).

---

## Frontend (`Gestion-Formation-Front/`)

### Installation

```bash
cd Gestion-Formation-Front
bun install
```

### Configuration

Créer un fichier `.env` :
```
VITE_API_URL=http://localhost:3001/api
```

### Lancement

```bash
bun run dev                 # développement (port 8081)
bun run build               # production
bun run lint                # ESLint
bun run format              # Prettier
```

---

## Fonctionnalités

| Module | Description |
|---|---|
| Authentification | Login, refresh token, protection par rôle (Admin, Cabinet, Formateur, Participant, Employé) |
| Formations | CRUD, upload d'image et supports, clonage cabinet → plateforme |
| Sessions | Planification, assignation formateurs/participants/employés, clonage |
| Inscriptions | Paiement (cash), confirmation, historique |
| Évaluations | Grille détaillée (10 critères), vérification doublon, KPI |
| Présences | Pointage par date, statut formation/cantine, justificatifs |
| Certificats | Génération PDF avec QR code, signature électronique |
| Documents | Convention, feuille d'émargement, contrat formateur — signature électronique multi-rôle |
| Notifications | In-app + email (SMTP optionnel, log console si non configuré) |
| Chatbot IA | Agent Groq pour assistance admin (création, stats, KPI) |
| Tableau de bord | KPI (taux satisfaction, participation, évaluations) |
| Recherche globale | ⌘K / Ctrl+K — command palette multi-entité |
| Load testing | Script k6 inclus (`load-test.js`) |

---

## API

Préfixe : `/api`

Principaux endpoints :

```
GET    /formations          # Catalogue public
POST   /formations          # Création (admin/cabinet)
GET    /sessions            # Sessions (auth requis)
POST   /auth/login          # Connexion
POST   /auth/refresh        # Rafraîchir token
GET    /users/participants  # Participants
GET    /users/cabinets      # Cabinets (admin)
GET    /formateurs          # Formateurs
GET    /employes            # Employés
POST   /inscriptions        # Inscription à une session
GET    /evaluations         # Évaluations (filtrées)
POST   /chatbot/message     # Agent IA
```

---

## Scripts utiles

```bash
# Load test (k6)
k6 run load-test.js

# Seed
cd Gestion-Formation-Back && npx ts-node src/seed/seed.ts
```

---

## Structure du projet

```
stir-stage/
├── Gestion-Formation-Back/       # NestJS (CommonJS)
│   ├── src/
│   │   ├── modules/              # 17 modules feature
│   │   ├── entities/             # Entités TypeORM
│   │   ├── common/               # Enums, helpers
│   │   └── seed/                 # Seed script
│   └── uploads/                  # Fichiers uploadés
├── Gestion-Formation-Front/      # TanStack Start (ESM)
│   ├── src/
│   │   ├── routes/               # File-based routing
│   │   ├── components/           # UI components
│   │   └── lib/api/              # API client
└── load-test.js                  # k6 load test
```
