# Deploying TMDB Mapper to Vercel

This guide will walk you through deploying your TMDB-to-FlixHQ/Fmovies mapper as a serverless API on Vercel.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   ```
3. **Git**: Your project should be in a Git repository (optional but recommended)

## 🚀 Deployment Steps

### Method 1: Deploy via Vercel CLI (Recommended)

1. **Navigate to your project**:
   ```bash
   cd c:\Users\Mario\Downloads\tmdb
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - Project name? `tmdb-mapper` (or your choice)
   - Directory? `./` (current directory)
   - Override settings? **N**

4. **Deploy to production**:
   ```bash
   vercel --prod
   ```

### Method 2: Deploy via GitHub

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/tmdb-mapper.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your repository
   - Click "Deploy"

## 🔧 Configuration

### Environment Variables (Optional)

If you plan to add update functionality later, add your TMDB API key:

1. In Vercel Dashboard:
   - Go to your project
   - Settings → Environment Variables
   - Add: `KEY` = `your_tmdb_api_key`

2. Via CLI:
   ```bash
   vercel env add KEY
   ```

## 📡 Testing Your Deployment

Once deployed, Vercel will give you a URL like: `https://tmdb-mapper.vercel.app`

Test the endpoints:

### 1. Check API Info
```bash
curl https://tmdb-mapper.vercel.app/api
```

### 2. Get TMDB ID from FlixHQ ID
```bash
curl https://tmdb-mapper.vercel.app/api/flixhq/movie/1
```

Expected response:
```json
{
  "provider": "flixhq",
  "type": "movie",
  "providerId": "1",
  "tmdbId": 548915
}
```

### 3. Reverse Lookup (TMDB → FlixHQ)
```bash
curl "https://tmdb-mapper.vercel.app/api/tmdb/movie/548915?provider=flixhq"
```

### 4. Batch Lookup
```bash
curl -X POST https://tmdb-mapper.vercel.app/api/batch \
  -H "Content-Type: application/json" \
  -d '{"provider":"flixhq","type":"movie","ids":[1,4,5]}'
```

### 5. Get Statistics
```bash
curl https://tmdb-mapper.vercel.app/api/stats
```

## 📱 Using in Your Expo App

### Install Dependencies
```bash
npm install axios
# or
npm install fetch
```

### Create API Client

Create `services/mapperApi.js`:

