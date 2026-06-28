# Zam Project - Hono & React Monorepo

A clean, professional full-stack monorepo featuring a Hono backend (Cloudflare Workers) and a React frontend (Vite), managed with pnpm workspaces.

---

## 🚀 Beginner Setup Guide

Follow these steps to get the project running on your local machine.

### 1. Prerequisites
Make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (Latest LTS version recommended)
*   [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)

### 2. Clone the Repository
Open your terminal and run:
```bash
git clone https://github.com/grandchasebank-arch/zam-project-hono-clean.git
cd zam-project-hono-clean
```

### 3. Install Dependencies
Install all necessary packages for the entire workspace:
```bash
pnpm install
```

### 4. Configure Environment Variables
You need to set up the environment variables for both the backend and frontend.

#### Backend Configuration
Create a `.env` file inside the `backend/` folder:
```bash
cp backend/.env.example backend/.env # If .env.example exists
```
Ensure it contains:
*   `SUPABASE_URL`
*   `SUPABASE_ANON_KEY`
*   `SUPABASE_SERVICE_ROLE_KEY`

#### Frontend Configuration
Create a `.env` file inside the `frontend/` folder:
```env
VITE_API_BASE_URL=http://localhost:8787
```

### 5. Start Development Servers
You will need two terminal windows running at the same time.

**Terminal 1: Start the Backend API**
```bash
pnpm run dev:api
```
*Your API will be running at `http://localhost:8787`*

**Terminal 2: Start the Frontend App**
```bash
pnpm run dev:web
```
*Your website will be running at `http://localhost:5173`*

---

## 📂 Project Structure
*   `backend/`: Hono API (Cloudflare Workers)
*   `frontend/`: React + Vite frontend
*   `packages/shared-types/`: Common TypeScript types
*   `lib/db/`: Shared database schemas and migrations

## 🛠️ Available Scripts
From the root directory, you can run:
*   `pnpm install`: Install all dependencies.
*   `pnpm run build`: Build both frontend and backend.
*   `pnpm run dev:api`: Start the backend in development mode.
*   `pnpm run dev:web`: Start the frontend in development mode.
*   `pnpm run deploy`: Deploy both services to Cloudflare.


Get-ChildItem -Path . -Filter "node_modules" -Recurse | Remove-Item -Force -Recurse

npx repomix
pnpm dev 2>&1 | Tee-Object -FilePath debug.log -Append