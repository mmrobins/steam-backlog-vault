const axios = require('axios');
const cache = require('./cache');

// Known fallback/preset times for top games in case HLTB is unreachable or returns 0
const POPULAR_HLTB_CACHE = {
  "Portal 2": { main: 8.5, mainExtra: 11, completionist: 21, hltbId: 7231 },
  "Portal": { main: 3, mainExtra: 5, completionist: 10, hltbId: 7230 },
  "The Witcher 3: Wild Hunt": { main: 51.5, mainExtra: 104, completionist: 173, hltbId: 10270 },
  "Hollow Knight": { main: 27, mainExtra: 41.5, completionist: 63.5, hltbId: 26286 },
  "Hades": { main: 22, mainExtra: 48, completionist: 97, hltbId: 59746 },
  "Elden Ring": { main: 55, mainExtra: 100, completionist: 133, hltbId: 68151 },
  "God of War": { main: 20.5, mainExtra: 32.5, completionist: 51, hltbId: 38050 },
  "Celeste": { main: 8, mainExtra: 14, completionist: 39, hltbId: 42818 },
  "Stardew Valley": { main: 52.5, mainExtra: 108, completionist: 191, hltbId: 24009 },
  "Terraria": { main: 47, mainExtra: 95.5, completionist: 188, hltbId: 9853 },
  "Subnautica": { main: 29.5, mainExtra: 44, completionist: 56, hltbId: 23023 },
  "Cyberpunk 2077": { main: 25, mainExtra: 60, completionist: 104, hltbId: 46397 },
  "Red Dead Redemption 2": { main: 50, mainExtra: 81, completionist: 180, hltbId: 27100 },
  "Mass Effect Legendary Edition": { main: 59.5, mainExtra: 106, completionist: 140, hltbId: 90647 },
  "Bioshock Infinite": { main: 11.5, mainExtra: 15.5, completionist: 27.5, hltbId: 1068 },
  "DOOM": { main: 11.5, mainExtra: 16.5, completionist: 25, hltbId: 2708 },
  "Outer Wilds": { main: 16, mainExtra: 22, completionist: 27.5, hltbId: 57523 },
  "Disco Elysium": { main: 22, mainExtra: 33.5, completionist: 46, hltbId: 57335 },
  "Half-Life 2": { main: 13, mainExtra: 16, completionist: 20, hltbId: 4078 },
  "Sekiro: Shadows Die Twice": { main: 30, mainExtra: 42, completionist: 70.5, hltbId: 57425 }
};

/**
 * Clean game title for better HLTB search results
 */
function cleanGameTitle(title) {
  if (!title) return '';
  return title
    .replace(/™/g, '')
    .replace(/®/g, '')
    .replace(/Edition/gi, '')
    .replace(/GOTY/gi, '')
    .replace(/Game of the Year/gi, '')
    .replace(/Remastered/gi, '')
    .replace(/:\s*Special Edition/gi, '')
    .trim();
}

// Global cached credentials for HLTB session
let hltbAuth = null;

async function getHltbAuth() {
  if (hltbAuth) return hltbAuth;
  
  const browserUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const initRes = await axios.get('https://howlongtobeat.com/api/bleed/init?t=' + Date.now(), {
    headers: {
      'User-Agent': browserUserAgent,
      'Referer': 'https://howlongtobeat.com/'
    },
    timeout: 4500
  });
  
  if (initRes.data && initRes.data.token) {
    hltbAuth = {
      token: initRes.data.token,
      hpKey: initRes.data.hpKey,
      hpVal: initRes.data.hpVal
    };
    return hltbAuth;
  }
  throw new Error('Failed to retrieve HLTB credentials');
}

/**
 * Fetch Time to Beat data for a single game from HowLongToBeat
 */
