#!/bin/bash
cd /Users/rajesh/AIML/o3_mutant

# Add the changes
git add server/index.ts vercel.json server/package.json server/tsconfig.json

# Commit the changes
git commit -m "Fix module resolution for Vercel deployment"

# Push to GitHub
git push origin main

# Deploy to Vercel production
vercel --prod
