from firebase_functions import https_fn
from firebase_functions.options import CorsOptions, set_global_options
from firebase_admin import initialize_app
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# For cost control, you can set the maximum number of containers that can be
# running at the same time. This helps mitigate the impact of unexpected
# traffic spikes by instead downgrading performance. This limit is a per-function
# limit. You can override the limit for each function using the max_instances
# parameter in the decorator, e.g. @https_fn.on_request(max_instances=5).
set_global_options(max_instances=10)

initialize_app()


@https_fn.on_request(
    cors=CorsOptions(
        cors_origins=["http://localhost:3000", "https://*.web.app", "https://*.firebaseapp.com"],
        cors_methods=["GET", "POST"]
    )
)

def generate_ad(req: https_fn.Request) -> https_fn.Response:
    """Generate an ad using LLM based on user prompt"""
    
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204)
    
    if req.method != "POST":
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers={"Content-Type": "application/json"}
        )
    
    try:
        data = req.get_json(silent=True)
        if not data or "prompt" not in data:
            return https_fn.Response(
                json.dumps({"error": "Missing 'prompt' in request body"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        user_prompt = data["prompt"]
        
        # Get API key from environment variable
        # Set this with: firebase functions:secrets:set GROK_API_KEY
        api_key = os.getenv("GROK_API_KEY")
        
        if not api_key:
            # Fallback: try to get from Firebase config (legacy method)
            try:
                from firebase_functions import config
                api_key = config().grok.key if hasattr(config(), 'grok') else None
            except:
                pass
        
        if not api_key:
            return https_fn.Response(
                json.dumps({"error": "Grok API key not configured. Please set GROK_API_KEY environment variable."}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        # Create the prompt for the LLM
        system_prompt = """You are an expert advertising copywriter. Create compelling, engaging ad copy based on the user's description. 
        Make it concise, persuasive, and tailored to the target audience. Include a catchy headline and compelling body text."""
        
        # Call Grok API (xAI) - compatible with OpenAI API format
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "grok-4",  # Grok model name
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }
        
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code != 200:
            return https_fn.Response(
                json.dumps({"error": f"Grok API error: {response.text}"}),
                status=response.status_code,
                headers={"Content-Type": "application/json"}
            )
        
        result = response.json()
        
        # Parse Grok response (OpenAI-compatible format)
        if "choices" not in result or len(result["choices"]) == 0:
            return https_fn.Response(
                json.dumps({"error": "No response from Grok API"}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        generated_text = result["choices"][0]["message"]["content"]
        
        return https_fn.Response(
            json.dumps({"ad": generated_text}),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )


@https_fn.on_request(
    cors=CorsOptions(
        cors_origins=["http://localhost:3000", "https://*.web.app", "https://*.firebaseapp.com"],
        cors_methods=["GET", "POST"]
    )
)
def get_trends(req: https_fn.Request) -> https_fn.Response:
    """Get trending topics from X (Twitter) API"""
    
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204)
    
    if req.method != "GET":
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers={"Content-Type": "application/json"}
        )
    
    try:
        # Get API credentials from environment variables
        # You need: X_API_BEARER_TOKEN (for v2)
        bearer_token = os.environ.get("X_API_BEARER_TOKEN")
        
        if not bearer_token:
            # Fallback: try to get from Firebase config (legacy method)
            try:
                from firebase_functions import config
                bearer_token = config().x_api.bearer_token if hasattr(config(), 'x_api') else None
            except:
                pass
        
        if not bearer_token:
            return https_fn.Response(
                json.dumps({
                    "error": "X API Bearer token not configured. Please set X_API_BEARER_TOKEN environment variable.",
                    "help": "For local dev: export X_API_BEARER_TOKEN='your-token'. For production: firebase functions:secrets:set X_API_BEARER_TOKEN"
                }),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        # Get WOEID (Where On Earth ID) - 1 is worldwide, or use specific country codes
        # You can get WOEID from: https://www.woeidlookup.com/
        # Common WOEIDs: 1=Worldwide, 23424977=United States, 23424975=United Kingdom
        woeid = req.args.get("woeid", "23424977")  # Default to United States
        
        # X API v2 trends endpoint
        # Documentation: https://developer.x.com/en/docs/x-api/tweets/trends/api-reference/get-trends-by-woeid
        url = f"https://api.x.com/2/trends/by/woeid/{woeid}"
        
        headers = {
            "Authorization": f"Bearer {bearer_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            url,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 401:
            return https_fn.Response(
                json.dumps({
                    "error": "X API authentication failed (401 Unauthorized)",
                    "details": response.text,
                    "troubleshooting": [
                        "1. Verify your Bearer Token is correct in the X Developer Portal",
                        "2. Make sure the token hasn't been regenerated (regenerating invalidates old tokens)",
                        "3. Check that you're using the Bearer Token (not API Key/Secret)",
                        "4. Ensure your developer account is approved and active",
                        "5. For local dev, make sure you exported: export X_API_BEARER_TOKEN='your-token'",
                        "6. For production, verify: firebase functions:secrets:get X_API_BEARER_TOKEN"
                    ]
                }),
                status=401,
                headers={"Content-Type": "application/json"}
            )
        
        if response.status_code != 200:
            return https_fn.Response(
                json.dumps({
                    "error": f"X API error: {response.text}",
                    "status_code": response.status_code,
                    "note": "Make sure you have X API v2 access and a valid Bearer token."
                }),
                status=response.status_code,
                headers={"Content-Type": "application/json"}
            )
        
        trends_data = response.json()
        
        # Parse trends from X API v2 response
        # Response format: {"data": [{"trend_name": "...", "tweet_count": ...}]}
        formatted_trends = []
        
        if trends_data and "data" in trends_data:
            trends_list = trends_data["data"]
            
            for idx, trend in enumerate(trends_list[:20]):  # Limit to top 20
                trend_name = trend.get("trend_name", "")
                tweet_count = trend.get("tweet_count", 0)
                
                # Calculate change percentage based on tweet count
                # Higher tweet counts = higher change percentage
                if tweet_count:
                    change = min(50, max(5, tweet_count // 5000))
                else:
                    change = 10  # Default for trends without tweet count
                
                formatted_trends.append({
                    "id": idx + 1,
                    "title": trend_name,
                    "category": "trending",  # X trends don't have categories
                    "change": change,
                    "description": f"Trending on X with {tweet_count:,} tweets" if tweet_count else "Currently trending on X",
                    "tweet_volume": tweet_count
                })
        
        return https_fn.Response(
            json.dumps({"trends": formatted_trends}),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )