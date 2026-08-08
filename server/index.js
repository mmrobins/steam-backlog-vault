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
      gamesList = DEMO_GAMES.map(g => ({ ...g, isCached: true }));
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

      // Check cache for each game to build the list instantly
      const cache = require('./cache');
      
      gamesList = unplayed.map((game) => {
        const cachedDetails = cache.get(`steam_details_${game.appid}`);
        const cachedReviews = cache.get(`steam_review_${game.appid}`);
        const cachedHltb = cache.get(`hltb_${game.name.toLowerCase().trim()}`);

        const isSteamCached = cachedDetails !== undefined && cachedReviews !== undefined;
        const isHltbCached = cachedHltb !== undefined;

        return {
          appid: game.appid,
          name: game.name,
          playtime_forever: game.playtime_forever || 0,
          img_icon_url: game.img_icon_url,
          isSteamCached,
          isHltbCached,
          // Hydrate details if available in cache
          reviewScore: cachedReviews?.reviewScore ?? null,
          reviewDesc: cachedReviews?.reviewDesc ?? 'No Reviews',
          totalReviews: cachedReviews?.totalReviews ?? 0,
          metacritic: cachedDetails?.metacritic ?? null,
          header_image: cachedDetails?.header_image ?? `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
          genres: cachedDetails?.genres ?? [],
          release_date: cachedDetails?.release_date ?? null,
          short_description: cachedDetails?.short_description ?? '',
          developer: cachedDetails?.developer ?? null,
          publisher: cachedDetails?.publisher ?? null,
          hltb: cachedHltb || { main: null, mainExtra: null, completionist: null }
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

// Endpoint to enrich Steam details & reviews
app.post('/api/enrich/steam', async (req, res) => {
  try {
    const { appid } = req.body;
    if (!appid) return res.status(400).json({ error: 'AppID is required' });

    const [reviews, details] = await Promise.all([
      getSteamAppReviewScore(appid),
      getSteamAppDetails(appid)
    ]);

    // If both returned fallback/rate-limited placeholder values (i.e. developer and reviews are null/zero)
    const success = (details.developer !== null || details.publisher !== null) && reviews.reviewDesc !== 'Rate Limited';

    return res.json({
      appid,
      success,
      reviewScore: reviews.reviewScore,
      reviewDesc: reviews.reviewDesc,
      totalReviews: reviews.totalReviews,
      metacritic: details.metacritic,
      header_image: details.header_image,
      genres: details.genres,
      release_date: details.release_date,
      short_description: details.short_description,
      developer: details.developer,
      publisher: details.publisher
    });
  } catch (err) {
    console.error(`[API /enrich/steam error] AppID ${req.body?.appid}:`, err.message);
    return res.status(500).json({ error: err.message, success: false });
  }
});

// Endpoint to enrich HowLongToBeat completion times
app.post('/api/enrich/hltb', async (req, res) => {
  try {
    const { appid, name } = req.body;
    if (!appid || !name) {
      return res.status(400).json({ error: 'AppID and Name are required' });
    }

    const hltb = await getGameTimeToBeat(name);

    // If hltb results are empty and it was NOT cached (i.e. it failed due to WAF block or error)
    const cache = require('./cache');
    const isCached = cache.get(`hltb_${name.toLowerCase().trim()}`) !== undefined;
    
    // It's a success if it's cached (even if null times) or if hltb has valid data
    const success = isCached || hltb.main !== null || hltb.mainExtra !== null;

    return res.json({
      appid,
      success,
      hltb
    });
  } catch (err) {
    console.error(`[API /enrich/hltb error] AppID ${req.body?.appid}:`, err.message);
    return res.status(500).json({ error: err.message, success: false });
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
