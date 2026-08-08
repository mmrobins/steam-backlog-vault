# 🎮 Steam Backlog Vault

> **Discover & beat your unplayed Steam games, sorted by Steam review score and HowLongToBeat completion times.**

![Steam Backlog Vault](https://store.steampowered.com/favicon.ico)

---

## 🌟 Key Features

1. **🔑 Steam OpenID 2.0 Authentication**
   - Log in seamlessly with your official Steam account (just like `gg.deals`).
   - Also supports pasting any Steam ID 64, Steam Profile URL, or Custom Vanity Name.

2. **⭐ Sorted by Steam Review Score & Metacritic**
   - Automatically prioritizes your top-rated unplayed games (e.g. *98% Overwhelmingly Positive*).
   - Easily sort by Review Rating %, Metacritic Score, Time to Beat, or Title.

3. **⏱️ HowLongToBeat (HLTB) Data Integration**
   - Real-time completion time estimates for every game:
     - 🎯 **Main Story** (e.g., 8.5h)
     - 🗡️ **Main + Extra Content** (e.g., 11h)
     - 🏆 **100% Completionist** (e.g., 21h)

4. **🎲 "What Should I Play Next?" Random Wheel**
   - Interactive game selector modal with confetti celebration!
   - Filter candidate games by how much free time you have (e.g., *"I have 5 hours free tonight!"*).

5. **📊 Backlog Analytics Dashboard**
   - Total unplayed games counter.
   - Aggregate average review rating of your backlog.
   - Sum total hours needed to beat your entire backlog.
   - Quick Beat games filter (< 10 hours).

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ and npm installed

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
- Frontend starts at: `http://localhost:5173`
- Express API server starts at: `http://localhost:3000`

### 3. Build & Run Production Mode
```bash
npm run build
npm start
```
- Unified app served at `http://localhost:3000`

---

## ☁️ How to Deploy for FREE

### Option A: Deploy to Replit (Recommended)

1. Go to [Replit.com](https://replit.com) and click **+ Create Repl**.
2. Select **Import from GitHub** (or upload this codebase).
3. Replit automatically detects `.replit` and `replit.nix`.
4. Click **Run** or deploy via **Replit Deployments** (Cloud Run target).
5. Add `STEAM_API_KEY` to **Secrets (Environment Variables)** if desired.

### Option B: Deploy to Render.com (Free Tier)

1. Create a free account on [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your repository.
4. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Under **Environment Variables**, add `STEAM_API_KEY` (optional).
6. Click **Create Web Service**.

### Option C: Deploy to Railway / Vercel

- **Railway**: Connect repository, Railway auto-detects `npm run build && npm start`.
- **Vercel**: Deploy frontend static files (`dist`) with serverless API functions under `/api`.

---

## 🔑 Obtaining a Steam Web API Key

While the app includes a rich **Demo Mode** and OpenID support out of the box, fetching your live owned games list directly from Steam requires a free Steam API key:

1. Visit [https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. Log in with your Steam account.
3. Enter your domain or `localhost` and copy your API key.
4. Paste the API key into the app's **Settings Modal** (it stays saved in your local browser storage!).
5. Ensure your Steam profile's privacy setting **Game Details** is set to **Public**.

---

## 🛠️ Built With

- **Frontend**: React 18, Vite, Lucide Icons, Canvas Confetti
- **Backend**: Node.js, Express 5, Axios, Node-Cache
- **APIs**: Steam OpenID 2.0, Steam Web API, Steam Store API, HowLongToBeat API
- **Styling**: Vanilla CSS with modern Glassmorphism design system
