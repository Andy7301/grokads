# Troubleshooting X API 401 Unauthorized Error

If you're seeing a 401 Unauthorized error, follow these steps:

## Step 1: Verify Your Bearer Token

1. Go to [X Developer Portal](https://developer.twitter.com/)
2. Navigate to your Project → App → "Keys and tokens"
3. Under "Bearer Token", check if you have one
4. If you don't have one, click "Generate" to create a new Bearer Token
5. **Important**: Copy the token immediately - it's only shown once!

## Step 2: Check Token Format

Your Bearer Token should:
- Start with `AAAAA...` (usually)
- Be a long string of characters
- NOT be your API Key or API Secret
- Be specifically labeled as "Bearer Token"

## Step 3: Set the Token Correctly

### For Local Development (Emulators):

```bash
# Make sure you're in the backend directory
cd backend

# Set the token (replace with your actual token)
export X_API_BEARER_TOKEN="AAAAA-your-actual-bearer-token-here"

# Verify it's set
echo $X_API_BEARER_TOKEN

# Then start emulators
firebase emulators:start
```

**Important**: You must export the variable in the SAME terminal session where you run `firebase emulators:start`

### For Production:

```bash
cd backend

# Set the secret
firebase functions:secrets:set X_API_BEARER_TOKEN

# When prompted, paste your Bearer Token
# Verify it was set
firebase functions:secrets:get X_API_BEARER_TOKEN
```

## Step 4: Common Issues

### Issue: Token was regenerated
- **Problem**: If you regenerated your Bearer Token, the old one is invalid
- **Solution**: Use the new token

### Issue: Token not exported in same session
- **Problem**: Environment variables don't persist across terminal sessions
- **Solution**: Export the variable in the same terminal where you start emulators

### Issue: Using wrong token type
- **Problem**: Using API Key or API Secret instead of Bearer Token
- **Solution**: Make sure you're using the "Bearer Token" specifically

### Issue: Developer account not approved
- **Problem**: Your developer account might not be fully approved
- **Solution**: Check your developer portal status

## Step 5: Test Your Token

You can test your Bearer Token directly with curl:

```bash
curl 'https://api.x.com/2/trends/by/woeid/1' \
  --header 'Authorization: Bearer YOUR_BEARER_TOKEN_HERE'
```

If this returns 401, your token is invalid. If it returns 200 with data, your token works.

## Step 6: Check Function Logs

If using emulators, check the Firebase emulator logs for more details about the error.

## Still Having Issues?

1. Double-check you're using the Bearer Token (not API Key/Secret)
2. Make sure the token is exported before starting emulators
3. Try regenerating the Bearer Token in the developer portal
4. Verify your developer account is active and approved
5. Check that you have access to the v2 trends endpoint

