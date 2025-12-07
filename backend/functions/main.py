from firebase_functions import https_fn
from firebase_functions.options import CorsOptions, set_global_options
from firebase_admin import initialize_app
import requests
import json
import os
import time
import base64
import asyncio
import tempfile
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, AsyncOpenAI
from moviepy import VideoFileClip, TextClip, CompositeVideoClip

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


@https_fn.on_request(
    cors=CorsOptions(
        cors_origins=["http://localhost:3000", "https://*.web.app", "https://*.firebaseapp.com"],
        cors_methods=["GET", "POST"]
    ),
    timeout_sec=300  # 5 minutes timeout for video processing
)
def add_text_overlay(req: https_fn.Request) -> https_fn.Response:
    """Add a text overlay to a video at a specific location"""
    
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
        if not data:
            return https_fn.Response(
                json.dumps({"error": "Missing request body"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Required parameters
        text = data.get("text")
        if not text:
            return https_fn.Response(
                json.dumps({"error": "Missing required parameter: 'text'"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Video input - can be base64 or URL
        video_base64 = data.get("video_base64")
        video_url = data.get("video_url")
        
        if not video_base64 and not video_url:
            return https_fn.Response(
                json.dumps({"error": "Missing required parameter: either 'video_base64' or 'video_url'"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Position parameters (required)
        position_x = data.get("position_x")
        position_y = data.get("position_y")
        
        if position_x is None or position_y is None:
            return https_fn.Response(
                json.dumps({"error": "Missing required parameters: 'position_x' and 'position_y'"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Optional styling parameters
        font_size = data.get("font_size", 50)
        font_color = data.get("font_color", "white")
        font_family = data.get("font_family", None)  # None will use default font
        stroke_color = data.get("stroke_color", "black")
        stroke_width = data.get("stroke_width", 2)
        start_time = data.get("start_time", 0)  # When to start showing text (in seconds)
        duration = data.get("duration")  # How long to show text (None = entire video)
        alignment = data.get("alignment", "center")  # left, center, right
        
        # Helper function to find a valid font
        def get_valid_font(font_name):
            """Try to find a valid font file, return None if not found (uses default)"""
            if not font_name:
                return None
            
            # Common font paths
            font_paths = [
                '/System/Library/Fonts',
                '/Library/Fonts',
                os.path.expanduser('~/Library/Fonts'),
            ]
            
            # Common font file extensions
            extensions = ['.ttf', '.otf', '.ttc']
            
            # Normalize font name - remove common suffixes/prefixes
            base_name = font_name.replace('-Bold', '').replace('-Regular', '').replace('-Italic', '').strip()
            
            # Try exact match first
            for path in font_paths:
                if not os.path.exists(path):
                    continue
                
                # Try exact match
                for ext in extensions:
                    font_file = os.path.join(path, f"{font_name}{ext}")
                    if os.path.exists(font_file):
                        return font_file
                
                # Try variations
                variations = [
                    font_name,
                    font_name.replace(' ', '-'),
                    font_name.replace('-', ' '),
                    base_name,
                    f"{base_name}-Bold",
                    f"{base_name} Bold",
                ]
                
                for variant in variations:
                    for ext in extensions:
                        font_file = os.path.join(path, f"{variant}{ext}")
                        if os.path.exists(font_file):
                            return font_file
                
                # Try case-insensitive search in directory
                try:
                    for file in os.listdir(path):
                        file_lower = file.lower()
                        font_lower = font_name.lower()
                        base_lower = base_name.lower()
                        
                        # Check if filename contains the font name
                        if (font_lower in file_lower or base_lower in file_lower) and any(file_lower.endswith(ext) for ext in extensions):
                            font_file = os.path.join(path, file)
                            if os.path.exists(font_file):
                                return font_file
                except (OSError, PermissionError):
                    pass
            
            # If not found, return None to use default font
            print(f"Font '{font_name}' not found, using default font")
            return None
        
        # Create temporary files for input and output
        input_video_path = None
        output_video_path = None
        
        try:
            # Download or decode video
            if video_url:
                print(f"Downloading video from URL: {video_url}")
                response = requests.get(video_url, timeout=60)
                if response.status_code != 200:
                    return https_fn.Response(
                        json.dumps({"error": f"Failed to download video from URL: {response.status_code}"}),
                        status=400,
                        headers={"Content-Type": "application/json"}
                    )
                video_bytes = response.content
            else:
                print("Decoding base64 video...")
                video_bytes = base64.b64decode(video_base64)
            
            # Save video to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_input:
                temp_input.write(video_bytes)
                input_video_path = temp_input.name
            
            print(f"Video saved to temporary file: {input_video_path}")
            print(f"Video size: {len(video_bytes)} bytes")
            
            # Load video
            print("Loading video with MoviePy...")
            video = VideoFileClip(input_video_path)
            
            # Calculate text duration (use video duration if not specified)
            text_duration = duration if duration is not None else video.duration - start_time
            text_duration = min(text_duration, video.duration - start_time)  # Don't exceed video length
            
            # Create text clip
            print(f"Creating text overlay: '{text}' at position ({position_x}, {position_y})")
            
            # Get valid font path or None for default
            font_path = get_valid_font(font_family)
            
            # Get video dimensions for size calculation if needed
            video_width = video.w
            video_height = video.h
            
            # Calculate padding needed for stroke (stroke extends outward)
            # Add generous padding to prevent any clipping
            stroke_padding = max(stroke_width * 3, 20)
            
            # Build TextClip parameters
            # Use 'label' method for single-line text positioning
            text_clip_params = {
                "text": text,
                "font_size": font_size,
                "color": font_color,
                "stroke_color": stroke_color,
                "stroke_width": stroke_width,
                "method": 'label',
                "text_align": alignment,
                "margin": (stroke_padding, stroke_padding),  # Add margin to prevent clipping
                "transparent": True  # Ensure transparent background
            }
            
            # Only add font parameter if we have a valid font path
            if font_path:
                text_clip_params["font"] = font_path
            
            # Create text clip with margin
            txt_clip = TextClip(**text_clip_params)
            
            print(f"Text clip size with margin: {txt_clip.w}x{txt_clip.h}")
            
            # Position the text clip
            txt_clip = txt_clip.with_position((position_x, position_y)).with_start(start_time).with_duration(text_duration)
            
            # Composite video with text overlay
            print("Compositing video with text overlay...")
            final_video = CompositeVideoClip([video, txt_clip])
            
            # Create output temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_output:
                output_video_path = temp_output.name
            
            # Write output video
            print(f"Writing output video to: {output_video_path}")
            final_video.write_videofile(
                output_video_path,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=tempfile.mktemp(suffix='.m4a'),
                remove_temp=True,
                logger=None
            )
            
            # Read output video
            print("Reading output video...")
            with open(output_video_path, 'rb') as f:
                output_video_bytes = f.read()
            
            print(f"Output video size: {len(output_video_bytes)} bytes")
            
            # Encode to base64
            output_base64 = base64.b64encode(output_video_bytes).decode('utf-8')
            
            # Clean up video objects to free memory
            txt_clip.close()
            final_video.close()
            video.close()
            
            return https_fn.Response(
                json.dumps({
                    "video_base64": output_base64,
                    "mime_type": "video/mp4",
                    "message": "Text overlay added successfully",
                    "text": text,
                    "position": {"x": position_x, "y": position_y}
                }),
                status=200,
                headers={"Content-Type": "application/json"}
            )
            
        except Exception as video_error:
            print(f"Video processing error: {str(video_error)}")
            import traceback
            traceback.print_exc()
            return https_fn.Response(
                json.dumps({"error": f"Video processing failed: {str(video_error)}"}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        finally:
            # Clean up temporary files
            if input_video_path and os.path.exists(input_video_path):
                try:
                    os.unlink(input_video_path)
                    print(f"Cleaned up input file: {input_video_path}")
                except:
                    pass
            
            if output_video_path and os.path.exists(output_video_path):
                try:
                    os.unlink(output_video_path)
                    print(f"Cleaned up output file: {output_video_path}")
                except:
                    pass
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return https_fn.Response(
            json.dumps({"error": f"Internal server error: {str(e)}"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )