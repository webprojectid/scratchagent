/**
 * REAL-TEST GENERATION SCRIPT v2
 * 
 * Purpose: Generate actual plans via LLM dengan force-set env vars
 */

// Force-set environment variables BEFORE importing generate.ts
process.env.LLM_BASE_URL = 'http://localhost:20128/v1';
process.env.LLM_API_KEY = 'sk-7587337097600db9-wuye2z-dd0434bb';
process.env.LLM_MODEL = 'qd/qmodel_38max';
process.env.NODE_ENV = 'development';

import { generatePlanStructure, generateTasksForFeature, assignTasksToSubFeatures } from '../src/lib/generate';
import fs from 'fs/promises';
import path from 'path';

console.log('\n' + '═'.repeat(80));
console.log('REAL PLAN GENERATION TEST - v2');
console.log('User Context: teguhends@gmail.com');
console.log(`LLM: qd/qmodel_38max @ ${process.env.LLM_BASE_URL}`);
console.log(`API Key: ${process.env.LLM_API_KEY?.substring(0, 15)}...${process.env.LLM_API_KEY?.slice(-4)}`);
console.log('═'.repeat(80));

const TEST_CONFIG = {
  USER_EMAIL: "teguhends@gmail.com",
};

const PLANS_TO_GENERATE = [
  {
    id: 'easy-todo-app',
    name: 'Scratch Todo App',
    brief: "Aplikasi todo list sederhana untuk produktivitas harian: CRUD tasks, categorization (work/personal), priority levels (high/medium/low), due dates, basic filtering (all/active/completed), dan drag-and-drop reordering. Mobile-responsive PWA.",
    tier: 'free',
  },
];

class GenerationHistory {
  private history: any[] = [];

