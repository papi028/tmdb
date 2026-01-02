import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache the databases in memory for faster access
let databases = null;

async function loadDatabases() {
    if (databases) return databases;

    databases = {
        flixhq: {
            movies: new Low(new JSONFile(join(__dirname, '../data/flixhq/moviesmap.json'))),
            tv: new Low(new JSONFile(join(__dirname, '../data/flixhq/tvmap.json')))
        },
        fmovies: {
            movies: new Low(new JSONFile(join(__dirname, '../data/fmovies/moviesmap.json'))),
            tv: new Low(new JSONFile(join(__dirname, '../data/fmovies/tvmap.json')))
        }
    };

    // Read all databases
    await Promise.all([
        databases.flixhq.movies.read(),
        databases.flixhq.tv.read(),
        databases.fmovies.movies.read(),
        databases.fmovies.tv.read()
    ]);

    return databases;
}

// Helper function to create reverse mapping (TMDB ID -> Provider ID)
function createReverseMapping(data) {
    const reverse = {};
    for (const [providerId, tmdbId] of Object.entries(data || {})) {
        if (tmdbId !== "0" && tmdbId !== 0) {
            reverse[tmdbId] = providerId;
        }
    }
    return reverse;
}

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const dbs = await loadDatabases();
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);
        const parts = pathname.split('/').filter(Boolean);

        // Remove 'api' from parts if present
        if (parts[0] === 'api') parts.shift();

        // GET /api/flixhq/movie/:id - Get TMDB ID from FlixHQ movie ID
        if (parts[0] === 'flixhq' && parts[1] === 'movie' && parts[2]) {
            const flixhqId = parts[2];
            const tmdbId = dbs.flixhq.movies.data[flixhqId];

            if (!tmdbId || tmdbId === "0") {
                return res.status(404).json({
                    error: 'Mapping not found',
                    flixhqId,
                    suggestion: 'This content may not be mapped yet or does not exist on TMDB'
                });
            }

            return res.status(200).json({
                provider: 'flixhq',
                type: 'movie',
                providerId: flixhqId,
                tmdbId: parseInt(tmdbId)
            });
        }

        // GET /api/flixhq/tv/:id - Get TMDB ID from FlixHQ TV ID
        if (parts[0] === 'flixhq' && parts[1] === 'tv' && parts[2]) {
            const flixhqId = parts[2];
            const tmdbId = dbs.flixhq.tv.data[flixhqId];

            if (!tmdbId || tmdbId === "0") {
                return res.status(404).json({
                    error: 'Mapping not found',
                    flixhqId,
                    suggestion: 'This content may not be mapped yet or does not exist on TMDB'
                });
            }

            return res.status(200).json({
                provider: 'flixhq',
                type: 'tv',
                providerId: flixhqId,
                tmdbId: parseInt(tmdbId)
            });
        }

        // GET /api/fmovies/movie/:id - Get TMDB ID from Fmovies movie ID
        if (parts[0] === 'fmovies' && parts[1] === 'movie' && parts[2]) {
            const fmoviesId = parts[2];
            const tmdbId = dbs.fmovies.movies.data[fmoviesId];

            if (!tmdbId || tmdbId === "0") {
                return res.status(404).json({
                    error: 'Mapping not found',
                    fmoviesId,
                    suggestion: 'This content may not be mapped yet or does not exist on TMDB'
                });
            }

            return res.status(200).json({
                provider: 'fmovies',
                type: 'movie',
                providerId: fmoviesId,
                tmdbId: parseInt(tmdbId)
            });
        }

        // GET /api/fmovies/tv/:id - Get TMDB ID from Fmovies TV ID
        if (parts[0] === 'fmovies' && parts[1] === 'tv' && parts[2]) {
            const fmoviesId = parts[2];
            const tmdbId = dbs.fmovies.tv.data[fmoviesId];

            if (!tmdbId || tmdbId === "0") {
                return res.status(404).json({
                    error: 'Mapping not found',
                    fmoviesId,
                    suggestion: 'This content may not be mapped yet or does not exist on TMDB'
                });
            }

            return res.status(200).json({
                provider: 'fmovies',
                type: 'tv',
                providerId: fmoviesId,
                tmdbId: parseInt(tmdbId)
            });
        }

        // GET /api/tmdb/movie/:id?provider=flixhq - Reverse lookup: Get provider ID from TMDB ID
        if (parts[0] === 'tmdb' && parts[1] === 'movie' && parts[2]) {
            const tmdbId = parts[2];
            const provider = new URL(req.url, `http://${req.headers.host}`).searchParams.get('provider') || 'flixhq';

            if (!dbs[provider]) {
                return res.status(400).json({
                    error: 'Invalid provider',
                    validProviders: ['flixhq', 'fmovies']
                });
            }

            const reverseMap = createReverseMapping(dbs[provider].movies.data);
            const providerId = reverseMap[tmdbId];

            if (!providerId) {
                return res.status(404).json({
                    error: 'Reverse mapping not found',
                    tmdbId,
                    provider,
                    suggestion: 'This TMDB content may not be available on the provider'
                });
            }

            return res.status(200).json({
                provider,
                type: 'movie',
                tmdbId: parseInt(tmdbId),
                providerId
            });
        }

        // GET /api/tmdb/tv/:id?provider=flixhq - Reverse lookup: Get provider ID from TMDB ID
        if (parts[0] === 'tmdb' && parts[1] === 'tv' && parts[2]) {
            const tmdbId = parts[2];
            const provider = new URL(req.url, `http://${req.headers.host}`).searchParams.get('provider') || 'flixhq';

            if (!dbs[provider]) {
                return res.status(400).json({
                    error: 'Invalid provider',
                    validProviders: ['flixhq', 'fmovies']
                });
            }

            const reverseMap = createReverseMapping(dbs[provider].tv.data);
            const providerId = reverseMap[tmdbId];

            if (!providerId) {
                return res.status(404).json({
                    error: 'Reverse mapping not found',
                    tmdbId,
                    provider,
                    suggestion: 'This TMDB content may not be available on the provider'
                });
            }

            return res.status(200).json({
                provider,
                type: 'tv',
                tmdbId: parseInt(tmdbId),
                providerId
            });
        }

        // POST /api/batch - Batch lookup
        if (req.method === 'POST' && parts[0] === 'batch') {
            const body = req.body || JSON.parse(await getBody(req));
            const { provider = 'flixhq', type = 'movie', ids = [], reverse = false } = body;

            if (!dbs[provider]) {
                return res.status(400).json({
                    error: 'Invalid provider',
                    validProviders: ['flixhq', 'fmovies']
                });
            }

            if (!['movie', 'tv'].includes(type)) {
                return res.status(400).json({
                    error: 'Invalid type',
                    validTypes: ['movie', 'tv']
                });
            }

            const db = dbs[provider][type === 'movie' ? 'movies' : 'tv'];
            const results = {};

            if (reverse) {
                // Reverse lookup: TMDB IDs -> Provider IDs
                const reverseMap = createReverseMapping(db.data);
                for (const id of ids) {
                    const providerId = reverseMap[id];
                    results[id] = providerId || null;
                }
            } else {
                // Forward lookup: Provider IDs -> TMDB IDs
                for (const id of ids) {
                    const tmdbId = db.data[id];
                    results[id] = (tmdbId && tmdbId !== "0") ? parseInt(tmdbId) : null;
                }
            }

            return res.status(200).json({
                provider,
                type,
                reverse,
                count: ids.length,
                results
            });
        }

        // GET /api/stats - Get statistics
        if (parts[0] === 'stats') {
            const stats = {
                flixhq: {
                    movies: Object.keys(dbs.flixhq.movies.data || {}).length,
                    tv: Object.keys(dbs.flixhq.tv.data || {}).length,
                    moviesSuccess: Object.values(dbs.flixhq.movies.data || {}).filter(v => v !== "0").length,
                    tvSuccess: Object.values(dbs.flixhq.tv.data || {}).filter(v => v !== "0").length
                },
                fmovies: {
                    movies: Object.keys(dbs.fmovies.movies.data || {}).length,
                    tv: Object.keys(dbs.fmovies.tv.data || {}).length,
                    moviesSuccess: Object.values(dbs.fmovies.movies.data || {}).filter(v => v !== "0").length,
                    tvSuccess: Object.values(dbs.fmovies.tv.data || {}).filter(v => v !== "0").length
                }
            };

            return res.status(200).json(stats);
        }

        // GET /api - API documentation
        if (parts.length === 0) {
            return res.status(200).json({
                name: 'TMDB to FlixHQ/Fmovies Mapper API',
                version: '1.0.0',
                endpoints: {
                    'GET /api/flixhq/movie/:id': 'Get TMDB ID from FlixHQ movie ID',
                    'GET /api/flixhq/tv/:id': 'Get TMDB ID from FlixHQ TV show ID',
                    'GET /api/fmovies/movie/:id': 'Get TMDB ID from Fmovies movie ID',
                    'GET /api/fmovies/tv/:id': 'Get TMDB ID from Fmovies TV show ID',
                    'GET /api/tmdb/movie/:id?provider=flixhq': 'Get provider ID from TMDB movie ID (reverse lookup)',
                    'GET /api/tmdb/tv/:id?provider=flixhq': 'Get provider ID from TMDB TV show ID (reverse lookup)',
                    'POST /api/batch': 'Batch lookup (body: {provider, type, ids, reverse})',
                    'GET /api/stats': 'Get mapping statistics'
                },
                examples: {
                    forward: 'GET /api/flixhq/movie/1',
                    reverse: 'GET /api/tmdb/movie/548915?provider=flixhq',
                    batch: 'POST /api/batch with body: {"provider":"flixhq","type":"movie","ids":[1,4,5]}'
                }
            });
        }

        // 404 - Not found
        return res.status(404).json({
            error: 'Endpoint not found',
            availableEndpoints: [
                '/api',
                '/api/stats',
                '/api/flixhq/movie/:id',
                '/api/flixhq/tv/:id',
                '/api/fmovies/movie/:id',
                '/api/fmovies/tv/:id',
                '/api/tmdb/movie/:id',
                '/api/tmdb/tv/:id',
                '/api/batch'
            ]
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

// Helper to get request body
function getBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}
