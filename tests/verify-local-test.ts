import { generatePlanStructure } from '../src/lib/generate';

const quickTest = async () => {
  console.log('');
  console.log('========================================');
  console.log('⚠️  REAL LOCAL VERIFICATION TEST');
  console.log('========================================');
  console.log('');
  
  const startTime = Date.now();
  
  const result = await generatePlanStructure(
    'Aplikasi todo list sederhana dengan fitur CRUD tasks',
    { mode: 'auto' },
    undefined,
    'free'
  );
  
  const elapsed = Date.now() - startTime;
  
  console.log('');
  console.log('✅ SUCCESS! Plan generated with REAL tokens.');
  console.log('');
  console.log('-'.repeat(70));
  console.log(`   Plan Title: "${result.title}"`);
  console.log(`   Brief: "${result.brief.substring(0, 60)}..."`);
  console.log(`   Features: ${result.features.length}`);
  console.log(`   Stack: ${result.stack.join(', ')}`);
  console.log(`   Architecture diagram: ${result.architecture.includes('mermaid') ? 'YES ✓' : 'NO ✗'}`);
  console.log(`   Database schema: ${result.databaseSchema.includes('mermaid') ? 'YES ✓' : 'NO ✗'}`);
  console.log(`   Warnings: ${result.warnings.length > 0 ? result.warnings.length : 'None'}`);
  console.log('-'.repeat(70));
  console.log('');
  console.log('📊 TOKEN USAGE (REAL):');
  console.log(`   Input tokens:  ${result.usage.tokensIn.toLocaleString()}`);
  console.log(`   Output tokens: ${result.usage.tokensOut.toLocaleString()}`);
  console.log(`   Total burned: ${(result.usage.tokensIn + result.usage.tokensOut).toLocaleString()} tokens`);
  console.log(`   Generation time: ${elapsed}ms`);
  console.log(`   Estimated cost: $${((result.usage.tokensIn + result.usage.tokensOut) * 0.00001).toFixed(4)} USD`);
  console.log('-'.repeat(70));
  
  if (result.features.length > 0) {
    console.log('');
    console.log('📝 FEATURES GENERATED:');
    result.features.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.title}`);
    });
  }
  
  console.log('');
  console.log('========================================');
  console.log('🎉 LOCAL VERIFICATION COMPLETE!');
  console.log('========================================');
};

quickTest().catch(err => {
  console.error('');
  console.error('❌ TEST FAILED:', err.message);
  process.exit(1);
});
