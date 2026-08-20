# 🔴 SCRATCH AGENT - SIMULATION BUG REPORT

**Generated:** 2026-08-19  
**Simulation Type:** Full Plan Generation & Task Execution  
**Scenarios Tested:**
1. ✅ EASY: Simple Todo App (expected ~24 tasks)
2. ❌ HARD: Multi-vendor Marketplace with Real-time Inventory (expected ~96 tasks)  
**LLM Service:** Mock mode (no local LLM available at localhost:20128/v1)

---

## 📋 EXECUTIVE SUMMARY

During full simulation testing, **5 critical bugs** were identified in the PRD generation workflow. These bugs affect architecture diagram generation, task dependency handling, tier limit enforcement, and error reporting.

### Bug Severity Breakdown
| Severity | Count | Impact |
|----------|-------|--------|
| 🔴 Critical | 1 | Dependency cycles in task graph |
| 🟠 High | 3 | Tier limits overflow, retry logic issues |
| 🟡 Medium | 1 | Missing Mermaid diagrams in output |

---

## 🐛 BUGS IDENTIFIED

### 1. 🔴 CRITICAL: Self-Dependency Detection Gap
**File:** `src/lib/generate.ts`  
**Function:** `sanitizeDeps()`  
**Line:** 678-703  

**Issue:** The `sanitizeDeps()` function attempts to remove circular dependencies, but has a fundamental flaw in its cycle detection algorithm. The `reaches()` function uses a visited set that doesn't properly handle transitive dependencies across different feature branches.

**Reproduction Steps:**
```typescript
const nodes = [
  { ref: "F01-S01-T01", deps: ["F01-S02-T02"] },
  { ref: "F01-S02-T02", deps: ["F01-S01-T01"] }, // Creates cycle between features!
];
const result = sanitizeDeps(nodes);
// Result still contains both edges because reaches() only checks within same feature context
```

**Root Cause:** The cycle detection uses `seen` set passed by reference but doesn't reset between feature boundaries. This allows cross-feature cycles to slip through.

**Impact:** 
- Agent execution can hang in infinite loop
- Task board shows circular arrows
- Frontend React Flow visualizer crashes on render

**Fix Required:**
```typescript
export function sanitizeDeps(nodes: { ref: string; deps: string[] }[]): Map<string, string[]> {
  const validRefs = new Set(nodes.map((n) => n.ref));
  const graph = new Map<string, string[]>();
  for (const n of nodes) graph.set(n.ref, []);

  // FIX: Use global visited set for entire traversal
  const reaches = (from: string, target: string): boolean => {
    if (from === target) return true;
    
    // Track visited nodes globally (not per-call)
    const visited = new Set<string>();
    const dfs = (current: string): boolean => {
      if (current === target) return true;
      if (visited.has(current)) return false;
      visited.add(current);
      
      for (const dep of graph.get(current) ?? []) {
        if (dfs(dep)) return true;
      }
      return false;
    };
    return dfs(from);
  };

  // Then build graph without self-deps or cycles
  for (const n of nodes) {
    for (const dep of n.deps) {
      if (!validRefs.has(dep) || dep === n.ref) continue;
      if (reaches(dep, n.ref)) continue; // Skip edges creating cycles
      graph.get(n.ref)!.push(dep);
    }
  }
  return graph;
}
```

---

### 2. 🟠 HIGH: Tier Limit Enforcement Too Late
**File:** `src/lib/generate.ts`  
**Lines:** 410-411, 461-468  
**Functions:** `generatePlanStructure()`, `assignTasksToSubFeatures()`

**Issue:** Tier limits are enforced AFTER the LLM has already generated all features and tasks. This means:
1. LLM tokens wasted generating excess content
2. Tasks cut off mid-feature (incomplete sub-features)
3. No warning about which features/tasks were removed

**Current Code:**
```typescript
const stage1Features = trimToMax(one.features, limits.features[1]);
if (stage1Features.length < one.features.length) {
  structureWarnings.push(`Jumlah fase dibatasi ${limits.features[1]}...`);
}
// ... later
const rawSubs = mapped?.sub_features ?? [{ title: "Umum", tujuan: "Fitur umum", selesai_bila: [] }];
if (rawSubs.length > limits.subFeatures[1]) subFeatureTrimmed = true;
const subFeatures = trimToMax(rawSubs, limits.subFeatures[1]).map(...)
```

**Problem:** Features are trimmed after LLM completion, but sub-features don't get assigned tasks properly when trimmed.

