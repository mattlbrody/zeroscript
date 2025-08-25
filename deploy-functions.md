# Deploy Supabase Edge Functions

The CORS error is occurring because the Edge Functions are not deployed to your Supabase project. Follow these steps to deploy them:

## Prerequisites
1. Install Supabase CLI if not already installed:
```bash
npm install -g supabase
```

2. Login to Supabase CLI:
```bash
npx supabase login
```

## Deploy Functions

1. Link your project (use your database password when prompted):
```bash
npx supabase link --project-ref klaflndltqrwfyobalzo
```

If you don't remember your database password, you can reset it from:
https://supabase.com/dashboard/project/klaflndltqrwfyobalzo/settings/database

2. Deploy the deepgram-token function:
```bash
npx supabase functions deploy deepgram-token --no-verify-jwt
```

3. Deploy the get-script function:
```bash
npx supabase functions deploy get-script --no-verify-jwt
```

## Set Environment Variables

After deploying, you need to set the environment variables for the Edge Functions:

1. Go to your Supabase Dashboard:
https://supabase.com/dashboard/project/klaflndltqrwfyobalzo/functions

2. Click on each function (deepgram-token and get-script)

3. Go to the "Settings" tab for each function

4. Add these environment variables:
   - `DEEPGRAM_API_KEY`: Your Deepgram API key
   - `OPENAI_API_KEY`: Your OpenAI API key

## Verify Deployment

After deployment, you can verify the functions are working:

1. Check function list:
```bash
npx supabase functions list
```

2. Test the functions are accessible:
- deepgram-token: https://klaflndltqrwfyobalzo.supabase.co/functions/v1/deepgram-token
- get-script: https://klaflndltqrwfyobalzo.supabase.co/functions/v1/get-script

## Important Notes

- The `--no-verify-jwt` flag is crucial as mentioned in CLAUDE.md
- Make sure the environment variables are set in the Supabase Dashboard, not just locally
- The functions handle their own JWT verification internally

## Troubleshooting

If you still get CORS errors after deployment:
1. Check the function logs in the Supabase Dashboard
2. Ensure the functions are marked as "Active" in the dashboard
3. Verify that the environment variables are set correctly