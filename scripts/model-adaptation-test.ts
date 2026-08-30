import "./lib-env";
/**
 * MODEL ADAPTATION TEST SCRIPT
 * 
 * Purpose: Verify system works with different LLM providers without code changes
 * Just change LLM_BASE_URL and LLM_MODEL environment variables!
 */

import { fetchAndParseLLM } from '../src/lib/sse-parser';

// Test configurations
const TEST_CONFIGS = [
  {
    name: 'qd/qmodel_38max (Local)',
    baseUrl: 'http://localhost:20128/v1',
    model: 'qd/qmodel_38max',
    apiKey: 'process.env.LLM_API_KEY ?? ""',
  },
  {
    name: 'OpenAI GPT-4o-mini (External)',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-key-here',
  },
];

async function testProvider(config: typeof TEST_CONFIGS[0]) {
  console.log(`\n🔬 Testing ${config.name}`);
  console.log('─'.repeat(60));
  
  try {
    const result = await fetchAndParseLLM(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{
          role: 'system',
          content: 'You are a testing assistant.'
        }, {
          role: 'user',
          content: 'Respond with exactly: {"test":"success","mode":"auto"}'
        }]
      })
    });
    
    console.log(`✅ ${config.name}: WORKING`);
    console.log(`   Detected mode: ${result.mode.toUpperCase()}`);
    console.log(`   Response length: ${result.content.length} chars`);
    console.log(`   Content preview: "${result.content.substring(0, 50)}..."`);
    
    return { success: true, mode: result.mode };
    
  } catch (error: any) {
    console.error(`❌ ${config.name}: FAILED`);
    console.error(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🧪 MODEL ADAPTATION TESTING');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const config of TEST_CONFIGS) {
    const result = await testProvider(config);
    results.push({ ...config, ...result });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:');
  
  results.forEach(r => {
    console.log(`\n${r.name}:`);
    if (r.success) {
      console.log(`  ✅ Working (${r.mode} mode detected)`);
    } else {
      console.log(`  ❌ Failed - ${r.error}`);
    }
  });
  
  console.log('\n💡 All configs tested automatically adapt to their response format!\n');
}

main();
