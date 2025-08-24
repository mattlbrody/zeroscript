import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTableStructure() {
  console.log('='.repeat(60))
  console.log('CHECKING PLAYBOOK TABLE STRUCTURE')
  console.log('='.repeat(60))
  
  try {
    // Try alternative approach - select from information_schema
    const { data, error } = await supabase
      .from('playbook')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Error accessing playbook table:', error)
      console.error('\nDetails:', error.message)
      console.error('Code:', error.code)
      console.error('Hint:', error.hint)
    } else {
      console.log('\nSample row from playbook table:')
      console.log(JSON.stringify(data, null, 2))
      
      if (data && data.length > 0) {
        console.log('\nDetected columns:')
        Object.keys(data[0]).forEach(col => {
          console.log(`  - ${col}: ${typeof data[0][col]}`)
        })
      } else {
        console.log('\nTable exists but has no data')
        
        // Try to insert a test row to see table structure
        const { error: insertError } = await supabase
          .from('playbook')
          .insert({
            intent: 'test_intent',
            script: 'test_script',
            embedding: JSON.stringify(new Array(1536).fill(0.1))
          })
        
        if (insertError) {
          console.log('\nInsert test revealed table structure issue:')
          console.log('Error:', insertError.message)
          console.log('Code:', insertError.code)
          console.log('Details:', insertError.details)
          console.log('Hint:', insertError.hint)
        }
      }
    }
    
    // Also check if the match_script function exists
    console.log('\n' + '='.repeat(60))
    console.log('CHECKING MATCH_SCRIPT FUNCTION')
    console.log('='.repeat(60))
    
    // Try calling the function with dummy data
    const dummyEmbedding = new Array(1536).fill(0.1)
    const { data: functionResult, error: functionError } = await supabase
      .rpc('match_script', {
        query_embedding: dummyEmbedding,
        match_threshold: 0.4
      })
    
    if (functionError) {
      console.log('\nFunction error:')
      console.log('Message:', functionError.message)
      console.log('Code:', functionError.code)
      console.log('Details:', functionError.details)
      console.log('Hint:', functionError.hint)
    } else {
      console.log('\nFunction exists and returned:')
      console.log(JSON.stringify(functionResult, null, 2))
    }
    
    // Check playbook table row count
    const { count, error: countError } = await supabase
      .from('playbook')
      .select('*', { count: 'exact', head: true })
    
    if (!countError) {
      console.log(`\nTotal rows in playbook table: ${count}`)
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkTableStructure().catch(console.error)