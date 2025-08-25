#!/bin/bash

echo "Deploying Supabase Edge Functions..."
echo "======================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Installing..."
    npm install -g supabase
fi

# Login to Supabase (if not already logged in)
echo "Logging in to Supabase..."
npx supabase login

# Link to project
echo "Linking to project klaflndltqrwfyobalzo..."
echo "You will need to enter your database password."
echo "If you forgot it, reset it at: https://supabase.com/dashboard/project/klaflndltqrwfyobalzo/settings/database"
npx supabase link --project-ref klaflndltqrwfyobalzo

# Deploy functions with no-verify-jwt flag
echo "Deploying deepgram-token function..."
npx supabase functions deploy deepgram-token --no-verify-jwt

echo "Deploying get-script function..."
npx supabase functions deploy get-script --no-verify-jwt

# List deployed functions
echo "======================================="
echo "Deployed functions:"
npx supabase functions list

echo "======================================="
echo "Deployment complete!"
echo ""
echo "IMPORTANT: Don't forget to set environment variables in the Supabase Dashboard:"
echo "1. Go to: https://supabase.com/dashboard/project/klaflndltqrwfyobalzo/functions"
echo "2. Click on each function and go to Settings"
echo "3. Add these environment variables:"
echo "   - DEEPGRAM_API_KEY"
echo "   - OPENAI_API_KEY"
echo ""
echo "The functions are now accessible at:"
echo "- https://klaflndltqrwfyobalzo.supabase.co/functions/v1/deepgram-token"
echo "- https://klaflndltqrwfyobalzo.supabase.co/functions/v1/get-script"