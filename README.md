# GrokAds

AI-powered ad generation platform using Grok API, built with Next.js and Firebase Functions.

## Project Structure

```
grokads/
├── app/                    # Next.js frontend application
│   ├── page.tsx           # Main ad generation page
│   ├── trends/            # Trends page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── backend/               # Firebase backend
│   ├── functions/         # Cloud Functions (Python)
│   │   ├── main.py       # Main function handler
│   │   └── requirements.txt
│   ├── firebase.json      # Firebase configuration
│   └── .firebaserc        # Firebase project config
└── package.json           # Frontend dependencies
```

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Python 3.13
- Firebase CLI (`npm install -g firebase-tools`)
- Grok API key from [xAI Console](https://console.x.ai/)

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Set up Python virtual environment (if not already done):
```bash
cd functions
python3.13 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set your Grok API key as an environment variable:
```bash
export GROK_API_KEY="your-api-key-here"
```

4. Start Firebase emulators:
```bash
cd ..  # Back to backend directory
firebase emulators:start
```

The function will be available at: `http://localhost:5001/grokads-47abba/us-central1/generate_ad`

### Production Deployment

1. Login to Firebase:
```bash
firebase login
```

2. Set the API key as a secret:
```bash
firebase functions:secrets:set GROK_API_KEY
```

3. Deploy functions:
```bash
firebase deploy --only functions
```

4. Update `NEXT_PUBLIC_FUNCTION_URL` in your frontend environment variables with the deployed function URL.

## Features

- **Ad Generation**: Create compelling ad copy using AI
- **Trends Page**: View current advertising trends
- **Real-time Processing**: Fast AI-powered ad generation via Grok API

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Firebase Functions (Python 3.13)
- **AI**: Grok API (xAI)
- **Database**: Firestore (configured but not actively used yet)

