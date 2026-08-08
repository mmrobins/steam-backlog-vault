const axios = require('axios');
const cache = require('./cache');

// Demo backlog games with full data for instant testing & offline/fallback mode
const DEMO_GAMES = [
  {
    appid: 620,
    name: "Portal 2",
    playtime_forever: 0,
    img_icon_url: "23b8801e74a9692484eb3b1f51f5068222384f93",
    reviewScore: 98,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 320500,
    metacritic: 95,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/620/header.jpg",
    genres: ["Action", "Adventure", "Puzzle"],
    release_date: "2011-04-18",
    hltb: { main: 8.5, mainExtra: 11, completionist: 21 }
  },
  {
    appid: 367520,
    name: "Hollow Knight",
    playtime_forever: 0,
    img_icon_url: "c9c2794eb02379377ebef8a9d18e87498c895c25",
    reviewScore: 97,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 310200,
    metacritic: 90,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg",
    genres: ["Action", "Adventure", "Indie", "Metroidvania"],
    release_date: "2017-02-24",
    hltb: { main: 27, mainExtra: 41.5, completionist: 63.5 }
  },
  {
    appid: 1145360,
    name: "Hades",
    playtime_forever: 0,
    img_icon_url: "8d0c242db745ec8fca6d31ca9e943265005ddcce",
    reviewScore: 98,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 245000,
    metacritic: 93,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1145360/header.jpg",
    genres: ["Action", "Indie", "RPG", "Roguelike"],
    release_date: "2020-09-17",
    hltb: { main: 22, mainExtra: 48, completionist: 97 }
  },
  {
    appid: 1245620,
    name: "Elden Ring",
    playtime_forever: 0,
    img_icon_url: "2cc47a50785f8184f479a957ca16bfed427d1434",
    reviewScore: 93,
    reviewDesc: "Very Positive",
    totalReviews: 680000,
    metacritic: 96,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg",
    genres: ["Action", "RPG", "Open World", "Souls-like"],
    release_date: "2022-02-24",
    hltb: { main: 55, mainExtra: 100, completionist: 133 }
  },
  {
    appid: 292030,
    name: "The Witcher 3: Wild Hunt",
    playtime_forever: 0,
    img_icon_url: "979b9a6fa34d2b271d4bf597b83144df3c5163ee",
    reviewScore: 96,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 720000,
    metacritic: 93,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg",
    genres: ["Action", "Adventure", "RPG", "Open World"],
    release_date: "2015-05-18",
    hltb: { main: 51.5, mainExtra: 104, completionist: 173 }
  },
  {
    appid: 504230,
    name: "Celeste",
    playtime_forever: 0,
    img_icon_url: "4a2beae2efaa14ad778a8be698888b5ef2cf5a14",
    reviewScore: 97,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 85000,
    metacritic: 88,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/504230/header.jpg",
    genres: ["Action", "Adventure", "Indie", "Platformer"],
    release_date: "2018-01-25",
    hltb: { main: 8, mainExtra: 14, completionist: 39 }
  },
  {
    appid: 1593500,
    name: "God of War",
    playtime_forever: 0,
    img_icon_url: "c9c2794eb02379377ebef8a9d18e87498c895c25",
    reviewScore: 96,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 98000,
    metacritic: 93,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/1593500/header.jpg",
    genres: ["Action", "Adventure", "Story Rich"],
    release_date: "2022-01-14",
    hltb: { main: 20.5, mainExtra: 32.5, completionist: 51 }
  },
  {
    appid: 264710,
    name: "Subnautica",
    playtime_forever: 0,
    img_icon_url: "2cc47a50785f8184f479a957ca16bfed427d1434",
    reviewScore: 96,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 240000,
    metacritic: 87,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/264710/header.jpg",
    genres: ["Adventure", "Indie", "Survival", "Open World"],
    release_date: "2018-01-23",
    hltb: { main: 29.5, mainExtra: 44, completionist: 56 }
  },
  {
    appid: 753640,
    name: "Outer Wilds",
    playtime_forever: 0,
    img_icon_url: "8d0c242db745ec8fca6d31ca9e943265005ddcce",
    reviewScore: 95,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 62000,
    metacritic: 85,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/753640/header.jpg",
    genres: ["Adventure", "Indie", "Space", "Mystery"],
    release_date: "2020-06-18",
    hltb: { main: 16, mainExtra: 22, completionist: 27.5 }
  },
  {
    appid: 632470,
    name: "Disco Elysium - The Final Cut",
    playtime_forever: 0,
    img_icon_url: "23b8801e74a9692484eb3b1f51f5068222384f93",
    reviewScore: 93,
    reviewDesc: "Very Positive",
    totalReviews: 82000,
    metacritic: 91,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/632470/header.jpg",
    genres: ["RPG", "Indie", "Story Rich"],
    release_date: "2019-10-15",
    hltb: { main: 22, mainExtra: 33.5, completionist: 46 }
  },
  {
    appid: 2028850,
    name: "Bioshock Infinite",
    playtime_forever: 0,
    img_icon_url: "c9c2794eb02379377ebef8a9d18e87498c895c25",
    reviewScore: 95,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 110000,
    metacritic: 94,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/8870/header.jpg",
    genres: ["Action", "FPS", "Story Rich"],
    release_date: "2013-03-25",
    hltb: { main: 11.5, mainExtra: 15.5, completionist: 27.5 }
  },
  {
    appid: 379720,
    name: "DOOM",
    playtime_forever: 0,
    img_icon_url: "8d0c242db745ec8fca6d31ca9e943265005ddcce",
    reviewScore: 95,
    reviewDesc: "Overwhelmingly Positive",
    totalReviews: 132000,
    metacritic: 85,
    header_image: "https://cdn.akamai.steamstatic.com/steam/apps/379720/header.jpg",
    genres: ["Action", "FPS", "Gore"],
    release_date: "2016-05-12",
    hltb: { main: 11.5, mainExtra: 16.5, completionist: 25 }
  }
];

