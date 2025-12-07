#!/bin/bash
# Script to load .env file and start Firebase emulators

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📝 Loading API keys from .env file..."
    export $(grep -v '^#' .env | xargs)
    echo "✅ API keys loaded!"
else
    echo "⚠️  Warning: .env file not found!"
    echo "   Create .env from .env.example and add your API keys"
    exit 1
fi

# Start Firebase emulators
echo "🚀 Starting Firebase emulators..."
firebase emulators:start
