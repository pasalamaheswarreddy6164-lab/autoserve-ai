# AutoServe AI — Automotive Customer Service Platform

An AI-powered platform for automotive customer service agents featuring real-time diagnostics, warranty validation, scheduling, and multi-agent AI bots.

---

## Architecture

```
Hackathon2/
├── server/     Express.js + PostgreSQL backend
└── client/     React + Tailwind CSS frontend
```

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Vite, React Router v6
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **AI**: Claude API (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`
- **Auth**: JWT (8h expiry)
- **File Upload**: Multer (local disk)

## 4 AI Agents

| Agent | Trigger | Purpose |
|-------|---------|---------|
| 🔧 DiagnosticBot | Default / any issue | Diagnose vehicle problems, suggest causes |
| 🛡️ WarrantyBot | Keywords: warranty, cost, cover | Check warranty eligibility |
| 📅 SchedulingBot | Keywords: schedule, book, appointment | Recommend & book service slots |
| 📖 DocuBot | Agent portal + repair/procedure keywords | Service procedures, TSBs, specs |

## 3 Problem Categories

| Category | Color | Examples |
|----------|-------|---------|
| 🔴 Critical | Red | Brake failure, engine seizure, airbag warning |
| 🟠 Mechanical | Orange | Transmission, exhaust, cooling, suspension |
| 🔵 Electrical/Diagnostic | Blue | Dashboard warnings, battery, sensors |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Anthropic API key (get from console.anthropic.com)

---

### Step 1: PostgreSQL Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE autoserve;"

# Run the schema (creates all tables + seeds 4 agent accounts)
psql -U postgres -d autoserve -f server/db/schema.sql
```

---

### Step 2: Backend Setup

```bash
cd server

# Install dependencies
npm install

# Configure environment variables
# Edit .env file with your actual values:
#   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/autoserve
#   ANTHROPIC_API_KEY=sk-ant-...

# Start the server
npm run dev
```

Server runs on: http://localhost:5000

---

### Step 3: Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend runs on: http://localhost:5173

---

## Default Agent Accounts

These are seeded by the schema (password: `password`):

| Email | Specialty |
|-------|-----------|
| agent1@autoserve.com | Critical Issues |
| agent2@autoserve.com | Mechanical |
| agent3@autoserve.com | Electrical/Diagnostic |
| agent4@autoserve.com | General |

> **Note**: The seeded password hash in schema.sql is for `password`. You can change it by generating a bcrypt hash.

---

## How to Run (Quick Start)

```bash
# Terminal 1 — Backend
cd server && npm install && npm run dev

# Terminal 2 — Frontend
cd client && npm install && npm run dev
```

Open http://localhost:5173

1. **Sign up** as a customer or log in as an agent
2. **Customer**: Submit a service request with vehicle info + optional photo
3. **AI auto-categorizes** the issue (Critical/Mechanical/Electrical) and assigns to best available agent
4. **Chat with AI bots** — type "schedule appointment" to book, "warranty" to check coverage, "repair procedure" (agent) for docs
5. **Agent**: Toggle availability, manage cases, use AI copilot sidebar

---

## Key Features

- **Login/Signup** with role selection (Customer / Agent)
- **3-step case submission** with image upload
- **AI auto-categorization** on case creation
- **Auto agent assignment** based on specialty + availability
- **Cases badge** top-right with live count (polls every 30s)
- **Slide-over cases panel** from navbar
- **Floating AI chatbot** on both portals
- **4 AI bots** with automatic routing based on message intent
- **Agent availability toggle**
- **Team view** showing all agents + their status
- **Scheduling** via AI conversation
- **Warranty status** displayed on each case
