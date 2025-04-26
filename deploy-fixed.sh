#!/bin/bash
cd /Users/rajesh/AIML/o3_mutant

# Build the application
echo "Building application..."
npm run build

# Add the changes to git
git add vercel.json server/index.ts

# Commit the changes
git commit -m "Fix ESM import extension for Vercel deployment"

# Push to GitHub
git push origin main

# Deploy to Vercel production
echo "Deploying to Vercel..."
vercel --prod

echo "Deployment complete!"