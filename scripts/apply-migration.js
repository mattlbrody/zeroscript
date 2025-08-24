import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  console.error('Required: REACT_APP_SUPABASE_URL')
  console.error('Required: SUPABASE_SERVICE_ROLE_KEY (or REACT_APP_SUPABASE_ANON_KEY as fallback)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('='.repeat(60))
  console.log('APPLYING DATABASE MIGRATION')
  console.log('='.repeat(60))
  
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', 'fix_match_script_column_name.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('\nMigration to apply:')
    console.log(migrationSQL)
    console.log('\n' + '='.repeat(60))
    
    // Note: The Supabase JS client doesn't directly support running raw SQL migrations
    // You'll need to run this SQL directly in the Supabase SQL Editor
    
    console.log('\n⚠️  IMPORTANT: The Supabase JS client cannot directly execute DDL statements.')
    console.log('\nTo fix the issue, please follow these steps:')
    console.log('\n1. Go to your Supabase project dashboard')
    console.log('2. Navigate to the SQL Editor')
    console.log('3. Copy and paste the following SQL:')
    console.log('\n' + '-'.repeat(60))
    console.log(migrationSQL)
    console.log('-'.repeat(60))
    console.log('\n4. Click "Run" to execute the migration')
    console.log('\n✅ Once done, the test script should work correctly.')
    
    // Test if the function exists with correct signature
    console.log('\n' + '='.repeat(60))
    console.log('TESTING CURRENT FUNCTION STATUS')
    console.log('='.repeat(60))
    
    const dummyEmbedding = new Array(1536).fill(0.1)
    const { data: functionResult, error: functionError } = await supabase
      .rpc('match_script', {
        query_embedding: dummyEmbedding,
        match_threshold: 0.4
      })
    
    if (functionError) {
      console.log('\n❌ Current function has errors:')
      console.log('   Message:', functionError.message)
      console.log('   Code:', functionError.code)
      
      if (functionError.message.includes('column p.intent does not exist')) {
        console.log('\n   This confirms the column name mismatch issue.')
        console.log('   The migration above will fix this problem.')
      }
    } else {
      console.log('\n✅ Function is working correctly!')
      console.log('   Result:', functionResult)
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

applyMigration().catch(console.error)