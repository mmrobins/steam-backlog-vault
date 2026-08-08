import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import BacklogStats from './components/BacklogStats';
import FilterBar from './components/FilterBar';
import GameCard from './components/GameCard';
import RandomPickerModal from './components/RandomPickerModal';
import SettingsModal from './components/SettingsModal';
import { fetchUserSummary, fetchBacklogGames, getStoredSettings, saveStoredSettings, clearStoredSettings } from './utils/api';
import { LogIn, Sparkles, AlertCircle, Lock, RefreshCw, Gamepad2 } from 'lucide-react';

export default function App() {
  const [steamid, setSteamid] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState(null);

  // Filters & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('reviewScore'); // default sort by review score!
  const [timeFilter, setTimeFilter] = useState('all');
  const [playtimeThreshold, setPlaytimeThreshold] = useState(0);

  // Modals State
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initial setup: read URL parameters or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSteamid = params.get('steamid');
    const stored = getStoredSettings();

    if (urlSteamid) {
      setSteamid(urlSteamid);
      saveStoredSettings(urlSteamid, stored.apiKey);
      // Clean up URL without reloading page
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (stored.steamid) {
      setSteamid(stored.steamid);
      setApiKey(stored.apiKey);
    } else {
      // Default to demo mode so user gets an immediate preview
      setSteamid('demo');
    }
  }, []);

  // Background Syncing State
  const [steamSyncTotal, setSteamSyncTotal] = useState(0);
  const [steamSuccessCount, setSteamSuccessCount] = useState(0);
  const [steamFailedCount, setSteamFailedCount] = useState(0);

  const [hltbSyncTotal, setHltbSyncTotal] = useState(0);
  const [hltbSuccessCount, setHltbSuccessCount] = useState(0);
  const [hltbFailedCount, setHltbFailedCount] = useState(0);
  
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch backlog when steamid, apiKey, or playtimeThreshold changes
  useEffect(() => {
    if (!steamid) return;

    let isMounted = true;
    setLoading(true);
    setErrorInfo(null);
    setIsSyncing(false);
    
    setSteamSyncTotal(0);
    setSteamSuccessCount(0);
    setSteamFailedCount(0);
    
    setHltbSyncTotal(0);
    setHltbSuccessCount(0);
    setHltbFailedCount(0);

    async function loadData() {
      try {
        const isDemo = steamid === 'demo';
        
        // Fetch user profile summary
        const userSummary = await fetchUserSummary(steamid, apiKey);
        if (isMounted) setUser(userSummary);

        // Fetch backlog games list (returns cached items and basic uncached items instantly)
        const data = await fetchBacklogGames(steamid, apiKey, isDemo, playtimeThreshold);
        if (isMounted) {
          const loadedGames = (data.games || []).map(game => {
            // Check browser localStorage first for details
            let isSteamCached = game.isSteamCached;
            let isHltbCached = game.isHltbCached;
            
            let extraSteam = {};
            let extraHltb = {};

            try {
              const localSteam = localStorage.getItem(`steam_details_${game.appid}`);
              if (localSteam) {
                extraSteam = JSON.parse(localSteam);
                // Schema migration fallback for older cache entries
                if (extraSteam.metacritic && !extraSteam.metacriticUrl) {
                  extraSteam.metacriticUrl = `https://www.metacritic.com/search/game/${encodeURIComponent(game.name)}/results`;
                }
                isSteamCached = true;
              }
              
              const localHltb = localStorage.getItem(`hltb_details_${game.appid}`);
              if (localHltb) {
                extraHltb = JSON.parse(localHltb);
                isHltbCached = true;
              }
            } catch (e) {
              console.warn('Failed to load from browser localStorage cache:', e);
            }

            return {
              ...game,
              ...extraSteam,
              ...extraHltb,
              isSteamCached,
              isHltbCached
            };
          });

          setGames(loadedGames);
          setLoading(false);

          if (!isDemo) {
            // Find items that need Steam details
            const steamQueue = loadedGames.filter(g => !g.isSteamCached);
            // Find items that need HLTB times
            const hltbQueue = loadedGames.filter(g => !g.isHltbCached);

            if (steamQueue.length > 0 || hltbQueue.length > 0) {
              setSteamSyncTotal(steamQueue.length);
              setHltbSyncTotal(hltbQueue.length);
              setIsSyncing(true);
              
              // Run sync loops
              triggerSync(steamQueue, hltbQueue);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading backlog data:', err);
          setErrorInfo({
            code: err.code || 'ERROR',
            message: err.message || 'Failed to load Steam library.'
          });
          setLoading(false);
        }
      }
    }

    async function triggerSync(steamQueue, hltbQueue) {
      let steamSuccesses = 0;
      let steamFailures = 0;
      let hltbSuccesses = 0;
      let hltbFailures = 0;

      const steamPromise = (async () => {
        for (const game of steamQueue) {
          if (!isMounted) break;
          try {
            const res = await fetch('/api/enrich/steam', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appid: game.appid })
            });
            if (!res.ok) throw new Error('Steam enrich failed');
            const data = await res.json();
            
            if (isMounted) {
              if (data.success) {
                // Save to browser localStorage cache
                try {
                  localStorage.setItem(`steam_details_${game.appid}`, JSON.stringify(data));
                } catch (e) {
                  console.warn('localStorage storage limit reached', e);
                }

                setGames(prev => prev.map(g => g.appid === game.appid ? { ...g, ...data, isSteamCached: true } : g));
                steamSuccesses++;
                setSteamSuccessCount(steamSuccesses);
              } else {
                // Rate limited fallback: do not mark cached as true so we can retry later
                setGames(prev => prev.map(g => g.appid === game.appid ? { ...g, ...data, isSteamCached: false } : g));
                steamFailures++;
                setSteamFailedCount(steamFailures);
              }
            }
          } catch (e) {
            console.warn(`[Steam Sync] Failed app ${game.appid}:`, e.message);
            if (isMounted) {
              steamFailures++;
              setSteamFailedCount(steamFailures);
            }
          }
          await sleep(650);
        }
      })();

      const hltbPromise = (async () => {
        for (const game of hltbQueue) {
          if (!isMounted) break;
          try {
            const res = await fetch('/api/enrich/hltb', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appid: game.appid, name: game.name })
            });
            if (!res.ok) throw new Error('HLTB enrich failed');
            const data = await res.json();
            
            if (isMounted) {
              if (data.success) {
                // Save to browser localStorage cache
                try {
                  localStorage.setItem(`hltb_details_${game.appid}`, JSON.stringify(data));
                } catch (e) {
                  console.warn('localStorage storage limit reached', e);
                }

                setGames(prev => prev.map(g => g.appid === game.appid ? { ...g, ...data, isHltbCached: true } : g));
                hltbSuccesses++;
                setHltbSuccessCount(hltbSuccesses);
              } else {
                setGames(prev => prev.map(g => g.appid === game.appid ? { ...g, ...data, isHltbCached: false } : g));
                hltbFailures++;
                setHltbFailedCount(hltbFailures);
              }
            }
          } catch (e) {
            console.warn(`[HLTB Sync] Failed app ${game.appid}:`, e.message);
            if (isMounted) {
              hltbFailures++;
              setHltbFailedCount(hltbFailures);
            }
          }
          await sleep(500);
        }
      })();

      await Promise.all([steamPromise, hltbPromise]);
      if (isMounted) setIsSyncing(false);
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    loadData();

    return () => {
      isMounted = false;
    };
  }, [steamid, apiKey, playtimeThreshold]);

  const handleSaveSettings = (newSteamid, newApiKey) => {
    setSteamid(newSteamid || 'demo');
    setApiKey(newApiKey || '');
    saveStoredSettings(newSteamid, newApiKey);
  };

  const handleTryDemo = () => {
    setSteamid('demo');
    saveStoredSettings('demo', apiKey);
  };

  const handleLogout = () => {
    clearStoredSettings();
    setUser(null);
    setSteamid('demo');
  };

  // Filter & Sort Logic
  const filteredAndSortedGames = useMemo(() => {
    if (!games) return [];

    return games
      .filter((game) => {
        // Search text matching
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const nameMatch = game.name.toLowerCase().includes(q);
          const genreMatch = game.genres && game.genres.some(g => g.toLowerCase().includes(q));
          if (!nameMatch && !genreMatch) return false;
        }

        // Time to beat filter matching
        const mainTime = game.hltb?.main;
        if (timeFilter === 'short' && (!mainTime || mainTime > 10)) return false;
        if (timeFilter === 'medium' && (!mainTime || mainTime <= 10 || mainTime > 25)) return false;
        if (timeFilter === 'long' && (!mainTime || mainTime <= 25 || mainTime > 50)) return false;
        if (timeFilter === 'epic' && (!mainTime || mainTime <= 50)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'reviewScore') {
          const scoreA = a.reviewScore !== null && a.reviewScore !== undefined ? a.reviewScore : -1;
          const scoreB = b.reviewScore !== null && b.reviewScore !== undefined ? b.reviewScore : -1;
          return scoreB - scoreA;
        }
        if (sortBy === 'metacritic') {
          const metaA = a.metacritic || -1;
          const metaB = b.metacritic || -1;
          return metaB - metaA;
        }
        if (sortBy === 'hltbAsc') {
          const timeA = a.hltb?.main || 9999;
          const timeB = b.hltb?.main || 9999;
          return timeA - timeB;
        }
        if (sortBy === 'hltbDesc') {
          const timeA = a.hltb?.main || -1;
          const timeB = b.hltb?.main || -1;
          return timeB - timeA;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [games, searchQuery, sortBy, timeFilter]);

  return (
    <div className="app-container">
      <Header
        user={user}
        apiKey={apiKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTryDemo={handleTryDemo}
        onLogout={handleLogout}
        isDemo={steamid === 'demo'}
      />

      {/* Real-time background sync progress bar */}
      {isSyncing && (
        <div className="sync-progress-bar-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {steamSyncTotal > 0 && (
            <div>
              <div className="sync-status">
                <span>
                  🎮 Steam Details: Synced {steamSuccessCount} · 
                  {steamFailedCount > 0 && <span style={{ color: 'var(--accent-amber)', marginLeft: '4px' }}> Failed {steamFailedCount}</span>}
                  {` / ${steamSyncTotal} (${Math.round((steamSuccessCount + steamFailedCount) / steamSyncTotal * 100)}%)`}
                </span>
              </div>
              <div className="sync-progress-track">
                <div className="sync-progress-fill" style={{ width: `${((steamSuccessCount + steamFailedCount) / steamSyncTotal * 100)}%` }}></div>
              </div>
            </div>
          )}
          {hltbSyncTotal > 0 && (
            <div>
              <div className="sync-status" style={{ color: 'var(--accent-purple)' }}>
                <span>
                  ⏱️ Playtimes: Synced {hltbSuccessCount} · 
                  {hltbFailedCount > 0 && <span style={{ color: 'var(--accent-rose)', marginLeft: '4px' }}> Failed {hltbFailedCount}</span>}
                  {` / ${hltbSyncTotal} (${Math.round((hltbSuccessCount + hltbFailedCount) / hltbSyncTotal * 100)}%)`}
                </span>
              </div>
              <div className="sync-progress-track">
                <div className="sync-progress-fill" style={{ width: `${((hltbSuccessCount + hltbFailedCount) / hltbSyncTotal * 100)}%`, background: 'linear-gradient(90deg, var(--accent-purple) 0%, var(--accent-rose) 100%)', boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)' }}></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aggregate Stats Dashboard */}
      {!loading && !errorInfo && <BacklogStats games={games} />}

      {/* Filter and Sorting Bar */}
      {!errorInfo && (
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          playtimeThreshold={playtimeThreshold}
          setPlaytimeThreshold={setPlaytimeThreshold}
          onOpenPicker={() => setIsPickerOpen(true)}
        />
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-box">
          <div className="spinner"></div>
          <h3 style={{ fontSize: '1.2rem', color: '#66c0f4', fontFamily: 'var(--font-heading)' }}>
            Fetching Steam Review Scores & HowLongToBeat Stats...
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
            Gathering unplayed games and completion times
          </p>
        </div>
      ) : errorInfo ? (
        <div
          style={{
            background: 'rgba(22, 30, 46, 0.9)',
            border: '1px solid var(--border-accent)',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            maxWidth: '650px',
            margin: '3rem auto'
          }}
        >
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(102, 192, 244, 0.15)', color: '#66c0f4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Key size={30} />
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            {user ? `Welcome, ${user.personaname}!` : 'Steam Web API Key Required'}
          </h3>

          <p style={{ color: '#9ca3af', fontSize: '0.95rem', marginBottom: '1.25rem', lineHeight: '1.6' }}>
            Your Steam account is authenticated via OpenID! To load your live game library, Steam requires a Web API key.
          </p>

          <div style={{ background: 'rgba(10, 15, 26, 0.7)', border: '1px dashed var(--border-accent)', borderRadius: '12px', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
            <strong style={{ color: '#66c0f4', display: 'block', marginBottom: '0.5rem' }}>💡 How to activate live sync:</strong>
            <ol style={{ paddingLeft: '1.2rem', color: '#d1d5db', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>
                <strong>Option A (For your web app server):</strong> Add <code>STEAM_API_KEY=your_key</code> in your <code>.env</code> file. Then all users signing in like gg.deals will load instantly without entering anything!
              </li>
              <li>
                <strong>Option B (Local test):</strong> Get a free key in 5 seconds from{' '}
                <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#66c0f4', textDecoration: 'underline' }}>
                  steamcommunity.com/dev/apikey
                </a>{' '}
                and paste it below.
              </li>
            </ol>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = e.target.elements.apiKeyInput.value.trim();
              if (val) {
                handleSaveSettings(steamid, val);
              }
            }}
            style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}
          >
            <input
              name="apiKeyInput"
              type="password"
              placeholder="Paste Steam Web API Key here..."
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                background: 'rgba(10, 15, 26, 0.8)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#fff',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button type="submit" className="btn btn-primary">
              Sync Library
            </button>
          </form>

          <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleTryDemo}>
              <Sparkles size={16} /> Explore Demo Backlog
            </button>
          </div>
        </div>
      ) : filteredAndSortedGames.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <Gamepad2 size={48} style={{ color: '#6b7280', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No unplayed games match your criteria</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '0.4rem' }}>
            Try adjusting your search query or time filter.
          </p>
        </div>
      ) : (
        <div className="games-grid">
          {filteredAndSortedGames.map((game) => (
            <GameCard key={game.appid} game={game} />
          ))}
        </div>
      )}

      {/* Modals */}
      <RandomPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        games={games}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSteamid={steamid}
        currentApiKey={apiKey}
        onSave={handleSaveSettings}
        onTryDemo={handleTryDemo}
      />
    </div>
  );
}
