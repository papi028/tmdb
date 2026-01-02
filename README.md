# TMDB to FlixHQ/Fmovies ID Mapper

A powerful ID mapping service that bridges TMDB (The Movie Database) with streaming providers like FlixHQ and Fmovies. This tool automatically scrapes and maps content IDs between different platforms, making it easy to find streaming sources for movies and TV shows.

## 🎯 What Does This Do?

**Problem**: Your Expo movie app uses TMDB for movie data, but you want to get HLS streaming sources from FlixHQ. However, FlixHQ uses completely different IDs for movies and TV shows.

**Solution**: This mapper automatically:
1. Scrapes FlixHQ and Fmovies to get their content IDs
2. Searches TMDB API to find matching content
3. Creates a mapping database: `FlixHQ ID ↔ TMDB ID`
4. Provides an API to lookup mappings instantly

## 📁 Project Structure

```
tmdb/
├── providers/
│   ├── flixhq.js       # FlixHQ scraper & mapper
│   └── fmovies.js      # Fmovies scraper & mapper
├── data/
│   ├── flixhq/
│   │   ├── moviesmap.json    # FlixHQ movie ID → TMDB ID mappings
│   │   ├── tvmap.json        # FlixHQ TV show ID → TMDB ID mappings
│   │   ├── movieerror.json   # Failed movie mappings
│   │   └── tvmaperror.json   # Failed TV mappings
│   └── fmovies/
│       └── (same structure)
├── tmdb/
│   ├── movies/         # Cached TMDB movie data
│   ├── tv/            # Cached TMDB TV show data
│   └── status.json    # TV show status tracking
├── main.js            # Main orchestrator
├── server.js          # Mapping logic
├── tmdb.js           # TMDB data fetcher
└── utils.js          # HTTP utilities
```

## 🔧 How It Works

### 1. **Scraping Phase**
The scrapers (`flixhq.js`, `fmovies.js`) crawl the provider websites:
- Extract movie/TV show listings
- Parse IDs, names, and release dates
- Store in temporary data structures

### 2. **Mapping Phase**
For each scraped item:
- Search TMDB API using title + release year
- Match results by comparing release dates
- Store the mapping: `provider_id → tmdb_id`

### 3. **Storage**
Mappings are stored in JSON files:
```json
{
  "1": 548915,      // FlixHQ ID 1 → TMDB ID 548915
  "4": 505031,
  "5": 28967,
  ...
}
```

### 4. **Error Handling**
Failed mappings are tracked separately:
- Retry logic for temporary failures
- Permanent failures logged after 10 attempts
- Separate error files for debugging

## 🚀 Usage

### Current Setup (Cron Job Style)

The current implementation runs as a background service:

```javascript
// Runs every hour
setInterval(() => {
    server.ini("fmovies");
    server.ini("flixhq");
}, 60 * 60 * 1000);
```

### Environment Variables

Create a `.env` file:

```env
KEY=your_tmdb_api_key_here
```

Get your TMDB API key from: https://www.themoviedb.org/settings/api

### Running Locally

```bash
# Install dependencies
npm install

# Start the mapper
node main.js
```

## 📡 API Endpoints (After Conversion)

After deploying to Vercel, you'll have these endpoints:

### 1. Get TMDB ID from FlixHQ ID

```
GET /api/flixhq/movie/:id
GET /api/flixhq/tv/:id
```

**Example:**
```bash
curl https://your-app.vercel.app/api/flixhq/movie/1
# Response: { "flixhqId": "1", "tmdbId": 548915 }
```

### 2. Get FlixHQ ID from TMDB ID (Reverse Lookup)

```
GET /api/tmdb/movie/:id
GET /api/tmdb/tv/:id
```

**Example:**
```bash
curl https://your-app.vercel.app/api/tmdb/movie/548915
# Response: { "tmdbId": 548915, "flixhqId": "1" }
```

### 3. Batch Lookup

