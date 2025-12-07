# API Reference Guide

This document references the official API documentation for X API and xAI (Grok) API used in this project.

## Official Documentation Links

- **X API (Twitter)**: https://docs.x.com/overview
- **xAI (Grok) API**: https://docs.x.ai/docs/overview

## X API Implementation

### Trends Endpoint
- **Endpoint**: `GET https://api.x.com/2/trends/by/woeid/{woeid}`
- **Authentication**: Bearer Token (App-only auth)
- **Rate Limit**: 75 requests per 15-minute window
- **Documentation**: https://developer.x.com/en/docs/x-api/tweets/trends/api-reference/get-trends-by-woeid

**Current Implementation**:
- ✅ Using correct endpoint: `https://api.x.com/2/trends/by/woeid/{woeid}`
- ✅ Using Bearer Token authentication
- ✅ Supporting WOEID parameter for location-based trends
- ✅ Proper error handling for 401 Unauthorized

**Common WOEIDs**:
- `1` - Worldwide
- `23424977` - United States
- `23424975` - United Kingdom
- `23424775` - Canada
- `23424748` - Australia
- `23424829` - Germany
- `23424819` - France
- `23424856` - Japan
- `23424848` - India
- `23424768` - Brazil

## xAI (Grok) API Implementation

### Chat Completions
- **Endpoint**: `POST https://api.x.ai/v1/chat/completions`
- **Base URL**: `https://api.x.ai/v1` (compatible with OpenAI SDK)
- **Authentication**: Bearer Token
- **Documentation**: https://docs.x.ai/docs/overview

**Current Implementation**:
- ✅ Using correct endpoint: `https://api.x.ai/v1/chat/completions`
- ✅ Using Bearer Token authentication
- ✅ Model: `grok-2-1212` (check docs for latest model)
- ✅ Proper message format with role and content

**Available Models** (as of 2024):
- `grok-2-1212` - Current model in use
- `grok-beta` - Beta model (may have newer features)
- Check https://docs.x.ai/docs/overview for latest models

**Request Format**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Your prompt here"
    }
  ],
  "model": "grok-2-1212",
  "temperature": 0.8,
  "max_tokens": 1000
}
```

### Image Generation
- **Endpoint**: `POST https://api.x.ai/v1/images/generations`
- **Documentation**: https://docs.x.ai/docs/overview

**Current Implementation**:
- ✅ Using correct endpoint: `https://api.x.ai/v1/images/generations`
- ✅ Model: `grok-imagine-v0p9` (check docs for latest)
- ✅ Supporting quality parameter: `low`, `medium`, `high`
- ✅ Supporting `n` parameter (1-10 images)
- ✅ Supporting `response_format`: `url` or `b64_json`

**Request Format**:
```json
{
  "prompt": "Your image description",
  "model": "grok-imagine-v0p9",
  "quality": "medium",
  "n": 1,
  "response_format": "url"
}
```

**Response Format**:
```json
{
  "data": [
    {
      "url": "https://imgen.x.ai/xai-images/...",
      "revised_prompt": "Enhanced prompt used for generation"
    }
  ]
}
```

## API Key Setup

### Environment Variables
- `GROK_API_KEY` - xAI API key from https://console.x.ai/
- `X_API_BEARER_TOKEN` - X API Bearer Token from https://developer.x.com/

### Local Development
Store keys in `backend/.env`:
```
GROK_API_KEY=xai-your-key-here
X_API_BEARER_TOKEN=your-bearer-token-here
```

### Production
Use Firebase Secrets:
```bash
firebase functions:secrets:set GROK_API_KEY
firebase functions:secrets:set X_API_BEARER_TOKEN
```

## Rate Limits & Best Practices

### X API
- **Trends**: 75 requests per 15-minute window
- Use caching when possible
- Implement exponential backoff for retries

### xAI API
- **Public Beta**: $25 free API credits per month (until end of 2024)
- Monitor usage in https://console.x.ai/
- Use appropriate model for task (faster models for simple tasks)

## Error Handling

### Common Errors

**401 Unauthorized (X API)**:
- Verify Bearer Token is correct
- Check token hasn't been regenerated
- Ensure developer account is approved

**401 Unauthorized (xAI)**:
- Verify API key is correct
- Check key hasn't been revoked
- Ensure account has active credits

**429 Rate Limit**:
- Implement exponential backoff
- Reduce request frequency
- Consider caching responses

## SDK Compatibility

The xAI API is compatible with OpenAI SDKs. You can use:
- OpenAI Python SDK (with base URL override)
- OpenAI JavaScript SDK (with base URL override)
- Direct HTTP requests (current implementation)

Example with OpenAI SDK:
```python
from openai import OpenAI

client = OpenAI(
    api_key="your-grok-api-key",
    base_url="https://api.x.ai/v1"
)
```

## Updates & Maintenance

- Check https://docs.x.ai/docs/overview regularly for model updates
- Check https://docs.x.com/overview for X API changes
- Monitor API status: https://status.x.com/ and https://status.x.ai/

## Resources

- **X Developer Portal**: https://developer.x.com/
- **xAI Console**: https://console.x.ai/
- **X API Status**: https://status.x.com/
- **xAI API Status**: https://status.x.ai/
- **X API Forums**: https://twittercommunity.com/c/developers/6
- **xAI Support**: Check console.x.ai for support options

