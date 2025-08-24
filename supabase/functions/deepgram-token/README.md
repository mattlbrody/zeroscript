# Deepgram Token Edge Function

This Supabase Edge Function securely generates temporary Deepgram API tokens for authenticated users.

## Setup

1. Set the following environment variables in your Supabase project:
   - `DEEPGRAM_API_KEY`: Your Deepgram API key

2. Deploy the function:
   ```bash
   supabase functions deploy deepgram-token
   ```

## Usage

Make a POST request to the function endpoint with a valid Supabase auth token:

```javascript
const { data, error } = await supabase.functions.invoke('deepgram-token', {
  method: 'POST'
})

if (data.success) {
  console.log('Temporary key:', data.key)
  console.log('Expires at:', data.expiresAt)
}
```

## Response

Success response:
```json
{
  "success": true,
  "key": "temporary_deepgram_api_key",
  "expiresAt": "2024-01-01T12:05:00.000Z",
  "expiresIn": 300,
  "userId": "user_uuid"
}
```

Error responses:
- 401: Authentication failed
- 500: Server configuration error
- 503: Deepgram service error