/**
 * Fetch player summary profile (Name, Avatar) from Steam Web API
 */
async function getPlayerSummary(steamid, apiKey) {
  if (!steamid) return null;

  const cacheKey = `steam_user_${steamid}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const key = apiKey || process.env.STEAM_API_KEY;

  if (key) {
    try {
      const url = `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${key}&steamids=${steamid}`;
      const res = await axios.get(url, { timeout: 5000 });
      if (res.data?.response?.players?.length > 0) {
        const player = res.data.response.players[0];
        const summary = {
          steamid: player.steamid,
          personaname: player.personaname,
          avatarfull: player.avatarfull || player.avatarmedium || player.avatar,
          profileurl: player.profileurl
        };
        cache.set(cacheKey, summary, 86400); // 24h
        return summary;
      }
    } catch (err) {
      console.warn(`[Steam API] Error getting summary for ${steamid}:`, err.message);
    }
  }

  // HTML Scraping Fallback if no API key set
  try {
    const profileUrl = `https://steamcommunity.com/profiles/${steamid}`;
    const res = await axios.get(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      maxRedirects: 5,
      timeout: 5000
    });
    const html = res.data;
    const nameMatch = html.match(/g_rgProfileData\s*=\s*({.*?});/);
    let personaname = `Steam User (${steamid.slice(-6)})`;
    if (nameMatch) {
      try {
        const parsed = JSON.parse(nameMatch[1]);
        if (parsed.personaname) personaname = parsed.personaname;
      } catch (e) {}
    }
    const avatarMatch = html.match(/<link rel="image_src" href="([^"]+)">/) || html.match(/<meta property="og:image" content="([^"]+)">/);
    const avatarfull = avatarMatch ? avatarMatch[1] : 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

    const summary = {
      steamid,
      personaname,
      avatarfull,
      profileurl: profileUrl
    };
    cache.set(cacheKey, summary, 86400);
    return summary;
  } catch (scrapeErr) {
    console.warn(`[Steam Profile Scrape] Could not scrape summary for ${steamid}:`, scrapeErr.message);
  }

  return {
    steamid,
    personaname: `Steam User (${steamid.slice(-6)})`,
    avatarfull: 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
    profileurl: `https://steamcommunity.com/profiles/${steamid}`
  };
}

