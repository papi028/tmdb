# Quick Start Guide

Get your TMDB mapper API up and running in 5 minutes!

## 🚀 TL;DR

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to project
cd c:\Users\Mario\Downloads\tmdb

# 3. Deploy
vercel --prod

# 4. Test
curl https://your-url.vercel.app/api/flixhq/movie/1

# 5. Use in your Expo app
# Copy examples/expo-integration.js to your app
# Update MAPPER_API_URL with your Vercel URL
```

## 📖 What This Project Does

**In Simple Terms:**
- You have TMDB movie data (titles, posters, descriptions)
- You want FlixHQ streaming sources (HLS video URLs)
- But TMDB ID ≠ FlixHQ ID (they use different numbering)
- This API maps between them: `TMDB ID 548915 ↔ FlixHQ ID 1`

**Example Flow:**
```
Your App (TMDB ID 550)
    ↓
Mapper API (550 → FlixHQ ID 1143)
    ↓
FlixHQ API (Get HLS source for ID 1143)
    ↓
Video Player (Play the movie!)
```

## 🎯 Step-by-Step Setup

### Step 1: Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# Deploy to production
vercel --prod
```

You'll get a URL like: `https://tmdb-mapper-abc123.vercel.app`

### Step 2: Test the API

```bash
# Replace with your actual Vercel URL
export API_URL="https://your-url.vercel.app"

# Test 1: Get API info
curl $API_URL/api

# Test 2: Convert FlixHQ ID → TMDB ID
curl $API_URL/api/flixhq/movie/1

# Test 3: Convert TMDB ID → FlixHQ ID
curl "$API_URL/api/tmdb/movie/548915?provider=flixhq"

# Test 4: Get statistics
curl $API_URL/api/stats
```

### Step 3: Integrate with Your Expo App

1. **Copy the integration file:**
   ```bash
   cp examples/expo-integration.js your-expo-app/services/mapperApi.js
   ```

2. **Update the API URL:**
   ```javascript
   // In mapperApi.js
   const MAPPER_API_URL = 'https://your-url.vercel.app/api';
   ```

3. **Use in your app:**
   ```javascript
   import { mapperApi } from './services/mapperApi';

   // Get FlixHQ ID from TMDB ID
   const flixhqId = await mapperApi.getTMDBToFlixHQ(550, 'movie');
   console.log(flixhqId); // "1143"
   ```

## 🎬 Real-World Example

Here's a complete flow for playing a movie:

```javascript
// MovieDetailScreen.jsx
import { mapperApi } from '../services/mapperApi';
import { getFlixHQStreamingSource } from '../services/flixhq';

async function handlePlayMovie(tmdbMovie) {
  try {
    // 1. Get FlixHQ ID from TMDB ID
    const flixhqId = await mapperApi.getTMDBToFlixHQ(
      tmdbMovie.id, 
      'movie'
    );

    if (!flixhqId) {
      Alert.alert('Not Available', 'This movie is not available for streaming');
      return;
    }

    // 2. Get streaming source from FlixHQ
    const source = await getFlixHQStreamingSource(flixhqId);

    // 3. Navigate to player
    navigation.navigate('Player', {
      title: tmdbMovie.title,
      source: source.hlsUrl,
      subtitles: source.subtitles
    });
  } catch (error) {
    console.error('Error playing movie:', error);
    Alert.alert('Error', 'Could not load movie');
  }
}
```

## 📊 Available Endpoints

| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /api` | API documentation | - |
| `GET /api/stats` | Mapping statistics | - |
| `GET /api/flixhq/movie/:id` | FlixHQ → TMDB (movie) | `/api/flixhq/movie/1` |
| `GET /api/flixhq/tv/:id` | FlixHQ → TMDB (TV) | `/api/flixhq/tv/100` |
| `GET /api/tmdb/movie/:id` | TMDB → FlixHQ (movie) | `/api/tmdb/movie/550` |
| `GET /api/tmdb/tv/:id` | TMDB → FlixHQ (TV) | `/api/tmdb/tv/1399` |
| `POST /api/batch` | Batch lookup | See below |

### Batch Lookup Example

```javascript
// Convert multiple TMDB IDs to FlixHQ IDs at once
const response = await fetch('https://your-url.vercel.app/api/batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'flixhq',
    type: 'movie',
    ids: [550, 551, 552],  // TMDB IDs
    reverse: true           // TMDB → FlixHQ
  })
});

