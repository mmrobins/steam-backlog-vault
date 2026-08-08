const NodeCache = require('node-cache');

// Cache with default TTL of 7 days (604800 seconds)
const cache = new NodeCache({ stdTTL: 604800, checkperiod: 86400 });

module.exports = cache;
