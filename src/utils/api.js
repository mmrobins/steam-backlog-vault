/**
 * Helper to fetch data from Express backend API
 */

export async function fetchUserSummary(steamid, apiKey = '') {
  const url = `/api/user/${encodeURIComponent(steamid)}?apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch user profile.');
  return await res.json();
}

export async function resolveCustomUrl(customUrl, apiKey = '') {
  const cleanName = customUrl.replace(/^https?:\/\/steamcommunity\.com\/(id|profiles)\//, '').replace(/\/$/, '');
  const url = `/api/user/resolve/${encodeURIComponent(cleanName)}?apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to resolve Steam URL.');
  }
  return data.steamid;
}

export async function fetchBacklogGames(steamid, apiKey = '', isDemo = false, maxPlaytime = 0) {
  const query = new URLSearchParams();
  if (apiKey) query.append('apiKey', apiKey);
  if (isDemo) query.append('demo', 'true');
  query.append('maxPlaytime', maxPlaytime);

  const url = `/api/backlog/${encodeURIComponent(steamid)}?${query.toString()}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.message || 'Failed to fetch backlog games.');
    err.code = data.error;
    throw err;
  }

  return data;
}

export function getStoredSettings() {
  try {
    return {
      steamid: localStorage.getItem('steam_backlog_steamid') || '',
      apiKey: localStorage.getItem('steam_backlog_apikey') || ''
    };
  } catch (e) {
    return { steamid: '', apiKey: '' };
  }
}

export function saveStoredSettings(steamid, apiKey) {
  try {
    if (steamid) localStorage.setItem('steam_backlog_steamid', steamid);
    if (apiKey !== undefined) localStorage.setItem('steam_backlog_apikey', apiKey);
  } catch (e) {}
}

export function clearStoredSettings() {
  try {
    localStorage.removeItem('steam_backlog_steamid');
  } catch (e) {}
}
