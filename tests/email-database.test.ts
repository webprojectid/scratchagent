import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as tables from "@/db/schema";
import { defaultAccountSettings } from "@/lib/account-preferences";
import * as templates from "@/lib/transactional-email";

const require = createRequire(import.meta.url);
function load<T>(filename: string, mocks: Record<string, unknown>, env: Record<string, string>) {
  const fixture = { exports: {} };
  const output = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  runInNewContext(output, { module: fixture, exports: fixture.exports, process: { env }, Buffer, Date, console, URL, setTimeout, AbortSignal, fetch: () => { throw new Error("Unexpected network access in database test"); }, require: (name: string) => name in mocks ? mocks[name] : require(name) });
  return fixture.exports as T;
}

test("real PostgreSQL migrations, Pro receipt queue, expiry reminders and unfinished task cancellation", { timeout: 60_000 }, async () => {
  const pg = new PGlite();
  try {
    await pg.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
    for (const entry of journal.entries) await pg.exec(readFileSync(`drizzle/${entry.tag}.sql`, "utf8"));
    const db = drizzle(pg);
    const env = { DATABASE_URL: "offline-test", EMAIL_NOTIFICATIONS_ENABLED: "1", EMAIL_OTP_SECRET: randomUUID() + randomUUID(), BREVO_API_KEY: randomUUID() };
    const mocks: Record<string, unknown> = { "@/db": { getDb: () => db }, "@/db/schema": tables, "@/lib/memory-store": {}, "./admin-access": { developerAdminEmails: () => [], isDeveloperAdmin: () => false } };
    const store = load<typeof import("@/lib/email-store")>("src/lib/email-store.ts", mocks, env);
    mocks["./email-store"] = store;
    const billing = load<typeof import("@/lib/billing")>("src/lib/billing.ts", mocks, env);
    const owner = randomUUID();
    await pg.query("INSERT INTO users(id,email) VALUES($1,$2)", [owner, "synthetic-db@example.test"]);
    const grant = await billing.grantPro(owner, "synthetic-admin@example.test", 7);
    assert.equal(grant.ok, true);
    assert.equal((await pg.query("SELECT * FROM email_outbox")).rows.length, 1);
    assert.equal((await billing.grantPro(owner, "synthetic-admin@example.test", 7)).ok, false);
    const messages: { to: string; subject: string; id: string }[] = [];
    const settings = structuredClone(defaultAccountSettings);
    mocks["./transactional-email"] = { ...templates, sendTransactionalEmail: async (to: string, content: templates.EmailContent, id: string) => { messages.push({ to, subject: content.subject, id }); return "synthetic-provider-id"; } };
    mocks["./account-store"] = { getAccountSettings: async () => settings };
    const service = load<typeof import("@/lib/email-notifications")>("src/lib/email-notifications.ts", mocks, env);
    const key = env.BREVO_API_KEY;
    env.BREVO_API_KEY = "";
    await assert.rejects(service.deliverEmailQueue());
    assert.equal((await pg.query<{ status: string }>("SELECT status FROM email_outbox")).rows[0].status, "pending");
    env.BREVO_API_KEY = key;
    const claims = await Promise.all([store.claimEmail(), store.claimEmail()]);
    assert.equal(claims.filter(Boolean).length, 1);
    await pg.exec("UPDATE email_outbox SET leased_at=now()-interval '3 minutes' WHERE status='processing'");
    await store.recoverEmailLeases();
    assert.equal((await service.deliverEmailQueue()).sent, 1);
    assert.equal((await service.deliverEmailQueue()).sent, 0);
    assert.equal(messages.length, 1);
    assert.match(messages[0].subject, /Payment successful/);
    assert.equal(messages[0].to, "synthetic-db@example.test");

    await pg.exec("UPDATE subscriptions SET expires_at=now()+interval '5 days'");
    await service.scheduleEmailReminders();
    await service.scheduleEmailReminders();
    assert.equal((await pg.query("SELECT * FROM email_outbox WHERE kind='pro_expiry'")).rows.length, 1);
    assert.equal((await service.deliverEmailQueue()).sent, 1);
    await pg.exec("UPDATE subscriptions SET expires_at=now()+interval '2 days'");
    await service.scheduleEmailReminders();
    settings.notifications.emailPlanExpiry = false;
    assert.equal((await service.deliverEmailQueue()).cancelled, 1);
    settings.notifications.emailPlanExpiry = true;
    await pg.exec("UPDATE subscriptions SET expires_at=now()+interval '1 day'");
    await service.scheduleEmailReminders();
    await pg.exec("UPDATE subscriptions SET ended_at=now()");
    assert.equal((await service.deliverEmailQueue()).cancelled, 1);

    const planId = randomUUID(), feature = randomUUID();
    await pg.query("INSERT INTO plans(id,user_id,title,brief,tech_prefs,status,created_at) VALUES($1,$2,'Synthetic unfinished project','Synthetic brief','{}','ready',now()-interval '4 days')", [planId, owner]);
    await pg.query("INSERT INTO features(id,plan_id,slug,title,icon,description,tujuan,selesai_bila,\"order\") VALUES($1,$2,'phase','Synthetic phase','code','Description','Goal','[]',0)", [feature, planId]);
    await pg.query("INSERT INTO tasks(plan_id,feature_id,ref,title,layer,phase,\"order\") VALUES($1,$2,'F01-T01','Synthetic task','frontend',1,0)", [planId, feature]);
    await service.scheduleEmailReminders();
    await service.scheduleEmailReminders();
    assert.equal((await pg.query("SELECT * FROM email_outbox WHERE kind='unfinished_plans'")).rows.length, 1);
    await pg.query("UPDATE tasks SET status='done',completed_at=now() WHERE plan_id=$1", [planId]);
    assert.equal((await service.deliverEmailQueue()).cancelled, 1);

    const rows = await pg.query<{ tablename: string; rowsecurity: boolean }>("SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'email_%'");
    assert.equal(rows.rows.length, 4);
    assert.ok(rows.rows.every(row => row.rowsecurity));
    await pg.exec("DELETE FROM email_daily_budget");
    for (let count = 0; count < 50; count++) assert.equal(await store.reserveEmailBudget(true), true);
    assert.equal(await store.reserveEmailBudget(true), false);
    assert.equal(await store.reserveEmailBudget(false), true);
    const otp = load<typeof import("@/lib/social-email-otp")>("src/lib/social-email-otp.ts", { ...mocks, "./transactional-email": templates }, env);
    const identity = { authUserId: randomUUID(), sessionId: randomUUID(), email: "synthetic-otp@example.test", required: true };
    let code = "";
    await otp.issueSocialCode(identity, "en", async (_to, content) => { code = content.text.match(/\b\d{6}\b/)![0]; return "synthetic-id"; });
    assert.equal(await otp.verifySocialCode(identity, code), true);
    assert.equal(await otp.isSocialSessionVerified(identity), true);
    assert.equal(await otp.verifySocialCode(identity, code), false);
  } finally { await pg.close(); }
});
