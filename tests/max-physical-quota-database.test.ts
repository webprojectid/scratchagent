import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@/db/schema";
import { MAX_PLAN } from "@/lib/max-plan";

test("Max hardware quota SQL reserves atomically within transactions and counts only its own stage",{timeout:60000},async()=>{
 const pg=new PGlite();
 try{
  await pg.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
  const journal=JSON.parse(readFileSync("drizzle/meta/_journal.json","utf8"));
  for(const entry of journal.entries)await pg.exec(readFileSync(`drizzle/${entry.tag}.sql`,"utf8"));
  const userId=randomUUID();await pg.query("INSERT INTO users(id,email) VALUES($1,$2)",[userId,"max-quota-db@example.test"]);
  const db=drizzle(pg),require=createRequire(import.meta.url);
  const mocks:Record<string,unknown>={"@/db":{getDb:()=>db},"@/db/schema":schema,"./memory-store":{},"./max-plan":{MAX_PLAN}};
  const fixture={exports:{} as {consumePhysicalQuota:(id:string)=>Promise<{eventId:string}|null>;getPhysicalQuota:(id:string)=>Promise<{remaining:number}>}};
  const source=ts.transpileModule(readFileSync("src/lib/physical-quota.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(source,{module:fixture,exports:fixture.exports,process:{env:{DATABASE_URL:"synthetic-storage-mode"}},require:(name:string)=>mocks[name]??require(name)});
  await pg.query("INSERT INTO usage_events(user_id,stage,tier) VALUES($1,'generate','pro')",[userId]);
  assert.equal((await fixture.exports.getPhysicalQuota(userId)).remaining,MAX_PLAN.hardwarePlans);
  const receipts=[];
  for(let i=0;i<MAX_PLAN.hardwarePlans;i++){const receipt=await fixture.exports.consumePhysicalQuota(userId);assert.ok(receipt);receipts.push(receipt);}
  assert.equal(await fixture.exports.consumePhysicalQuota(userId),null);
  assert.equal((await fixture.exports.getPhysicalQuota(userId)).remaining,0);
  await pg.query("DELETE FROM usage_events WHERE id=$1",[receipts[0].eventId]);
  assert.equal((await fixture.exports.getPhysicalQuota(userId)).remaining,1);
  assert.ok(await fixture.exports.consumePhysicalQuota(userId));
  const software=await pg.query<{count:number}>("SELECT count(*)::int AS count FROM usage_events WHERE user_id=$1 AND stage='generate'",[userId]);
  assert.equal(software.rows[0].count,1);
 }finally{await pg.close();}
});
