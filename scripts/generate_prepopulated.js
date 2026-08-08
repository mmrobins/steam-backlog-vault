const fs = require('fs');
const path = require('path');
const axios = require('axios');

const PREPOPULATED_FILE = path.join(__dirname, '..', 'server', 'prepopulated_games.json');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Fallback HLTB times in memory for instant seeding
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
  "Bioshock Infinite": { main: 11.5, mainExtra: 15.5, completionist: 27.5 },
  "DOOM": { main: 11.5, mainExtra: 16.5, completionist: 25 },
  "Outer Wilds": { main: 16, mainExtra: 22, completionist: 27.5 },
  "Disco Elysium": { main: 22, mainExtra: 33.5, completionist: 46 }
};

// Simple clean HLTB query method to bypass WAF blockers locally in dev mode
async function fetchHltbTime(title) {
  const cleaned = title.replace(/[™®]/g, '').trim();
  if (POPULAR_HLTB_CACHE[cleaned]) return POPULAR_HLTB_CACHE[cleaned];
  
  try {
    const initRes = await axios.get('https://howlongtobeat.com/api/bleed/init?t=' + Date.now(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      timeout: 3000
    });
    
    if (initRes.data && initRes.data.token) {
      const { token, hpKey, hpVal } = initRes.data;
      const payload = {
        searchType: 'games',
        searchTerms: cleaned.split(' '),
        searchPage: 1,
        size: 3,
        searchOptions: {
          games: {
            userId: 0, platform: '', sortCategory: 'popular', rangeCategory: 'main',
            rangeTime: { min: null, max: null }, gameplay: { perspective: '', flow: '', genre: '' },
            rangeYear: { min: null, max: null }, modifier: ''
          },
          users: { sortCategory: 'postcount' },
          lists: { sortCategory: 'follows' }
        },
        useCache: true
      };
      payload[hpKey] = hpVal;
      
      const searchRes = await axios.post('https://howlongtobeat.com/api/bleed', payload, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://howlongtobeat.com/',
          'Origin': 'https://howlongtobeat.com',
          'Content-Type': 'application/json',
          'x-auth-token': token,
          'x-hp-key': hpKey,
          'x-hp-val': hpVal
        },
        timeout: 3000
      });
      
      if (searchRes.data?.data?.length > 0) {
        const game = searchRes.data.data[0];
        return {
          main: game.comp_main ? Math.round(game.comp_main / 3600 * 10) / 10 : null,
          mainExtra: game.comp_plus ? Math.round(game.comp_plus / 3600 * 10) / 10 : null,
          completionist: game.comp_100 ? Math.round(game.comp_100 / 3600 * 10) / 10 : null
        };
      }
    }
  } catch (e) {
    // Ignore error
  }
  return { main: null, mainExtra: null, completionist: null };
}

// Fetch Steam Review details
async function fetchSteamReviews(appid) {
  try {
    const url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=all`;
    const res = await axios.get(url, { timeout: 4000 });
    if (res.data?.query_summary) {
      const summary = res.data.query_summary;
      const total = summary.total_reviews || 0;
      const positive = summary.total_positive || 0;
      const scorePct = total > 0 ? Math.round((positive / total) * 100) : null;
      return {
        reviewScore: scorePct,
        reviewDesc: summary.review_score_desc || 'No Reviews',
        totalReviews: total
      };
    }
  } catch (e) {
    // Ignore error
  }
  return { reviewScore: null, reviewDesc: 'No Reviews', totalReviews: 0 };
}

// Fetch Steam details
async function fetchSteamDetails(appid) {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en`;
    const res = await axios.get(url, { timeout: 4000 });
    if (res.data && res.data[appid] && res.data[appid].success) {
      const data = res.data[appid].data;
      return {
        header_image: data.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`,
        metacritic: data.metacritic ? data.metacritic.score : null,
        genres: data.genres ? data.genres.map(g => g.description) : [],
        release_date: data.release_date ? data.release_date.date : null,
        short_description: data.short_description || '',
        developer: data.developers ? data.developers.join(', ') : null,
        publisher: data.publishers ? data.publishers.join(', ') : null
      };
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

async function run() {
  console.log('=== Prepopulated Game Store Crawler ===');
  
  // Load existing prepopulated games to avoid duplicate fetches
  let prepopulated = {};
  if (fs.existsSync(PREPOPULATED_FILE)) {
    try {
      prepopulated = JSON.parse(fs.readFileSync(PREPOPULATED_FILE, 'utf8'));
    } catch (e) {
      prepopulated = {};
    }
  }
  console.log(`Loaded ${Object.keys(prepopulated).length} existing pre-cached games.`);

  // Get most popular games list from SteamSpy
  console.log('Fetching top 1000 popular games list from SteamSpy...');
  const spyRes = await axios.get('https://steamspy.com/api.php?request=all&page=0');
  const spyGames = Object.values(spyRes.data);
  
  console.log(`Retrieved ${spyGames.length} popular games.`);
  
  let successCount = 0;
  for (let i = 0; i < spyGames.length; i++) {
    const game = spyGames[i];
    const appid = String(game.appid);
    
    if (prepopulated[appid]) {
      // Already cached, skip
      continue;
    }
    
    console.log(`[${i + 1}/${spyGames.length}] Processing "${game.name}" (AppID: ${appid})...`);
    
    try {
      // Fetch details, reviews and HLTB in parallel
      const [reviews, details, hltb] = await Promise.all([
        fetchSteamReviews(appid),
        fetchSteamDetails(appid),
        fetchHltbTime(game.name)
      ]);
      
      if (details) {
        prepopulated[appid] = {
          reviewScore: reviews.reviewScore,
          reviewDesc: reviews.reviewDesc,
          totalReviews: reviews.totalReviews,
          metacritic: details.metacritic,
          header_image: details.header_image,
          genres: details.genres,
          release_date: details.release_date,
          short_description: details.short_description,
          developer: details.developer,
          publisher: details.publisher,
          hltb
        };
        
        successCount++;
        
        // Write to file progressively
        fs.writeFileSync(PREPOPULATED_FILE, JSON.stringify(prepopulated, null, 2), 'utf8');
      }
    } catch (e) {
      console.warn(`Failed fetching "${game.name}":`, e.message);
    }
    
    // Pause between games to respect rate limits
    await sleep(800);
  }
  
  console.log(`=== Completed! Cached ${successCount} new games. Total size: ${Object.keys(prepopulated).length} ===`);
}

run().catch(console.error);
