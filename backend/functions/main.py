from firebase_functions import https_fn
from firebase_functions.options import CorsOptions, set_global_options
from firebase_admin import initialize_app
import requests
import json
import os
import time
import base64
import asyncio
from dotenv import load_dotenv
from openai import OpenAI, AsyncOpenAI

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