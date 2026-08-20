/**
 * FULL SIMULATION SCRIPT - Scratch Agent
 * 
 * Purpose: Test complete flow from brief → PRD generation → task execution
 * Scenarios: 
 *  - Plan MUDAH: Simple Todo App
 *  - Plan SULIT: Multi-vendor Marketplace with Real-time Inventory
 * 
 * Run: npx tsx tests/full-plan-simulation.ts
 */

import { generatePlanStructure, generateTasksForFeature, assignTasksToSubFeatures } from '../src/lib/generate';

// ============================================================================
// SCENARIO DEFINITIONS
// ============================================================================

const SCENARIOS = {
  EASY: {
    name: "Simple Todo App",
    brief: "Aplikasi todo list sederhana dengan fitur: CRUD tasks, categorization (work/personal), due dates, priority levels (high/medium/low), basic filtering (all/active/completed), and drag-and-drop reordering. Mobile-responsive PWA.",
    expectedDuration: "~30 min total",
    estimatedTasks: 24, // ~6 features × 4 tasks
  },
  
  HARD: {
    name: "Multi-vendor Marketplace with Real-time Inventory",
    brief: "Platform marketplace multi-vendor dengan fitur: vendor registration & profile management, product listing with variants (color, size), real-time inventory tracking across multiple warehouses, order processing with shipping integration (JNE/J&T/SiCepat), payment gateway (Midtrans), escrow system untuk transaksi aman, rating & review system, live chat antara buyer-seller, analytics dashboard untuk vendor (sales report, inventory alert), admin panel untuk moderation & dispute resolution. Stack: Next.js + NestJS + PostgreSQL + Redis + WebSocket (Socket.io).",
    expectedDuration: "~4-6 hours total",
    estimatedTasks: 96, // ~8 features × 12 tasks
  },
};

// ============================================================================
// BUG IDENTIFICATION LOGIC
// ============================================================================

interface Bug {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  evidence: string;
  recommendation: string;
}

async function identifyBugs(results: any[]): Promise<{ type: 'bug-report'; totalBugs: number; critical: number; high: number; medium: number; low: number; bugs: Bug[] }> {
  const bugs: Bug[] = [];
  
  // Check 1: Missing architecture diagram
  const prdStep = results.find((r: any) => r.step === 'prd-generation');
  if (prdStep && !prdStep.architecture?.includes('mermaid')) {
    bugs.push({
      severity: 'medium',
      category: 'architecture',
      description: 'Architecture diagram menggunakan fallback generik karena LLM gagal menghasilkan mermaid diagram',
      evidence: 'architecture field tidak contain mermaid fence',
      recommendation: 'Regenerate atau inject manual diagram dari narasi arsitektur',
    });
  }
  
  // Check 2: Missing database schema diagram
  if (prdStep && !prdStep.databaseSchema?.includes('mermaid')) {
    bugs.push({
      severity: 'medium',
      category: 'database',
      description: 'Database schema diagram menggunakan fallback generik karena LLM gagal',
      evidence: 'databaseSchema field tidak contain mermaid fence',
      recommendation: 'Regenerate ERD atau manual injection dari text-based schema',
    });
  }
  
  // Check 3: High warning count
  if (prdStep && prdStep.warnings.length > 3) {
    bugs.push({
      severity: 'high',
      category: 'llm-reliability',
      description: `Terdeteksi ${prdStep.warnings.length} warnings dari LLM - reliability issue`,
      evidence: prdStep.warnings.join('; '),
      recommendation: 'Pertimbangkan retry logic atau switch ke stronger model',
    });
  }
  
  // Check 4: Task budget overflow
  const featureResults = results.find((r: any) => r.features);
  if (featureResults) {
    const totalTasks = featureResults.features.reduce((sum: number, f: any) => sum + f.subFeatures.reduce((s: number, sf: any) => s + sf.assignedTasks.length, 0), 0);
    if (totalTasks > 24) { // Free tier limit
      bugs.push({
        severity: 'high',
        category: 'tier-limits',
        description: `Total tasks ${totalTasks} melebihi batas tier Free (max 24)`,
        evidence: `Generated ${totalTasks} tasks, limit is 24`,
        recommendation: 'Truncate tasks atau upgrade ke Pro tier',
      });
    }
  }
  
  // Summary
  return {
    type: 'bug-report',
    totalBugs: bugs.length,
    critical: bugs.filter(b => b.severity === 'critical').length,
    high: bugs.filter(b => b.severity === 'high').length,
    medium: bugs.filter(b => b.severity === 'medium').length,
    low: bugs.filter(b => b.severity === 'low').length,
    bugs,
  };
}

// ============================================================================
// MOCK GENERATE FUNCTIONS
// ============================================================================

async function generatePRD(scenarioName: string, brief: string) {
  console.log(`Prompting LLM for scenario: ${scenarioName}`);
  console.log(`Token usage will be tracked...\n`);
  
  const result = await generatePlanStructure(
    brief,
    { mode: 'auto' },
    undefined,
    'free' // Using free tier limits
  );
  
  console.log(`✓ Generated: ${result.title}`);
  console.log(`  Features: ${result.features.length}`);
  console.log(`  Stack: ${result.stack.join(', ')}`);
  console.log(`  Architecture diagram: ${result.architecture.includes('mermaid') ? 'Yes' : 'No (fallback)'}`);
  console.log(`  Database schema: ${result.databaseSchema.includes('mermaid') ? 'Yes' : 'No (fallback)'}`);
  console.log(`  Token usage: ${result.usage.tokensIn.toLocaleString()} in, ${result.usage.tokensOut.toLocaleString()} out`);
  console.log(`  Warnings: ${result.warnings.length}`);
  
  if (result.warnings.length > 0) {
    console.log('  ⚠️  Warnings:', result.warnings);
  }
  
  return { ...result, generatedAt: new Date().toISOString() };
}

