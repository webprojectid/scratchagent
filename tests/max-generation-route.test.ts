import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { NextResponse } from "next/server";
import { physicalInputSchema } from "@/lib/physical-domain";
import { physicalInput } from "./fixtures/physical-plan";
import { defaultHandoff } from "@/lib/account-preferences";

test("generation denies hardware Free/Pro before quota, scheduling or provider work, including spoofed Max bodies", async()=>{
 const source=ts.transpileModule(readFileSync("src/app/api/generate/route.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const tier of ["free","pro","max"] as const){
  let storageChecks=0;
  const unexpected=()=>{throw Error("Unexpected provider, quota or generation work");};
  const mocks:Record<string,unknown>={
   "next/server":{NextResponse},"zod":{z},"crypto":{randomUUID:unexpected},
   "@/lib/write-origin":{writeOriginGate:()=>null},"@/lib/ui-messages":{apiText:(s:string)=>s},
   "@/lib/llm-config":{resolveLlmProviders:unexpected},"@/lib/run-generation":{scheduleGeneration:unexpected},
   "@/lib/account-store":{getAccountSettings:async()=>({handoff:defaultHandoff}),saveProjectState:unexpected},
   "@/lib/account-preferences":{handoffSettingsSchema:z.object({}),resolveHandoff:()=>defaultHandoff,effectiveTechPrefs:(v:unknown)=>v},
   "@/lib/api-auth":{legacyDevMode:()=>false,getRequestUser:async()=>({userId:"synthetic",via:"session"}),planOwnerKey:()=>"synthetic",unauthorized:unexpected},
   "@/lib/request-json":{readRequestJson:(r:Request)=>r.json(),RequestJsonError:class extends Error{}},
   "@/lib/storage":{savePlan:unexpected,deletePlan:unexpected},"@/lib/quota":{consumeQuota:unexpected,refundQuota:unexpected,getQuota:unexpected},
   "@/lib/billing":{getAccountState:async()=>({tier,bannedAt:null}),isAdminEmail:()=>true},
   "@/lib/security":{getClientIp:async()=>"synthetic",blockedIpResponse:async()=>null},
   "@/lib/physical-domain":{physicalInputSchema},"@/lib/physical-storage":{physicalStorageReady:async()=>{storageChecks++;return false;}},
  };
  const fixture={exports:{} as {POST:(r:Request)=>Promise<Response>}};
  runInNewContext(source,{module:fixture,exports:fixture.exports,console,require:(name:string)=>{assert.ok(name in mocks,name);return mocks[name];}});
  const response=await fixture.exports.POST(new Request("https://example.test/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brief:"Synthetic hardware prototype",tier:"max",techPrefs:{domain:"physical",mode:"custom",hardware:physicalInput}})}));
  assert.equal(response.status,tier === "max"?503:403);
  assert.equal(storageChecks,tier === "max"?1:0);
 }
});

test("software generation derives its tier and allowance from the account, never from a requested tier", async () => {
  const source = ts.transpileModule(readFileSync("src/app/api/generate/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const tier of ["free", "pro", "max"] as const) {
    let savedTier: string | undefined, scheduledTier: string | undefined, quotaTier: string | undefined;
    const unexpected = () => { throw new Error("Unexpected work"); };
    const mocks: Record<string, unknown> = {
      "next/server": { NextResponse }, zod: { z }, crypto: { randomUUID: () => "synthetic-plan" },
      "@/lib/write-origin": { writeOriginGate: () => null }, "@/lib/ui-messages": { apiText: (value: string) => value },
      "@/lib/llm-config": { resolveLlmProviders: async () => [{}] },
      "@/lib/run-generation": { scheduleGeneration: async (job: { tier: string }) => { scheduledTier = job.tier; return true; } },
      "@/lib/account-store": { getAccountSettings: async () => ({ handoff: defaultHandoff }), saveProjectState: async () => {} },
      "@/lib/account-preferences": { handoffSettingsSchema: z.object({}), resolveHandoff: () => defaultHandoff, effectiveTechPrefs: (value: unknown) => value },
      "@/lib/api-auth": { legacyDevMode: () => false, getRequestUser: async () => ({ userId: "synthetic", via: "session" }), planOwnerKey: () => "synthetic", unauthorized: unexpected },
      "@/lib/request-json": { readRequestJson: (request: Request) => request.json(), RequestJsonError: class extends Error {} },
      "@/lib/storage": { savePlan: async (plan: { tier: string }) => { savedTier = plan.tier; }, deletePlan: unexpected },
      "@/lib/quota": { consumeQuota: async (_owner: string, value: string) => { quotaTier = value; return { userId: "synthetic", tier: value, eventId: "synthetic-receipt" }; }, refundQuota: unexpected },
      "@/lib/billing": { getAccountState: async () => ({ tier, bannedAt: null }), isAdminEmail: () => false },
      "@/lib/security": { getClientIp: async () => "synthetic", blockedIpResponse: async () => null, RATE_LIMITS: { generate: { limit: 10, windowMs: 1000 } }, clientKey: () => "synthetic", rateLimit: () => null },
    };
    const fixture = { exports: {} as { POST: (request: Request) => Promise<Response> } };
    runInNewContext(source, { module: fixture, exports: fixture.exports, console, require: (name: string) => { assert.ok(name in mocks, name); return mocks[name]; } });
    const response = await fixture.exports.POST(new Request("https://example.test/api/generate", { method: "POST", body: JSON.stringify({ brief: "Synthetic software brief", tier: "max", userId: "another-account", techPrefs: { domain: "software", mode: "auto" } }) }));
    assert.equal(response.status, 200);
    assert.equal(savedTier, tier);
    assert.equal(scheduledTier, tier);
    assert.equal(quotaTier, tier === "max" ? "pro" : tier);
  }
});
