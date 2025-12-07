# API Keys Setup Guide

This guide explains how to set up all the API keys needed for GrokAds.

## Required API Keys

You need two API keys:

1. **GROK_API_KEY** - For generating ads using Grok (xAI)
2. **X_API_BEARER_TOKEN** - For fetching trends from X (Twitter)

## Setting Up API Keys

### Option 1: Local Development (Firebase Emulators)

#### Step 1: Get Your API Keys

**Grok API Key:**
1. Go to [xAI Console](https://console.x.ai/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the key (starts with `xai-...`)

**X API Bearer Token:**
1. Go to [X Developer Portal](https://developer.twitter.com/)
2. Sign in with your X account
3. Go to your Project → App → "Keys and tokens"
4. Under "Bearer Token", generate or copy your token
5. Copy the token (starts with `AAAAA...`)

#### Step 2: Set Environment Variables

**Recommended: Using .env file (Easiest)**

1. Copy the example env file:
```bash
cd backend
cp .env.example .env
```

2. Edit `.env` file and add your actual API keys:
```bash
# Open in your editor
nano .env
# or
code .env
# or
vim .env
```

3. Add your keys:
```
GROK_API_KEY=xai-your-actual-grok-api-key-here
X_API_BEARER_TOKEN=AAAAA-your-actual-bearer-token-here
```

4. Start emulators using the script (automatically loads .env):
```bash
./start-emulators.sh
```

**Alternative: Manual Export (macOS/Linux)**
```bash
cd backend

# Set Grok API Key
export GROK_API_KEY="xai-your-actual-grok-api-key-here"

# Set X API Bearer Token
export X_API_BEARER_TOKEN="AAAAA-your-actual-bearer-token-here"

# Verify they're set
echo $GROK_API_KEY
echo $X_API_BEARER_TOKEN

# Start emulators (in the same terminal session)
firebase emulators:start
```

**For Windows (PowerShell):**
```powershell
cd backend

# Set Grok API Key
$env:GROK_API_KEY="xai-your-actual-grok-api-key-here"

# Set X API Bearer Token
$env:X_API_BEARER_TOKEN="AAAAA-your-actual-bearer-token-here"

# Verify they're set
echo $env:GROK_API_KEY
echo $env:X_API_BEARER_TOKEN

# Start emulators
firebase emulators:start
```

**For Windows (Command Prompt):**
```cmd
cd backend

set GROK_API_KEY=xai-your-actual-grok-api-key-here
set X_API_BEARER_TOKEN=AAAAA-your-actual-bearer-token-here

firebase emulators:start
```

#### Step 3: Using the Provided Startup Script

We've created a `start-emulators.sh` script that automatically loads your `.env` file:

```bash
cd backend
./start-emulators.sh
```

This script will:
1. Load API keys from `.env` file
2. Start Firebase emulators with the keys loaded

**Note**: Make sure you've created `.env` from `.env.example` and added your keys first!

#### Alternative: Manual Startup Script

Create a file `backend/start-emulators.sh` (macOS/Linux) or `backend/start-emulators.bat` (Windows):

**macOS/Linux (`start-emulators.sh`):**
```bash
#!/bin/bash
export GROK_API_KEY="xai-your-actual-grok-api-key-here"
export X_API_BEARER_TOKEN="AAAAA-your-actual-bearer-token-here"
firebase emulators:start
```

Make it executable:
```bash
chmod +x backend/start-emulators.sh
```

Then run:
```bash
./backend/start-emulators.sh
```

**Windows (`start-emulators.bat`):**
```batch
@echo off
set GROK_API_KEY=xai-your-actual-grok-api-key-here
set X_API_BEARER_TOKEN=AAAAA-your-actual-bearer-token-here
firebase emulators:start
```

### Option 2: Production (Firebase Functions)

#### Step 1: Set Secrets in Firebase

```bash
cd backend

# Set Grok API Key
firebase functions:secrets:set GROK_API_KEY
# When prompted, paste your Grok API key and press Enter

# Set X API Bearer Token
firebase functions:secrets:set X_API_BEARER_TOKEN
# When prompted, paste your X API Bearer Token and press Enter

# Verify they're set
firebase functions:secrets:get GROK_API_KEY
firebase functions:secrets:get X_API_BEARER_TOKEN
```

#### Step 2: Deploy Functions

```bash
firebase deploy --only functions
```

The functions will automatically use the secrets you set.

## Quick Setup Script

You can also create a simple script to set both keys at once:

**macOS/Linux (`backend/set-keys.sh`):**
```bash
#!/bin/bash
echo "Setting API keys..."
export GROK_API_KEY="xai-your-actual-grok-api-key-here"
export X_API_BEARER_TOKEN="AAAAA-your-actual-bearer-token-here"
echo "✅ API keys set!"
echo "Now run: firebase emulators:start"
```

**Windows (`backend/set-keys.bat`):**
```batch
@echo off
echo Setting API keys...
set GROK_API_KEY=xai-your-actual-grok-api-key-here
set X_API_BEARER_TOKEN=AAAAA-your-actual-bearer-token-here
echo ✅ API keys set!
echo Now run: firebase emulators:start
```

## Troubleshooting

### Keys Not Working in Emulators

**Problem**: Keys are set but functions still show "API key not configured"

**Solution**: 
- Make sure you exported the keys in the **same terminal session** where you run `firebase emulators:start`
- Environment variables don't persist across terminal sessions
- Restart the emulators after setting keys

### Verify Keys Are Set

```bash
# Check if keys are set
echo $GROK_API_KEY        # macOS/Linux
echo $X_API_BEARER_TOKEN  # macOS/Linux

# Or
echo %GROK_API_KEY%        # Windows CMD
echo %X_API_BEARER_TOKEN%  # Windows CMD
```

If nothing is printed, the keys aren't set.

### Keys Work in Terminal but Not in Functions

**Problem**: Keys are set in terminal but functions can't access them

**Solution**:
- Make sure you're using `export` (macOS/Linux) or `set` (Windows)
- Restart the emulators after setting keys
- Check that you're in the `backend` directory when setting keys

## Security Best Practices

1. **Never commit API keys to git** - They're already in `.gitignore`
2. **Use Firebase Secrets for production** - Never hardcode keys
3. **Rotate keys if exposed** - Regenerate them in the respective portals
4. **Use different keys for dev/prod** - Keep environments separate
5. **Don't share keys** - Each developer should have their own

## Testing Your Keys

### Test Grok API Key:
```bash
curl https://api.x.ai/v1/models \
  -H "Authorization: Bearer $GROK_API_KEY"
```

### Test X API Bearer Token:
```bash
curl 'https://api.x.com/2/trends/by/woeid/1' \
  -H "Authorization: Bearer $X_API_BEARER_TOKEN"
```

If both return data (not 401/403), your keys are valid!

