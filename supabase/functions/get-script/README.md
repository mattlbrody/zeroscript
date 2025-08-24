# Get Script Edge Function

This Edge Function performs vector similarity search to find the most relevant script from the playbook based on transcribed text from live calls.

## Setup Instructions

### 1. Deploy the Database Function

First, run the migration to create the `match_script` database function:

```bash
supabase migration up
```

Or manually run the SQL in `supabase/migrations/20240824_create_match_script_function.sql` in the Supabase SQL editor.

### 2. Set Environment Variables

In your Supabase dashboard, go to Settings > Edge Functions and add:

```
OPENAI_API_KEY=your-openai-api-key-here
```

### 3. Deploy the Edge Function

```bash
supabase functions deploy get-script
```

### 4. Create the Playbook Table (if not exists)

Ensure your `playbook` table has the following structure:

```sql
CREATE TABLE IF NOT EXISTS playbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent TEXT NOT NULL,
  script TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS playbook_embedding_idx ON playbook 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Usage

Send a POST request to the function endpoint:

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/get-script', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userAccessToken}`
  },
  body: JSON.stringify({
    text: "How much does this cost?"
  })
})

const result = await response.json()
// Success response:
// {
//   "success": true,
//   "intent": "price_inquiry",
//   "script": "Our pricing starts at $99 per month...",
//   "similarity": 0.92
// }
```

## Testing

Test the function locally:

```bash
supabase functions serve get-script --env-file ./supabase/.env.local
```

Then send a test request:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/get-script' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"text":"What is the pricing?"}'
```

## Error Responses

- `400 Bad Request`: Missing or invalid text field
- `401 Unauthorized`: Invalid or missing authentication token
- `503 Service Unavailable`: OpenAI API unavailable or rate limited
- `500 Internal Server Error`: Database or unexpected errors

## Notes

- The function uses OpenAI's `text-embedding-3-small` model (1536 dimensions)
- Default similarity threshold is 0.7 (adjustable in the code)
- Authentication is handled manually per project requirements (not using legacy JWT verification)