```
POST /api/batch
Body: { "provider": "flixhq", "type": "movie", "ids": [1, 4, 5] }
```

**Example:**
```bash
curl -X POST https://your-app.vercel.app/api/batch \
  -H "Content-Type: application/json" \
  -d '{"provider":"flixhq","type":"movie","ids":[1,4,5]}'

# Response: 
# {
#   "1": 548915,
#   "4": 505031,
#   "5": 28967
# }
```

## 🔍 Understanding the Mapping Logic

### FlixHQ Mapper

```javascript
static async mapReq(info, movie) {
    // Extract year from release date
    let year = (new Date(info.released)).getFullYear();
    
    // Search TMDB
    let urlAPI = `https://api.themoviedb.org/3/search/${movie ? "movie" : "tv"}?api_key=${KEY}&query=${info.name}&page=1&primary_release_year=${year}`;
    
    // Match by release date (within 1 month tolerance)
    for (let result of searchResults) {
        if (Math.abs(date - flixDate) < 2629746 * 1000) {
            return result.id; // TMDB ID
        }
    }
}
```

### Key Features:
- **Fuzzy date matching**: Allows 1-month tolerance for release date differences
- **Automatic retry**: Failed mappings are retried up to 10 times
- **Error tracking**: Separate error logs for debugging

## 📊 Data Statistics

Current mappings (as of your data):
- **FlixHQ Movies**: ~42,590 mappings
- **FlixHQ TV Shows**: Thousands of mappings
- **Success Rate**: High (most entries successfully mapped)

## 🎬 Integration with Your Expo App

Here's how to use this in your app:

```javascript
// 1. Get movie details from TMDB
const tmdbId = 550; // Fight Club
const tmdbData = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}`);

// 2. Get FlixHQ ID from your mapper API
const mapping = await fetch(`https://your-mapper.vercel.app/api/tmdb/movie/${tmdbId}`);
const flixhqId = mapping.flixhqId;

// 3. Get streaming source from FlixHQ
const streamingSource = await getFlixHQSource(flixhqId);

// 4. Play the HLS stream
<Video source={{ uri: streamingSource.hlsUrl }} />
```

## 🔄 Update Frequency

The mapper updates automatically:
- **Provider scraping**: Every 1 hour
- **TMDB data refresh**: Every 1 week
- **Incremental updates**: Only new content is processed

## ⚠️ Important Notes

1. **Rate Limiting**: TMDB API has rate limits (40 requests/10 seconds)
2. **Scraping Ethics**: Respect provider websites' robots.txt
3. **Data Freshness**: Mappings are cached; new content takes time to appear
4. **Error Handling**: Some content may not map (different titles, release dates)

## 🛠️ Customization

### Adding a New Provider

1. Create `providers/newprovider.js`:
```javascript
export class NewProvider {
    static name = "newprovider";
    static requiresPopulatingReleased = true;
    
    static async mapReq(info, movie) {
        // Your mapping logic
    }
    
    static async fetchAndStore(pageNum, movie) {
        // Your scraping logic
    }
}
```

2. Update `main.js`:
```javascript
setInterval(() => {
    server.ini("newprovider");
}, 60 * 60 * 1000);
```

## 📝 License

This is a utility tool for personal use. Respect TMDB's API terms and provider websites' terms of service.

## 🤝 Contributing

This is a mapping service - contributions welcome for:
- New provider integrations
- Improved matching algorithms
- Better error handling
- Performance optimizations

## 🐛 Troubleshooting

**Issue**: Mappings not found
- Check if the content exists on both TMDB and the provider
- Verify release dates match (within tolerance)
- Check error logs in `data/{provider}/error.json`

**Issue**: API rate limits
- Implement request queuing
- Add delays between requests
- Use caching aggressively

**Issue**: Outdated mappings
- Run the update process manually
- Check TMDB API key validity
- Verify provider website structure hasn't changed

---

**Next Steps**: See `API.md` for deploying this as a Vercel API service.