async function getGameTimeToBeat(title) {
  if (!title) return null;
  const cacheKey = `hltb_${title.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Check preset popular cache first
  const cleaned = cleanGameTitle(title);
  if (POPULAR_HLTB_CACHE[title]) {
    cache.set(cacheKey, POPULAR_HLTB_CACHE[title]);
    return POPULAR_HLTB_CACHE[title];
  }
  if (POPULAR_HLTB_CACHE[cleaned]) {
    cache.set(cacheKey, POPULAR_HLTB_CACHE[cleaned]);
    return POPULAR_HLTB_CACHE[cleaned];
  }

  const browserUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  try {
    const searchTerms = cleaned.split(/\s+/).filter(Boolean);
    
    // Get dynamic token (reads from memory cache if already populated)
    const { token, hpKey, hpVal } = await getHltbAuth();
    
    // Construct payload with honeypot key
    const payload = {
      searchType: 'games',
      searchTerms: searchTerms,
      searchPage: 1,
      size: 5,
      searchOptions: {
        games: {
          userId: 0,
          platform: '',
          sortCategory: 'popular',
          rangeCategory: 'main',
          rangeTime: { min: 0, max: 0 },
          gameplay: { perspective: '', flow: '', genre: '', difficulty: '' },
          rangeYear: { min: 0, max: 0 },
          modifier: ''
        },
        users: { sortCategory: 'postcount' },
        lists: { sortCategory: 'follows' },
        filter: '',
        sort: 0,
        randomizer: 0
      },
      useCache: true
    };
    
    // Inject honeypot key
    payload[hpKey] = hpVal;
    
    // Search using /api/bleed endpoint
    const response = await axios.post(
      'https://howlongtobeat.com/api/bleed',
      payload,
      {
        headers: {
          'User-Agent': browserUserAgent,
          'Referer': 'https://howlongtobeat.com/',
          'Origin': 'https://howlongtobeat.com',
          'Content-Type': 'application/json',
          'x-auth-token': token,
          'x-hp-key': hpKey,
          'x-hp-val': hpVal
        },
        timeout: 4000
      }
    );
    
    if (response.data && response.data.data && response.data.data.length > 0) {
      const game = response.data.data.find(
        g => g.game_name.toLowerCase() === title.toLowerCase() || g.game_name.toLowerCase() === cleaned.toLowerCase()
      ) || response.data.data[0];

      const hltbData = {
        main: game.comp_main ? Math.round((game.comp_main / 3600) * 10) / 10 : null,
        mainExtra: game.comp_plus ? Math.round((game.comp_plus / 3600) * 10) / 10 : null,
        completionist: game.comp_100 ? Math.round((game.comp_100 / 3600) * 10) / 10 : null,
        hltbId: game.game_id
      };

      cache.set(cacheKey, hltbData);
      return hltbData;
    }
  } catch (err) {
    const status = err.response?.status;
    if (status === 403 || status === 401) {
      // Invalidate credentials on auth failures to trigger fresh lookup next time
      hltbAuth = null;
    }
    
    // Suppress console warnings for WAF blocks (like 404/403) and log quietly
    if (status !== 404 && status !== 403) {
      console.log(`[HLTB info] HLTB lookups currently unavailable for "${title}" (${err.message})`);
    }
    // Return direct fallback without caching so we can retry on next loading loop
    return { main: null, mainExtra: null, completionist: null };
  }

  // Default fallback if unknown (but search successfully returned 0 matches)
  const result = { main: null, mainExtra: null, completionist: null };
  cache.set(cacheKey, result);
  return result;
}

/**
 * Batch fetch Time to Beat for a list of games concurrently (with concurrency limit)
 */
async function batchGetTimeToBeat(games, concurrency = 5) {
  const results = {};
  for (let i = 0; i < games.length; i += concurrency) {
    const chunk = games.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (game) => {
        const hltb = await getGameTimeToBeat(game.name);
        results[game.appid] = hltb;
      })
    );
  }
  return results;
}

module.exports = {
  getGameTimeToBeat,
  batchGetTimeToBeat
};