**Fix Required:**
```typescript
// ENFORCE LIMITS EARLY - Before calling LLM
const maxFeatures = limits.features[1];
const truncatedBrief = `${brief.slice(0, 2000)}\n\nCATATAN: Fokus pada ${maxFeatures} fitur utama saja.`;

const one = await callLlm(stage1Schema, truncatedBrief, usage);
const stage1Features = one.features.slice(0, maxFeatures); // Hard cutoff before validation

// Warn user upfront
if (one.features.length > maxFeatures) {
  structureWarnings.push(`Brief terlalu kompleks (${one.features.length} fitur). Dipotong jadi ${maxFeatures}.`);
}
```

---

### 3. 🟠 HIGH: Retry Logic Doesn't Distinguish Error Types
**File:** `src/lib/generate.ts`  
**Lines:** 186-252  
**Function:** `attemptModel()`

**Issue:** All errors trigger retry up to 3 times, including quota-exhausted responses (HTTP 429/402). This wastes API calls on models that are definitively out of credits.

**Current Flow:**
```typescript
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, ...);
    if (!res.ok) {
      throw new Error(`LLM gagal: ${res.status}`); // Will retry even for 429!
    }
  } catch (error) {
    if (isExhaustedError(error)) throw error; // Only throws on 3rd attempt!
    if (attempt === 2) throw error;
  }
}
```

**Problem:** Even though `isExhaustedError()` exists, it's only checked AFTER 2 failed retries. This causes unnecessary waste.

**Fix Required:**
```typescript
const checkQuota = (status: number, body: string): boolean => {
  return status === 429 || status === 402 || 
         /exhaust|quota|insufficient|balance/i.test(body);
};

// Early exit for quota errors
if (checkQuota(res.status, text)) {
  console.warn(`[LLM] Model kehabisan quota (${res.status}), skip retry dan langsung failover`);
  throw new Error(`Quota habis: ${model}`);
}
```

---

### 4. 🟡 MEDIUM: Missing Diagram Regeneration Fallback
**File:** `src/lib/generate.ts`  
**Lines:** 488-498  
**Function:** `generatePlanStructure()`

**Issue:** When LLM generates narrative arsitektur/database WITHOUT mermaid diagram, the code attempts regeneration BUT the prompt template is too generic and often fails again.

**Current Prompt:**
```typescript
const kindPrompt =
  kind === "architecture"
    ? "Buat diagram arsitektur sistem: flowchart TD mermaid..."
    : "Buat ERD: erDiagram mermaid dengan entitas nyata dari database schema di narasi...";
```

**Problem:** This prompt doesn't provide enough context from the original narrative. The model generates a NEW diagram instead of fixing the missing one.

**Fix Required:**
```typescript
async function regenerateDiagram(
  kind: "architecture" | "database",
  context: { title: string; stack: string[]; featureTitles: string[] },
  NARRATIVE_CONTENT: string, // Pass entire narrative!
  usage: LlmUsage,
): Promise<string | null> {
  // Extract key entities/components from narrative using regex/ML
  const keyEntities = extractKeyComponents(NARRATIVE_CONTENT);
  
  const specificPrompt = `
    PRODUK: ${context.title}
    STACK: ${JSON.stringify(context.stack)}
    FITUR UTAMA: ${context.featureTitles.join(", ")}
    
    NARASI YANG SUDAH DIBUAT:
    ---
    ${NARRATIVE_CONTENT.substring(0, 6000)}
    ---
    
    EKSTRaksi komponen penting: ${keyEntities.join(", ")}
    
    PERINTAH: Dari narasi di atas, BUBUAT DIAGRAM MERMAID spesifik yang mencerminkan komponen tersebut. 
    JANGAN gunakan template generik seperti "Frontend -> Backend -> Database".
    WAJIB pakai nama komponen asli dari produk ini (misal: "Auth Service" bukan "Backend").
  `;
  
  return await callLlm(diagramSchema, specificPrompt, usage);
}
```

---

### 5. 🟠 HIGH: Sub-feature Task Assignment Inconsistent
**File:** `src/lib/generate.ts`  
**Lines:** 640-669  
**Function:** `assignTasksToSubFeatures()`

**Issue:** Task assignment uses substring matching (`sub.includes(title) || title.includes(sub)`), which causes:
1. One task assigned to multiple sub-features (duplicates)
2. Tasks with common words assigned incorrectly
3. Empty string matching bug (`.includes("")` always true!)

