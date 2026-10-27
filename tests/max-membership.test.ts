import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryGetOrCreateUser, memoryAddSubscription, memorySetUserTier } from "@/lib/memory-store";
import { grantPro, endPro, getAccountState, getAccountSummary } from "@/lib/billing";
import { hasProFeatures } from "@/lib/account-capabilities";
import { effectiveAccountTier, accountBadges } from "@/lib/account-membership";
import { accessPlan, type AuthUser } from "@/lib/api-auth";
import { emailTemplate } from "@/lib/transactional-email";
import { physicalInput } from "./fixtures/physical-plan";
import type { Plan } from "@/lib/types";

test("Max inherits Pro features while hardware requires an actual active Max subscription", async () => {
 delete process.env.DATABASE_URL;
 for (const tier of ["free", "pro", "max"] as const) {
  const user = memoryGetOrCreateUser(`max-boundary-${tier}@example.test`);
  const actor: AuthUser = { userId: user.id, email:user.email, via:"session" };
  if(tier !== "free") assert.equal((await grantPro(user.id,"synthetic-admin",7,tier)).ok,true);
  assert.equal((await getAccountSummary(user.id))?.tier,tier);
  assert.equal(hasProFeatures(actor,tier),tier !== "free");
  const plan: Plan={id:`max-boundary-${tier}`,userId:user.email,title:"Synthetic physical plan",brief:"Synthetic",stack:[],asumsi:[],features:[],status:"ready",physical:{version:1,revision:1,input:physicalInput}};
  for(const write of [false,true]) {
   const result=await accessPlan(plan.id,actor,{write,loadPlan:async()=>plan});
   assert.equal(result.error?.status,tier === "max" ? undefined : 403);
  }
  const software=await accessPlan(plan.id,actor,{loadPlan:async()=>({...plan,physical:undefined})});
  assert.equal(software.plan?.id,plan.id);
  if(tier === "max") {
   assert.equal((await endPro(user.id,"synthetic-admin")).ok,true);
   assert.equal((await getAccountState(user.id))?.tier,"free");
   assert.equal((await accessPlan(plan.id,actor,{loadPlan:async()=>plan})).error?.status,403);
  }
 }
});
test("stored Max labels cannot bypass expiry or create administrator permissions", async()=>{
 const user=memoryGetOrCreateUser("expired-max@example.test");
 memorySetUserTier(user.id,"max");
 memoryAddSubscription(user.id,"synthetic-admin",new Date(Date.now()-60000).toISOString(),"max");
 assert.equal((await getAccountState(user.id))?.tier,"free");
 assert.equal(effectiveAccountTier({tier:"max",proActive:false}),"free");
 assert.deepEqual(accountBadges({tier:"max",proActive:true,role:"user"}),["max"]);
});
test("Max activation and expiry emails identify the actual package without changing legacy Pro copy",()=>{
 const activation={kind:"pro_active" as const,subscriptionId:"synthetic",startsAt:"2026-10-22T00:00:00Z",expiresAt:"2026-10-29T00:00:00Z",days:7};
 assert.match(emailTemplate({...activation,tier:"max"}).subject,/Max/);
 assert.match(emailTemplate({...activation,tier:"max"}).text,/hardware and robotics/);
 assert.match(emailTemplate(activation).subject,/Pro/);
 assert.match(emailTemplate({kind:"pro_expiry",tier:"max",subscriptionId:"synthetic",expiresAt:activation.expiresAt,days:2}).subject,/Max/);
});
