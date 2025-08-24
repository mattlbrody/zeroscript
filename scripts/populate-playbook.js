import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('Missing required environment variables')
  console.error('Required: REACT_APP_SUPABASE_URL, OPENAI_API_KEY')
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY (or REACT_APP_SUPABASE_ANON_KEY as fallback)')
  
  if (!supabaseUrl) console.error('  ✗ REACT_APP_SUPABASE_URL is missing')
  if (!supabaseServiceKey) console.error('  ✗ SUPABASE_SERVICE_ROLE_KEY and REACT_APP_SUPABASE_ANON_KEY are both missing')
  if (!openaiApiKey) console.error('  ✗ OPENAI_API_KEY is missing')
  
  process.exit(1)
}

// Warn if using anon key instead of service role key
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.warn('⚠️  Warning: Using REACT_APP_SUPABASE_ANON_KEY instead of SUPABASE_SERVICE_ROLE_KEY')
  console.warn('   For production use, please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
  console.warn('')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

// Golden Scripts data - core scripts for our sales coaching platform
const goldenScripts = [
  {
    intent_name: "price_objection",
    representative_phrase: "How much does this cost?",
    script: "That's a fair question. The investment is [Amount] per month."
  },
  {
    intent_name: "guarantee_question",
    representative_phrase: "Do you have a money back guarantee?",
    script: "You are protected by a 100% money-back guarantee. If we don't provide you with a minimum of a 100-point increase across all three bureaus in 90 days, you get all of your money back."
  },
  {
    intent_name: "opening_script",
    representative_phrase: "I need some help with my credit.",
    script: "Hi [Customer Name], this is [Your Name] from Zeroscript. How is your day going? ... Great to hear. I'm giving you a call because you requested some information about helping with your credit. To start, are you aware of the specific negative items on your account?"
  },
  {
    intent_name: "authority_pitch",
    representative_phrase: "Why should I choose you?",
    script: "That's a great question. Our founder, Matt, has been building our credibility for over ten years and is one of the best in the industry. He's the one who will be heading the work on your file."
  },
  {
    intent_name: "objection_indecision",
    representative_phrase: "I need to think about it.",
    script: "I completely understand. Just so you know, you are protected by our 100% money-back guarantee. If you don't see the results we discussed, you get a full refund, so there is no risk to you."
  }
]

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

async function populatePlaybook() {
  console.log('='.repeat(60))
  console.log('STARTING GOLDEN PLAYBOOK POPULATION')
  console.log('='.repeat(60))
  console.log(`\nProcessing ${goldenScripts.length} golden scripts...`)
  
  let successCount = 0
  let errorCount = 0
  
  for (const entry of goldenScripts) {
    try {
      console.log(`\n[${successCount + errorCount + 1}/${goldenScripts.length}] Processing intent: "${entry.intent_name}"`)
      
      // Generate embedding for the representative phrase using text-embedding-3-small model
      console.log(`  → Generating embedding for representative phrase: "${entry.representative_phrase}"...`)
      const embedding = await generateEmbedding(entry.representative_phrase)
      console.log(`  ✓ Embedding generated (dimension: ${embedding.length})`)
      
      // Check if entry already exists
      console.log(`  → Checking if intent already exists...`)
      const { data: existing, error: checkError } = await supabase
        .from('playbook')
        .select('id')
        .eq('intent', entry.intent_name)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {  // PGRST116 = no rows found
        throw checkError
      }
      
      let data, error
      
      if (existing) {
        // Update existing entry
        console.log(`  → Updating existing entry...`)
        const { error } = await supabase
          .from('playbook')
          .update({
            script: entry.script,
            embedding: JSON.stringify(embedding)
          })
          .eq('id', existing.id)
      } else {
        // Insert new entry
        console.log(`  → Inserting new entry into playbook table...`)
        const { error } = await supabase
          .from('playbook')
          .insert({
            intent: entry.intent_name,
            script: entry.script,
            embedding: JSON.stringify(embedding)
          })
      }
      
      if (error) {
        console.error(`  ✗ Error upserting "${entry.intent_name}":`, error.message)
        errorCount++
      } else {
        console.log(`  ✓ Successfully upserted: "${entry.intent_name}"`)
        successCount++
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`  ✗ Failed to process "${entry.intent_name}":`, error.message)
      errorCount++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('PLAYBOOK POPULATION COMPLETE')
  console.log(`✓ Success: ${successCount} scripts`)
  if (errorCount > 0) {
    console.log(`✗ Errors: ${errorCount} scripts`)
  }
  console.log('='.repeat(60))
}

// Run the population script
populatePlaybook().catch(console.error)