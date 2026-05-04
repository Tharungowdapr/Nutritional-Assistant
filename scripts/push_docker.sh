#!/bin/bash
set -e

# Default to the given Docker Hub username
USERNAME="tharungowdapr28"

# Optional: Add build arguments for production build optimization
echo "🚀 Building AaharAI NutriSync Frontend..."
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t ${USERNAME}/nutrisync-frontend:latest ./frontend

echo "🚀 Building AaharAI NutriSync Backend..."
docker build -t ${USERNAME}/nutrisync-backend:latest ./backend

echo "✅ Build complete! Pushing to Docker Hub under repository: ${USERNAME}"

echo "⬆️ Pushing Frontend..."
docker push ${USERNAME}/nutrisync-frontend:latest

echo "⬆️ Pushing Backend..."
docker push ${USERNAME}/nutrisync-backend:latest

echo "🎉 Done! Your images are live on Docker Hub."
