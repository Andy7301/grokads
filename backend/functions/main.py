from firebase_functions import https_fn
from firebase_functions.options import CorsOptions, set_global_options
from firebase_admin import initialize_app
import requests
import json
import os
import time
import base64
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, AsyncOpenAI

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded .env file from {env_path}")
else:
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
    ),
    timeout_sec=300  # 5 minutes timeout
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
        
        # Get OpenAI API key from environment variable
        # Set this with: firebase functions:secrets:set OPENAI_API_KEY
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not openai_api_key:
            # Fallback: try to get from Firebase config (legacy method)
            try:
                from firebase_functions import config
                openai_api_key = config().openai.key if hasattr(config(), 'openai') else None
            except:
                pass
        
        if not openai_api_key:
            return https_fn.Response(
                json.dumps({"error": "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        # Initialize OpenAI client (async for polling)
        async_client = AsyncOpenAI(api_key=openai_api_key)
        sync_client = OpenAI(api_key=openai_api_key)
        
        # Async function to create and poll video with progress logging
        async def create_and_poll_video():
            print(f"Starting video generation with prompt: {user_prompt}")
            
            # Create video
            video = await async_client.videos.create(
                model="sora-2",
                prompt=user_prompt,
                seconds='4',
            )
            
            print(f"Video creation started. Video ID: {video.id if hasattr(video, 'id') else 'N/A'}")
            print(f"Initial status: {video.status if hasattr(video, 'status') else 'N/A'}")
            
            # Poll for completion with progress logging
            bar_length = 30
            
            while video.status in ("in_progress", "queued"):
                # Get progress if available
                progress = getattr(video, "progress", 0)
                
                # Create progress bar
                filled_length = int((progress / 100) * bar_length) if progress > 0 else 0
                bar = "=" * filled_length + "-" * (bar_length - filled_length)
                status_text = "Queued" if video.status == "queued" else "Processing"
                
                # Log progress
                if progress > 0:
                    print(f"{status_text}: [{bar}] {progress:.1f}%")
                else:
                    print(f"{status_text}: [{bar}] Status: {video.status}")
                
                # Wait before next poll
                await asyncio.sleep(2)
                
                # Refresh status
                video = await async_client.videos.retrieve(video.id)
            
            # Final status log
            progress = getattr(video, "progress", 100 if video.status == "completed" else 0)
            print(f"Final status: {video.status}, Progress: {progress}%")
            
            return video
        
        # Call Sora API to generate video
        try:
            # Run async function
            video = asyncio.run(create_and_poll_video())
            
            print(f"Video generation completed. Status: {video.status}")
            print(f"Video ID: {video.id if hasattr(video, 'id') else 'N/A'}")
            
            # Check if video generation failed
            if video.status == "failed":
                error_message = "Video generation failed"
                if hasattr(video, 'error') and video.error:
                    if hasattr(video.error, 'message'):
                        error_message = video.error.message
                print(f"Video generation failed: {error_message}")
                return https_fn.Response(
                    json.dumps({"error": error_message}),
                    status=500,
                    headers={"Content-Type": "application/json"}
                )
            
            # Download video content
            if video.status == "completed":
                try:
                    print("Downloading video content...")
                    # Download the video content using sync client
                    video_content = sync_client.videos.download_content(video.id, variant="video")
                    
                    # Read video content as bytes
                    video_bytes = video_content.read()
                    print(f"Video downloaded. Size: {len(video_bytes)} bytes")
                    
                    # Encode to base64 for JSON transmission
                    video_base64 = base64.b64encode(video_bytes).decode('utf-8')
                    print("Video encoded to base64")
                    
                    # Convert video object to dictionary for JSON serialization
                    video_data = {
                        "id": video.id if hasattr(video, 'id') else None,
                        "status": video.status if hasattr(video, 'status') else None,
                        "video_url": video.video_url if hasattr(video, 'video_url') else None,
                        "prompt": user_prompt,
                        "video_base64": video_base64,
                        "mime_type": "video/mp4"
                    }
                    
                    print("Video generation completed successfully")
                    return https_fn.Response(
                        json.dumps({
                            "video": video_data,
                            "message": "Video generation completed successfully"
                        }),
                        status=200,
                        headers={"Content-Type": "application/json"}
                    )
                except Exception as download_error:
                    print(f"Failed to download video: {str(download_error)}")
                    return https_fn.Response(
                        json.dumps({"error": f"Failed to download video: {str(download_error)}"}),
                        status=500,
                        headers={"Content-Type": "application/json"}
                    )
            else:
                # Unexpected status
                print(f"Unexpected video status: {video.status}")
                return https_fn.Response(
                    json.dumps({
                        "error": f"Unexpected video status: {video.status}",
                        "video_id": video.id if hasattr(video, 'id') else None
                    }),
                    status=500,
                    headers={"Content-Type": "application/json"}
                )
            
        except Exception as api_error:
            print(f"Sora API error: {str(api_error)}")
            return https_fn.Response(
                json.dumps({"error": f"Sora API error: {str(api_error)}"}),
                status=500,
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
def get_trend_ad_suggestions(req: https_fn.Request) -> https_fn.Response:
    """Generate AI ad suggestions for a specific trend"""
    
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
        if not data or "trend" not in data:
            return https_fn.Response(
                json.dumps({"error": "Missing 'trend' in request body"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        trend_name = data["trend"]
        
        # Get API key
        api_key = os.getenv("GROK_API_KEY")
        if not api_key:
            try:
                from firebase_functions import config
                api_key = config().grok.key if hasattr(config(), 'grok') else None
            except:
                pass
        
        if not api_key:
            return https_fn.Response(
                json.dumps({"error": "Grok API key not configured"}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        # Generate ad suggestions using Grok
        prompt = f"""Generate 3 creative advertising suggestions for the trending topic: "{trend_name}"

For each suggestion, provide:
1. A catchy headline
2. A brief ad copy (2-3 sentences)
3. A suggested target audience

Format as JSON array with objects containing: headline, copy, audience

Be creative and make the ads relevant to current trends and engaging."""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "model": "grok-2-1212",
            "temperature": 0.8,
            "max_tokens": 1000
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
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        # Try to parse JSON from response, or create structured suggestions
        try:
            import re
            json_match = re.search(r'\[.*\]', content, re.DOTALL)
            if json_match:
                suggestions = json.loads(json_match.group())
            else:
                # Fallback: create suggestions from text
                suggestions = [
                    {"headline": f"Ad for {trend_name}", "copy": content[:200], "audience": "General"}
                ]
        except:
            # Fallback suggestions
            suggestions = [
                {
                    "headline": f"Join the {trend_name} Movement",
                    "copy": f"Be part of the conversation. {trend_name} is trending now - create engaging content that resonates.",
                    "audience": "Social media users aged 18-45"
                },
                {
                    "headline": f"Capitalize on {trend_name}",
                    "copy": f"Leverage the power of trending topics. Connect your brand with {trend_name} and reach millions.",
                    "audience": "Marketing professionals"
                },
                {
                    "headline": f"{trend_name}: Your Next Campaign",
                    "copy": f"Stay ahead of the curve. Use {trend_name} to create viral content that drives engagement.",
                    "audience": "Content creators and brands"
                }
            ]
        
        return https_fn.Response(
            json.dumps({"suggestions": suggestions}),
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


@https_fn.on_request(
    cors=CorsOptions(
        cors_origins=["http://localhost:3000", "https://*.web.app", "https://*.firebaseapp.com"],
        cors_methods=["GET", "POST"]
    )
)
def generate_image(req: https_fn.Request) -> https_fn.Response:
    """Generate an image using xAI Image Generation API"""
    
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
        model = data.get("model", "grok-imagine-v0p9")
        quality = data.get("quality", "medium")  # low, medium, high
        n = data.get("n", 1)  # Number of images (1-10)
        response_format = data.get("response_format", "url")  # url or b64_json
        
        # Get API key from environment variable
        api_key = os.getenv("GROK_API_KEY")
        
        if not api_key:
            # Try loading .env again
            env_path = Path(__file__).parent.parent / '.env'
            if env_path.exists():
                load_dotenv(env_path, override=True)
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
        
        # Call xAI Image Generation API
        url = "https://api.x.ai/v1/images/generations"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "prompt": user_prompt,
            "model": model,
            "quality": quality,
            "n": min(max(1, n), 10),  # Clamp between 1 and 10
            "response_format": response_format
        }
        
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code != 200:
            return https_fn.Response(
                json.dumps({
                    "error": f"xAI Image API error: {response.text}",
                    "status_code": response.status_code
                }),
                status=response.status_code,
                headers={"Content-Type": "application/json"}
            )
        
        result = response.json()
        
        return https_fn.Response(
            json.dumps(result),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )


# ============================================================================
# GROK ADS STUDIO - ADVANCED FEATURES
# ============================================================================

@https_fn.on_request(
    cors=CorsOptions(
        cors_origins=["http://localhost:3000", "https://*.web.app", "https://*.firebaseapp.com"],
        cors_methods=["GET", "POST"]
    ),
    timeout_sec=300
)
def build_campaign(req: https_fn.Request) -> https_fn.Response:
    """Build a full-funnel ad campaign with strategy and multiple ad variants"""
    
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
        if not data or "product" not in data:
            return https_fn.Response(
                json.dumps({"error": "Missing 'product' in request body"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        product = data["product"]
        target_audience = data.get("target_audience", "General audience")
        budget = data.get("budget", "Medium")
        goals = data.get("goals", ["awareness", "conversions"])
        num_variants = min(max(1, data.get("num_variants", 10)), 50)
        
        api_key = os.getenv("GROK_API_KEY")
        if not api_key:
            try:
                from firebase_functions import config
                api_key = config().grok.key if hasattr(config(), 'grok') else None
            except:
                pass
        
        if not api_key:
            return https_fn.Response(
                json.dumps({"error": "Grok API key not configured"}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        # Use structured outputs for reliable JSON
        strategy_prompt = f"""You are an expert advertising strategist. Create a comprehensive ad campaign strategy for:

Product/Service: {product}
Target Audience: {target_audience}
Budget: {budget}
Goals: {', '.join(goals)}

Provide a detailed campaign strategy with:
1. Campaign overview and positioning
2. Key messaging pillars (3-5)
3. Target audience insights
4. Channel recommendations
5. Budget allocation suggestions
6. Success metrics

Format your response as a JSON object with these exact keys:
{{
  "overview": "Campaign overview text",
  "positioning": "Brand positioning statement",
  "messaging_pillars": ["pillar1", "pillar2", "pillar3"],
  "audience_insights": "Detailed audience insights",
  "channels": ["channel1", "channel2"],
  "budget_allocation": {{"channel1": "percentage", "channel2": "percentage"}},
  "success_metrics": ["metric1", "metric2"]
}}"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Get campaign strategy
        strategy_response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json={
                "messages": [{"role": "user", "content": strategy_prompt}],
                "model": "grok-2-1212",
                "temperature": 0.7,
                "max_tokens": 2000,
                "response_format": {"type": "json_object"}
            },
            timeout=60
        )
        
        if strategy_response.status_code != 200:
            return https_fn.Response(
                json.dumps({"error": f"Strategy generation failed: {strategy_response.text}"}),
                status=strategy_response.status_code,
                headers={"Content-Type": "application/json"}
            )
        
        strategy_data = strategy_response.json()
        strategy_content = strategy_data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        
        try:
            strategy = json.loads(strategy_content)
        except:
            strategy = {"error": "Failed to parse strategy"}
        
        # Generate multiple ad variants
        variants_prompt = f"""Generate {num_variants} unique ad variants for this campaign:

Product: {product}
Target Audience: {target_audience}
Strategy: {json.dumps(strategy, indent=2)}

For each variant, create:
- A catchy headline
- Compelling ad copy (2-3 sentences)
- Call-to-action
- Suggested visual style
- Target emotion/angle

Format as JSON object with "variants" array:
{{
  "variants": [
    {{
      "headline": "string",
      "copy": "string",
      "cta": "string",
      "visual_style": "string",
      "emotion": "string",
      "angle": "string"
    }}
  ]
}}"""

        variants_response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json={
                "messages": [{"role": "user", "content": variants_prompt}],
                "model": "grok-2-1212",
                "temperature": 0.9,
                "max_tokens": 4000,
                "response_format": {"type": "json_object"}
            },
            timeout=60
        )
        
        variants = []
        if variants_response.status_code == 200:
            variants_data = variants_response.json()
            variants_content = variants_data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            try:
                variants_json = json.loads(variants_content)
                if "variants" in variants_json:
                    variants = variants_json["variants"]
                elif isinstance(variants_json, list):
                    variants = variants_json
            except:
                pass
        
        # Ensure we have at least some variants
        if not variants:
            for i in range(min(num_variants, 10)):
                variants.append({
                    "headline": f"Ad Variant {i+1} for {product}",
                    "copy": f"Discover {product} - the solution you've been looking for.",
                    "cta": "Learn More",
                    "visual_style": "Modern and clean",
                    "emotion": "Excitement",
                    "angle": "Problem-solution"
                })
        
        return https_fn.Response(
            json.dumps({
                "strategy": strategy,
                "variants": variants[:num_variants],
                "campaign_id": f"campaign_{int(time.time())}"
            }),
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
    ),
    timeout_sec=180
)
def predict_performance(req: https_fn.Request) -> https_fn.Response:
    """Predict ad performance using Grok reasoning"""
    
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
        if not data or "ad" not in data:
            return https_fn.Response(
                json.dumps({"error": "Missing 'ad' in request body"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        ad = data["ad"]
        target_audience = data.get("target_audience", "General")
        channel = data.get("channel", "social_media")
        budget = data.get("budget", 1000)
        
        api_key = os.getenv("GROK_API_KEY")
        if not api_key:
            try:
                from firebase_functions import config
                api_key = config().grok.key if hasattr(config(), 'grok') else None
            except:
                pass
        
        if not api_key:
            return https_fn.Response(
                json.dumps({"error": "Grok API key not configured"}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        # Use Grok's reasoning for performance prediction
        prediction_prompt = f"""As an expert ad performance analyst, predict the performance of this ad:

Ad Content:
{json.dumps(ad, indent=2)}

Target Audience: {target_audience}
Channel: {channel}
Budget: ${budget}

Analyze and predict:
1. Expected CTR (Click-Through Rate) as percentage
2. Expected conversion rate as percentage
3. Estimated CPC (Cost Per Click)
4. Estimated CPA (Cost Per Acquisition)
5. Predicted engagement score (0-100)
6. Risk factors
7. Optimization recommendations

Format as JSON:
{{
  "ctr": 2.5,
  "conversion_rate": 3.2,
  "cpc": 0.45,
  "cpa": 14.50,
  "engagement_score": 75,
  "risk_factors": ["factor1", "factor2"],
  "recommendations": ["rec1", "rec2"],
  "confidence": 85
}}"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json={
                "messages": [{"role": "user", "content": prediction_prompt}],
                "model": "grok-2-1212",
                "temperature": 0.3,
                "max_tokens": 1500,
                "response_format": {"type": "json_object"}
            },
            timeout=60
        )
        
        if response.status_code != 200:
            return https_fn.Response(
                json.dumps({"error": f"Prediction failed: {str(response.text)}"}),
                status=response.status_code,
                headers={"Content-Type": "application/json"}
            )
        
        result = response.json()
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        
        try:
            prediction = json.loads(content)
        except:
            prediction = {
                "ctr": 2.0,
                "conversion_rate": 2.5,
                "cpc": 0.50,
                "cpa": 20.00,
                "engagement_score": 65,
                "risk_factors": ["Limited data available"],
                "recommendations": ["A/B test multiple variants", "Optimize targeting"],
                "confidence": 60
            }
        
        return https_fn.Response(
            json.dumps({"prediction": prediction}),
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
    ),
    timeout_sec=300
)
def generate_variants(req: https_fn.Request) -> https_fn.Response:
    """Generate multiple personalized ad variants"""
    
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
        
        prompt = data["prompt"]
        num_variants = min(max(1, data.get("num_variants", 10)), 50)
        personalization_data = data.get("personalization", {})
        
        api_key = os.getenv("GROK_API_KEY")
        if not api_key:
            try:
                from firebase_functions import config
                api_key = config().grok.key if hasattr(config(), 'grok') else None
            except:
                pass
        
        if not api_key:
            return https_fn.Response(
                json.dumps({"error": "Grok API key not configured"}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        variants_prompt = f"""Generate {num_variants} unique, personalized ad variants for:

Base Prompt: {prompt}
Personalization Data: {json.dumps(personalization_data, indent=2)}

Each variant should:
- Have a unique angle/approach
- Target different emotions or pain points
- Use varied messaging styles
- Include different CTAs
- Be optimized for different audience segments

Format as JSON object with "variants" array:
{{
  "variants": [
    {{
      "variant_id": 1,
      "headline": "string",
      "copy": "string",
      "cta": "string",
      "target_emotion": "string",
      "audience_segment": "string",
      "personalization_note": "string"
    }}
  ]
}}"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json={
                "messages": [{"role": "user", "content": variants_prompt}],
                "model": "grok-2-1212",
                "temperature": 0.9,
                "max_tokens": 4000,
                "response_format": {"type": "json_object"}
            },
            timeout=120
        )
        
        if response.status_code != 200:
            return https_fn.Response(
                json.dumps({"error": f"Variant generation failed: {str(response.text)}"}),
                status=response.status_code,
                headers={"Content-Type": "application/json"}
            )
        
        result = response.json()
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        
        try:
            variants_json = json.loads(content)
            if "variants" in variants_json:
                variants = variants_json["variants"]
            elif isinstance(variants_json, list):
                variants = variants_json
            else:
                variants = []
        except:
            variants = []
        
        if len(variants) < num_variants:
            for i in range(len(variants), num_variants):
                variants.append({
                    "variant_id": i + 1,
                    "headline": f"Variant {i + 1}",
                    "copy": f"Discover {prompt} - personalized for you.",
                    "cta": "Get Started",
                    "target_emotion": "Excitement",
                    "audience_segment": "General",
                    "personalization_note": "Generated variant"
                })
        
        return https_fn.Response(
            json.dumps({
                "variants": variants[:num_variants],
                "count": len(variants[:num_variants])
            }),
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
    ),
    timeout_sec=300
)
def trend_to_ad_pipeline(req: https_fn.Request) -> https_fn.Response:
    """Real-time trend detection and instant ad generation"""
    
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
        trend_name = data.get("trend", "")
        product = data.get("product", "")
        woeid = data.get("woeid", "23424977")
        
        api_key = os.getenv("GROK_API_KEY")
        bearer_token = os.getenv("X_API_BEARER_TOKEN")
        
        if not api_key:
            try:
                from firebase_functions import config
                api_key = config().grok.key if hasattr(config(), 'grok') else None
            except:
                pass
        
        if not api_key:
            return https_fn.Response(
                json.dumps({"error": "Grok API key not configured"}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        # If no trend provided, fetch latest trends
        if not trend_name:
            if bearer_token:
                try:
                    trends_url = f"https://api.x.com/2/trends/by/woeid/{woeid}"
                    trends_response = requests.get(
                        trends_url,
                        headers={"Authorization": f"Bearer {bearer_token}"},
                        timeout=30
                    )
                    if trends_response.status_code == 200:
                        trends_data = trends_response.json()
                        if trends_data.get("data"):
                            trend_name = trends_data["data"][0].get("trend_name", "")
                except:
                    pass
        
        if not trend_name:
            return https_fn.Response(
                json.dumps({"error": "No trend available"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Generate ad from trend
        ad_prompt = f"""Create a compelling ad that capitalizes on the trending topic "{trend_name}" for the product: {product if product else 'general advertising'}

Requirements:
- Make it timely and relevant to the trend
- Create urgency and relevance
- Include a strong CTA
- Optimize for viral potential

Format as JSON:
{{
  "headline": "string",
  "copy": "string",
  "cta": "string",
  "trend_connection": "How it connects to the trend",
  "viral_potential": "High/Medium/Low",
  "urgency_level": "High/Medium/Low"
}}"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            "https://api.x.ai/v1/chat/completions",
            headers=headers,
            json={
                "messages": [{"role": "user", "content": ad_prompt}],
                "model": "grok-2-1212",
                "temperature": 0.8,
                "max_tokens": 1000,
                "response_format": {"type": "json_object"}
            },
            timeout=60
        )
        
        if response.status_code != 200:
            return https_fn.Response(
                json.dumps({"error": f"Ad generation failed: {str(response.text)}"}),
                status=response.status_code,
                headers={"Content-Type": "application/json"}
            )
        
        result = response.json()
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        
        try:
            ad = json.loads(content)
        except:
            ad = {
                "headline": f"Join the {trend_name} Movement",
                "copy": f"Be part of the conversation. {trend_name} is trending now.",
                "cta": "Learn More",
                "trend_connection": "Direct trend reference",
                "viral_potential": "Medium",
                "urgency_level": "High"
            }
        
        return https_fn.Response(
            json.dumps({
                "trend": trend_name,
                "ad": ad,
                "generated_at": int(time.time())
            }),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )