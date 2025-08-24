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
    intent_name: "opening_script",
    representative_phrases: [
      "I need some help with my credit.",
      "Can you help me with credit repair?",
      "I saw an ad and I need to fix my credit score."
    ],
    script: "Hi [Customer Name], this is [Your Name] from Zeroscript. How is your day going? ... Great to hear. I'm giving you a call because you requested some information about helping with your credit. To start, are you aware of the specific negative items on your account?"
  },
  {
    intent_name: "price_inquiry",
    representative_phrases: [
      "How much does this cost?",
      "What's your pricing?",
      "Can you tell me the cost?",
      "So what's the fee for this?"
    ],
    script: "That's a fair question. The investment is [Amount] per month, and that covers everything. There are no other hidden fees."
  },
  {
    intent_name: "guarantee_question",
    representative_phrases: [
      "Do you have a money back guarantee?",
      "Is there a guarantee?",
      "What if I'm not satisfied?",
      "What happens if it doesn't work?"
    ],
    script: "You are protected by a 100% money-back guarantee. If we don't provide you with a minimum of a 100-point increase across all three bureaus in 90 days, you get all of your money back, fully refunded."
  },
  {
    intent_name: "authority_pitch",
    representative_phrases: [
      "Why should I choose you?",
      "What makes you different?",
      "How do I know this isn't a scam?"
    ],
    script: "That's a great question. Our founder, Matt, has been building our credibility for over ten years and is one of the best in the industry. He's the one who will be heading the work on your file."
  },
  {
    intent_name: "objection_indecision",
    representative_phrases: [
      "I need to think about it.",
      "Let me think this over.",
      "I need to talk to my spouse about this."
    ],
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
  
  // Calculate total number of entries (phrases) to process
  const totalEntries = goldenScripts.reduce((sum, script) => sum + script.representative_phrases.length, 0)
  console.log(`\nProcessing ${goldenScripts.length} golden scripts with ${totalEntries} total phrases...`)
  
  let successCount = 0
  let errorCount = 0
  let entryCounter = 0
  
  for (const entry of goldenScripts) {
    console.log(`\n[Intent: "${entry.intent_name}"] Processing ${entry.representative_phrases.length} phrases...`)
    
    // Loop through each representative phrase for this intent
    for (const phrase of entry.representative_phrases) {
      entryCounter++
      
      try {
        console.log(`\n  [${entryCounter}/${totalEntries}] Processing phrase: "${phrase}"`)
        
        // Generate embedding for the representative phrase using text-embedding-3-small model
        console.log(`    → Generating embedding...`)
        const embedding = await generateEmbedding(phrase)
        console.log(`    ✓ Embedding generated (dimension: ${embedding.length})`)
        
        // Check if entry already exists for this specific phrase
        console.log(`    → Checking if this phrase already exists...`)
        const { data: existing, error: checkError } = await supabase
          .from('playbook')
          .select('id')
          .eq('intent_name', entry.intent_name)
          .eq('representative_phrase', phrase)
          .single()
        
        if (checkError && checkError.code !== 'PGRST116') {  // PGRST116 = no rows found
          throw checkError
        }
        
        let error
        
        if (existing) {
          // Update existing entry
          console.log(`    → Updating existing entry...`)
          const result = await supabase
            .from('playbook')
            .update({
              script: entry.script,
              embedding: JSON.stringify(embedding)
            })
            .eq('id', existing.id)
          error = result.error
        } else {
          // Insert new entry with the representative phrase
          console.log(`    → Inserting new entry into playbook table...`)
          const result = await supabase
            .from('playbook')
            .insert({
              intent_name: entry.intent_name,
              representative_phrase: phrase,
              script: entry.script,
              embedding: JSON.stringify(embedding)
            })
          error = result.error
        }
        
        if (error) {
          console.error(`    ✗ Error upserting phrase:`, error.message)
          errorCount++
        } else {
          console.log(`    ✓ Successfully upserted phrase for intent "${entry.intent_name}"`)
          successCount++
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (error) {
        console.error(`    ✗ Failed to process phrase "${phrase}":`, error.message)
        errorCount++
      }
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('PLAYBOOK POPULATION COMPLETE')
  console.log(`✓ Success: ${successCount} phrases`)
  if (errorCount > 0) {
    console.log(`✗ Errors: ${errorCount} phrases`)
  }
  console.log('='.repeat(60))
}

// Run the population script
populatePlaybook().catch(console.error)