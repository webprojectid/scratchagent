/**
 * REAL TOKEN BURNING TEST
 * 
 * Purpose: Execute REAL plan generation with ACTUAL API calls
 * NO MOCKS, NO FAKE DATA - REAL LLM execution only
 * 
 * Warning: This will consume tokens and money!
 * Estimated cost: $0.05 - $0.15 USD per plan
 */

import { generatePlanStructure, generateTasksForFeature } from '../src/lib/generate';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// CONFIGURATION - CHANGE THIS TO YOUR ACCOUNT DETAILS
// ============================================================================

const REAL_TEST_CONFIG = {
  USER_EMAIL: 'teguhends@gmail.com',
  ACCOUNT_NAME: 'Teguh Adhi Wibowo',
  
  // Enable/disable testing
  ENABLE_TESTS: true,
  
  // Plan configurations (REAL briefs for production apps)
  PLANS_TO_GENERATE: [
    {
      id: 'real-todo-app',
      name: 'Real Todo App v2',
      tier: 'free',
      brief: "Aplikasi todo list modern untuk produktivitas harian dengan fitur lengkap: CRUD tasks multi-user, categorization work/personal/family dengan warna berbeda, priority levels high/medium/low dengan icon, due dates dengan reminder otomatis 1 hari sebelumnya, basic filtering all/active/completed/priority-based, drag-and-drop reordering antar categories dengan smooth animations, dan PWA responsive full mobile support dengan offline-first architecture dan sync background.",
      expectedFeatures: 6, // Free tier limit
      maxTokens: 8000, // Budget
    },
  ],
  
  // Output settings
  OUTPUT_DIR: './real-generation-results',
};

// ============================================================================
// REAL TOKEN TRACKER
// ============================================================================

class RealTokenTracker {
  private totalTokensIn: number = 0;
  private totalTokensOut: number = 0;
  private totalCostUSD: number = 0;
  private generations: Array<{
    planId: string;
    planName: string;
    tokensIn: number;
    tokensOut: number;
    durationMs: number;
    success: boolean;
    error?: string;
  }> = [];

  constructor() {
    console.log('\n🔥 REAL TOKEN BURNER INITIALIZED');
    console.log('='.repeat(70));
    console.log(`User: ${REAL_TEST_CONFIG.USER_EMAIL}`);
    console.log(`Test Mode: TRUE (NO MOCKS)`);
    console.log('');
  }

