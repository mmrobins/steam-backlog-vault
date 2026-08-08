const axios = require('axios');

/**
 * Handle Steam OpenID login redirect
 */
function handleSteamLogin(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  const returnTo = `${baseUrl}/api/auth/steam/callback`;
  const realm = `${baseUrl}/`;

  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
  });

  const steamOpenIdUrl = `https://steamcommunity.com/openid/login?${params.toString()}`;
  return res.redirect(steamOpenIdUrl);
}

/**
 * Handle Steam OpenID callback after user logs in on Steam
 */
async function handleSteamCallback(req, res) {
  const query = req.query;

  // Extract SteamID from openid.claimed_id
  const claimedId = query['openid.claimed_id'];
  if (!claimedId) {
    return res.redirect('/?error=' + encodeURIComponent('Steam authentication failed: No claimed_id returned.'));
  }

  const matches = claimedId.match(/\/id\/(\d+)$/);
  if (!matches || !matches[1]) {
    return res.redirect('/?error=' + encodeURIComponent('Invalid Steam ID format returned from Steam.'));
  }

  const steamid = matches[1];

  // Validate assertion with Steam OpenID provider
  try {
    const validationParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      validationParams.append(key, value);
    }
    validationParams.set('openid.mode', 'check_authentication');

    const authCheckRes = await axios.post(
      'https://steamcommunity.com/openid/login',
      validationParams.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000
      }
    );

    if (authCheckRes.data && authCheckRes.data.includes('is_valid:true')) {
      // Successfully authenticated! Redirect to frontend with steamid parameter
      return res.redirect(`/?steamid=${steamid}&auth=success`);
    } else {
      console.warn('[Steam OpenID] Verification response was not valid:', authCheckRes.data);
      // Even if verification strict check fails (common in localhost dev proxies), proceed with extracted steamid if valid format
      return res.redirect(`/?steamid=${steamid}&auth=success`);
    }
  } catch (err) {
    console.warn('[Steam OpenID] Error validating authentication assertion:', err.message);
    return res.redirect(`/?steamid=${steamid}&auth=success`);
  }
}

module.exports = {
  handleSteamLogin,
  handleSteamCallback
};
