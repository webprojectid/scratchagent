/**
 * END-TO-END SIMULATION WITH REAL LLM & AUTH
 * 
 * Purpose: Test complete flow menggunakan real API credentials dan save ke database
 * User: teguhends@gmail.com (based on account context)
 * History: Track all generations in database
 * 
 * Run: npx tsx tests/e2e-plan-generation.ts
 */

import { getDb } from '../src/db';
import { llmSettings, plans, tasks, users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { generatePlanStructure, generateTasksForFeature, buildTaskRef } from '../src/lib/generate';
import type { PlanIdea } from '../src/lib/types';

// ============================================================================
// SCENARIO DEFINITIONS
// ============================================================================

const SCENARIOS = {
  EASY: {
    name: "Scratch Todo App",
    brief: "Aplikasi todo list sederhana untuk produktivitas harian: CRUD tasks, categorization (work/personal), priority levels (high/medium/low), due dates, filtering, dan drag-and-drop reordering. Mobile-responsive PWA.",
    expectedTasks: 24,
    tier: 'free',
  },
  
  HARD: {
    name: "Scratch Marketplace Pro",
    brief: "Platform e-commerce multi-vendor lengkap: vendor management, product variants, real-time inventory tracking, order processing dengan shipping integration (JNE/J&T), payment gateway Midtrans, escrow system, rating/review system, live chat buyer-seller, analytics dashboard, admin moderation panel.",
    expectedTasks: 48,
    tier: 'pro',
  },
};

// ============================================================================
// HISTORY TRACKING
// ============================================================================

interface GenerationHistory {
  planId: string;
  scenarioName: string;
  userToken?: string;
  tier: string;
  tokensIn: number;
  tokensOut: number;
  featuresCount: number;
  tasksCount: number;
  createdAt: Date;
  status: 'success' | 'partial' | 'failed';
  error?: string;
}

class HistoryTracker {
  private history: GenerationHistory[] = [];
  
  record(gen: Omit<GenerationHistory, 'createdAt'>) {
    const entry = { ...gen, createdAt: new Date() };
    this.history.push(entry);
    
    // Save to database if available
    try {
      const db = getDb();
      void db.insert(plans).values({
        id: gen.planId,
        title: `${entry.scenarioName} - ${new Date().toLocaleString('id-ID')}`,
        brief: `Generated via E2E test: ${entry.scenarioName}`,
        stack: ['Next.js', 'PostgreSQL', 'Railway'],
        architecture: '',
        databaseSchema: '',
        asumsi: [],
        features: JSON.stringify([]),
        tasks: JSON.stringify([]),
        techStack: [],
        requirements: { fungsional: [], nonFungsional: [] },
        userFlow: [],
        status: 'ready' as const,
        userId: null,
        tokenUsed: null,
      }).onConflictDoNothing();
    } catch (error) {
      console.warn('[HistoryTracker] Failed to persist to DB:', error);
    }
    
    console.log(`✓ Recorded: ${entry.planId} (${entry.scenarioName}) - ${entry.tokensIn.toLocaleString()} in, ${entry.tokensOut.toLocaleString()} out tokens`);
  }
  
  getAll(): GenerationHistory[] {
    return this.history;
  }
  
  printSummary() {
    if (this.history.length === 0) {
      console.log('\n📭 No generations recorded');
      return;
    }
    
    console.log('\n📊 GENERATION HISTORY SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total generations: ${this.history.length}`);
    console.log(`Total tokens consumed: ${this.history.reduce((sum, h) => sum + h.tokensIn + h.tokensOut, 0).toLocaleString()}`);
    console.log(`Successful: ${this.history.filter(h => h.status === 'success').length}`);
    console.log(`Failed: ${this.history.filter(h => h.status === 'failed').length}`);
    
    console.log('\nRecent generations:');
    this.history.forEach((h, i) => {
      console.log(`\n${i + 1}. ${h.planId}`);
      console.log(`   Scenario: ${h.scenarioName}`);
      console.log(`   Tier: ${h.tier}`);
      console.log(`   Features: ${h.featuresCount}, Tasks: ${h.tasksCount}`);
      console.log(`   Tokens: ${h.tokensIn.toLocaleString()} in / ${h.tokensOut.toLocaleString()} out`);
      console.log(`   Status: ${h.status.toUpperCase()} (${new Date(h.createdAt).toLocaleString('id-ID')})`);
      if (h.error) {
        console.log(`   Error: ${h.error.substring(0, 100)}`);
      }
    });
    
    console.log('=' .repeat(60));
  }
}

// ============================================================================
// TEST EXECUTION
// ============================================================================

async function runE2ESimulation(scenarioName: string, scenarioData: any, historyTracker: HistoryTracker) {
  console.log(`\n🎯 STARTING E2E TEST: ${scenarioName.name}`);
  console.log('-'.repeat(70));
  
  const startTime = Date.now();
  const planId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    // Step 1: Generate PRD Structure with Real LLM
    console.log('\n📝 Step 1: Generating PRD Structure via LLM...');
    const prdResult = await generatePlanStructure(
      scenarioData.brief,
      { mode: 'auto' },
      undefined,
      scenarioData.tier as any
    );
    
    console.log(`✅ PRD Generated:`);
    console.log(`   Title: ${prdResult.title}`);
    console.log(`   Features: ${prdResult.features.length}`);
    console.log(`   Stack: ${prdResult.stack.join(', ')}`);
    console.log(`   Architecture diagram: ${prdResult.architecture.includes('mermaid') ? 'Yes ✓' : 'No ✗'}`);
    console.log(`   Database schema: ${prdResult.databaseSchema.includes('mermaid') ? 'Yes ✓' : 'No ✗'}`);
    console.log(`   Token usage: ${prdResult.usage.tokensIn.toLocaleString()} in, ${prdResult.usage.tokensOut.toLocaleString()} out`);
    console.log(`   Warnings: ${prdResult.warnings.length > 0 ? `${prdResult.warnings.length}` : 'None ✓'}`);
    
    // Step 2: Generate Tasks for Each Feature
    console.log('\n💼 Step 2: Generating Tasks per Feature...');
    const totalTasksGenerated = await generateAndAssignTasks(
      prdResult,
      scenarioName,
      historyTracker
    );
    
    // Record history
    historyTracker.record({
      planId,
      scenarioName: scenarioName.name,
      tier: scenarioData.tier,
      tokensIn: prdResult.usage.tokensIn,
      tokensOut: prdResult.usage.tokensOut,
      featuresCount: prdResult.features.length,
      tasksCount: totalTasksGenerated,
      status: 'success',
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ COMPLETED in ${elapsed}s\n`);
    
    return { success: true, elapsedTime: elapsed, prdResult, totalTasksGenerated };
    
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ FAILED after ${elapsed}s:`);
    console.error(`Error: ${error.message}`);
    if (error.cause) console.error('Cause:', error.cause);
    
    historyTracker.record({
      planId,
      scenarioName: scenarioName.name,
      tier: scenarioData.tier,
      tokensIn: 0,
      tokensOut: 0,
      featuresCount: 0,
      tasksCount: 0,
      status: 'failed',
      error: error.message,
    });
    
    return { success: false, elapsedTime: elapsed, error: error.message };
  }
}

async function generateAndAssignTasks(prdResult: any, scenarioName: string, historyTracker: HistoryTracker) {
  const { assignTasksToSubFeatures, generateTasksForFeature } = await import('../src/lib/generate');
  
  let totalTasks = 0;
  
  for (let i = 0; i < prdResult.features.length; i++) {
    const feature = prdResult.features[i];
    console.log(`\nGenerating tasks for Feature ${i + 1}/${prdResult.features.length}: ${feature.title}`);
    
    const subFeatureTasks = [];
    
    for (const [subIndex, subFeature] of feature.subFeatures.entries()) {
      console.log(`  Sub-feature: ${subFeature.title}`);
      
      const { tasks, usage } = await generateTasksForFeature(
        prdResult.brief,
        feature.title,
        [subFeature.title],
        i,
        prdResult.features[0]?.priority || 'free',
        prdResult.features.length
      );
      
      console.log(`    Generated ${tasks.length} tasks (${usage.tokensIn.toLocaleString()} in, ${usage.tokensOut.toLocaleString()} out)`);
      
      subFeatureTasks.push({
        featureIndex: i,
        subFeatureTitle: subFeature.title,
        tasks,
        usage,
        index: subIndex,
      });
      
      totalTasks += tasks.length;
    }
    
    // Assign tasks to sub-features
    const subFeatureTitles = feature.subFeatures.map(sf => sf.title);
    const combinedTasks = subFeatureTasks.flatMap(sft => sft.tasks.map(t => ({ ...t, sub_feature: sft.subFeatureTitle })));
    const taskMap = assignTasksToSubFeatures(combinedTasks, subFeatureTitles);
    
    feature.subFeatures = feature.subFeatures.map((sf: any, si: number) => ({
      ...sf,
      assignedTasks: taskMap.get(si) || [],
    }));
    
    console.log(`  ✓ Completed Feature ${i + 1}`);
  }
  
  console.log(`\n✓ All features processed. Total tasks generated: ${totalTasks.toLocaleString()}`);
  
  return totalTasks;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n🚀 Starting E2E Simulation with REAL LLM');
  console.log('User Context: teguhends@gmail.com (assumed)');
  console.log('='.repeat(70));
  
  // Initialize history tracker
  const historyTracker = new HistoryTracker();
  
  try {
    // Check LLM configuration
    console.log('\n🔍 Verifying LLM Configuration...');
    const envVars = process.env;
    if (!envVars.LLM_BASE_URL || !envVars.LLM_API_KEY || !envVars.LLM_MODEL) {
      throw new Error('LLM environment variables not configured. Please set LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL in .env file.');
    }
    console.log(`✓ Base URL: ${envVars.LLM_BASE_URL}`);
    console.log(`✓ Model: ${envVars.LLM_MODEL}`);
    console.log(`✓ API Key: ${envVars.LLM_API_KEY?.substring(0, 10)}...${envVars.LLM_API_KEY?.substring(envVars.LLM_API_KEY.length - 4)}`);
    
    // Run simulations
    const results = {
      easy: await runE2ESimulation('EASY', SCENARIOS.EASY, historyTracker),
      hard: await runE2ESimulation('HARD', SCENARIOS.HARD, historyTracker),
    };
    
    // Print final report
    historyTracker.printSummary();
    
    // Summary statistics
    console.log('\n📈 FINAL STATISTICS');
    console.log('='.repeat(70));
    const totalPlans = 2;
    const successful = results.easy.success && results.hard.success ? 2 : results.easy.success || results.hard.success ? 1 : 0;
    console.log(`Plans attempted: ${totalPlans}`);
    console.log(`Plans successful: ${successful}`);
    console.log(`Success rate: ${Math.round((successful / totalPlans) * 100)}%`);
    
    const easyTokens = results.easy.prdResult?.usage.tokensIn + results.easy.prdResult?.usage.tokensOut || 0;
    const hardTokens = results.hard.prdResult?.usage.tokensIn + results.hard.prdResult?.usage.tokensOut || 0;
    const totalTokens = easyTokens + hardTokens;
    console.log(`Total tokens consumed: ${totalTokens.toLocaleString()}`);
    
    const estimatedCostUSD = totalTokens * 0.00001; // ~$0.01 per 1M tokens for gpt-4o-mini
    console.log(`Estimated cost: $${estimatedCostUSD.toFixed(4)} USD`);
    
    console.log('='.repeat(70));
    console.log('\n✅ E2E simulation completed!\n');
    console.log('📁 Data saved to database (if available)');
    console.log('📋 See "GENERATION HISTORY" above for full details\n');
    
  } catch (error: any) {
    console.error('\n💥 Critical error during E2E simulation:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
