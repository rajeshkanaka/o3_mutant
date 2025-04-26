#!/bin/bash
cd /Users/rajesh/AIML/o3_mutant

# Add the changes to git
git add vercel.json

# Commit the changes
git commit -m "Update Node.js version to 22.x for Vercel deployment"

# Deploy to Vercel production
vercel --prod
