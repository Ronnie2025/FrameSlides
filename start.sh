#!/bin/bash

# Navigate to the script's directory
cd "$(dirname "$0")"

echo "🍃 Starting MintPPT..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Start the development server
echo "🚀 Starting development server..."
npm run dev
