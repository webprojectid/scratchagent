import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { consumePhysicalQuota, getPhysicalQuota, PHYSICAL_GENERATION_STAGE } from "@/lib/physical-quota";
import { consumeQuota, getQuota, refundQuota, finalizeQuota } from "@/lib/quota";
import { memoryListUsage } from "@/lib/memory-store";
import { MAX_PLAN } from "@/lib/max-plan";
import { pricingCopy } from "@/lib/copy-pricing";

beforeEach(()=>{delete process.env.DATABASE_URL;});
test("Max hardware allowance is bounded under concurrent reservations and separate from software",async()=>{
 const id=randomUUID();
 const receipts=await Promise.all(Array.from({length:MAX_PLAN.hardwarePlans+4},()=>consumePhysicalQuota(id)));
 assert.equal(receipts.filter(Boolean).length,MAX_PLAN.hardwarePlans);
 assert.equal((await getPhysicalQuota(id)).remaining,0);
 assert.ok(receipts.filter(Boolean).every(receipt=>receipt?.tier==="max"));
 assert.equal((await getQuota(id,"free")).remaining,3);
 assert.equal((await getQuota(id,"pro")).unlimited,true);
 assert.ok(await consumeQuota(id,"pro"));
 assert.equal((await getPhysicalQuota(id)).remaining,0);
});
test("failed hardware generation refunds exactly its reservation and successful plans retain it",async()=>{
 const id=randomUUID(), receipt=await consumePhysicalQuota(id);assert.ok(receipt);
 await finalizeQuota(receipt,"synthetic-plan",{tokensIn:1,tokensOut:2});
 assert.equal((await getPhysicalQuota(id)).remaining,MAX_PLAN.hardwarePlans-1);
 assert.equal(memoryListUsage(id)[0].planId,"synthetic-plan");
 assert.equal(memoryListUsage(id)[0].stage,PHYSICAL_GENERATION_STAGE);
 const failed=await consumePhysicalQuota(id);assert.ok(failed);
 await refundQuota(failed);await refundQuota(failed);
 assert.equal((await getPhysicalQuota(id)).remaining,MAX_PLAN.hardwarePlans-1);
 assert.equal(memoryListUsage(id)[0].planId,"synthetic-plan");
});
test("hardware slots reset after their rolling window rather than after software use",async()=>{
 const id=randomUUID();await consumePhysicalQuota(id);
 const event=memoryListUsage(id)[0];const now=Date.now();
 event.createdAt=new Date(now-MAX_PLAN.hardwareWindowDays*86400000-1000).toISOString();
 assert.equal((await getPhysicalQuota(id,now)).remaining,MAX_PLAN.hardwarePlans);
 assert.ok(await consumePhysicalQuota(id));
 assert.equal((await getPhysicalQuota(id)).remaining,MAX_PLAN.hardwarePlans-1);
});
test("draft Max pricing stays aligned with its allowance and cannot enable checkout",()=>{
 const en=pricingCopy("en"),id=pricingCopy("id");
 assert.equal(MAX_PLAN.checkoutEnabled,false);
 assert.ok(en.maxReasons.some(reason=>reason.includes(`${MAX_PLAN.hardwarePlans}`)&&reason.includes(`${MAX_PLAN.hardwareWindowDays}`)));
 assert.match(en.maxMonthlyPrice,/99,000/);assert.match(id.maxQuarterlyPrice,/269\.000/);
 assert.equal(en.monthlyPrice,"IDR 39,000");
});