  async saveResults(results: any[]) {
    const timestamp = Date.now();
    await fs.mkdir(REAL_TEST_CONFIG.OUTPUT_DIR, { recursive: true });
    
    const report = {
      generatedAt: new Date().toISOString(),
      userContext: REAL_TEST_CONFIG.USER_EMAIL,
      summary: {
        totalGenerations: this.generations.length,
        successful: this.generations.filter(g => g.success).length,
        totalTokensIn: this.totalTokensIn,
        totalTokensOut: this.totalTokensOut,
        totalEstimatedCost: this.totalCostUSD,
      },
      generations: this.generations,
      rawResults: results,
    };
    
    const filePath = path.join(REAL_TEST_CONFIG.OUTPUT_DIR, `report-${timestamp}.json`);
    await fs.writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n✅ Results saved to: ${filePath}`);
  }

  recordGeneration(result: Parameters<typeof this.addGeneration>[0]) {
    this.generations.push(result);
    this.totalTokensIn += result.tokensIn;
    this.totalTokensOut += result.tokensOut;
    
    // Estimate cost (~$0.00001 per token for standard models)
    this.totalCostUSD += (result.tokensIn + result.tokensOut) * 0.00001;
    
    console.log(`💰 Cost so far: $${this.totalCostUSD.toFixed(4)} USD (${this.totalTokensIn.toLocaleString()} in / ${this.totalTokensOut.toLocaleString()} out tokens)`);
  }

  printSummary() {
    console.log('\n📊 REAL GENERATION SUMMARY');
    console.log('═'.repeat(70));
    console.log(`Total generations: ${this.generations.length}`);
    console.log(`Successful: ${this.generations.filter(g => g.success).length}`);
    console.log(`Failed: ${this.generations.filter(g => !g.success).length}`);
    console.log('─'.repeat(70));
    console.log(`Total input tokens:  ${this.totalTokensIn.toLocaleString()}`);
    console.log(`Total output tokens: ${this.totalTokensOut.toLocaleString()}`);
    console.log(`Total tokens burned: ${(this.totalTokensIn + this.totalTokensOut).toLocaleString()}`);
    console.log('─'.repeat(70));
    console.log(`Estimated cost:     $${this.totalCostUSD.toFixed(4)} USD`);
    console.log('═'.repeat(70));
    
    if (this.generations.length > 0) {
      console.log('\n📝 Detailed Breakdown:');
      this.generations.forEach((g, idx) => {
        console.log(`\n${idx + 1}. ${g.planName} (${g.tokensIn.toLocaleString()} in / ${g.tokensOut.toLocaleString()} out)`);
        console.log(`   Duration: ${g.durationMs}ms`);
        console.log(`   Status: ${g.success ? 'SUCCESS ✓' : 'FAILED ✗'}`);
        if (!g.success && g.error) {
          console.log(`   Error: ${g.error.substring(0, 100)}`);
        }
      });
    }
  }
}

// ============================================================================
// REAL EXECUTION ENGINE
// ============================================================================

async function executeRealPlan(
  planConfig: typeof REAL_TEST_CONFIG.PLANS_TO_GENERATE[0],
  tracker: RealTokenTracker
): Promise<any> {
  console.log(`\n🎯 STARTING REAL PLAN: ${planConfig.name}`);
  console.log('─'.repeat(70));
  console.log(`Brief preview: "${planConfig.brief.substring(0, 100)}..."`);
  console.log(`Tier: ${planConfig.tier.toUpperCase()}`);
  console.log(`Expected features: ${planConfig.expectedFeatures}`);
  console.log(`Max tokens budget: ${planConfig.maxTokens.toLocaleString()}`);
  console.log('─'.repeat(70));
  
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Calling REAL LLM API (this may take 30-90 seconds)...');
    
    // STEP 1: Generate PRD Structure (ACTUAL API CALL)
    const prdResult = await generatePlanStructure(
      planConfig.brief,
      { mode: 'auto' },
      undefined,
      planConfig.tier
    );
    
    const elapsedPRD = Date.now() - startTime;
    
    console.log(`\n✅ PRD Generated Successfully!`);
    console.log(`   Title: "${prdResult.title}"`);
    console.log(`   Brief: "${prdResult.brief.substring(0, 80)}..."`);
    console.log(`   Features count: ${prdResult.features.length} (limit: ${planConfig.expectedFeatures})`);
    console.log(`   Stack: ${prdResult.stack.join(', ')}`);
    console.log(`   ⚠️  Architecture diagram: ${prdResult.architecture.includes('mermaid') ? 'YES ✓' : 'NO ✗ (fallback)'}`);
    console.log(`   ⚠️  Database schema: ${prdResult.databaseSchema.includes('mermaid') ? 'YES ✓' : 'NO ✗ (fallback)'}`);
    console.log(`   🔢 Input tokens:  ${prdResult.usage.tokensIn.toLocaleString()}`);
    console.log(`   🔢 Output tokens: ${prdResult.usage.tokensOut.toLocaleString()}`);
    console.log(`   💰 Total tokens: ${(prdResult.usage.tokensIn + prdResult.usage.tokensOut).toLocaleString()}`);
    console.log(`   💵 Estimated cost: $${(prdResult.usage.tokensIn + prdResult.usage.tokensOut) * 0.00001.toFixed(4)} USD`);
    
    if (prdResult.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${prdResult.warnings.length}):`);
      prdResult.warnings.forEach((w, i) => console.log(`   ${i + 1}. ${w}`));
    }
    
    // Record generation
    tracker.recordGeneration({
      planId: planConfig.id,
      planName: planConfig.name,
      tokensIn: prdResult.usage.tokensIn,
      tokensOut: prdResult.usage.tokensOut,
      durationMs: elapsedPRD,
      success: true,
    });
    
    console.log('\n✨ Plan generation COMPLETE with REAL tokens burned!');
    console.log('═'.repeat(70));
    
    return {
      success: true,
      elapsedTime: elapsedPRD,
      prdResult,
      actualTokensUsed: prdResult.usage.tokensIn + prdResult.usage.tokensOut,
      estimatedCost: (prdResult.usage.tokensIn + prdResult.usage.tokensOut) * 0.00001,
    };
    
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    
    console.error(`\n❌ REAL GENERATION FAILED!`);
    console.error(`Error: ${error.message}`);
    
    if (error.cause) {
      console.error(`Cause: ${error.cause}`);
    }
    
    tracker.recordGeneration({
      planId: planConfig.id,
      planName: planConfig.name,
      tokensIn: 0,
      tokensOut: 0,
      durationMs: elapsed,
      success: false,
      error: error.message,
    });
    
    return {
      success: false,
      elapsedTime: elapsed,
      error: error.message,
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('⚠️  REAL TOKEN BURNING TEST');
  console.log('='.repeat(70));
  console.log('WARNING: This will consume ACTUAL tokens and cost money!');
  console.log('No mocks, no simulations - PURE REAL LLM EXECUTION');
  console.log('='.repeat(70));
  
  if (!REAL_TEST_CONFIG.ENABLE_TESTS) {
    console.log('\n⛔ TESTS DISABLED - Set ENABLE_TESTS: true to run');
    return;
  }
  
  const tracker = new RealTokenTracker();
  const results: any[] = [];
  
  try {
    // Check environment variables first
    console.log('\n🔍 Verifying LLM Configuration...');
    if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY || !process.env.LLM_MODEL) {
      throw new Error('LLM environment variables not configured!\nPlease set LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL in .env file');
    }
    console.log(`✓ Base URL: ${process.env.LLM_BASE_URL}`);
    console.log(`✓ Model: ${process.env.LLM_MODEL}`);
    console.log(`✓ API Key present: ${process.env.LLM_API_KEY?.substring(0, 10)}...`);
    
    // Execute each plan
    for (let i = 0; i < REAL_TEST_CONFIG.PLANS_TO_GENERATE.length; i++) {
      const planConfig = REAL_TEST_CONFIG.PLANS_TO_GENERATE[i];
      
      console.log(`\n\n🔄 PLAN ${i + 1}/${REAL_TEST_CONFIG.PLANS_TO_GENERATE.length}: ${planConfig.name}`);
      const result = await executeRealPlan(planConfig, tracker);
      results.push(result);
      
      if (i < REAL_TEST_CONFIG.PLANS_TO_GENERATE.length - 1) {
        console.log(`\n⏱️  Pausing 5 seconds before next generation...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Save results
    await tracker.saveResults(results);
    
    // Print final summary
    tracker.printSummary();
    
    console.log('\n🎉 REAL TOKEN BURNING TEST COMPLETE!');
    console.log('═'.repeat(70));
    console.log(`\n💡 Summary:`);
    console.log(`   Plans attempted: ${tracker.generations.length}`);
    console.log(`   Successful generations: ${tracker.generations.filter(g => g.success).length}`);
    console.log(`   TOTAL TOKENS BURNED: ${tracker.totalTokensIn + tracker.totalTokensOut} tokens`);
    console.log(`   TOTAL COST: $${tracker.totalCostUSD.toFixed(4)} USD`);
    
    // Check if we exceeded budget
    const totalBudget = REAL_TEST_CONFIG.PLANS_TO_GENERATE.reduce((sum, p) => sum + p.maxTokens, 0);
    const exceededBudget = (tracker.totalTokensIn + tracker.totalTokensOut) > totalBudget;
    
    if (exceededBudget) {
      console.log(`\n⚠️  WARNING: Exceeded token budget by ${(tracker.totalTokensIn + tracker.totalTokensOut - totalBudget).toLocaleString()} tokens`);
    }
    
    console.log('\n📁 Full report saved to ./real-generation-results/\n');
    
  } catch (error: any) {
    console.error('\n💥 CRITICAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
