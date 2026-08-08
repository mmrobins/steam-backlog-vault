const axios = require('axios');
const cache = require('./cache');

// Known fallback/preset times for top games in case HLTB is unreachable or returns 0
const POPULAR_HLTB_CACHE = {
  "Portal 2": { main: 8.5, mainExtra: 11, completionist: 21 },
  "Portal": { main: 3, mainExtra: 5, completionist: 10 },
  "The Witcher 3: Wild Hunt": { main: 51.5, mainExtra: 104, completionist: 173 },
  "Hollow Knight": { main: 27, mainExtra: 41.5, completionist: 63.5 },
  "Hades": { main: 22, mainExtra: 48, completionist: 97 },
  "Elden Ring": { main: 55, mainExtra: 100, completionist: 133 },
  "God of War": { main: 20.5, mainExtra: 32.5, completionist: 51 },
  "Celeste": { main: 8, mainExtra: 14, completionist: 39 },
  "Stardew Valley": { main: 52.5, mainExtra: 108, completionist: 191 },
  "Terraria": { main: 47, mainExtra: 95.5, completionist: 188 },
  "Subnautica": { main: 29.5, mainExtra: 44, completionist: 56 },
  "Cyberpunk 2077": { main: 25, mainExtra: 60, completionist: 104 },
  "Red Dead Redemption 2": { main: 50, mainExtra: 81, completionist: 180 },
  "Mass Effect Legendary Edition": { main: 59.5, mainExtra: 106, completionist: 140 },
  "Bioshock Infinite": { main: 11.5, mainExtra: 15.5, completionist: 27.5 },
  "DOOM": { main: 11.5, mainExtra: 16.5, completionist: 25 },
  "Outer Wilds": { main: 16, mainExtra: 22, completionist: 27.5 },
  "Disco Elysium": { main: 22, mainExtra: 33.5, completionist: 46 },
  "Half-Life 2": { main: 13, mainExtra: 16, completionist: 20 },
  "Sekiro: Shadows Die Twice": { main: 30, mainExtra: 42, completionist: 70.5 }
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

  try {
    const searchTerms = cleaned.split(/\s+/).filter(Boolean);
    const response = await axios.post(
      'https://howlongtobeat.com/api/search',
      {
        searchType: 'games',
        searchTerms: searchTerms,
        searchPage: 1,
        size: 10,
        searchOptions: {
          games: {
            userId: 0,
            platform: '',
            sortCategory: 'popular',
            rangeCategory: 'main',
            rangeTime: { min: null, max: null },
            gameplay: { perspective: '', flow: '', genre: '' },
            rangeYear: { min: null, max: null },
            modifier: ''
          },
          users: { sortCategory: 'postcount' },
          lists: { sortCategory: 'follows' }
        }
      },
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://howlongtobeat.com/',
          'Content-Type': 'application/json',
          'Origin': 'https://howlongtobeat.com'
        },
        timeout: 5000
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      // Find best matching game
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
    // If search failed, try scraper HTML search or return fallback
    console.warn(`[HLTB] Warning searching "${title}":`, err.message);
  }

  // Default fallback if unknown
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
