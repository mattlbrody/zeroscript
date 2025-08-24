import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
const testUserEmail = process.env.TEST_USER_EMAIL
const testUserPassword = process.env.TEST_USER_PASSWORD

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables')
  console.error('Required: REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY')
  process.exit(1)
}

if (!testUserEmail || !testUserPassword) {
  console.error('Missing test user credentials')
  console.error('Required: TEST_USER_EMAIL, TEST_USER_PASSWORD in .env.local')
  process.exit(1)
}

// Test cases for the get-script function
// These match the actual intents in the database from populate-playbook.js
const testCases = [
  // Price objection tests
  { text: "How much does this cost?", expectedIntent: "price_objection" },
  { text: "What's the price for this?", expectedIntent: "price_objection" },
  { text: "Can you tell me the cost?", expectedIntent: "price_objection" },
  
  // Guarantee question tests
  { text: "Do you have a money back guarantee?", expectedIntent: "guarantee_question" },
  { text: "Is there a guarantee?", expectedIntent: "guarantee_question" },
  { text: "What if I'm not satisfied?", expectedIntent: "guarantee_question" },
  
  // Opening script tests
  { text: "I need some help with my credit.", expectedIntent: "opening_script" },
  { text: "Can you help me with credit repair?", expectedIntent: "opening_script" },
  
  // Authority pitch tests
  { text: "Why should I choose you?", expectedIntent: "authority_pitch" },
  { text: "What makes you different?", expectedIntent: "authority_pitch" },
  
  // Objection indecision tests
  { text: "I need to think about it.", expectedIntent: "objection_indecision" },
  { text: "Let me think this over", expectedIntent: "objection_indecision" },
  
  // Test cases that should NOT match (no corresponding intent in database)
  { text: "Does this integrate with Salesforce?", expectedIntent: null },
  { text: "How's the weather today?", expectedIntent: null }
]

async function getAuthToken() {
  // Create a test user session for authentication
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  console.log('Authenticating with test user...')
  
  try {
    // Sign in with the test user credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUserEmail,
      password: testUserPassword
    })
    
    if (error) {
      console.error('Authentication failed:', error.message)
      throw error
    }
    
    if (!data.session || !data.session.access_token) {
      throw new Error('No access token received from authentication')
    }
    
    console.log('✓ Authentication successful')
    return data.session.access_token
  } catch (error) {
    console.error('Failed to authenticate:', error.message)
    process.exit(1)
  }
}

async function testGetScript(text, token) {
  const functionUrl = `${supabaseUrl}/functions/v1/get-script`
  
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    })
    
    const result = await response.json()
    return { status: response.status, ...result }
  } catch (error) {
    return { error: error.message }
  }
}

async function runTests() {
  console.log('Starting Edge Function tests...\n')
  
  const token = await getAuthToken()
  
  for (const testCase of testCases) {
    console.log(`Testing: "${testCase.text}"`)
    
    const result = await testGetScript(testCase.text, token)
    
    if (result.error) {
      console.log(`  ❌ Error: ${result.error}`)
    } else if (result.success) {
      const intentMatch = result.intent === testCase.expectedIntent ? '✓' : '✗'
      console.log(`  ${intentMatch} Intent: ${result.intent} (expected: ${testCase.expectedIntent})`)
      console.log(`  Similarity: ${(result.similarity * 100).toFixed(1)}%`)
      console.log(`  Script preview: ${result.script.substring(0, 100)}...`)
    } else {
      // No match found - check if this was expected
      if (testCase.expectedIntent === null) {
        console.log(`  ✓ No match found (as expected)`)
      } else {
        console.log(`  ✗ No match found (expected: ${testCase.expectedIntent})`)
      }
    }
    
    console.log('')
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('Tests complete!')
}

// Run edge case tests
async function runEdgeCaseTests() {
  console.log('\n=== Edge Case Tests ===\n')
  
  const token = await getAuthToken()
  
  // Test with empty text
  console.log('Testing empty text:')
  let result = await testGetScript('', token)
  console.log(`  Status: ${result.status}`)
  console.log(`  Response: ${JSON.stringify(result)}\n`)
  
  // Test with very long text
  console.log('Testing very long text:')
  const longText = 'How much does it cost? '.repeat(100)
  result = await testGetScript(longText, token)
  console.log(`  Status: ${result.status}`)
  console.log(`  Success: ${result.success}\n`)
  
  // Test with special characters
  console.log('Testing special characters:')
  result = await testGetScript('What\'s the price? @#$%^&*()', token)
  console.log(`  Status: ${result.status}`)
  console.log(`  Success: ${result.success}\n`)
  
  // Test without authentication
  console.log('Testing without authentication:')
  const noAuthResult = await fetch(`${supabaseUrl}/functions/v1/get-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'test' })
  })
  console.log(`  Status: ${noAuthResult.status}`)
  const noAuthBody = await noAuthResult.json()
  console.log(`  Response: ${JSON.stringify(noAuthBody)}\n`)
}

// Main execution
async function main() {
  console.log('='.repeat(50))
  console.log('Get-Script Edge Function Test Suite')
  console.log('='.repeat(50) + '\n')
  
  await runTests()
  await runEdgeCaseTests()
}

main().catch(console.error)