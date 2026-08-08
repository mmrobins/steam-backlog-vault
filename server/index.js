require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { handleSteamLogin, handleSteamCallback } = require('./steamAuth');
const {
  getPlayerSummary,
  resolveVanityUrl,
  getOwnedGames,
  getSteamAppReviewScore,
  getSteamAppDetails,
  batchFetchStoreData,
  DEMO_GAMES
} = require('./steamApi');
const { batchGetTimeToBeat, getGameTimeToBeat } = require('./hltbApi');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend assets if built
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// --- Auth Routes ---
app.get('/api/auth/steam', handleSteamLogin);
app.get('/api/auth/steam/callback', handleSteamCallback);

// --- User Profile Routes ---
app.get('/api/user/resolve/:vanityName', async (req, res) => {
  try {
    const { vanityName } = req.params;
    const apiKey = req.query.apiKey || process.env.STEAM_API_KEY;
    const steamid = await resolveVanityUrl(vanityName, apiKey);
    if (!steamid) {
      return res.status(404).json({ error: `Could not resolve custom URL "${vanityName}". Check custom URL or provide a Steam API key.` });
    }
    return res.json({ steamid });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/:steamid', async (req, res) => {
  try {
    const { steamid } = req.params;
    if (steamid === 'demo') {
      return res.json({
        steamid: 'demo',
        personaname: 'Gabe Newell (Demo Backlog)',
        avatarfull: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/c9/c9c2794eb02379377ebef8a9d18e87498c895c25_full.jpg',
        profileurl: 'https://steamcommunity.com'
      });
    }

    const apiKey = req.query.apiKey || process.env.STEAM_API_KEY;
    const summary = await getPlayerSummary(steamid, apiKey);
    if (!summary) {
      // Fallback summary if no API key
      return res.json({
        steamid,
        personaname: `Steam User (${steamid.slice(-6)})`,
        avatarfull: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
        profileurl: `https://steamcommunity.com/profiles/${steamid}`
      });
    }
    return res.json(summary);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// --- Backlog Route ---
app.get('/api/backlog/:steamid', async (req, res) => {
  try {
    const { steamid } = req.params;
    const apiKey = req.query.apiKey || process.env.STEAM_API_KEY;
    const maxPlaytime = req.query.maxPlaytime !== undefined ? parseInt(req.query.maxPlaytime, 10) : 0; // minutes
    const isDemo = steamid === 'demo' || req.query.demo === 'true';

    let gamesList = [];

    if (isDemo) {
      // Use built-in rich demo backlog dataset
      gamesList = DEMO_GAMES;
    } else {
      if (!apiKey) {
        return res.status(400).json({
          error: "NO_API_KEY",
          message: "A Steam Web API Key is needed to fetch live owned games from Steam. You can enter your API Key in Settings, or click 'Try Demo Mode' to preview the app!"
        });
      }

      const ownedGames = await getOwnedGames(steamid, apiKey);
      
      // Filter by playtime (default: unplayed = 0 minutes)
      const unplayed = ownedGames.filter(g => (g.playtime_forever || 0) <= maxPlaytime);

      console.log(`[Backlog] Fetching enrichment for ${unplayed.length} unplayed games...`);

      // Fetch HLTB and Steam Store data with concurrency limits to avoid 403 rate limits
      const [hltbMap, storeData] = await Promise.all([
        batchGetTimeToBeat(unplayed, 6),
        batchFetchStoreData(unplayed, 4)   // max 4 concurrent Steam Store requests
      ]);

      gamesList = unplayed.map((game) => {
        const { reviews, details } = storeData[game.appid] || {};
        return {
          appid: game.appid,
          name: game.name,
          playtime_forever: game.playtime_forever || 0,
          img_icon_url: game.img_icon_url,
          reviewScore: reviews?.reviewScore ?? null,
          reviewDesc: reviews?.reviewDesc ?? 'No Reviews',
          totalReviews: reviews?.totalReviews ?? 0,
          metacritic: details?.metacritic ?? null,
          header_image: details?.header_image ?? `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
          genres: details?.genres ?? [],
          release_date: details?.release_date ?? null,
          short_description: details?.short_description ?? '',
          developer: details?.developer ?? null,
          publisher: details?.publisher ?? null,
          hltb: hltbMap[game.appid] || { main: null, mainExtra: null, completionist: null }
        };
      });
    }

    return res.json({
      steamid,
      totalCount: gamesList.length,
      games: gamesList
    });
  } catch (err) {
    console.error('[API /backlog error]:', err);
    return res.status(500).json({
      error: 'FETCH_ERROR',
      message: err.message || 'Failed to fetch backlog games.'
    });
  }
});

// Single game HLTB lookup endpoint
app.get('/api/hltb', async (req, res) => {
  try {
    const title = req.query.title;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const hltb = await getGameTimeToBeat(title);
    return res.json(hltb);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Catch-all route to serve SPA index.html in production
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🎮 Steam Unplayed Backlog Server running on port ${PORT}`);
});
