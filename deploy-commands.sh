#!/bin/bash
cd /Users/rajesh/AIML/o3_mutant

# Add the changes
git add server/routes-index.ts
git add server/index.ts
git add vercel.json

# Commit the changes
git commit -m "Fix module import issue for Vercel deployment"

# Push to GitHub to trigger Vercel build
git push origin main

# Deploy to Vercel production
vercel --prod