async function generateAllTasks(scenarioName: string, prdResult: any) {
  const allFeatures = [];
  
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
        'free',
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
    }
    
    // Assign tasks to sub-features
    const subFeatureTitles = feature.subFeatures.map(sf => sf.title);
    const combinedTasks = subFeatureTasks.flatMap(sft => sft.tasks.map(t => ({ ...t, sub_feature: sft.subFeatureTitle })));
    const taskMap = assignTasksToSubFeatures(combinedTasks, subFeatureTitles);
    
    allFeatures.push({
      ...feature,
      subFeatures: feature.subFeatures.map((sf: any, si: number) => ({
        ...sf,
        assignedTasks: taskMap.get(si) || [],
      })),
    });
    
    console.log(`  ✓ Completed Feature ${i + 1}`);
  }
  
  console.log(`\n✓ All features processed.`);
  
  return {
    features: allFeatures,
    totalTasks: allFeatures.reduce((sum: number, f: any) => sum + f.subFeatures.reduce((s: number, sf: any) => s + sf.assignedTasks.length, 0), 0),
    generatedAt: new Date().toISOString(),
  };
}

async function executeTaskLoop(scenarioName: string, taskResults: any) {
  console.log(`Executing task loop for ${taskResults.totalTasks} tasks...`);
  
  // For simulation, we just acknowledge the loop would run here
  // Actual execution would call: node cli/dist/index.js task start <ref>
  
  return {
    type: 'task-execution',
    executedCount: taskResults.totalTasks,
    simulatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runSimulation(scenarioName: string, scenarioData: any) {
  console.log(`\n🎯 STARTING: ${scenarioName.name}`);
  console.log('-'.repeat(60));
  console.log(`Brief: ${scenarioData.brief.slice(0, 120)}...`);
  console.log(`Expected duration: ${scenarioData.expectedDuration}`);
  console.log(`Estimated tasks: ${scenarioData.estimatedTasks}`);
  console.log('-'.repeat(60));
  
  const startTime = Date.now();
  const results: any[] = [];
  
  try {
    // Step 1: Generate PRD Structure
    console.log('\n📝 Step 1: Generating PRD Structure...');
    const prdResult = await generatePRD(scenarioName, scenarioData.brief);
    results.push({ step: 'prd-generation', ...prdResult });
    
    // Step 2: Generate Tasks for Each Feature
    console.log('\n💼 Step 2: Generating Tasks per Feature...');
    const taskResults = await generateAllTasks(scenarioName, prdResult);
    results.push(taskResults);
    
    // Step 3: Execute Task Loop (Simulation)
    console.log('\n⚡ Step 3: Simulating Task Execution Loop...');
    const executionResults = await executeTaskLoop(scenarioName, taskResults);
    results.push(executionResults);
    
    // Step 4: Bug Hunting & Reporting
    console.log('\n🐛 Step 4: Identifying Bugs & Issues...');
    const bugResults = await identifyBugs(results);
    results.push(bugResults);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ COMPLETED in ${elapsed}s\n`);
    
    return { scenarioName, scenarioData, results, elapsed };
    
  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`\n❌ FAILED after ${elapsed}s:`);
    console.error(error.message);
    if (error.cause) console.error('Cause:', error.cause);
    return { scenarioName, scenarioData, error, elapsed };
  }
}

async function main() {
  console.log('\n🚀 Starting Full Plan Simulation\n');
  
  try {
    // Run both scenarios
    const easyResult = await runSimulation('EASY', SCENARIOS.EASY);
    const hardResult = await runSimulation('HARD', SCENARIOS.HARD);
    
    // Generate final report
    console.log('\n📊 FINAL SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Easy Plan: ${easyResult.error ? `❌ FAILED (${easyResult.elapsed}s)` : `✅ COMPLETED (${easyResult.elapsed}s)`}`);
    console.log(`Hard Plan: ${hardResult.error ? `❌ FAILED (${hardResult.elapsed}s)` : `✅ COMPLETED (${hardResult.elapsed}s)`}`);
    
    if (!easyResult.error && easyResult.results) {
      const easyBugs = easyResult.results.find((r: any) => r.type === 'bug-report');
      if (easyBugs) {
        console.log(`Easy Plan Bugs: ${easyBugs.critical} critical, ${easyBugs.high} high, ${easyBugs.medium} medium, ${easyBugs.low} low`);
      }
    }
    
    if (!hardResult.error && hardResult.results) {
      const hardBugs = hardResult.results.find((r: any) => r.type === 'bug-report');
      if (hardBugs) {
        console.log(`Hard Plan Bugs: ${hardBugs.critical} critical, ${hardBugs.high} high, ${hardBugs.medium} medium, ${hardBugs.low} low`);
      }
    }
    
    console.log('=' .repeat(60));
    console.log('\n📝 Full simulation completed. Review above for issues.\n');
    
  } catch (error: any) {
    console.error('\n💥 Critical error during simulation:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
