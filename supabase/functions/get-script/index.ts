import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Step 1: Validate request method and content
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate text field
    const { text } = requestBody
    console.log('Incoming text from request:', text)
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "text" field in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 2: Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract token from Bearer format
    const token = authHeader.replace('Bearer ', '')
    
    // Create authenticated Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })

    // Verify the user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 3: Generate text embedding using OpenAI
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Embedding service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const openai = new OpenAI({ apiKey: openaiApiKey })

    let embedding
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.trim(),
      })
      
      embedding = embeddingResponse.data[0].embedding
      console.log('Generated Embedding (start):', embedding.slice(0, 5))
      console.log('Embedding length:', embedding.length)
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError)
      
      // Handle specific OpenAI errors
      if (openaiError.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Embedding service rate limit exceeded. Please try again later.' }),
          { 
            status: 503, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      if (openaiError.status === 401) {
        console.error('Invalid OpenAI API key')
        return new Response(
          JSON.stringify({ error: 'Embedding service authentication failed' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Embedding service unavailable. Please try again.' }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 4: Call database function to find matching script
    const { data: matchResult, error: dbError } = await supabase.rpc('match_script', {
      query_embedding: embedding,
      match_threshold: 0.4
    })

    console.log('Raw matchResult from database:', JSON.stringify(matchResult, null, 2))

    if (dbError) {
      console.error('Database query error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Database query failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Step 5: Format and return response
    if (matchResult && matchResult.length > 0) {
      const match = matchResult[0]
      return new Response(
        JSON.stringify({
          success: true,
          intent: match.intent,
          script: match.script,
          similarity: match.similarity
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // No matching script found
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No matching script found',
          intent: null,
          script: null
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    // Catch-all error handler
    console.error('Unexpected error in get-script function:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})