/**
 * Resolve custom URL / vanity name to 64-bit SteamID
 */
async function resolveVanityUrl(vanityName, apiKey) {
  const key = apiKey || process.env.STEAM_API_KEY;
  if (!key || !vanityName) return null;

  try {
    const url = `http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${key}&vanityurl=${encodeURIComponent(vanityName)}`;
    const res = await axios.get(url, { timeout: 5000 });
    if (res.data?.response?.success === 1) {
      return res.data.response.steamid;
    }
  } catch (err) {
    console.warn(`[Steam API] Error resolving vanity URL "${vanityName}":`, err.message);
  }
  return null;
}

/**
 * Fetch owned games list from Steam Web API
 */
async function getOwnedGames(steamid, apiKey) {
  const key = apiKey || process.env.STEAM_API_KEY;
  if (!key) {
    throw new Error("Steam API Key is required to fetch real user library. Please set STEAM_API_KEY in .env or provide key in app settings.");
  }

  const cacheKey = `steam_owned_${steamid}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${key}&steamid=${steamid}&include_appinfo=true&include_played_free_games=true&format=json`;
  const res = await axios.get(url, { timeout: 10000 });

  if (!res.data?.response?.games) {
    throw new Error("No games found or profile is set to Private. Make sure your Steam profile 'Game Details' privacy setting is set to Public.");
  }

  const games = res.data.response.games;
  cache.set(cacheKey, games, 1800); // 30 minutes
  return games;
}

/**
 * Fetch Steam Store user reviews summary for an AppID
 */
async function getSteamAppReviewScore(appid) {
  const cacheKey = `steam_review_${appid}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=all`;
    const res = await axios.get(url, { timeout: 4000 });
    if (res.data?.query_summary) {
      const summary = res.data.query_summary;
      const total = summary.total_reviews || 0;
      const positive = summary.total_positive || 0;
      const scorePct = total > 0 ? Math.round((positive / total) * 100) : null;

      const reviewData = {
        reviewScore: scorePct,
        reviewDesc: summary.review_score_desc || (scorePct >= 90 ? "Overwhelmingly Positive" : scorePct >= 80 ? "Very Positive" : scorePct >= 70 ? "Positive" : "Mixed"),
        totalReviews: total
      };

      cache.set(cacheKey, reviewData);
      return reviewData;
    }
  } catch (err) {
    console.warn(`[Steam Store API] Failed review fetch for app ${appid}:`, err.message);
  }

  const fallback = { reviewScore: null, reviewDesc: "No Reviews", totalReviews: 0 };
  cache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Fetch additional store metadata (Metacritic score, genres, release date)
 */
async function getSteamAppDetails(appid) {
  const cacheKey = `steam_details_${appid}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en`;
    const res = await axios.get(url, { timeout: 4000 });
    if (res.data && res.data[appid] && res.data[appid].success) {
      const data = res.data[appid].data;
      const details = {
        header_image: data.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
        metacritic: data.metacritic ? data.metacritic.score : null,
        genres: data.genres ? data.genres.map(g => g.description) : [],
        release_date: data.release_date ? data.release_date.date : null,
        short_description: data.short_description || ''
      };
      cache.set(cacheKey, details);
      return details;
    }
  } catch (err) {
    console.warn(`[Steam AppDetails API] Failed details fetch for app ${appid}:`, err.message);
  }

  const fallback = {
    header_image: `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
    metacritic: null,
    genres: [],
    release_date: null,
    short_description: ''
  };
  cache.set(cacheKey, fallback);
  return fallback;
}

module.exports = {
  getPlayerSummary,
  resolveVanityUrl,
  getOwnedGames,
  getSteamAppReviewScore,
  getSteamAppDetails,
  DEMO_GAMES
};
