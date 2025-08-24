# Supabase Database Setup for Zeroscript

This directory contains the SQL setup files for your Zeroscript database.

## Quick Setup

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor (usually in the left sidebar)

2. **Run the Setup Script**
   - Open `setup.sql` in this directory
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click "Run" to execute

3. **Verify Installation**
   After running the script, verify everything was created:
   - Check the Table Editor for `sessions` and `playbook` tables
   - Verify RLS is enabled (shield icon should be green)
   - Check that indexes were created successfully

## Database Structure

### Sessions Table
Stores call session data with the following columns:
- `id` - Primary key
- `created_at` - Timestamp of session creation
- `phone_number` - Customer's phone number
- `last_stage` - Last completed playbook stage (0-5)
- `agent_id` - References auth.users (with CASCADE delete)
- `updated_at` - Auto-updated timestamp
- `session_notes` - Optional notes about the session
- `is_active` - Boolean flag for active sessions

**RLS Policies**: Agents can only access their own sessions (SELECT, INSERT, UPDATE, DELETE)

### Playbook Table
Stores Golden Playbook scripts with vector embeddings:
- `id` - Primary key
- `created_at` - Timestamp
- `intent` - Intent name (e.g., "Objection: Price")
- `script` - The polished Golden Script
- `embedding` - 1536-dimension vector for similarity search
- `category` - Script category for filtering
- `stage` - Playbook stage number
- `is_active` - Boolean flag
- `usage_count` - Track script usage

**RLS Policies**: Read-only for all authenticated users

## Helper Functions

### search_similar_intents()
Searches for similar scripts using vector similarity:
```sql
SELECT * FROM search_similar_intents(
    query_embedding := your_vector,
    match_threshold := 0.7,
    match_count := 5
);
```

### get_active_session()
Gets the active session for a phone number and agent:
```sql
SELECT * FROM get_active_session(
    p_phone_number := '+1234567890',
    p_agent_id := auth.uid()
);
```

## Adding Playbook Entries

To add new playbook entries with embeddings:

1. Generate embeddings using OpenAI's API:
```javascript
const embedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: "Your intent text here"
});
```

2. Insert into the playbook table:
```sql
INSERT INTO public.playbook (intent, script, category, stage, embedding) 
VALUES (
    'Intent Name',
    'Your script here',
    'Category',
    1,
    '[your-1536-dimension-vector]'::vector
);
```

## Performance Considerations

The setup includes several performance optimizations:
- Indexes on all foreign keys and commonly queried columns
- IVFFlat index on embeddings for fast similarity search
- Partial indexes for active records
- Auto-updating timestamps via triggers

## Security Notes

- Row Level Security (RLS) is enabled on both tables
- Sessions are isolated per agent (multi-tenant)
- Playbook is read-only through the API
- Foreign key with CASCADE ensures data integrity

## Troubleshooting

If you encounter errors:

1. **pgvector not found**: Ensure your Supabase project has pgvector enabled (most new projects do)
2. **Permission denied**: Make sure you're running as a superuser in the SQL Editor
3. **Table already exists**: The script uses IF NOT EXISTS, but you may want to drop tables first if recreating

## Next Steps

After setup:
1. Test the tables by inserting sample data
2. Generate real embeddings for your playbook scripts
3. Configure your app's Supabase client with the correct credentials
4. Test RLS policies by authenticating as different users