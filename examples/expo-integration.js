/**
 * TMDB Mapper API Client
 * 
 * This service provides easy integration with your TMDB-to-FlixHQ mapper API.
 * Use this in your Expo app to convert between TMDB IDs and FlixHQ IDs.
 * 
 * Setup:
 * 1. Deploy your mapper to Vercel (see DEPLOYMENT.md)
 * 2. Replace MAPPER_API_URL with your Vercel URL
 * 3. Import this file in your app: import { mapperApi } from './services/mapperApi'
 */

// Replace with your deployed Vercel URL
const MAPPER_API_URL = 'https://your-mapper.vercel.app/api';

class MapperAPI {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    /**
     * Get TMDB ID from FlixHQ ID
     * @param {string|number} flixhqId - The FlixHQ content ID
     * @param {string} type - 'movie' or 'tv'
     * @returns {Promise<number|null>} TMDB ID or null if not found
     */
    async getFlixHQToTMDB(flixhqId, type = 'movie') {
        try {
            const response = await fetch(`${this.baseURL}/flixhq/${type}/${flixhqId}`);

            if (!response.ok) {
                console.warn(`FlixHQ ID ${flixhqId} not found in mapper`);
                return null;
            }

            const data = await response.json();
            return data.tmdbId;
        } catch (error) {
            console.error('Mapper API error (FlixHQ->TMDB):', error);
            return null;
        }
    }

    /**
     * Get FlixHQ ID from TMDB ID (reverse lookup)
     * @param {string|number} tmdbId - The TMDB content ID
     * @param {string} type - 'movie' or 'tv'
     * @param {string} provider - 'flixhq' or 'fmovies'
     * @returns {Promise<string|null>} FlixHQ ID or null if not found
     */
    async getTMDBToFlixHQ(tmdbId, type = 'movie', provider = 'flixhq') {
        try {
            const response = await fetch(
                `${this.baseURL}/tmdb/${type}/${tmdbId}?provider=${provider}`
            );

            if (!response.ok) {
                console.warn(`TMDB ID ${tmdbId} not available on ${provider}`);
                return null;
            }

            const data = await response.json();
            return data.providerId;
        } catch (error) {
            console.error('Mapper API error (TMDB->FlixHQ):', error);
            return null;
        }
    }

    /**
     * Get Fmovies ID from TMDB ID
     * @param {string|number} tmdbId - The TMDB content ID
     * @param {string} type - 'movie' or 'tv'
     * @returns {Promise<string|null>} Fmovies ID or null if not found
     */
    async getTMDBToFmovies(tmdbId, type = 'movie') {
        return this.getTMDBToFlixHQ(tmdbId, type, 'fmovies');
    }

    /**
     * Batch lookup - convert multiple IDs at once
     * @param {Array<string|number>} ids - Array of IDs to lookup
     * @param {string} type - 'movie' or 'tv'
     * @param {string} provider - 'flixhq' or 'fmovies'
     * @param {boolean} reverse - If true, converts TMDB->Provider, else Provider->TMDB
     * @returns {Promise<Object|null>} Object mapping input IDs to output IDs
     */
    async batchLookup(ids, type = 'movie', provider = 'flixhq', reverse = false) {
        try {
            const response = await fetch(`${this.baseURL}/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, type, ids, reverse })
            });

            if (!response.ok) {
                console.error('Batch lookup failed');
                return null;
            }

            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error('Mapper API error (batch):', error);
            return null;
        }
    }

    /**
     * Get API statistics
     * @returns {Promise<Object|null>} Statistics object
     */
    async getStats() {
        try {
            const response = await fetch(`${this.baseURL}/stats`);

            if (!response.ok) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Mapper API error (stats):', error);
            return null;
        }
    }

    /**
     * Check if a TMDB movie/show is available on FlixHQ
     * @param {string|number} tmdbId - The TMDB content ID
     * @param {string} type - 'movie' or 'tv'
     * @returns {Promise<boolean>} True if available
     */
    async isAvailableOnFlixHQ(tmdbId, type = 'movie') {
        const flixhqId = await this.getTMDBToFlixHQ(tmdbId, type);
        return flixhqId !== null;
    }

    /**
     * Get complete mapping info
     * @param {string|number} tmdbId - The TMDB content ID
     * @param {string} type - 'movie' or 'tv'
     * @returns {Promise<Object|null>} Complete mapping info for all providers
     */
    async getCompleteMapping(tmdbId, type = 'movie') {
        try {
            const [flixhqId, fmoviesId] = await Promise.all([
                this.getTMDBToFlixHQ(tmdbId, type, 'flixhq'),
                this.getTMDBToFlixHQ(tmdbId, type, 'fmovies')
            ]);

            return {
                tmdbId,
                type,
                providers: {
                    flixhq: flixhqId,
                    fmovies: fmoviesId
                },
                available: flixhqId !== null || fmoviesId !== null
            };
        } catch (error) {
            console.error('Error getting complete mapping:', error);
            return null;
        }
    }
}

// Export singleton instance
export const mapperApi = new MapperAPI(MAPPER_API_URL);

// Export class for custom instances
export default MapperAPI;

/**
 * USAGE EXAMPLES:
 * 
 * // Example 1: Play a movie from TMDB data
 * async function playMovie(tmdbId) {
 *   const flixhqId = await mapperApi.getTMDBToFlixHQ(tmdbId, 'movie');
 *   if (flixhqId) {
 *     const source = await getFlixHQSource(flixhqId);
 *     navigation.navigate('Player', { source });
 *   }
 * }
 * 
 * // Example 2: Show movie details from FlixHQ ID
 * async function showDetails(flixhqId) {
 *   const tmdbId = await mapperApi.getFlixHQToTMDB(flixhqId, 'movie');
 *   if (tmdbId) {
 *     const details = await fetchTMDBDetails(tmdbId);
 *     setMovieDetails(details);
 *   }
 * }
 * 
 * // Example 3: Check availability before showing play button
 * async function MovieCard({ movie }) {
 *   const [available, setAvailable] = useState(false);
 *   
 *   useEffect(() => {
 *     mapperApi.isAvailableOnFlixHQ(movie.id, 'movie')
 *       .then(setAvailable);
 *   }, [movie.id]);
 *   
 *   return (
 *     <View>
 *       <Text>{movie.title}</Text>
 *       {available && <Button title="Play" />}
 *     </View>
 *   );
 * }
 * 
 * // Example 4: Batch check for a list of movies
 * async function checkAvailability(tmdbIds) {
 *   const mappings = await mapperApi.batchLookup(
 *     tmdbIds, 
 *     'movie', 
 *     'flixhq', 
 *     true // reverse lookup
 *   );
 *   
 *   const available = tmdbIds.filter(id => mappings[id] !== null);
 *   console.log(`${available.length}/${tmdbIds.length} available`);
 * }
 * 
 * // Example 5: Get all provider options
 * async function getStreamingOptions(tmdbId) {
 *   const mapping = await mapperApi.getCompleteMapping(tmdbId, 'movie');
 *   
 *   if (mapping.providers.flixhq) {
 *     console.log('Available on FlixHQ:', mapping.providers.flixhq);
 *   }
 *   if (mapping.providers.fmovies) {
 *     console.log('Available on Fmovies:', mapping.providers.fmovies);
 *   }
 * }
 */
