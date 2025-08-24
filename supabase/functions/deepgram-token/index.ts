import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createClient as createDeepgramClient } from "https://esm.sh/@deepgram/sdk@3"

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
    // Step 1: Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '')
    
    // Initialize Supabase client with service role key to verify JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 2: Get Deepgram API key from environment
    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
    
    if (!deepgramApiKey) {
      console.error('DEEPGRAM_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Deepgram service not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 3: Initialize Deepgram client and create temporary key
    const deepgram = createDeepgramClient(deepgramApiKey)
    
    // Create a temporary API key with 5-minute expiration
    const expirationSeconds = 300 // 5 minutes
    const comment = `Temporary key for user ${user.id}`
    
    // Create project-scoped key with limited permissions
    const { result: keyData, error: deepgramError } = await deepgram.keys.create(
      {
        comment,
        scopes: ['usage:write'], // Minimal scope for real-time transcription
        expiration_date: new Date(Date.now() + expirationSeconds * 1000).toISOString(),
        time_to_live_in_seconds: expirationSeconds
      }
    )
    
    if (deepgramError || !keyData) {
      console.error('Deepgram key creation failed:', deepgramError)
      return new Response(
        JSON.stringify({ error: 'Failed to create temporary token' }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Step 4: Return the temporary key with metadata
    const response = {
      success: true,
      key: keyData.key,
      expiresAt: new Date(Date.now() + expirationSeconds * 1000).toISOString(),
      expiresIn: expirationSeconds,
      userId: user.id
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    // Step 5: Handle unexpected errors
    console.error('Unexpected error in deepgram-token function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})