```javascript
const MAPPER_API = 'https://tmdb-mapper.vercel.app/api';

export const mapperApi = {
  // Get TMDB ID from FlixHQ ID
  async getFlixHQToTMDB(flixhqId, type = 'movie') {
    try {
      const response = await fetch(`${MAPPER_API}/flixhq/${type}/${flixhqId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.tmdbId;
    } catch (error) {
      console.error('Mapper API error:', error);
      return null;
    }
  },

  // Get FlixHQ ID from TMDB ID (reverse)
  async getTMDBToFlixHQ(tmdbId, type = 'movie') {
    try {
      const response = await fetch(`${MAPPER_API}/tmdb/${type}/${tmdbId}?provider=flixhq`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.providerId;
    } catch (error) {
      console.error('Mapper API error:', error);
      return null;
    }
  },

  // Batch lookup
  async batchLookup(ids, type = 'movie', provider = 'flixhq', reverse = false) {
    try {
      const response = await fetch(`${MAPPER_API}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, type, ids, reverse })
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error('Mapper API error:', error);
      return null;
    }
  }
};
```

### Example Usage in Your App

```javascript
import { mapperApi } from './services/mapperApi';

// Scenario 1: You have TMDB data, need FlixHQ source
async function playMovie(tmdbId) {
  // 1. Get FlixHQ ID from TMDB ID
  const flixhqId = await mapperApi.getTMDBToFlixHQ(tmdbId, 'movie');
  
  if (!flixhqId) {
    console.log('Movie not available on FlixHQ');
    return;
  }
  
  // 2. Get streaming source from FlixHQ API
  const streamingSource = await getFlixHQStreamingSource(flixhqId);
  
  // 3. Play the video
  navigation.navigate('Player', { 
    source: streamingSource.hlsUrl,
    subtitles: streamingSource.subtitles 
  });
}

// Scenario 2: You have FlixHQ ID, need TMDB data
async function showMovieDetails(flixhqId) {
  // 1. Get TMDB ID from FlixHQ ID
  const tmdbId = await mapperApi.getFlixHQToTMDB(flixhqId, 'movie');
  
  if (!tmdbId) {
    console.log('Could not find TMDB data');
    return;
  }
  
  // 2. Fetch TMDB details
  const tmdbData = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}`
  ).then(r => r.json());
  
  // 3. Show details
  navigation.navigate('MovieDetail', { movie: tmdbData });
}

// Scenario 3: Batch lookup for a list
async function loadMovieList(tmdbIds) {
  // Get all FlixHQ IDs at once
  const mappings = await mapperApi.batchLookup(tmdbIds, 'movie', 'flixhq', true);
  
  // Filter only available movies
  const availableMovies = tmdbIds.filter(id => mappings[id] !== null);
  
  console.log(`${availableMovies.length}/${tmdbIds.length} movies available on FlixHQ`);
  return availableMovies;
}
```

## 🔄 Updating the Mappings

The current deployment serves static mapping data. To keep mappings updated:

### Option 1: Manual Updates

1. Run the scraper locally:
   ```bash
   node main.js
   ```

2. Wait for it to complete (may take hours)

3. Redeploy:
   ```bash
   vercel --prod
   ```

### Option 2: Scheduled Updates (Advanced)

Create a separate service (e.g., on Railway, Render, or a VPS) that:
- Runs the scraper on a schedule
- Commits updated JSON files to GitHub
- Triggers Vercel redeployment via webhook

Example GitHub Action (`.github/workflows/update.yml`):
```yaml
name: Update Mappings
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: node main.js
        env:
          KEY: ${{ secrets.TMDB_API_KEY }}
      - run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add data/
          git commit -m "Update mappings"
          git push
```

## 🎯 Performance Optimization

### 1. Enable Caching

Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=3600, stale-while-revalidate"
        }
      ]
    }
  ]
}
```

### 2. Use Edge Functions (Faster)

Rename `api/index.js` to `api/index.ts` and add:
```typescript
export const config = {
  runtime: 'edge',
};
```

### 3. Implement Rate Limiting

Add to your API handler:
```javascript
const rateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 100) {
    return false; // Rate limit exceeded
  }
  
  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);
  return true;
}
```

## 🐛 Troubleshooting

### Issue: "Module not found" errors
**Solution**: Ensure all dependencies are in `package.json`:
```bash
npm install lowdb jsdom node-fetch dotenv express
```

### Issue: Large deployment size
**Solution**: Add `.vercelignore`:
```
node_modules
.git
out.txt
pages/
tmdb/
*.log
```

### Issue: Timeout errors
**Solution**: Vercel serverless functions have a 10s timeout on Hobby plan. Optimize:
- Cache database reads in memory
- Use Edge Functions for faster cold starts
- Upgrade to Pro plan for 60s timeout

### Issue: 404 on all routes
**Solution**: Check `vercel.json` routing configuration is correct

## 📊 Monitoring

### Vercel Dashboard
- View logs: Project → Deployments → Click deployment → Logs
- Monitor usage: Project → Analytics
- Check errors: Project → Logs

### Add Custom Logging
```javascript
console.log('[API]', {
  endpoint: pathname,
  method: req.method,
  timestamp: new Date().toISOString()
});
```

## 💰 Pricing

**Vercel Hobby (Free)**:
- 100GB bandwidth/month
- Serverless function execution
- Perfect for personal projects

**Vercel Pro ($20/month)**:
- 1TB bandwidth
- 60s function timeout
- Better for production apps

## 🔒 Security

### 1. Add API Key Authentication (Optional)
```javascript
const API_KEY = process.env.API_KEY;

if (req.headers['x-api-key'] !== API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 2. Restrict CORS (Optional)
```javascript
const allowedOrigins = ['https://yourapp.com'];
const origin = req.headers.origin;

if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

## ✅ Post-Deployment Checklist

- [ ] API responds at root endpoint (`/api`)
- [ ] Forward lookup works (`/api/flixhq/movie/1`)
- [ ] Reverse lookup works (`/api/tmdb/movie/548915`)
- [ ] Batch endpoint works
- [ ] Stats endpoint works
- [ ] CORS is enabled for your app domain
- [ ] Error handling returns proper status codes
- [ ] Logs are accessible in Vercel dashboard

## 🎉 You're Done!

Your TMDB mapper is now live and ready to use in your Expo app!

**Next Steps**:
1. Update your Expo app to use the mapper API
2. Test with real TMDB IDs from your app
3. Monitor usage in Vercel dashboard
4. Set up automated updates (optional)

---

**Need Help?** Check the [Vercel Documentation](https://vercel.com/docs) or open an issue on GitHub.
