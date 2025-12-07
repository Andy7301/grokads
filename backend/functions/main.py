from firebase_functions import https_fn
from firebase_functions.options import CorsOptions, set_global_options
from firebase_admin import initialize_app
import requests
import json
import os

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
        api_key = os.environ.get("GROK_API_KEY")
        
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