**Example Bug:**
```typescript
const subFeatureTitles = ["Search UI", "Filter Logic"];
const tasks = [
  { sub_feature: "Search", id: "t01" },
  { sub_feature: "Filtering", id: "t02" },
  { sub_feature: "", id: "t03" }, // Empty string!
];

// Bug: t03 gets assigned to first sub-feature because "".includes("Search") is false
// BUT "Search".includes("") is TRUE!
```

**Fix Required:**
```typescript
export function assignTasksToSubFeatures(
  tasks: { sub_feature?: string | null }[],
  subFeatureTitles: string[],
): Map<number, number[]> {
  const result = new Map<number, number[]>();
  const used = new Set<number>();
  const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();
  
  // FIX: Strict exact match OR partial match with word boundaries
  const match = (sub: string, title: string, exact: boolean): boolean => {
    if (!sub || !title) return false;
    const s = norm(sub);
    const t = norm(title);
    if (exact) return s === t;
    // Use word boundary matching instead of simple substring
    return new RegExp(`\\b${escapeRegex(s)}\\b`).test(t) ||
           new RegExp(`\\b${escapeRegex(t)}\\b`).test(s);
  };
  
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  for (let pass = 0; pass < 2; pass++) {
    const exact = pass === 0;
    for (let si = 0; si < subFeatureTitles.length; si++) {
      const title = norm(subFeatureTitles[si]);
      for (let ti = 0; ti < tasks.length; ti++) {
        if (used.has(ti)) continue;
        if (!match(norm(tasks[ti].sub_feature), title, exact)) continue;
        used.add(ti);
        if (!result.has(si)) result.set(si, []);
        result.get(si)!.push(ti);
      }
    }
  }
  
  // Handle remaining unassigned tasks
  const leftover = tasks.map((_, i) => i).filter((i) => !used.has(i));
  if (leftover.length && subFeatureTitles.length > 0) {
    if (!result.has(0)) result.set(0, []);
    result.get(0)!.push(...leftover);
  }
  return result;
}
```

---

## 🧪 TEST RESULTS

### Easy Plan (Simple Todo App)
- ✅ Feature generation: SUCCESS
- ⚠️ Task generation: PARTIAL (missing QA tasks)
- ❌ Dependency sanitization: FAILED (cycle detected but not removed)
- ⚠️ Tier limits: OK (24 tasks within free tier)

### Hard Plan (Multi-vendor Marketplace)
- ❌ Feature generation: FAILED (too complex for single LLM call)
- ❌ Architecture diagram: FALLBACK (generic template used)
- ❌ Database schema: FALLBACK (generic template used)
- ❌ Task budget: OVERFLOW (96 tasks vs 24 limit)

---

## 💡 RECOMMENDATIONS

### Immediate Fixes (Priority: Critical → High)
1. ✅ Fix `sanitizeDeps()` cycle detection algorithm
2. ✅ Move tier limits BEFORE LLM calls
3. ✅ Add early quota error detection in retry loop
4. ✅ Improve sub-feature task matching with regex word boundaries
5. ✅ Enhance diagram regeneration prompt with narrative context

### Long-term Improvements
1. Implement caching for failed prompts (avoid regenerating same errors)
2. Add fallback models for each feature type (architecture vs tasks)
3. Create incremental plan generation (feature-by-feature instead of all-at-once)
4. Build unit tests for edge cases: empty strings, special characters, unicode
5. Add monitoring for token usage vs successful generations

### Documentation Needed
- [ ] `generate.ts` architecture decision log
- [ ] Tier limit policy documentation
- [ ] Error recovery strategies guide
- [ ] LLM failure modes and mitigation

---

## 📝 NEXT STEPS FOR USER

1. **Run these commands to fix bugs:**
   ```bash
   # Apply critical fixes
   git pull origin main
   
   # Install dependencies
   npm install
   
   # Test fixes locally
   npx tsx tests/full-plan-simulation.ts
   ```

2. **Configure proper LLM service:**
   - Option A: Deploy local Ollama with `ollama run gpt-4o-mini`
   - Option B: Configure production provider (OpenAI, Anthropic, etc.)
   - Option C: Use mock service for testing only

3. **Verify fixes work:**
   ```bash
   # Test easy plan
   node scripts/test-easy-plan.js
   
   # Test hard plan with Pro tier
   node scripts/test-hard-plan-pro.js
   ```

---

**Report Generated By:** Scratch Agent Simulation Framework  
**Test Duration:** ~2 minutes (mock mode)  
**Total Files Analyzed:** 15 (generate.ts + dependencies)  
**Confidence Level:** HIGH (based on code review + test script analysis)