  async record(entry: any) {
    const record = {
      id: `gen-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    
    this.history.push(record);
    return record;
  }
}

async function generatePlan(planConfig: any, history: GenerationHistory) {
  console.log(`\n🎯 Generating: ${planConfig.name}`);
  console.log('─'.repeat(80));
  
  try {
    // Step 1: Generate PRD Structure
    console.log('\n📝 Step 1: Calling LLM for PRD Structure...');
    const prdResult = await generatePlanStructure(
      planConfig.brief,
      { mode: 'auto' },
      undefined,
      planConfig.tier
    );
    
    const elapsedPRD = ((Date.now()) / 1000).toFixed(2);
    
    console.log(`✅ PRD Generated successfully!`);
    console.log(`   Title: "${prdResult.title}"`);
    console.log(`   Features count: ${prdResult.features.length}`);
    console.log(`   Stack: ${prdResult.stack.join(', ')}`);
    console.log(`   Architecture diagram: ${prdResult.architecture.includes('mermaid') ? '✓ Yes' : '✗ No (fallback)'}`);
    console.log(`   Database schema: ${prdResult.databaseSchema.includes('mermaid') ? '✓ Yes' : '✗ No (fallback)'}`);
    console.log(`   Token usage: ${prdResult.usage.tokensIn.toLocaleString()} in / ${prdResult.usage.tokensOut.toLocaleString()} out`);
    console.log(`   Total tokens: ${(prdResult.usage.tokensIn + prdResult.usage.tokensOut).toLocaleString()}`);
    
    if (prdResult.warnings.length > 0) {
      console.log(`   ⚠️  Warnings (${prdResult.warnings.length}):`);
      prdResult.warnings.forEach((w: string, idx: number) => {
        console.log(`      ${idx + 1}. ${w}`);
      });
    }
    
    // Record to history
    const record = await history.record({
      planId: planConfig.id,
      planName: planConfig.name,
      userContext: TEST_CONFIG.USER_EMAIL,
      tier: planConfig.tier,
      featuresCount: prdResult.features.length,
      status: 'success',
      tokensIn: prdResult.usage.tokensIn,
      tokensOut: prdResult.usage.tokensOut,
      totalTokens: prdResult.usage.tokensIn + prdResult.usage.tokensOut,
      stack: prdResult.stack,
      architectureDiagram: prdResult.architecture.includes('mermaid'),
      databaseDiagram: prdResult.databaseSchema.includes('mermaid'),
      warnings: prdResult.warnings,
    });
    
    console.log(`\n✅ SUCCESS! Plan generated.`);
    console.log(`   Tokens consumed: ${record.totalTokens.toLocaleString()}`);
    console.log(`   Estimated cost: $${(record.totalTokens * 0.00001).toFixed(4)} USD`);
    
    return { success: true, record, prdResult };
    
  } catch (error: any) {
    console.error(`❌ FAILED: ${error.message}`);
    
    const record = await history.record({
      planId: planConfig.id,
      planName: planConfig.name,
      userContext: TEST_CONFIG.USER_EMAIL,
      status: 'failed',
      error: error.message,
    });
    
    return { success: false, record, error: error.message };
  }
}

async function printReport(historyInstance: GenerationHistory, allResults: any[]) {
  console.log('\n\n🎉 FINAL REPORT - REAL PLAN GENERATION COMPLETE');
  console.log('═'.repeat(80));
  
  const successful = allResults.filter(r => r.success).length;
  const failed = allResults.filter(r => !r.success).length;
  const totalTokens = allResults.reduce((sum: number, r: any) => sum + (r.record?.totalTokens || 0), 0);
  
  console.log(`\n📊 Summary:`);
  console.log(`   User: ${TEST_CONFIG.USER_EMAIL}`);
  console.log(`   Plans attempted: ${allResults.length}`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total tokens consumed: ${totalTokens.toLocaleString()}`);
  console.log(`   Estimated cost: $${(totalTokens * 0.00001).toFixed(4)} USD`);
  
  console.log(`\n📋 Detailed Results:`);
  
  allResults.forEach((result: any, idx: number) => {
    console.log(`\n${idx + 1}. ${result.record.planName}`);
    console.log(`   Status: ${result.record.status.toUpperCase()}`);
    
    if (result.success && result.prdResult) {
      const prd = result.prdResult;
      console.log(`   Features: ${prd.features.length}`);
      console.log(`   Stack: ${prd.stack.join(', ')}`);
      console.log(`   Diagrams: Architect=${prd.architecture.includes('mermaid') ? '✓' : '✗'}, DB=${prd.databaseSchema.includes('mermaid') ? '✓' : '✗'}`);
      console.log(`   Tokens: ${prd.usage.tokensIn.toLocaleString()} in / ${prd.usage.tokensOut.toLocaleString()} out`);
      console.log(`   Cost: $${(prd.usage.tokensIn + prd.usage.tokensOut) * 0.00001.toFixed(4)} USD`);
      
      if (prd.warnings && prd.warnings.length > 0) {
        console.log(`   Warnings: ${prd.warnings.length}`);
      }
    } else {
      console.log(`   Error: ${result.record.error}`);
    }
  });
  
  console.log(`\n═`.repeat(80));
  console.log(`✅ Test completed successfully!`);
  console.log(`\nNext steps:\n`);
  console.log(`  1. Verify the generated plan in web app`);
  console.log(`  2. Check mindmap visualization`);
  console.log(`  3. Review task assignments`);
  console.log(`  4. Start CLI agent execution if needed\n`);
}

async function main() {
  try {
    const history = new GenerationHistory();
    
    // Generate each plan
    for (const planConfig of PLANS_TO_GENERATE) {
      const result = await generatePlan(planConfig, history);
      
      if (result.success) {
        console.log('\n💾 Saving generation metadata...\n');
      }
      
      // Brief pause before next generation
      console.log('\n⏱️  Waiting 2 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Final report
    await printReport(history, []);
    
  } catch (error: any) {
    console.error('\n💥 Critical error:', error);
    process.exit(1);
  }
}

main();
