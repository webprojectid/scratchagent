import { test } from "node:test";
import assert from "node:assert/strict";
import { structureLimits, ideasPerPlanLimit, taskBudgetPerFeature } from "@/lib/plan-limits";
import { pricingCopy } from "@/lib/copy-pricing";
import { emailTemplate } from "@/lib/transactional-email";
test("Max has independent 30 ceilings without changing Free or Pro", () => {
 assert.deepEqual(structureLimits("free"),{features:[4,8],subFeatures:[3,5],tasks:[8,12]});
 assert.deepEqual(structureLimits("pro"),{features:[10,15],subFeatures:[12,20],tasks:[15,25]});
 const max=structureLimits("max"); for(const range of Object.values(max)){assert.equal(range[1],30);assert.ok(range[0]<30);}
 assert.equal(taskBudgetPerFeature("max"),30); assert.equal(ideasPerPlanLimit("max"),5);assert.equal(ideasPerPlanLimit("pro"),2);
});
test("Max pricing and activation use ceilings and five ideas",()=>{
 const copy=pricingCopy("en");assert.equal(copy.comparison.filter(row=>row.max==="Up to 30").length,3);
 assert.ok(copy.maxReasons.includes("Add up to 5 ideas per software project"));
 const email=emailTemplate({kind:"pro_active",tier:"max",subscriptionId:"synthetic",startsAt:"2026-10-23T00:00:00Z",expiresAt:"2026-11-23T00:00:00Z",days:31});
 assert.match(email.text,/Up to 30 phases/);assert.match(email.text,/Up to 5 additional ideas/);
});

import { physicalPhases } from "./fixtures/physical-plan";
import { validatePhysicalRoadmap, physicalOutlineSchema } from "@/lib/physical-generation";
test("Max hardware contract accepts 30 outline phases and rejects 31 or excess tasks per phase",()=>{
 const base={...physicalPhases[0],dependsOnPhases:[],packages:physicalPhases[0].packages.map(({title,goal,acceptance})=>({title,goal,acceptance}))};
 assert.equal(physicalOutlineSchema.safeParse({phases:Array.from({length:30},()=>base)}).success,true);
 assert.equal(physicalOutlineSchema.safeParse({phases:Array.from({length:31},()=>base)}).success,false);
 const phase=structuredClone(physicalPhases[0]);const task=phase.packages[0].tasks[0];
 phase.packages[0].tasks=Array.from({length:31},(_,i)=>({...task,id:"T"+String(i+1).padStart(2,"0")}));
 assert.ok(validatePhysicalRoadmap({phases:[phase]},["R01","R02"],"max").some(issue=>issue.includes("up to 30")));
});