const data = await response.json();
console.log(data.results);
// { "550": "1143", "551": "1144", "552": null }
```

## 🔍 Understanding the Data

### Mapping Files

The API uses these JSON files:

```
data/
├── flixhq/
│   ├── moviesmap.json    # { "1": 548915, "4": 505031, ... }
│   └── tvmap.json        # { "100": 1399, "101": 1402, ... }
└── fmovies/
    ├── moviesmap.json
    └── tvmap.json
```

**Format:** `{ "provider_id": tmdb_id }`

**Example:**
```json
{
  "1": 548915,     // FlixHQ ID 1 maps to TMDB ID 548915
  "4": 505031,
  "5": 28967
}
```

### Checking Mappings Locally

```bash
# See how many movies are mapped
cat data/flixhq/moviesmap.json | grep -o ":" | wc -l

# Find TMDB ID for FlixHQ ID 1
cat data/flixhq/moviesmap.json | grep '"1"'

# Find FlixHQ ID for TMDB ID 548915
cat data/flixhq/moviesmap.json | grep '548915'
```

## ⚡ Performance Tips

### 1. Cache Results in Your App

```javascript
// Simple in-memory cache
const mappingCache = new Map();

async function getCachedMapping(tmdbId, type) {
  const key = `${type}-${tmdbId}`;
  
  if (mappingCache.has(key)) {
    return mappingCache.get(key);
  }
  
  const flixhqId = await mapperApi.getTMDBToFlixHQ(tmdbId, type);
  mappingCache.set(key, flixhqId);
  
  return flixhqId;
}
```

### 2. Use Batch Lookups

Instead of:
```javascript
// ❌ Slow - 10 separate requests
for (const movie of movies) {
  movie.flixhqId = await mapperApi.getTMDBToFlixHQ(movie.id, 'movie');
}
```

Do this:
```javascript
// ✅ Fast - 1 request
const tmdbIds = movies.map(m => m.id);
const mappings = await mapperApi.batchLookup(tmdbIds, 'movie', 'flixhq', true);

movies.forEach(movie => {
  movie.flixhqId = mappings[movie.id];
});
```

### 3. Preload Availability

```javascript
// Check availability when loading movie list
useEffect(() => {
  const checkAvailability = async () => {
    const ids = movies.map(m => m.id);
    const mappings = await mapperApi.batchLookup(ids, 'movie', 'flixhq', true);
    
    setAvailableMovies(
      movies.filter(m => mappings[m.id] !== null)
    );
  };
  
  checkAvailability();
}, [movies]);
```

## 🐛 Common Issues

### Issue: "Mapping not found"

**Cause:** The movie/show isn't in the database yet.

**Solutions:**
1. Check if it exists on FlixHQ website
2. Wait for next mapping update
3. Try alternative provider (Fmovies)

### Issue: API is slow

**Causes:**
- Cold start (first request after inactivity)
- Large mapping files

**Solutions:**
- Use batch endpoints
- Implement caching in your app
- Consider upgrading Vercel plan

### Issue: CORS errors

**Cause:** Your app domain isn't allowed.

**Solution:** The API already has CORS enabled (`Access-Control-Allow-Origin: *`). If you still have issues, check your request headers.

## 📱 Next Steps

1. ✅ Deploy to Vercel
2. ✅ Test endpoints
3. ✅ Integrate with Expo app
4. 🔄 Set up FlixHQ API integration
5. 🎬 Build your video player
6. 🚀 Launch your app!

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **TMDB API**: https://developers.themoviedb.org/3
- **FlixHQ API**: (You'll need to find/build this separately)

## 💡 Pro Tips

1. **Monitor Usage**: Check Vercel dashboard for API usage
2. **Error Tracking**: Add Sentry or similar for production
3. **Rate Limiting**: Implement if you expect high traffic
4. **Caching**: Use React Query or SWR in your Expo app
5. **Fallbacks**: Have a backup plan if mapping fails

## 🎉 You're Ready!

Your mapper API is now live and ready to bridge TMDB and FlixHQ in your Expo app!

**Questions?** Check the full documentation:
- `README.md` - Complete project overview
- `DEPLOYMENT.md` - Detailed deployment guide
- `examples/expo-integration.js` - Integration examples

---

**Happy Coding! 🚀**
