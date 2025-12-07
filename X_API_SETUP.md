# X (Twitter) API Setup Guide

This guide explains how to set up X API credentials to fetch real trending topics.

## Getting X API Credentials

### Step 1: Create a Developer Account

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Sign in with your X (Twitter) account
3. Apply for a developer account if you don't have one
4. Create a new project/app in the developer portal

### Step 2: Get Your Bearer Token

1. In your Twitter Developer Portal, go to your app
2. Navigate to "Keys and tokens" tab
3. Under "Bearer Token", click "Generate" or copy your existing Bearer Token
4. **Important**: Save this token securely - you'll need it for the function

### Step 3: API Access Levels

X API has different access levels:
- **Free/Basic**: Limited access, may not include trends endpoint
- **Elevated**: Access to trends endpoint (may require application)
- **Academic Research**: Full access (requires application)

**Note**: The trends endpoint (`/1.1/trends/place.json`) typically requires **Elevated** access or higher.

### Step 4: Set Up the Bearer Token

#### For Local Development (Emulators):

```bash
cd backend
export X_API_BEARER_TOKEN="your-bearer-token-here"
firebase emulators:start
```

#### For Production:

```bash
cd backend
firebase functions:secrets:set X_API_BEARER_TOKEN
# Paste your bearer token when prompted
```

## Using the Trends Function

The `get_trends` function uses **X API v2** endpoint: `https://api.x.com/2/trends/by/woeid/{woeid}`

The function is available at:
- **Local**: `http://localhost:5001/grokads-47abba/us-central1/get_trends`
- **Production**: Your deployed function URL

### Optional Parameters

You can specify a WOEID (Where On Earth ID) to get trends for a specific location:

- `1` = Worldwide (default)
- `23424977` = United States
- `23424975` = United Kingdom
- `23424748` = Canada
- `26062` = Example from docs (Europe/UK region)
- Find more at: https://www.woeidlookup.com/

Example:
```
GET /get_trends?woeid=23424977  # US trends
GET /get_trends?woeid=1         # Worldwide trends (default)
```

### Response Format

The function returns trends in this format:
```json
{
  "trends": [
    {
      "id": 1,
      "title": "Trend Name",
      "category": "trending",
      "change": 25,
      "description": "Trending on X with 50,000 tweets",
      "tweet_volume": 50000
    }
  ]
}
```

## Alternative: Using Grok API for Trends

If you don't have X API access, you could also use Grok API to analyze and generate trend insights:

1. Use the existing `generate_ad` function
2. Send a prompt like: "What are the current trending topics in advertising and marketing?"
3. Parse the response to extract trends

## Troubleshooting

### Error: "X API Bearer token not configured"
- Make sure you've set the `X_API_BEARER_TOKEN` environment variable
- For emulators, export it before starting
- For production, use `firebase functions:secrets:set`

### Error: "403 Forbidden" or "401 Unauthorized"
- Check that your Bearer Token is correct
- Verify your API access level includes the v2 trends endpoint
- Make sure you have an approved developer account
- The v2 trends endpoint requires app authentication (Bearer token)

### Error: "Rate limit exceeded"
- X API has rate limits based on your access level
- Consider caching trends data
- Implement retry logic with exponential backoff

## Rate Limits

The trends endpoint has a rate limit of **75 requests per 15-minute window** per app.

- Check your specific limits in the X Developer Portal
- Consider caching trends data to reduce API calls
- Implement rate limiting in your application if needed

## Security Notes

- **Never commit** your Bearer Token to git
- Use Firebase Secrets for production
- Rotate tokens if they're exposed
- Monitor API usage in the Developer Portal

