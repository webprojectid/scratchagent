import { generatePlanStructure } from './src/lib/generate';

const run = async () => {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('🚀 REAL SIMULATION - teguhends@gmail.com');
  console.log('═══════════════════════════════════════════');
  console.log('');
  
  // PLAN 1: EASY
  console.log('🔥 PLAN 1/2: EASY (Todo App)');
  console.log('─'.repeat(60));
  
  const t1 = Date.now();
  const easy = await generatePlanStructure(
    'Aplikasi todo list sederhana: CRUD tasks, categorization work/personal, priority high/medium/low, due dates, filtering all/active/completed, drag-and-drop reordering. Mobile-responsive PWA.',
    { mode: 'auto' },
    undefined,
    'free'
  );
  const e1 = Date.now() - t1;
  
  console.log('');
  console.log('✅ EASY PLAN GENERATED!');
  console.log('   Title      : ' + easy.title);
  console.log('   Features   : ' + easy.features.length);
  console.log('   Stack      : ' + easy.stack.join(', '));
  console.log('   Tokens     : ' + (easy.usage.tokensIn + easy.usage.tokensOut).toLocaleString());
  console.log('   Time       : ' + e1 + 'ms');
  console.log('');
  easy.features.forEach((f, i) => console.log('   ' + (i+1) + '. ' + f.title));
  
  // PLAN 2: HARD
  console.log('');
  console.log('─'.repeat(60));
  console.log('');
  console.log('🔥 PLAN 2/2: HARD (Marketplace)');
  console.log('─'.repeat(60));
  
  const t2 = Date.now();
  const hard = await generatePlanStructure(
    'Platform e-commerce multi-vendor: vendor registration, product listing with variants color/size, real-time inventory tracking, order processing shipping JNE/J&T, payment gateway Midtrans, escrow system, rating review, live chat buyer-seller, analytics dashboard vendor, admin moderation panel.',
    { mode: 'auto' },
    undefined,
    'free'
  );
  const e2 = Date.now() - t2;
  
  console.log('');
  console.log('✅ HARD PLAN GENERATED!');
  console.log('   Title      : ' + hard.title);
  console.log('   Features   : ' + hard.features.length);
  console.log('   Stack      : ' + hard.stack.join(', '));
  console.log('   Tokens     : ' + (hard.usage.tokensIn + hard.usage.tokensOut).toLocaleString());
  console.log('   Time       : ' + e2 + 'ms');
  console.log('');
  hard.features.forEach((f, i) => console.log('   ' + (i+1) + '. ' + f.title));
  
  // SUMMARY
  const totalTokens = easy.usage.tokensIn + easy.usage.tokensOut + hard.usage.tokensIn + hard.usage.tokensOut;
  console.log('');
  console.log('═'.repeat(60));
  console.log('🎉 ALL DONE!');
  console.log('═'.repeat(60));
  console.log('   Total Tokens : ' + totalTokens.toLocaleString());
  console.log('   Total Cost   : $' + (totalTokens * 0.00001).toFixed(4));
  console.log('   Total Time   : ' + (e1 + e2) + 'ms');
  console.log('═'.repeat(60));
};

run().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
